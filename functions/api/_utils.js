// Shared helpers for the wallpaper API (Cloudflare Pages Functions).
// Files starting with "_" are not routed as endpoints.

export function json(data, init){
  init = typeof init === 'number' ? { status: init } : (init || {});
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status: init.status || 200, headers });
}

// The admin page runs from a local file on the admin's PC (Origin "null"), so
// the API must answer cross-origin requests. The X-Admin-Key header is the
// protection, not the origin.
export function cors(res){
  res.headers.set('access-control-allow-origin', '*');
  res.headers.set('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.headers.set('access-control-allow-headers', 'Content-Type, X-Admin-Key');
  res.headers.set('access-control-max-age', '86400');
  return res;
}

export function preflight(){ return cors(new Response(null, { status: 204 })); }

export function authorized(request, env){
  const key = (request.headers.get('x-admin-key') || '').trim();
  // trim the stored secret too — pasting/piping it in can smuggle a stray newline
  const secret = String(env.ADMIN_KEY || '').trim();
  return !!secret && key === secret;
}

// ---- Object storage: Workers KV (binding STORE) ----
// All binary access goes through these three helpers so that a future move to
// R2 (10 GB free tier, needs a card) only means rewriting this section.
// KV limits that matter here: values up to 25 MB, 1 GB total, 100k reads/day.

export async function putObject(env, key, body, contentType){
  await env.STORE.put(key, body, { metadata: { contentType: contentType || 'application/octet-stream' } });
}

// -> { body: ArrayBuffer, contentType } | null
export async function getObject(env, key){
  const { value, metadata } = await env.STORE.getWithMetadata(key, { type: 'arrayBuffer' });
  if(value === null) return null;
  return { body: value, contentType: (metadata && metadata.contentType) || 'application/octet-stream' };
}

export async function deleteObject(env, key){
  await env.STORE.delete(key);
}

// The whole wallpaper list is one JSON document — same shape the old GitHub
// wallpapers.json had, so the row format is unchanged:
// { name, category, tab, resolution, tags[], image_path, created_at }
const LIST_KEY = 'meta/wallpapers.json';

export async function readList(env){
  try {
    const data = await env.STORE.get(LIST_KEY, { type: 'json' });
    return Array.isArray(data) ? data : [];
  } catch(e){ return []; }
}

export async function writeList(env, list){
  await env.STORE.put(LIST_KEY, JSON.stringify(list, null, 2));
}

export function sanitizeName(s){
  return String(s || 'wallpaper').replace(/[^a-z0-9.-]+/gi, '-')
    .replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'wallpaper';
}

// ---- SEO URLs: one crawlable page per wallpaper at /wallpaper/<slug> ----
// The slug is the name plus the upload timestamp already baked into image_path,
// so it's keyword-rich AND guaranteed unique (two same-named wallpapers differ).
export function nameSlug(s){
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function idOf(image_path){
  const m = String(image_path || '').match(/(\d{6,})(?=\.[a-z0-9]+$)/i);
  return m ? m[1] : '';
}
export function wallpaperSlug(row){
  const base = nameSlug(row && row.name) || 'wallpaper';
  const id = idOf(row && row.image_path);
  return id ? base + '-' + id : base;
}
export function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
