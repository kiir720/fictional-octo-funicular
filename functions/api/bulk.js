// POST /api/bulk  (admin) — update many wallpapers in ONE write.
// Body: { updates: [ { image_path, category?, tags?, name? }, … ] }
//
// The per-wallpaper PATCH rewrites the whole list document each time, so
// retagging 1000+ wallpapers one-by-one would burn straight through Workers
// KV's 1000-writes-per-day free limit and fail halfway. This applies a whole
// batch against a single read/write cycle.
import { json, cors, preflight, authorized, readList, writeList, deleteObject } from './_utils.js';

const MAX_UPDATES = 500;
const MAX_DELETES = 600;
// Purging files costs 2 KV deletes each (image + thumbnail) and KV's free tier
// allows 1000 writes/day, so file removal is capped per call and reported back.
const MAX_FILE_PURGE = 150;

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));
  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));

  let body;
  try { body = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }

  // ---- bulk delete: { deletes: [image_path…], purgeFiles?: bool } ----
  // Taking entries out of the list is ONE write and makes them instantly gone
  // from the site. Deleting the stored files is separate and rate-limited.
  if(body && Array.isArray(body.deletes)){
    const paths = body.deletes.map(p => String(p || '')).filter(Boolean).slice(0, MAX_DELETES);
    if(!paths.length) return cors(json({ error: 'deletes[] was empty' }, 400));
    const list = await readList(env);
    const drop = new Set(paths);
    const next = list.filter(r => !(r && drop.has(r.image_path)));
    const removed = list.length - next.length;
    if(removed) await writeList(env, next);

    let filesDeleted = 0, filesPending = 0;
    if(body.purgeFiles){
      for(const p of paths){
        if(filesDeleted >= MAX_FILE_PURGE){ filesPending++; continue; }
        try { await deleteObject(env, 'images/' + p); } catch(e){}
        try { await deleteObject(env, 'images/thumbs/' + p); } catch(e){}
        filesDeleted++;
      }
    } else {
      filesPending = paths.length;
    }
    return cors(json({ removed, filesDeleted, filesPending, remaining: next.length }));
  }

  const updates = body && Array.isArray(body.updates) ? body.updates : null;
  if(!updates || !updates.length) return cors(json({ error: 'updates[] required' }, 400));
  if(updates.length > MAX_UPDATES) return cors(json({ error: 'too many updates (max ' + MAX_UPDATES + ')' }, 413));

  const list = await readList(env);
  const byPath = new Map();
  list.forEach(row => { if(row && row.image_path) byPath.set(row.image_path, row); });

  let updated = 0, missing = 0;
  for(const u of updates){
    const row = u && u.image_path ? byPath.get(u.image_path) : null;
    if(!row){ missing++; continue; }
    if(typeof u.name === 'string' && u.name.trim()) row.name = u.name.trim().slice(0, 200);
    if(typeof u.category === 'string' && u.category.trim()) row.category = u.category.trim();
    if(Array.isArray(u.tags)){
      const tags = u.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 12);
      if(tags.length) row.tags = tags;
    }
    updated++;
  }

  if(updated) await writeList(env, list);
  return cors(json({ updated, missing, total: list.length }));
}
