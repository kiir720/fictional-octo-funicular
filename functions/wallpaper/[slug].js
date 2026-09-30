// GET /wallpaper/<slug> — a real, crawlable HTML page per wallpaper.
// Server-rendered, so Google (and link-preview bots) see full content and
// metadata without running any JavaScript. This is what makes the site's
// 1000+ wallpapers indexable — the hash-routed SPA never was.
import { readList, wallpaperSlug, nameSlug, idOf, escapeHtml } from '../api/_utils.js';

const SITE = '8K Wallpapers';

// the 8K wordmark, same set of icons the gallery page links
const ICONS = '<link rel="icon" href="/favicon.png" sizes="32x32">'
  + '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
  + '<link rel="apple-touch-icon" href="/apple-touch-icon.png">';

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

// "3840x2160" -> ' width="3840" height="2160"', so the browser reserves the
// space before the image arrives and nothing below it jumps
function dimsAttr(res){
  const m = /^(\d{2,5})\s*[x\u00d7]\s*(\d{2,5})$/.exec(String(res || '').trim());
  return m ? ' width="' + m[1] + '" height="' + m[2] + '"' : '';
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
    + ICONS
    + '<link rel="canonical" href="' + escapeHtml(canonical) + '">'
    + '<meta property="og:type" content="article">'
    + '<meta property="og:site_name" content="' + SITE + '">'
    + '<meta property="og:title" content="' + escapeHtml(name + ' — ' + category + ' Wallpaper') + '">'
    + '<meta property="og:description" content="' + escapeHtml(desc) + '">'
    + '<meta property="og:url" content="' + escapeHtml(canonical) + '">'
    // Share previews use the 640px thumbnail: X refuses images over 5 MB and
    // Facebook over 8 MB, and many originals here are around 10 MB.
    + '<meta property="og:image" content="' + escapeHtml(imgThumb) + '">'
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:title" content="' + escapeHtml(name + ' — ' + category + ' Wallpaper') + '">'
    + '<meta name="twitter:description" content="' + escapeHtml(desc) + '">'
    + '<meta name="twitter:image" content="' + escapeHtml(imgThumb) + '">'
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
      + '<a class="stage" href="' + escapeHtml(imgFull) + '" title="View full size">'
        // The full image stays the src (it's what Google Images indexes); the
        // thumbnail sits behind it so the stage shows a picture straight away.
        + '<img src="' + escapeHtml(imgFull) + '"' + dimsAttr(row.resolution)
          + ' fetchpriority="high" decoding="async"'
          + ' style="background:#1b1b21 url(&quot;' + escapeHtml(imgThumb) + '&quot;) center/contain no-repeat"'
          + ' onload="this.style.backgroundImage=\'none\'"'
          + ' alt="' + escapeHtml(name + ' — ' + category + ' wallpaper in ' + resolution) + '"></a>'
      + '<div class="dt-head">'
        + '<div class="dt-head-main">'
          + '<div class="dt-eyebrow">' + escapeHtml(category) + '</div>'
          + '<h1 class="dt-title">' + escapeHtml(name) + '</h1>'
          + '<p class="lead">' + escapeHtml(desc) + '</p>'
        + '</div>'
        + '<div class="dt-dims"><div class="dt-dims-val">' + escapeHtml(resolution.replace('x', ' × ')) + '</div>'
          + '<div class="dt-dims-lbl">PIXELS</div></div>'
      + '</div>'
      + '<a class="download" href="' + escapeHtml(imgFull) + '" download>'
        + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M7 10l5 5 5-5M5 20h14"/></svg>'
        + ' Download Original (' + escapeHtml(resolution) + ')</a>'
      + '<div class="meta">'
        + '<div class="mrow"><span class="ml">Category</span>'
          + '<a class="chip" href="/#q=' + encodeURIComponent(category.toLowerCase()) + '">' + escapeHtml(category) + '</a></div>'
        + (tags.length ? '<div class="mrow"><span class="ml">Tags</span><div class="tags">' + tagHtml + '</div></div>' : '')
        + (dateStr ? '<div class="mrow"><span class="ml">Added</span><span class="v">' + escapeHtml(dateStr) + '</span></div>' : '')
      + '</div>'
      + '<a class="report" href="/report?id=' + encodeURIComponent(path) + '">'
        + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-1.5 3.5L16 11H5"/></svg> Report Image</a>'
      + (relHtml ? '<section class="related"><h2>Related Wallpapers</h2><div class="relgrid">' + relHtml + '</div></section>' : '')
    + '</main>'
    + '<footer><a href="/">' + SITE + '</a> — free 4K, 5K &amp; 8K wallpapers for desktop, mobile &amp; tablet. '
      + '<a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/copyright">Copyright</a></footer>'
    + '</body></html>';
}

function render404(origin){
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>Wallpaper not found | ' + SITE + '</title>'
    + '<meta name="robots" content="noindex">' + ICONS + STYLE + '</head><body>'
    + '<header><a class="logo" href="/"><b>8K</b> WALLPAPERS</a></header>'
    + '<main><h1>Wallpaper not found</h1>'
    + '<p class="lead">This wallpaper may have been removed. Browse the full gallery instead.</p>'
    + '<a class="download" href="/">Browse all wallpapers</a></main></body></html>';
}

// Same visual language as the interactive detail view in wallpapers.html
// (dt-head eyebrow/serif-title/dims panel) — this page is the one a fresh
// load or a refresh actually hits, so it has to look like the same site.
const STYLE = '<style>'
  + '*{margin:0;padding:0;box-sizing:border-box}'
  + 'body{background:#0a0a0c;color:rgba(255,255,255,.95);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.5}'
  + 'a{color:inherit;text-decoration:none}'
  + 'header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 24px;background:#121216;border-bottom:1px solid #272730;position:sticky;top:0;z-index:5}'
  + '.logo{font-size:19px;font-weight:700}.logo b{color:#6366f1}'
  + '.allbtn{background:#1b1b21;border:1px solid #272730;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600}'
  + '.allbtn:hover{border-color:#6366f1}'
  + 'main{max-width:1100px;margin:0 auto;padding:26px 24px 60px}'
  + '.crumbs{color:rgba(255,255,255,.55);font-size:13px;margin-bottom:14px}.crumbs a:hover{color:#818cf8}'
  + '.stage{display:block;border-radius:10px;overflow:hidden;border:1px solid #272730;background:#1b1b21;line-height:0}'
  + '.stage img{width:100%;height:auto;display:block}'
  // ---- title panel: eyebrow / serif title / description, dims off to the right ----
  + '.dt-head{max-width:100%;margin:22px 0 0;padding:24px 26px;background:#121216;border:1px solid #272730;'
    + 'border-radius:10px;display:flex;align-items:center;gap:30px}'
  + '.dt-head-main{flex:1;min-width:0}'
  + '.dt-eyebrow{font-size:11px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;color:rgba(255,255,255,.58);'
    + 'padding-bottom:7px;margin-bottom:13px;border-bottom:2px solid #6366f1;display:inline-block}'
  + '.dt-title{font-family:Georgia,"Iowan Old Style","Times New Roman",serif;font-size:clamp(24px,3.4vw,38px);'
    + 'font-weight:600;line-height:1.14;letter-spacing:.2px;color:#fff;margin:0 0 12px}'
  + '.lead{color:#c4c8cf;font-size:15px;max-width:62ch;margin:0}'
  + '.dt-dims{flex-shrink:0;text-align:right;padding-left:30px;border-left:1px solid #272730}'
  + '.dt-dims-val{font-size:19px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:.4px}'
  + '.dt-dims-lbl{margin-top:5px;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:rgba(255,255,255,.58)}'
  + '@media(max-width:700px){.dt-head{flex-direction:column;align-items:flex-start;gap:16px;padding:20px}'
    + '.dt-dims{border-left:none;border-top:1px solid #272730;padding:14px 0 0;text-align:left;width:100%}}'
  + '.download{display:flex;align-items:center;justify-content:center;gap:10px;margin:20px 0;padding:15px;border-radius:10px;'
    + 'background:#6366f1;color:#fff;font-size:15px;font-weight:700}'
  + '.download:hover{background:#4f46e5}'
  + '.download svg{width:20px;height:20px;stroke:currentColor;stroke-width:1.75;fill:none;stroke-linecap:round;stroke-linejoin:round}'
  + '.meta{display:flex;flex-direction:column;gap:12px;margin:8px 0 6px}'
  + '.mrow{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}'
  + '.ml{width:90px;flex-shrink:0;font-size:13px;font-weight:700;color:rgba(255,255,255,.55)}'
  + '.v{color:#c4c8cf;font-size:14px}'
  + '.chip,.tag{display:inline-block;background:#1b1b21;border:1px solid #272730;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;margin:0 4px 4px 0}'
  + '.chip:hover,.tag:hover{border-color:#6366f1}.tag .hash{color:#6366f1;font-weight:700}'
  + '.tags{display:flex;flex-wrap:wrap}'
  + '.report{display:inline-flex;align-items:center;gap:7px;color:rgba(255,255,255,.55);font-size:13px;font-weight:600;margin:14px 0 26px}'
  + '.report:hover{color:#fff}.report svg{width:15px;height:15px;stroke:currentColor;stroke-width:1.9;fill:none;stroke-linecap:round;stroke-linejoin:round}'
  + '.related{margin-top:10px}.related h2{font-size:18px;font-weight:700;margin-bottom:16px}'
  + '.relgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}'
  + '.rel{position:relative;display:block;border-radius:10px;overflow:hidden;background:#1b1b21}'
  + '.rel:hover img{transform:scale(1.04)}'
  + '.rel img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;background:#1b1b21;transition:transform .35s ease}'
  + '.rel span{position:absolute;left:0;right:0;bottom:0;padding:26px 10px 8px;font-size:12.5px;font-weight:600;color:#fff;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.8));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + 'footer{text-align:center;color:rgba(255,255,255,.55);font-size:13px;padding:26px;border-top:1px solid #272730}'
  + 'footer a:hover{color:#818cf8}'
  + '@media(max-width:820px){.relgrid{grid-template-columns:repeat(2,1fr)}}'
  + '</style>';
