// Server-rendered legal pages. These exist as REAL URLs (/privacy, /about, …)
// rather than only as an in-page view, because a reviewer or a crawler that
// does not run JavaScript has to be able to fetch and read them — and Google
// asks for a Privacy Policy URL you can actually submit.
import { POLICIES } from './_content.js';

const SITE = '8K Wallpapers';

export const PAGES = {
  privacy:   { title: 'Privacy Policy',    desc: 'What 8K Wallpapers collects, how advertising cookies are used, and how to opt out.' },
  tos:       { title: 'Terms of Service',  desc: 'The terms for using 8K Wallpapers, downloading wallpapers, and submitting your own.' },
  copyright: { title: 'Copyright Policy',  desc: 'How to file a takedown notice, our notice-and-notice process, and repeat-infringer policy.' },
  contact:   { title: 'Contact Us',        desc: 'How to reach 8K Wallpapers — support, corrections, copyright and advertising enquiries.' },
  about:     { title: 'About',             desc: 'What 8K Wallpapers is, where the images come from, and who runs it.' }
};

const STYLE = '<style>'
+ ':root{--ink:#0a0a0c;--surface:#121216;--surface-2:#1b1b21;--line:#272730;'
  + '--text:rgba(255,255,255,.95);--muted:#98a0ae;--accent:#6366f1;--accent-2:#818cf8}'
+ '*{margin:0;padding:0;box-sizing:border-box}'
+ 'body{background:var(--ink);color:var(--text);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;'
  + 'line-height:1.65;-webkit-font-smoothing:antialiased}'
+ 'a{color:var(--accent);text-decoration:underline}a:hover{color:var(--accent-2)}'
+ 'header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 24px;'
  + 'background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}'
+ '.logo{font-size:19px;font-weight:700;letter-spacing:0;color:var(--text);text-decoration:none}'
+ '.logo b{color:var(--accent)}'
+ '.allbtn{background:var(--surface-2);border:1px solid var(--line);padding:9px 16px;border-radius:8px;'
  + 'font-size:13px;font-weight:600;color:var(--text);text-decoration:none}'
+ '.allbtn:hover{border-color:var(--accent);color:#fff}'
+ 'main{max-width:760px;margin:0 auto;padding:44px 22px 80px}'
+ 'h1{font-size:clamp(26px,3.6vw,36px);font-weight:700;letter-spacing:-.6px;line-height:1.12;margin-bottom:14px}'
+ 'h3{font-size:17px;font-weight:700;margin:32px 0 10px;letter-spacing:-.2px}'
+ 'p{margin:14px 0;color:#c4c8cf}'
+ 'p.lead{font-size:17px;color:#dfe3ea}'
+ 'p.updated{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;'
  + 'color:var(--muted);margin:-4px 0 22px}'
+ 'ul{margin:14px 0 14px 22px;color:#c4c8cf}li{margin:7px 0}'
+ '.contact-card{background:var(--surface);border:1px solid var(--line);border-radius:10px;'
  + 'padding:18px 20px;margin:18px 0}'
+ '.contact-card .row{display:flex;gap:14px;padding:8px 0;font-size:14.5px;color:#c4c8cf;'
  + 'border-bottom:1px solid var(--line)}'
+ '.contact-card .row:last-child{border-bottom:none}'
+ '.contact-card b{min-width:96px;color:var(--text);font-weight:700}'
+ 'nav.legal{display:flex;flex-wrap:wrap;gap:8px;margin:34px 0 0;padding-top:22px;border-top:1px solid var(--line)}'
+ 'nav.legal a{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 15px;'
  + 'font-size:13px;font-weight:600;color:var(--text);text-decoration:none}'
+ 'nav.legal a:hover{border-color:var(--accent)}'
+ 'nav.legal a[aria-current]{background:var(--accent);border-color:var(--accent);color:#fff}'
+ 'footer{text-align:center;color:var(--muted);font-size:13px;padding:26px;border-top:1px solid var(--line)}'
+ '@media(max-width:560px){main{padding:32px 16px 64px}header{padding:12px 15px}}'
+ '</style>';

function nav(current){
  return '<nav class="legal">' + Object.keys(PAGES).map(k =>
    '<a href="/' + k + '"' + (k === current ? ' aria-current="page"' : '') + '>' + PAGES[k].title + '</a>'
  ).join('') + '</nav>';
}

export function renderLegal(key, request){
  const meta = PAGES[key];
  if(!meta) return new Response('Not found', { status: 404 });
  const origin = new URL(request.url).origin;
  const html = '<!DOCTYPE html><html lang="en"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + meta.title + ' | ' + SITE + '</title>'
    + '<meta name="description" content="' + meta.desc + '">'
    + '<link rel="canonical" href="' + origin + '/' + key + '">'
    + '<meta name="robots" content="index, follow">'
    + '<meta name="theme-color" content="#0a0a0c">'
    + '<link rel="icon" href="/favicon.png" sizes="32x32">'
    + '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
    + '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
    + STYLE + '</head><body>'
    + '<header><a class="logo" href="/"><b>8K</b> WALLPAPERS</a>'
      + '<a class="allbtn" href="/">Browse wallpapers</a></header>'
    + '<main>' + POLICIES[key] + nav(key) + '</main>'
    + '<footer><a href="/">' + SITE + '</a> &middot; <a href="/guides">Guides</a> &middot; <a href="/report">Report an image</a> &middot; '
      + '<a href="/upload">Submit a wallpaper</a></footer>'
    + '</body></html>';
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' }
  });
}
