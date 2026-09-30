// Site-wide middleware: canonical hostname + a no-JavaScript fallback for the
// gallery homepage.
//
// This runs on EVERY request to the project, including static assets, so it is
// deliberately narrow and defensive: anything unexpected falls through to the
// normal response rather than failing the request.
import { readList, wallpaperSlug, escapeHtml } from './api/_utils.js';

const CANONICAL = '8k-wallpapers.com';
const REDIRECT_FROM = new Set([
  '8k-wallpapers.pages.dev',
  'www.' + CANONICAL
]);
// the gallery document, however it is addressed
const HOME_PATHS = new Set(['/', '/wallpapers', '/wallpapers.html']);
const FALLBACK_COUNT = 36;

export async function onRequest(context){
  try {
    const { request, next, env } = context;
    if(request.method !== 'GET' && request.method !== 'HEAD') return next();

    const url = new URL(request.url);

    // ---- 1. one canonical hostname -------------------------------------
    // Only the exact production hostnames redirect. Preview deployments look
    // like <hash>.8k-wallpapers.pages.dev and are left alone, otherwise there
    // would be no way to test a build before it goes live. Only GET/HEAD, as a
    // 301 on a POST can be downgraded to GET and break form submissions.
    if(REDIRECT_FROM.has(url.hostname.toLowerCase())){
      url.hostname = CANONICAL;
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }

    const response = await next();

    // ---- 2. no-JS fallback for the homepage ----------------------------
    // The gallery builds itself in the browser, so a client that does not run
    // JavaScript saw only "This gallery needs JavaScript" — about 200 words,
    // most of them form labels, and not a single wallpaper. That reads as an
    // empty page to any crawler that does not execute scripts.
    //
    // So the real wallpapers are rendered into #grid server-side. The gallery's
    // own renderPage() clears #grid before drawing, so a visitor with
    // JavaScript never sees this — it is replaced, not duplicated. Same content
    // either way, which is what keeps it progressive enhancement.
    if(!HOME_PATHS.has(url.pathname)) return response;
    if(!/text\/html/i.test(response.headers.get('content-type') || '')) return response;

    let cards = '';
    try {
      const list = await readList(env);
      cards = buildFallback(list, url.origin);
    } catch(e){ /* the page is still fine without it */ }
    if(!cards) return response;

    return new HTMLRewriter()
      .on('#grid', {
        element(el){ el.setInnerContent(cards, { html: true }); }
      })
      .on('noscript', {
        element(el){
          el.setInnerContent(
            '<p style="padding:14px 20px;text-align:center;font:14px/1.6 system-ui,sans-serif;'
            + 'color:#c4c8cf;background:#17171b;margin:0">'
            + 'Browsing without JavaScript &mdash; the wallpapers below are still fully '
            + 'downloadable, each on its own page.</p>', { html: true });
        }
      })
      .transform(response);
  } catch(e){
    // never let middleware take the site down
    try { return await context.next(); } catch(e2){ return new Response('', { status: 500 }); }
  }
}

// A real, crawlable grid: newest first, each linking to its own server-rendered
// page. Mirrors what the JavaScript gallery shows, so the two never disagree.
function buildFallback(list, origin){
  if(!Array.isArray(list) || !list.length) return '';
  const rows = list
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, FALLBACK_COUNT);

  return rows.map(r => {
    const name = r.name || 'Wallpaper';
    const cat = r.category || '';
    const res = r.resolution || '';
    const href = '/wallpaper/' + wallpaperSlug(r);
    const thumb = origin + '/images/thumbs/' + encodeURI(r.image_path || '');
    const full = origin + '/images/' + encodeURI(r.image_path || '');
    const alt = name + (cat ? ' — ' + cat : '') + ' wallpaper' + (res ? ' in ' + res : '');
    return '<a class="card" href="' + escapeHtml(href) + '">'
      + '<div class="thumb"><img loading="lazy" src="' + escapeHtml(thumb) + '"'
        + ' alt="' + escapeHtml(alt) + '" width="320" height="200"'
        + ' onerror="this.onerror=null;this.src=\'' + escapeHtml(full) + '\'"></div>'
      + '<div class="card-body"><div class="card-title">' + escapeHtml(name) + '</div>'
      + '<div class="card-sub">' + escapeHtml([cat, res].filter(Boolean).join(' · ')) + '</div></div>'
      + '</a>';
  }).join('');
}
