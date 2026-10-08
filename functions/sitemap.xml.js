// GET /sitemap.xml — generated from the live wallpaper list so every
// wallpaper's real URL (/wallpaper/<slug>) is discoverable by search engines.
// Replaces the old static 2-URL sitemap. (The static public/sitemap.xml was
// removed so this Function is what answers the route.)
import { readList, wallpaperSlug } from './api/_utils.js';
import { groupByCategory, MIN_INDEXABLE, groupByTag, TAG_MIN_INDEX } from './category/_shared.js';

function esc(s){ return String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c])); }

export async function onRequestGet({ env, request }){
  const origin = new URL(request.url).origin;
  const list = await readList(env);

  const urls = [];
  urls.push({ loc: origin + '/', changefreq: 'daily', priority: '1.0' });
  // the legal pages are real crawlable URLs now, so list them too
  ['about', 'privacy', 'tos', 'copyright', 'contact'].forEach(p => {
    urls.push({ loc: origin + '/' + p, changefreq: 'yearly', priority: '0.3' });
  });
  urls.push({ loc: origin + '/upload', changefreq: 'monthly', priority: '0.5' });
  // written guides — real editorial pages, worth crawling often
  urls.push({ loc: origin + '/guides', changefreq: 'monthly', priority: '0.8' });
  ['wallpaper-resolution','4k-5k-8k-explained','how-to-set-a-wallpaper',
   'ultrawide-and-multi-monitor','why-wallpapers-look-blurry'].forEach(g => {
    urls.push({ loc: origin + '/guides/' + g, changefreq: 'monthly', priority: '0.8' });
  });

  // category pages: the ones people actually search for ("anime wallpapers").
  // Thin categories are noindex on the page itself, so they stay out of here.
  const day = s => { const d = new Date(s || ''); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
  const groups = groupByCategory(list);
  urls.push({ loc: origin + '/categories', changefreq: 'weekly', priority: '0.8',
    lastmod: groups.length ? groups.map(g => day(g.rows[0].created_at)).sort().pop() : '' });
  groups.filter(g => g.rows.length >= MIN_INDEXABLE).forEach(g => {
    urls.push({ loc: origin + '/category/' + g.slug, changefreq: 'daily', priority: '0.9',
      lastmod: day(g.rows[0].created_at) });
  });
  // tag pages ("samurai", "blue"…) — only the substantial ones, which are the
  // ones whose pages ask to be indexed
  [...groupByTag(list, new Set(groups.map(g => g.slug))).values()]
    .filter(t => t.rows.length >= TAG_MIN_INDEX)
    .sort((a, b) => b.rows.length - a.rows.length)
    .forEach(t => {
      urls.push({ loc: origin + '/tag/' + t.slug, changefreq: 'weekly', priority: '0.8',
        lastmod: day(t.rows[0].created_at) });
    });

  // newest first so freshly published wallpapers sit near the top. Each one
  // also names its image, which is how Google Images finds the file itself.
  list.slice().sort((a, b) => {
    const av = a.created_at || '', bv = b.created_at || '';
    return av < bv ? 1 : (av > bv ? -1 : 0);
  }).forEach(r => {
    if(!r || !r.image_path) return;
    urls.push({
      loc: origin + '/wallpaper/' + wallpaperSlug(r), changefreq: 'weekly', priority: '0.7',
      lastmod: day(r.created_at),
      image: origin + '/images/' + encodeURI(r.image_path)
    });
  });

  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    + ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    + urls.map(u => '  <url><loc>' + esc(u.loc) + '</loc>'
        + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '')
        + '<changefreq>' + u.changefreq + '</changefreq>'
        + '<priority>' + u.priority + '</priority>'
        + (u.image ? '<image:image><image:loc>' + esc(u.image) + '</image:loc></image:image>' : '')
        + '</url>').join('\n')
    + '\n</urlset>\n';

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600'
    }
  });
}
