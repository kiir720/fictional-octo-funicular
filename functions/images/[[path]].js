// GET /images/<path> — serves wallpaper files from storage with long-lived
// caching (files are content-addressed by a timestamp suffix, so they never change).
// Responses are also cached at the Cloudflare edge: the first visitor in a region
// pays the KV read, everyone after is served straight from the CDN.
import { getObject } from '../api/_utils.js';

export async function onRequestGet(context){
  const { request, env, params } = context;
  const rel = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if(!rel) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const hit = await cache.match(request);
  if(hit){
    const res = new Response(hit.body, hit);
    res.headers.set('x-edge-cache', 'hit');
    return res;
  }

  const obj = await getObject(env, 'images/' + rel);
  if(!obj) return new Response('Not found', { status: 404 });

  const res = new Response(obj.body, {
    headers: {
      'content-type': obj.contentType,
      'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*',
      'x-edge-cache': 'miss'
    }
  });
  context.waitUntil(cache.put(request, res.clone()));
  return res;
}
