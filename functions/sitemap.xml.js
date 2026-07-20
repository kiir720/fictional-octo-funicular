// GET /sitemap.xml — generated from the live wallpaper list so every
// wallpaper's real URL (/wallpaper/<slug>) is discoverable by search engines.
// Replaces the old static 2-URL sitemap. (The static public/sitemap.xml was
// removed so this Function is what answers the route.)
import { readList, wallpaperSlug } from './api/_utils.js';

function esc(s){ return String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c])); }

export async function onRequestGet({ env, request }){
  const origin = new URL(request.url).origin;
  const list = await readList(env);

  const urls = [];
  urls.push({ loc: origin + '/', changefreq: 'daily', priority: '1.0' });

  // newest first so freshly published wallpapers sit near the top
  list.slice().sort((a, b) => {
    const av = a.created_at || '', bv = b.created_at || '';
    return av < bv ? 1 : (av > bv ? -1 : 0);
  }).forEach(r => {
    if(!r || !r.image_path) return;
    const u = { loc: origin + '/wallpaper/' + wallpaperSlug(r), changefreq: 'weekly', priority: '0.7' };
    if(r.created_at){ const d = new Date(r.created_at); if(!isNaN(d)) u.lastmod = d.toISOString().slice(0, 10); }
    urls.push(u);
  });

  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => '  <url><loc>' + esc(u.loc) + '</loc>'
        + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '')
        + '<changefreq>' + u.changefreq + '</changefreq>'
        + '<priority>' + u.priority + '</priority></url>').join('\n')
    + '\n</urlset>\n';

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600'
    }
  });
}
