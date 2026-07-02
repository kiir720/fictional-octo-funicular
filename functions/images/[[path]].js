// GET /images/<path> — serves wallpaper files from storage with long-lived
// caching (files are content-addressed by a timestamp suffix, so they never change).
import { getObject } from '../api/_utils.js';

export async function onRequestGet({ params, env }){
  const rel = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if(!rel) return new Response('Not found', { status: 404 });

  const obj = await getObject(env, 'images/' + rel);
  if(!obj) return new Response('Not found', { status: 404 });

  return new Response(obj.body, {
    headers: {
      'content-type': obj.contentType,
      'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*'
    }
  });
}
