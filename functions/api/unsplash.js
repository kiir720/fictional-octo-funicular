// GET /api/unsplash — public proxy for browsing Unsplash photos.
//   ?q=<term>&page=N              search photos
//   ?order=latest|popular&page=N  browse the global feed
//   ?track=<download_location>    fire Unsplash's download trigger (API guideline)
// The access key stays server-side (UNSPLASH_KEY secret). Responses are cached
// at the edge for an hour, which keeps a demo key (50 req/h) workable.
import { json, cors, preflight } from './_utils.js';

export async function onRequest(context){
  const { request, env } = context;
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'GET') return cors(json({ error: 'method not allowed' }, 405));

  const key = String(env.UNSPLASH_KEY || '').trim();
  if(!key) return cors(json({ error: 'Unsplash is not configured (set the UNSPLASH_KEY secret)' }, 503));

  const url = new URL(request.url);

  // download tracking — required by the Unsplash API guidelines
  const track = url.searchParams.get('track');
  if(track){
    let t; try { t = new URL(track); } catch(e){ return cors(json({ error: 'bad track url' }, 400)); }
    if(t.protocol !== 'https:' || t.hostname !== 'api.unsplash.com') return cors(json({ error: 'bad track host' }, 400));
    context.waitUntil(fetch(t.toString(), { headers: { 'Authorization': 'Client-ID ' + key } }).catch(()=>{}));
    return cors(json({ ok: true }));
  }

  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const page = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1));
  const order = url.searchParams.get('order') === 'latest' ? 'latest' : 'popular';

  // serve repeats from the edge cache instead of spending rate limit
  const cache = caches.default;
  const cacheKey = new Request(url.origin + '/api/unsplash?q=' + encodeURIComponent(q) + '&page=' + page + '&order=' + order);
  const hit = await cache.match(cacheKey);
  if(hit) return cors(new Response(hit.body, hit));

  const api = q
    ? 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(q) + '&page=' + page + '&per_page=24'
    : 'https://api.unsplash.com/photos?order_by=' + order + '&page=' + page + '&per_page=24';
  const r = await fetch(api, { headers: { 'Authorization': 'Client-ID ' + key, 'Accept-Version': 'v1' } });
  if(!r.ok){
    // demo keys answer 403 when the hourly rate limit is spent
    return cors(json({ error: 'Unsplash returned HTTP ' + r.status }, r.status === 403 ? 429 : 502));
  }
  const data = await r.json();
  const items = Array.isArray(data) ? data : (data.results || []);
  const photos = items.map(p => ({
    id: p.id,
    name: String(p.description || p.alt_description || 'Untitled wallpaper').slice(0, 90),
    img: p.urls && (p.urls.regular || p.urls.small),
    width: p.width, height: p.height,
    author: p.user && p.user.name,
    authorLink: p.user && p.user.links && p.user.links.html,
    photoLink: p.links && p.links.html,
    download: p.links && p.links.download_location,
    // search results carry real tags; the browse feed usually doesn't
    tags: Array.isArray(p.tags) ? p.tags.map(t => t && t.title).filter(Boolean).slice(0, 8) : []
  })).filter(p => p.img);

  const res = json({ photos, page }, { headers: { 'cache-control': 'public, max-age=3600' } });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return cors(res);
}
