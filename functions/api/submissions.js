// /api/submissions  (admin) — the moderation queue.
//   GET                        list pending submissions (newest first)
//   POST { id, action, … }     action = approve | reject
//
// Approving moves the image out of images/pending/ into the live library and
// appends it to the wallpaper list. Rejecting deletes the file. Either way the
// row is kept (with its ip_hash) so a repeat-infringer policy can be enforced.
import { json, cors, preflight, authorized, readList, writeList,
         getObject, putObject, deleteObject, sanitizeName } from './_utils.js';

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));
  if(!env.DB) return cors(json({ error: 'submissions database not bound' }, 503));

  if(request.method === 'GET'){
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    // join the account through so the moderator can see who actually sent it
    const rows = await env.DB.prepare(
      'SELECT s.id, s.image_path, s.name, s.category, s.tags, s.resolution, s.uploader, s.source_url, ' +
      's.ip_hash, s.status, s.created_at, s.user_id, u.email AS user_email, u.name AS user_name, u.blocked AS user_blocked ' +
      'FROM submissions s LEFT JOIN users u ON u.id = s.user_id ' +
      'WHERE s.status = ? ORDER BY s.id DESC LIMIT 200'
    ).bind(status).all();
    return cors(json({ submissions: rows.results || [] }, { headers: { 'cache-control': 'no-store' } }));
  }

  if(request.method === 'POST'){
    let b;
    try { b = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }
    const action = b && b.action;

    // repeat-infringer enforcement: suspend or restore an account
    if(action === 'block' || action === 'unblock'){
      const uid = parseInt(b && b.user_id, 10);
      if(!uid) return cors(json({ error: 'user_id is required' }, 400));
      await env.DB.prepare('UPDATE users SET blocked = ? WHERE id = ?')
        .bind(action === 'block' ? 1 : 0, uid).run();
      return cors(json({ ok: true, user_id: uid, blocked: action === 'block' }));
    }

    const id = parseInt(b && b.id, 10);
    if(!id || ['approve','reject'].indexOf(action) === -1){
      return cors(json({ error: 'id and action (approve|reject|block|unblock) are required' }, 400));
    }
    const row = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
    if(!row) return cors(json({ error: 'submission not found' }, 404));
    if(row.status !== 'pending') return cors(json({ error: 'already ' + row.status }, 409));

    if(action === 'reject'){
      try { await deleteObject(env, 'images/' + row.image_path); } catch(e){}
      await env.DB.prepare("UPDATE submissions SET status='rejected', reviewed_at=datetime('now') WHERE id = ?")
        .bind(id).run();
      return cors(json({ ok: true, status: 'rejected' }));
    }

    // ---- approve: move the file into the live library ----
    const obj = await getObject(env, 'images/' + row.image_path);
    if(!obj) return cors(json({ error: 'the submitted file is missing' }, 410));

    const name = (b.name && String(b.name).trim()) || row.name;
    const ext = (row.image_path.split('.').pop() || 'jpg').toLowerCase();
    const livePath = sanitizeName(name) + '-' + Date.now() + '.' + ext;
    await putObject(env, 'images/' + livePath, obj.body, obj.contentType);
    try { await deleteObject(env, 'images/' + row.image_path); } catch(e){}

    const tags = (b.tags && Array.isArray(b.tags) ? b.tags : String(row.tags || '').split(','))
      .map(t => String(t).trim()).filter(Boolean).slice(0, 12);
    const entry = {
      name: name.slice(0, 200),
      category: String(b.category || row.category || 'Abstract'),
      tab: 'RECENT',
      resolution: String(b.resolution || row.resolution || '3840x2160'),
      tags: tags.length ? tags : ['Wallpaper'],
      image_path: livePath,
      created_at: new Date().toISOString()
    };
    // credit the submitter on the wallpaper's page when they gave a name
    if(row.uploader) entry.credit = String(row.uploader).slice(0, 60);
    if(row.source_url) entry.source_url = String(row.source_url).slice(0, 300);

    const list = await readList(env);
    list.unshift(entry);
    await writeList(env, list);

    await env.DB.prepare(
      "UPDATE submissions SET status='approved', image_path=?, reviewed_at=datetime('now') WHERE id = ?"
    ).bind(livePath, id).run();

    return cors(json({ ok: true, status: 'approved', entry }));
  }

  return cors(json({ error: 'method not allowed' }, 405));
}
