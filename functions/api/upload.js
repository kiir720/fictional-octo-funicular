// POST /api/upload?name=<original filename>  (admin)
//   Body: raw image bytes. Stores the file and returns { path } — the caller
//   then records that path via POST /api/wallpapers.
// POST /api/upload?thumb=<existing path>  (admin)
//   Stores a small grid thumbnail for an already-uploaded image at
//   images/thumbs/<existing path>; the public grid loads that instead of the
//   full-size original.
import { json, cors, preflight, authorized, sanitizeName, putObject } from './_utils.js';

const MAX_BYTES = 15 * 1024 * 1024;   // matches the admin page's upload cap (KV allows 25 MB)

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));
  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));

  const ct = request.headers.get('content-type') || '';
  if(!ct.startsWith('image/')) return cors(json({ error: 'content-type must be image/*' }, 400));

  const body = await request.arrayBuffer();
  if(body.byteLength < 100) return cors(json({ error: 'file is empty' }, 400));
  if(body.byteLength > MAX_BYTES) return cors(json({ error: 'file too large (max 15 MB)' }, 413));

  const url = new URL(request.url);

  // thumbnail for an existing image — stored under a fixed derived key
  const thumbFor = url.searchParams.get('thumb');
  if(thumbFor){
    const target = String(thumbFor).replace(/[\/\\]/g, '').replace(/[^a-zA-Z0-9._-]/g, '');
    if(!target) return cors(json({ error: 'bad thumb target' }, 400));
    const path = 'thumbs/' + target;
    await putObject(env, 'images/' + path, body, ct);
    return cors(json({ path }, 201));
  }

  const base = sanitizeName((url.searchParams.get('name') || 'wallpaper').replace(/\.[^.]+$/, ''));
  const ext = (ct.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = base + '-' + Date.now() + '.' + ext;

  await putObject(env, 'images/' + path, body, ct);
  return cors(json({ path }, 201));
}
