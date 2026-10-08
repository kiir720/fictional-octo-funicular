// Site-wide middleware: canonical hostname, security headers, Google Tag
// Manager on every page, and a no-JavaScript fallback for the gallery homepage.
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

// public/_headers declares these too, but Pages applies _headers only to
// static files — never to anything a Function produced, which here means the
// homepage, every wallpaper/category/guide/legal page and the API. So they
// are added once, here, to whatever the rest of the stack returns.
// (No HSTS "preload": that is a hard-to-undo browser-list commitment.)
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
function secure(res){
  try {
    // responses handed back by next() can have immutable headers — copy once
    const out = new Response(res.body, res);
    for(const k in SECURITY_HEADERS){
      if(!out.headers.has(k)) out.headers.set(k, SECURITY_HEADERS[k]);
    }
    return out;
  } catch(e){ return res; }
}

// ---- Google Tag Manager ---------------------------------------------------
// Injected here rather than pasted into each template: the site has eight page
// templates (gallery, wallpaper, category, guide, legal, upload, report, 404)
// and search visitors mostly land on the server-rendered ones, so one place
// guarantees every page is measured, including any page added later.
const GTM_ID = 'GTM-PKZBLSFS';
// Consent Mode defaults. Analytics/ad storage start DENIED in the EEA, UK and
// Switzerland (same list /api/ads uses for its consent gate) — Google then
// sends only cookieless pings there — and granted everywhere else. A visitor
// who accepted the ads consent bar gets the ad signals granted; that bar only
// asked about ads, so it does not grant analytics.
const CONSENT_REGIONS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
const DENIED = "{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'";
const GTM_HEAD = '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
  + "gtag('consent','default'," + DENIED + ",region:" + JSON.stringify(CONSENT_REGIONS).replace(/"/g, "'") + '});'
  + "gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});"
  + "try{if(localStorage.getItem('8kw_ads_consent')==='yes')gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}catch(e){}"
  + '</script>'
  + '<!-- Google Tag Manager -->'
  + "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':"
  + "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],"
  + "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src="
  + "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);"
  + "})(window,document,'script','dataLayer','" + GTM_ID + "');</script>"
  + '<!-- End Google Tag Manager -->';
const GTM_BODY = '<!-- Google Tag Manager (noscript) -->'
  + '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + GTM_ID + '"'
  + ' height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'
  + '<!-- End Google Tag Manager (noscript) -->';

// Head snippet goes straight after <meta charset> (as high as possible, but
// without pushing the charset declaration out of the first 1024 bytes); a page
// without one gets it at the end of <head>. The noscript part opens <body>.
function addGtm(rw){
  let placed = false;
  return rw
    .on('meta[charset]', { element(el){ if(!placed){ el.after(GTM_HEAD, { html: true }); placed = true; } } })
    .on('head', { element(el){ el.onEndTag(end => { if(!placed){ end.before(GTM_HEAD, { html: true }); placed = true; } }); } })
    .on('body', { element(el){ el.prepend(GTM_BODY, { html: true }); } });
}

export async function onRequest(context){
  try {
    const { request, env } = context;
    const next = async () => secure(await context.next());
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
    if(request.method !== 'GET') return response;
    if(!/text\/html/i.test(response.headers.get('content-type') || '')) return response;
    const rw = new HTMLRewriter();
    let rewrite = false;

    // ---- 2. Google Tag Manager on every page ---------------------------
    // Live hostname only, so test traffic on preview deployments
    // (<hash>.8k-wallpapers.pages.dev) never reaches the analytics.
    if(url.hostname.toLowerCase() === CANONICAL){ addGtm(rw); rewrite = true; }

    // ---- 3. no-JS fallback for the homepage ----------------------------
    // The gallery builds itself in the browser, so a client that does not run
    // JavaScript saw only "This gallery needs JavaScript" — about 200 words,
    // most of them form labels, and not a single wallpaper. That reads as an
    // empty page to any crawler that does not execute scripts.
    //
    // So the real wallpapers are rendered into #grid server-side. The gallery's
    // own renderPage() clears #grid before drawing, so a visitor with
    // JavaScript never sees this — it is replaced, not duplicated. Same content
    // either way, which is what keeps it progressive enhancement.
    if(HOME_PATHS.has(url.pathname)){
      let cards = '';
      try {
        const list = await readList(env);
        cards = buildFallback(list, url.origin);
      } catch(e){ /* the page is still fine without it */ }
      if(cards){
        rewrite = true;
        rw.on('#grid', {
          element(el){ el.setInnerContent(cards, { html: true }); }
        })
        // the page's own <noscript>; the GTM one is inserted content, which
        // HTMLRewriter does not run selectors over, so it is left alone
        .on('noscript', {
          element(el){
            el.setInnerContent(
              '<p style="padding:14px 20px;text-align:center;font:14px/1.6 system-ui,sans-serif;'
              + 'color:#c4c8cf;background:#17171b;margin:0">'
              + 'Browsing without JavaScript &mdash; the wallpapers below are still fully '
              + 'downloadable, each on its own page.</p>', { html: true });
          }
        });
      }
    }

    return rewrite ? rw.transform(response) : response;
  } catch(e){
    // never let middleware take the site down
    try { return secure(await context.next()); } catch(e2){ return new Response('', { status: 500 }); }
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
