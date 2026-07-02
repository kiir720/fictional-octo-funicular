// POST /api/import  (admin)  Body: { url, name }
// Fetches a stock photo server-side (no browser CORS limits), stores it in R2,
// and returns { path }. Only known stock-photo hosts are allowed.
import { json, cors, preflight, authorized, sanitizeName, putObject } from './_utils.js';

const ALLOWED_HOSTS = ['images.unsplash.com', 'source.unsplash.com', 'images.pexels.com'];
const MAX_BYTES = 20 * 1024 * 1024;   // KV values max out at 25 MB

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));
  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));

  let b; try { b = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }
  let target;
  try { target = new URL(b.url); } catch(e){ return cors(json({ error: 'invalid url' }, 400)); }
  if(target.protocol !== 'https:' || !ALLOWED_HOSTS.includes(target.hostname)){
    return cors(json({ error: 'only Unsplash / Pexels image URLs can be imported' }, 400));
  }

  const r = await fetch(target.toString());
  if(!r.ok) return cors(json({ error: 'image fetch failed (HTTP ' + r.status + ')' }, 502));
  const ct = r.headers.get('content-type') || '';
  if(!ct.startsWith('image/')) return cors(json({ error: 'that URL is not an image' }, 400));
  const body = await r.arrayBuffer();
  if(body.byteLength > MAX_BYTES) return cors(json({ error: 'image too large' }, 413));

  const base = sanitizeName(b.name || 'wallpaper');
  const ext = (ct.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = base + '-' + Date.now() + '.' + ext;

  await putObject(env, 'images/' + path, body, ct);
  return cors(json({ path }, 201));
}
