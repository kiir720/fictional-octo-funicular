// /api/wallpapers — the wallpaper list.
//   GET            public: returns the full list (newest first)
//   POST   (admin) add an entry     { name, category, tab, resolution, tags, image_path }
//   PATCH  (admin) rename an entry  { image_path, name }
//   DELETE (admin) remove an entry  { image_path }  (also deletes its R2 image)
import { json, cors, preflight, authorized, readList, writeList, deleteObject } from './_utils.js';

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();

  if(request.method === 'GET'){
    const list = await readList(env);
    // no-store: publishes must show up immediately, not after a CDN TTL
    return cors(json(list, { headers: { 'cache-control': 'no-store' } }));
  }

  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));
  const list = await readList(env);

  if(request.method === 'POST'){
    let row; try { row = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }
    if(!row || !row.name || !row.image_path) return cors(json({ error: 'name and image_path are required' }, 400));
    const entry = {
      name: String(row.name).slice(0, 200),
      category: String(row.category || 'Abstract'),
      tab: String(row.tab || 'RECENT'),
      resolution: String(row.resolution || '3840x2160'),
      tags: Array.isArray(row.tags) && row.tags.length ? row.tags.map(t=>String(t).slice(0,50)).slice(0,20) : ['Wallpaper'],
      image_path: String(row.image_path),
      created_at: new Date().toISOString()
    };
    list.unshift(entry);
    await writeList(env, list);
    return cors(json(entry, 201));
  }

  if(request.method === 'PATCH'){
    let b; try { b = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }
    const row = list.find(r => r.image_path === b.image_path);
    if(!row) return cors(json({ error: 'not found' }, 404));
    if(b.name) row.name = String(b.name).slice(0, 200);
    await writeList(env, list);
    return cors(json(row));
  }

  if(request.method === 'DELETE'){
    let b; try { b = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }
    const next = list.filter(r => r.image_path !== b.image_path);
    if(next.length === list.length) return cors(json({ error: 'not found' }, 404));
    await writeList(env, next);
    try { await deleteObject(env, 'images/' + b.image_path); } catch(e){ /* best-effort */ }
    return cors(json({ ok: true }));
  }

  return cors(json({ error: 'method not allowed' }, 405));
}
