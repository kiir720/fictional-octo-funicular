// Shared pieces for the category pages: /categories and /category/<slug>.
// Underscore-prefixed, so Pages does not route this file.
//
// Why these pages exist: people search for "anime wallpapers 4k", not for one
// wallpaper's name. Before these, a category was only a filter inside the
// JavaScript gallery (and the wallpaper pages linked it as "/#q=anime", which
// Google treats as the homepage), so no URL on the site could rank for it.
import { nameSlug, wallpaperSlug, escapeHtml } from '../api/_utils.js';

export const SITE = '8K Wallpapers';
export const PER_PAGE = 48;
// Below this a category is a thin page. It still works for visitors, but it
// asks search engines not to index it and stays out of the sitemap.
export const MIN_INDEXABLE = 5;

export function catSlug(name){ return nameSlug(name); }

// One honest line per category, written about the subject rather than stuffed
// with keywords. The numbers and tags on each page come from the live library.
export const BLURBS = {
  'Abstract': 'Shapes, textures and fields of colour with no literal subject — backgrounds that stay out of the way of your icons and windows.',
  'Animals': 'Wildlife and pets, from big cats and birds of prey to the animals people share their homes with.',
  'Anime': 'Characters and scenes in anime and manga style, with the bold colour and dramatic lighting the genre is known for.',
  'Architecture': 'Buildings, bridges, interiors and skylines. Strong lines and structure suit wide screens especially well.',
  'Bikes': 'Motorcycles and bicycles — the machines, their riders and the roads they travel.',
  'Black/Dark': 'Mostly black and low-light wallpapers. On OLED and AMOLED screens black pixels are switched off entirely, so dark wallpapers look deep and use a little less power.',
  'Cars': 'Sports cars, classics and concept designs, at resolutions high enough to keep paintwork and reflections crisp.',
  'Celebrations': 'Holidays, festivals and seasonal occasions.',
  'CGI': 'Computer-generated 3D renders — shapes, materials, light and invented scenes.',
  'Cute': 'Soft colours, small creatures and kawaii-style art.',
  'Fantasy': 'Dragons, castles, magic and invented worlds.',
  'Flowers': 'Blooms, petals and gardens, in close-up and wide shots.',
  'Food': 'Food and drink, photographed or illustrated up close.',
  'Games': 'Art and scenes inspired by video games.',
  'Gradients': 'Smooth blends from one colour into another. With no fine detail to blur, gradients look clean at any resolution and keep desktop icons easy to see.',
  'Lifestyle': 'Everyday scenes and moods — desks, coffee, city life and quiet moments.',
  'Love': 'Romantic scenes, hearts and warm colour palettes.',
  'Military': 'Aircraft, ships, vehicles and other military hardware and scenes.',
  'Minimal': 'Few elements and plenty of empty space. Minimal wallpapers keep a desktop calm and leave room for icons.',
  'Movies': 'Scenes, characters and poster-style art inspired by film.',
  'Music': 'Instruments, musicians and art inspired by sound.',
  'Nature': 'Mountains, forests, lakes, coastlines and open skies — landscapes that suit a wide desktop screen.',
  'People': 'Portraits and figures, from photography to illustrated characters.',
  'Photography': 'Real photographs — landscapes, streets and details captured with a camera rather than drawn or rendered.',
  'Quotes': 'Words set against a background: short quotes and typography meant to be read at a glance.',
  'Sci-Fi': 'Spacecraft, robots, futuristic cities and other science-fiction scenes.',
  'Space': 'Planets, nebulae, galaxies and astronauts. The deep blacks of space scenes pair especially well with dark themes.',
  'Sports': 'Athletes, stadiums and action from the world of sport.',
  'Technology': 'Devices, circuits, code and hardware.',
  'World': 'Cities, landmarks and scenery from countries around the world.'
};

// -> [{ name, slug, rows }] for every category that has wallpapers,
//    rows newest first, biggest categories first
export function groupByCategory(list){
  const map = new Map();
  for(const r of (Array.isArray(list) ? list : [])){
    if(!r || !r.image_path) continue;
    const c = r.category || 'Abstract';          // same default as the wallpaper pages
    if(!map.has(c)) map.set(c, []);
    map.get(c).push(r);
  }
  for(const rows of map.values()){
    rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }
  return [...map.entries()]
    .map(([name, rows]) => ({ name, slug: catSlug(name), rows }))
    .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name));
}

// longest edge in pixels, so a portrait 2160x3840 still counts as 4K
export function longEdge(res){
  const m = /^(\d{2,5})\s*[x×]\s*(\d{2,5})/.exec(String(res || '').trim());
  return m ? Math.max(+m[1], +m[2]) : 0;
}

// resolution tiers and filler words say nothing about a category's subject
const NOT_A_SUBJECT = new Set(['4k', '5k', '8k', 'hd', 'full hd', 'fhd', 'qhd', 'uhd', '2k',
  'wallpaper', 'wallpapers', 'background', 'backgrounds', 'desktop']);
export function topTags(rows, catName, n){
  const counts = new Map();
  const skip = String(catName || '').toLowerCase();
  for(const r of rows){
    for(const t of (Array.isArray(r.tags) ? r.tags : [])){
      const k = String(t).trim();
      const low = k.toLowerCase();
      if(!k || low === skip || NOT_A_SUBJECT.has(low)) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)                   // a tag on one wallpaper is noise here
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([t]) => t);
}

// Real engagement from the D1 counters, keyed by image_path. null if the
// database is unavailable — callers then fall back to "newest".
export async function loadStats(env){
  try {
    if(!env.DB) return null;
    const res = await env.DB.prepare(
      'SELECT path, views, likes, downloads FROM stats WHERE views > 0 OR likes > 0 OR downloads > 0'
    ).all();
    const m = new Map();
    for(const r of (res.results || [])){
      m.set(r.path, { views: r.views || 0, likes: r.likes || 0, downloads: r.downloads || 0 });
    }
    return m;
  } catch(e){ return null; }
}

// A category's cover is the wallpaper visitors actually download most (then
// like, then view), not simply the newest upload — the newest is often an
// odd one out that landed in the category by mistake. A handful of views is
// too little signal to override "newest", hence the floor.
export function pickCover(rows, stats){
  let best = null, bestScore = 0;
  if(stats){
    for(const r of rows){
      const s = stats.get(r.image_path);
      if(!s) continue;
      const score = s.downloads * 10 + s.likes * 5 + s.views;
      if(score >= 5 && score > bestScore){ best = r; bestScore = score; }
    }
  }
  return best || rows[0];
}

export function thumbUrl(origin, r){ return origin + '/images/thumbs/' + encodeURI(r.image_path); }
export function fullUrl(origin, r){ return origin + '/images/' + encodeURI(r.image_path); }

// One wallpaper card. The first row loads eagerly (it is what the visitor sees
// first); the rest lazily. A missing thumbnail falls back to the original once.
export function cardHtml(r, origin, eager){
  const name = r.name || 'Wallpaper';
  const res = r.resolution || '';
  return '<a class="card" href="/wallpaper/' + escapeHtml(wallpaperSlug(r)) + '">'
    + '<img ' + (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async"'
      + ' src="' + escapeHtml(thumbUrl(origin, r)) + '" width="320" height="200"'
      + ' alt="' + escapeHtml(name + ' wallpaper' + (res ? ' in ' + res : '')) + '"'
      + ' onerror="this.onerror=null;this.src=\'' + escapeHtml(fullUrl(origin, r)) + '\'">'
    + '<span class="cap"><b>' + escapeHtml(name) + '</b>'
      + (res ? '<i>' + escapeHtml(res.replace(/x/i, ' × ')) + '</i>' : '') + '</span>'
    + '</a>';
}

// The full HTML document around a page body. Same palette, header and footer
// language as the server-rendered wallpaper and guide pages.
export function pageShell(o){
  const ld = (o.jsonld || []).map(x =>
    '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>').join('');
  return '<!DOCTYPE html><html lang="en"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + escapeHtml(o.title) + '</title>'
    + '<meta name="description" content="' + escapeHtml(o.desc) + '">'
    + '<meta name="robots" content="' + (o.robots || 'index, follow, max-image-preview:large') + '">'
    + '<meta name="theme-color" content="#0a0a0c">'
    + '<link rel="icon" href="/favicon.png" sizes="32x32">'
    + '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
    + '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
    + (o.canonical ? '<link rel="canonical" href="' + escapeHtml(o.canonical) + '">' : '')
    + '<meta property="og:type" content="website">'
    + '<meta property="og:site_name" content="' + SITE + '">'
    + '<meta property="og:title" content="' + escapeHtml(o.ogTitle || o.title) + '">'
    + '<meta property="og:description" content="' + escapeHtml(o.desc) + '">'
    + (o.canonical ? '<meta property="og:url" content="' + escapeHtml(o.canonical) + '">' : '')
    + (o.ogImage ? '<meta property="og:image" content="' + escapeHtml(o.ogImage) + '">'
        + '<meta name="twitter:card" content="summary_large_image">'
        + '<meta name="twitter:image" content="' + escapeHtml(o.ogImage) + '">' : '')
    + ld + STYLE
    + '</head><body>'
    + '<header><a class="logo" href="/"><b>8K</b> WALLPAPERS</a>'
      + '<nav><a href="/categories">Categories</a><a href="/guides">Guides</a>'
      + '<a class="allbtn" href="/">Browse all wallpapers</a></nav></header>'
    + '<main>' + o.body + '</main>'
    + '<footer><a href="/">' + SITE + '</a> — free 4K, 5K &amp; 8K wallpapers for desktop, mobile &amp; tablet.'
      + '<div class="flinks"><a href="/categories">Categories</a><a href="/guides">Guides</a>'
      + '<a href="/upload">Submit a wallpaper</a><a href="/about">About</a><a href="/privacy">Privacy</a>'
      + '<a href="/copyright">Copyright</a><a href="/contact">Contact</a></div></footer>'
    + '</body></html>';
}

export function htmlResponse(html, status){
  return new Response(html, {
    status: status || 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // a new upload shows up within five minutes
      'cache-control': status && status !== 200 ? 'no-store' : 'public, max-age=300'
    }
  });
}

// A useful 404: says what happened and offers every real category instead.
export function notFoundPage(groups, what){
  const links = groups.map(g => '<a class="chip" href="/category/' + escapeHtml(g.slug) + '">'
    + escapeHtml(g.name) + ' <em>' + g.rows.length + '</em></a>').join('');
  return htmlResponse(pageShell({
    title: 'Not found | ' + SITE,
    desc: 'That page does not exist.',
    robots: 'noindex, follow',
    body: '<h1>' + escapeHtml(what || 'Category not found') + '</h1>'
      + '<p class="lead">It may have been renamed or removed. Every category that exists is below.</p>'
      + '<div class="chips">' + links + '</div>'
  }), 404);
}

const STYLE = '<style>'
  + '*{margin:0;padding:0;box-sizing:border-box}'
  + 'body{background:#0a0a0c;color:rgba(255,255,255,.95);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.5}'
  + 'a{color:inherit;text-decoration:none}'
  + 'header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 24px;background:#121216;border-bottom:1px solid #272730;position:sticky;top:0;z-index:5}'
  + '.logo{font-size:19px;font-weight:700;white-space:nowrap}.logo b{color:#6366f1}'
  + 'header nav{display:flex;align-items:center;gap:18px;font-size:13.5px;font-weight:600}'
  + 'header nav a:not(.allbtn){color:rgba(255,255,255,.72)}header nav a:not(.allbtn):hover{color:#fff}'
  + '.allbtn{background:#1b1b21;border:1px solid #272730;padding:9px 16px;border-radius:8px}'
  + '.allbtn:hover{border-color:#6366f1}'
  + 'main{max-width:1280px;margin:0 auto;padding:22px 24px 60px}'
  + '.crumbs{color:rgba(255,255,255,.55);font-size:13px;margin-bottom:14px}.crumbs a:hover{color:#818cf8}'
  + 'h1{font-family:Georgia,"Iowan Old Style","Times New Roman",serif;font-size:clamp(26px,3.6vw,40px);font-weight:600;line-height:1.14;margin:0 0 12px}'
  + '.lead{color:#c4c8cf;font-size:15.5px;max-width:72ch;margin:0 0 10px}'
  + '.stats{color:rgba(255,255,255,.6);font-size:13.5px;margin:0 0 16px}'
  + '.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}'
  + '.chip{display:inline-flex;align-items:center;gap:7px;background:#1b1b21;border:1px solid #272730;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600}'
  + '.chip:hover{border-color:#6366f1}.chip em{font-style:normal;color:rgba(255,255,255,.5);font-size:12px}'
  + '.chip.on{background:#6366f1;border-color:#6366f1;color:#fff}.chip.on em{color:rgba(255,255,255,.75)}'
  + '.tagrow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 22px}'
  + '.tagrow .lbl{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-right:4px}'
  + '.tagrow a{color:#c4c8cf;font-size:13px;font-weight:600;padding:4px 10px;border:1px solid #272730;border-radius:8px}'
  + '.tagrow a:hover{border-color:#6366f1;color:#fff}'
  + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}'
  + '.card{position:relative;display:block;border-radius:10px;overflow:hidden;background:#1b1b21}'
  + '.card img{width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;display:block;transition:transform .35s ease}'
  + '.card:hover img{transform:scale(1.04)}'
  + '.cap{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;'
    + 'padding:28px 11px 9px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.82))}'
  + '.cap b{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.cap i{flex-shrink:0;font-style:normal;font-size:11px;font-weight:700;color:rgba(255,255,255,.72);font-variant-numeric:tabular-nums}'
  + '.pager{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin:28px 0 8px}'
  + '.pager a,.pager span{min-width:40px;text-align:center;padding:8px 13px;border-radius:8px;border:1px solid #272730;background:#1b1b21;font-size:14px;font-weight:600}'
  + '.pager a:hover{border-color:#6366f1}.pager .cur{background:#6366f1;border-color:#6366f1;color:#fff}'
  + '.more{margin-top:40px;padding-top:26px;border-top:1px solid #272730}'
  + '.more h2{font-size:18px;font-weight:700;margin:0 0 14px}'
  + '.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px}'
  + '.tile{position:relative;display:block;border-radius:10px;overflow:hidden;background:#1b1b21;aspect-ratio:16/9}'
  + '.tile img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease}'
  + '.tile:hover img{transform:scale(1.04)}'
  + '.tile .cap{padding:40px 14px 12px}.tile .cap b{font-size:17px;font-weight:700}.tile .cap i{font-size:12.5px}'
  + 'footer{text-align:center;color:rgba(255,255,255,.55);font-size:13px;padding:26px 20px;border-top:1px solid #272730}'
  + 'footer a:hover{color:#818cf8}'
  + '.flinks{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 18px;margin-top:10px}'
  + '@media(max-width:700px){header{padding:10px 16px}header nav{gap:12px}header nav a:not(.allbtn){display:none}'
    + 'main{padding:18px 16px 50px}.grid{grid-template-columns:repeat(2,1fr);gap:10px}'
    + '.tiles{grid-template-columns:repeat(2,1fr);gap:10px}.tile .cap b{font-size:14px}.cap{padding:22px 8px 7px}}'
  + '@media(prefers-reduced-motion:reduce){.card img,.tile img{transition:none}}'
  + '</style>';
