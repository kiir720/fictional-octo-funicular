// GET /wallpaper/<slug> — a real, crawlable HTML page per wallpaper.
// Server-rendered, so Google (and link-preview bots) see full content and
// metadata without running any JavaScript. This is what makes the site's
// 1000+ wallpapers indexable — the hash-routed SPA never was.
import { readList, wallpaperSlug, nameSlug, idOf, escapeHtml } from '../api/_utils.js';

const SITE = '8K Wallpapers';

export async function onRequestGet(context){
  const { params, env, request } = context;
  const origin = new URL(request.url).origin;
  const slug = (Array.isArray(params.slug) ? params.slug.join('/') : String(params.slug || '')).toLowerCase();

  const list = await readList(env);
  let row = null;
  // prefer the unique trailing id (…-1783742575595); fall back to the name slug
  const idm = slug.match(/-(\d{6,})$/);
  if(idm) row = list.find(r => idOf(r.image_path) === idm[1]);
  if(!row) row = list.find(r => wallpaperSlug(r).toLowerCase() === slug)
             || list.find(r => nameSlug(r.name) === slug);

  if(!row){
    return new Response(render404(origin), {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }
  return new Response(renderPage(row, list, origin), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
}

function renderPage(row, list, origin){
  const name = row.name || 'Wallpaper';
  const category = row.category || 'Abstract';
  const resolution = row.resolution || '3840x2160';
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const path = row.image_path;
  const canonical = origin + '/wallpaper/' + wallpaperSlug(row);
  const imgFull = origin + '/images/' + encodeURI(path);
  const imgThumb = origin + '/images/thumbs/' + encodeURI(path);
  const created = row.created_at ? new Date(row.created_at) : null;
  const dateStr = created && !isNaN(created)
    ? created.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '';

  const title = name + ' — ' + category + ' Wallpaper (' + resolution + ') | ' + SITE;
  const desc = 'Download ' + name + ' in ' + resolution + ' for free. A high-quality '
    + category + ' wallpaper for desktop, mobile, iPhone and iPad'
    + (tags.length ? ' — ' + tags.slice(0, 6).join(', ') + '.' : '.');

  // related wallpapers: same category first, then fill from the rest
  const same = list.filter(r => r !== row && r.category === category);
  const other = list.filter(r => r !== row && r.category !== category);
  const related = same.concat(other).slice(0, 12);
  const relHtml = related.map(r => {
    const rp = '/wallpaper/' + wallpaperSlug(r);
    const rt = origin + '/images/thumbs/' + encodeURI(r.image_path);
    const rf = origin + '/images/' + encodeURI(r.image_path);
    // if a thumbnail is ever missing, fall back to the full image (no CSP here)
    return '<a class="rel" href="' + escapeHtml(rp) + '">'
      + '<img loading="lazy" src="' + escapeHtml(rt) + '" alt="' + escapeHtml(r.name || '') + ' wallpaper" width="320" height="200"'
      + ' onerror="this.onerror=null;this.src=\'' + escapeHtml(rf) + '\'">'
      + '<span>' + escapeHtml(r.name || '') + '</span></a>';
  }).join('');

  const tagHtml = tags.map(t =>
    '<a class="tag" href="/#q=' + encodeURIComponent(String(t).toLowerCase()) + '">'
    + '<span class="hash">#</span>' + escapeHtml(t) + '</a>').join('');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: name,
    description: desc,
    contentUrl: imgFull,
    thumbnailUrl: imgThumb,
    caption: name,
    representativeOfPage: true,
    isFamilyFriendly: true,
    license: origin + '/#copyright',
    acquireLicensePage: canonical,
    creditText: SITE,
    datePublished: row.created_at || undefined
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type':'ListItem', position:1, name:'Home', item: origin + '/' },
      { '@type':'ListItem', position:2, name: category + ' Wallpapers', item: origin + '/#q=' + encodeURIComponent(category.toLowerCase()) },
      { '@type':'ListItem', position:3, name: name, item: canonical }
    ]
  };

  return '<!DOCTYPE html><html lang="en"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + escapeHtml(title) + '</title>'
    + '<meta name="description" content="' + escapeHtml(desc) + '">'
    + '<meta name="robots" content="index, follow, max-image-preview:large">'
    + '<meta name="theme-color" content="#0f1116">'
    + '<link rel="canonical" href="' + escapeHtml(canonical) + '">'
    + '<meta property="og:type" content="article">'
    + '<meta property="og:site_name" content="' + SITE + '">'
    + '<meta property="og:title" content="' + escapeHtml(name + ' — ' + category + ' Wallpaper') + '">'
    + '<meta property="og:description" content="' + escapeHtml(desc) + '">'
    + '<meta property="og:url" content="' + escapeHtml(canonical) + '">'
    + '<meta property="og:image" content="' + escapeHtml(imgFull) + '">'
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:title" content="' + escapeHtml(name + ' — ' + category + ' Wallpaper') + '">'
    + '<meta name="twitter:description" content="' + escapeHtml(desc) + '">'
    + '<meta name="twitter:image" content="' + escapeHtml(imgFull) + '">'
    + '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>'
    + '<script type="application/ld+json">' + JSON.stringify(breadcrumb) + '</script>'
    + STYLE
    + '</head><body>'
    + '<header><a class="logo" href="/"><b>8K</b> WALLPAPERS</a>'
      + '<a class="allbtn" href="/">Browse all wallpapers</a></header>'
    + '<main>'
      + '<nav class="crumbs"><a href="/">Home</a> / '
        + '<a href="/#q=' + encodeURIComponent(category.toLowerCase()) + '">' + escapeHtml(category) + '</a> / '
        + '<span>' + escapeHtml(name) + '</span></nav>'
      + '<h1>' + escapeHtml(name) + ' Wallpaper</h1>'
      + '<p class="lead">' + escapeHtml(desc) + '</p>'
      + '<a class="stage" href="' + escapeHtml(imgFull) + '" title="View full size">'
        + '<img src="' + escapeHtml(imgFull) + '" alt="' + escapeHtml(name + ' — ' + category + ' wallpaper in ' + resolution) + '"></a>'
      + '<a class="download" href="' + escapeHtml(imgFull) + '" download>'
        + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M7 10l5 5 5-5M5 20h14"/></svg>'
        + ' Download Original (' + escapeHtml(resolution) + ')</a>'
      + '<div class="meta">'
        + '<div class="mrow"><span class="ml">Category</span>'
          + '<a class="chip" href="/#q=' + encodeURIComponent(category.toLowerCase()) + '">' + escapeHtml(category) + '</a></div>'
        + (tags.length ? '<div class="mrow"><span class="ml">Tags</span><div class="tags">' + tagHtml + '</div></div>' : '')
        + '<div class="mrow"><span class="ml">Resolution</span><span class="v">' + escapeHtml(resolution) + '</span></div>'
        + (dateStr ? '<div class="mrow"><span class="ml">Added</span><span class="v">' + escapeHtml(dateStr) + '</span></div>' : '')
      + '</div>'
      + (relHtml ? '<section class="related"><h2>Related Wallpapers</h2><div class="relgrid">' + relHtml + '</div></section>' : '')
    + '</main>'
    + '<footer><a href="/">' + SITE + '</a> — free 4K, 5K &amp; 8K wallpapers for desktop, mobile &amp; tablet. '
      + '<a href="/#about">About</a> · <a href="/#privacy">Privacy</a> · <a href="/#copyright">Copyright</a></footer>'
    + '</body></html>';
}

function render404(origin){
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>Wallpaper not found | ' + SITE + '</title>'
    + '<meta name="robots" content="noindex">' + STYLE + '</head><body>'
    + '<header><a class="logo" href="/"><b>8K</b> WALLPAPERS</a></header>'
    + '<main><h1>Wallpaper not found</h1>'
    + '<p class="lead">This wallpaper may have been removed. Browse the full gallery instead.</p>'
    + '<a class="download" href="/">Browse all wallpapers</a></main></body></html>';
}

const STYLE = '<style>'
  + '*{margin:0;padding:0;box-sizing:border-box}'
  + 'body{background:#0f1116;color:rgba(255,255,255,.95);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.5}'
  + 'a{color:inherit;text-decoration:none}'
  + 'header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 28px;background:#171a21;border-bottom:1px solid #2b303c;position:sticky;top:0;z-index:5}'
  + '.logo{font-size:22px;font-weight:800}.logo b{color:#6366f1}'
  + '.allbtn{background:#21252f;border:1px solid #2b303c;padding:9px 16px;border-radius:100px;font-size:13px;font-weight:600}'
  + '.allbtn:hover{border-color:#6366f1}'
  + 'main{max-width:1100px;margin:0 auto;padding:26px 24px 60px}'
  + '.crumbs{color:rgba(255,255,255,.55);font-size:13px;margin-bottom:14px}.crumbs a:hover{color:#818cf8}'
  + 'h1{font-size:26px;font-weight:800;letter-spacing:-.3px;margin-bottom:8px}'
  + '.lead{color:#c4c8cf;font-size:15px;max-width:80ch;margin-bottom:20px}'
  + '.stage{display:block;border-radius:14px;overflow:hidden;border:1px solid #2b303c;background:#21252f;line-height:0}'
  + '.stage img{width:100%;height:auto;display:block}'
  + '.download{display:flex;align-items:center;justify-content:center;gap:10px;margin:20px 0;padding:16px;border-radius:12px;'
    + 'background:#6366f1;color:#fff;font-size:15px;font-weight:700}'
  + '.download:hover{box-shadow:0 10px 24px rgba(99,102,241,.4)}'
  + '.download svg{width:20px;height:20px;stroke:currentColor;stroke-width:1.75;fill:none;stroke-linecap:round;stroke-linejoin:round}'
  + '.meta{display:flex;flex-direction:column;gap:12px;margin:8px 0 30px}'
  + '.mrow{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}'
  + '.ml{width:90px;flex-shrink:0;font-size:13px;font-weight:700;color:rgba(255,255,255,.55)}'
  + '.v{color:#c4c8cf;font-size:14px}'
  + '.chip,.tag{display:inline-block;background:#21252f;border:1px solid #2b303c;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;margin:0 4px 4px 0}'
  + '.chip:hover,.tag:hover{border-color:#6366f1}.tag .hash{color:#6366f1;font-weight:700}'
  + '.tags{display:flex;flex-wrap:wrap}'
  + '.related{margin-top:10px}.related h2{font-size:18px;font-weight:700;margin-bottom:16px}'
  + '.relgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}'
  + '.rel{display:block;border-radius:12px;overflow:hidden;background:#171a21;border:1px solid #2b303c}'
  + '.rel:hover{border-color:#6366f1}'
  + '.rel img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;background:#21252f}'
  + '.rel span{display:block;padding:9px 11px;font-size:12.5px;color:#c4c8cf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + 'footer{text-align:center;color:rgba(255,255,255,.55);font-size:13px;padding:26px;border-top:1px solid #2b303c}'
  + 'footer a:hover{color:#818cf8}'
  + '@media(max-width:820px){.relgrid{grid-template-columns:repeat(2,1fr)}}'
  + '</style>';
