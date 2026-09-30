// Renders the guides index (/guides) and each article (/guides/<slug>).
// Server-rendered for the same reason the legal pages are: this is the written
// content on the site, so it has to be readable without JavaScript.
import { GUIDES, GUIDE_ORDER } from './_content.js';

const SITE = '8K Wallpapers';

const STYLE = '<style>'
+ ':root{--ink:#0a0a0c;--surface:#121216;--surface-2:#1b1b21;--line:#272730;'
  + '--text:rgba(255,255,255,.95);--muted:#98a0ae;--accent:#6366f1;--accent-2:#818cf8}'
+ '*{margin:0;padding:0;box-sizing:border-box}'
+ 'body{background:var(--ink);color:var(--text);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;'
  + 'line-height:1.7;-webkit-font-smoothing:antialiased}'
+ 'a{color:var(--accent);text-decoration:none}a:hover{color:var(--accent-2);text-decoration:underline}'
+ 'header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 24px;'
  + 'background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}'
+ '.logo{font-size:19px;font-weight:700;letter-spacing:0;color:var(--text)}'
+ '.logo b{color:var(--accent)}'
+ '.allbtn{background:var(--surface-2);border:1px solid var(--line);padding:9px 16px;border-radius:8px;'
  + 'font-size:13px;font-weight:600;color:var(--text)}'
+ '.allbtn:hover{border-color:var(--accent);color:#fff;text-decoration:none}'
+ 'main{max-width:760px;margin:0 auto;padding:44px 22px 80px}'
+ '.crumbs{color:var(--muted);font-size:13px;margin-bottom:16px}'
+ '.eyebrow{font-size:11px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:var(--accent-2);'
  + 'padding-bottom:7px;margin-bottom:14px;border-bottom:2px solid var(--accent);display:inline-block}'
+ 'h1{font-size:clamp(26px,3.6vw,36px);font-weight:700;letter-spacing:-.6px;line-height:1.15;margin-bottom:14px}'
+ 'h2{font-size:21px;font-weight:700;margin:34px 0 12px;letter-spacing:-.2px}'
+ 'p{margin:14px 0;color:#c4c8cf}'
+ 'p.lead{font-size:17.5px;color:#dfe3ea;margin-bottom:8px}'
+ 'p.updated{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;'
  + 'color:var(--muted);margin:-4px 0 26px}'
+ 'ul,ol{margin:14px 0 14px 24px;color:#c4c8cf}li{margin:9px 0}'
+ 'b{color:var(--text)}'
+ '.g-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14.5px}'
+ '.g-table th{text-align:left;padding:10px 12px;background:var(--surface-2);color:var(--text);'
  + 'font-size:12px;letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid var(--line)}'
+ '.g-table td{padding:10px 12px;border-bottom:1px solid var(--line);color:#c4c8cf}'
+ '.g-table tr:last-child td{border-bottom:none}'
+ '.tablewrap{overflow-x:auto}'
// index cards
+ '.glist{display:grid;gap:14px;margin-top:26px}'
+ '.gcard{display:block;background:var(--surface);border:1px solid var(--line);border-radius:10px;'
  + 'padding:20px 22px;transition:border-color .15s,transform .15s}'
+ '.gcard:hover{border-color:var(--accent);text-decoration:none}'
+ '.gcard h2{margin:0 0 6px;font-size:18.5px;color:var(--text)}'
+ '.gcard p{margin:0;color:var(--muted);font-size:14.5px}'
// next/prev
+ '.more{margin-top:44px;padding-top:26px;border-top:1px solid var(--line)}'
+ '.more h3{font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}'
+ 'footer{text-align:center;color:var(--muted);font-size:13px;padding:26px;border-top:1px solid var(--line)}'
+ '@media(max-width:560px){main{padding:32px 16px 64px}header{padding:12px 15px}}'
+ '</style>';

function shell(o){
  return '<!DOCTYPE html><html lang="en"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + o.title + ' | ' + SITE + '</title>'
    + '<meta name="description" content="' + o.desc + '">'
    + '<link rel="canonical" href="' + o.canonical + '">'
    + '<meta name="robots" content="index, follow">'
    + '<meta name="theme-color" content="#0a0a0c">'
    + '<meta property="og:type" content="article">'
    + '<meta property="og:title" content="' + o.title + '">'
    + '<meta property="og:description" content="' + o.desc + '">'
    + '<meta property="og:url" content="' + o.canonical + '">'
    + '<link rel="icon" href="/favicon.png" sizes="32x32">'
    + '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
    + '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
    + STYLE + '</head><body>'
    + '<header><a class="logo" href="/"><b>8K</b> WALLPAPERS</a>'
      + '<a class="allbtn" href="/">Browse wallpapers</a></header>'
    + '<main>' + o.body + '</main>'
    + '<footer><a href="/">' + SITE + '</a> &middot; <a href="/guides">Guides</a> &middot; '
      + '<a href="/about">About</a> &middot; <a href="/privacy">Privacy</a> &middot; '
      + '<a href="/contact">Contact</a></footer>'
    + '</body></html>';
}

const html = (s) => new Response(s, {
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' }
});

export function renderIndex(request){
  const origin = new URL(request.url).origin;
  const cards = GUIDE_ORDER.map(k => {
    const g = GUIDES[k];
    return '<a class="gcard" href="/guides/' + k + '">'
      + '<h2>' + g.title + '</h2><p>' + g.desc + '</p></a>';
  }).join('');
  return html(shell({
    title: 'Wallpaper Guides',
    desc: 'Practical guides to screen resolution, 4K/5K/8K, setting wallpapers on any device, ultrawide setups, and fixing blurry wallpapers.',
    canonical: origin + '/guides',
    body: '<p class="eyebrow">Guides</p>'
      + '<h1>Wallpaper Guides</h1>'
      + '<p class="lead">Straight answers to the questions that decide whether a wallpaper looks '
      + 'right on your screen &mdash; what resolution to pick, what the K numbers mean, and why an '
      + 'image that looked sharp in the browser can look soft on your desktop.</p>'
      + '<div class="glist">' + cards + '</div>'
  }));
}

export function renderGuide(slug, request){
  const g = GUIDES[slug];
  if(!g) return null;
  const origin = new URL(request.url).origin;

  // link on to the other guides so no article is a dead end
  const others = GUIDE_ORDER.filter(k => k !== slug).slice(0, 3).map(k =>
    '<a class="gcard" href="/guides/' + k + '"><h2>' + GUIDES[k].title + '</h2>'
    + '<p>' + GUIDES[k].desc + '</p></a>').join('');

  return html(shell({
    title: g.title,
    desc: g.desc,
    canonical: origin + '/guides/' + slug,
    body: '<nav class="crumbs"><a href="/">Home</a> / <a href="/guides">Guides</a></nav>'
      + '<p class="eyebrow">Guide</p>'
      + '<h1>' + g.title + '</h1>'
      + '<p class="updated">Updated ' + g.updated + '</p>'
      + g.body.replace(/<table class='g-table'>/g, "<div class='tablewrap'><table class='g-table'>")
              .replace(/<\/table>/g, '</table></div>')
      + '<div class="more"><h3>More guides</h3><div class="glist">' + others + '</div></div>'
  }));
}
