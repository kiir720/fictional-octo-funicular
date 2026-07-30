// /api/stats — global view / like / dislike counters (D1-backed).
//   GET   public: { "<image_path>": { v, l, d }, … } for every wallpaper
//   POST  public: { path, action } where action is
//         view | like | unlike | dislike | undislike
//
// D1 rather than KV: KV's free tier allows 1000 writes/day, which a like
// button would burn through; D1 allows 100k. The browser dedupes (one view
// and one vote per wallpaper per browser), so writes stay proportional to
// real people rather than page loads.
import { json, cors, preflight } from './_utils.js';

const ACTIONS = {
  view:      'views = views + 1',
  like:      'likes = likes + 1',
  unlike:    'likes = MAX(likes - 1, 0)',
  dislike:   'dislikes = dislikes + 1',
  undislike: 'dislikes = MAX(dislikes - 1, 0)'
};

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(!env.DB) return cors(json({ error: 'stats database not bound' }, 503));

  if(request.method === 'GET'){
    const rows = await env.DB.prepare(
      'SELECT path, views, likes, dislikes FROM stats WHERE views>0 OR likes>0 OR dislikes>0'
    ).all();
    const out = {};
    for(const r of (rows.results || [])) out[r.path] = { v: r.views, l: r.likes, d: r.dislikes };
    return cors(json(out, { headers: { 'cache-control': 'public, max-age=30' } }));
  }

  if(request.method === 'POST'){
    let body;
    try { body = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }
    const path = body && typeof body.path === 'string' ? body.path.slice(0, 300) : '';
    const set = ACTIONS[body && body.action];
    if(!path || !set) return cors(json({ error: 'path and a valid action are required' }, 400));

    // one statement: create the row if new, otherwise apply the delta
    await env.DB.prepare(
      'INSERT INTO stats (path, views, likes, dislikes) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(path) DO UPDATE SET ' + set
    ).bind(
      path,
      body.action === 'view' ? 1 : 0,
      body.action === 'like' ? 1 : 0,
      body.action === 'dislike' ? 1 : 0
    ).run();

    const row = await env.DB.prepare('SELECT views, likes, dislikes FROM stats WHERE path = ?')
      .bind(path).first();
    return cors(json({ v: (row && row.views) || 0, l: (row && row.likes) || 0, d: (row && row.dislikes) || 0 }));
  }

  return cors(json({ error: 'method not allowed' }, 405));
}
