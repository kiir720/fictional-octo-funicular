// GET /api/imagga?url=<image url on this site>  (admin)
// Proxies Imagga's tagging API with the credentials held server-side
// (IMAGGA_KEY + IMAGGA_SECRET secrets). Imagga fetches the image itself by
// URL, so only public images on this site can be tagged. Responses are
// edge-cached for 7 days — re-tagging the same image never spends quota
// twice (the free tier is only 1000 requests/month).
import { json, cors, preflight, authorized } from './_utils.js';

export async function onRequest(context){
  const { request, env } = context;
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'GET') return cors(json({ error: 'method not allowed' }, 405));
  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));

  const key = String(env.IMAGGA_KEY || '').trim();
  const secret = String(env.IMAGGA_SECRET || '').trim();
  if(!key || !secret) return cors(json({ error: 'Imagga is not configured (set IMAGGA_KEY and IMAGGA_SECRET)' }, 503));

  const u = new URL(request.url);
  let target;
  try { target = new URL(u.searchParams.get('url')); } catch(e){ return cors(json({ error: 'bad url' }, 400)); }
  // only images this site serves — keeps the quota from being spent elsewhere
  if(target.protocol !== 'https:' || target.hostname !== u.hostname){
    return cors(json({ error: 'only images on this site can be tagged' }, 400));
  }

  const cache = caches.default;
  const cacheKey = new Request(u.origin + '/api/imagga?url=' + encodeURIComponent(target.toString()));
  const hit = await cache.match(cacheKey);
  if(hit) return cors(new Response(hit.body, hit));

  const api = 'https://api.imagga.com/v2/tags?limit=10&image_url=' + encodeURIComponent(target.toString());
  const r = await fetch(api, { headers: { 'Authorization': 'Basic ' + btoa(key + ':' + secret) } });
  const data = await r.json().catch(()=>null);
  if(!r.ok){
    const detail = data && data.status && data.status.text ? ': ' + data.status.text : '';
    // 401 from Imagga = wrong key/secret; anything else = their side or quota
    return cors(json({ error: 'Imagga HTTP ' + r.status + detail }, 502));
  }

  const tags = ((data && data.result && data.result.tags) || [])
    .filter(t => t && t.confidence >= 30)
    .slice(0, 8)
    .map(t => ({
      tag: String((t.tag && (t.tag.en || Object.values(t.tag)[0])) || '').trim(),
      confidence: Math.round(t.confidence)
    }))
    .filter(t => t.tag);

  const res = json({ tags }, { headers: { 'cache-control': 'public, max-age=604800' } });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return cors(res);
}
