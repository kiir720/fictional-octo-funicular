// GET /feed.xml — the 50 newest wallpapers as RSS 2.0.
// Main use: Pinterest's "auto-publish from RSS" pins every new wallpaper to a
// board automatically (Pinterest takes each item's image, title and link).
// Feed readers and aggregators get it too. Each item carries the full-size
// image as media:content — low-resolution pins perform poorly on Pinterest.
import { readList, wallpaperSlug } from './api/_utils.js';

const LIMIT = 50;
function x(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
}
function mime(path){
  return /\.png$/i.test(path) ? 'image/png' : /\.webp$/i.test(path) ? 'image/webp' : 'image/jpeg';
}

export async function onRequestGet({ env, request }){
  const origin = new URL(request.url).origin;
  const rows = (await readList(env))
    .filter(r => r && r.image_path)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, LIMIT);

  const items = rows.map(r => {
    const link = origin + '/wallpaper/' + wallpaperSlug(r);
    const img = origin + '/images/' + encodeURI(r.image_path);
    const name = r.name || 'Wallpaper';
    const cat = r.category || '';
    const res = r.resolution || '';
    const tags = (Array.isArray(r.tags) ? r.tags : []).slice(0, 8);
    const text = name + (cat ? ' — ' + cat + ' wallpaper' : ' wallpaper') + (res ? ' in ' + res : '')
      + '. Free to download at full resolution.' + (tags.length ? ' ' + tags.map(t => '#' + String(t).replace(/\s+/g, '')).join(' ') : '');
    const d = new Date(r.created_at || '');
    return '<item>'
      + '<title>' + x(name + (cat ? ' — ' + cat + ' Wallpaper' : ' Wallpaper')) + '</title>'
      + '<link>' + x(link) + '</link>'
      + '<guid isPermaLink="true">' + x(link) + '</guid>'
      + (isNaN(d) ? '' : '<pubDate>' + d.toUTCString() + '</pubDate>')
      + (cat ? '<category>' + x(cat) + '</category>' : '')
      // description is HTML carried as escaped text, as RSS expects
      + '<description>' + x('<p><img src="' + img + '" alt="' + x(name) + '"></p><p>' + x(text) + '</p>') + '</description>'
      + '<media:content url="' + x(img) + '" medium="image" type="' + mime(r.image_path) + '"/>'
      + '</item>';
  }).join('\n');

  const newest = rows[0] && new Date(rows[0].created_at || '');
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">\n'
    + '<channel>'
    + '<title>8K Wallpapers — New Wallpapers</title>'
    + '<link>' + x(origin + '/') + '</link>'
    + '<atom:link href="' + x(origin + '/feed.xml') + '" rel="self" type="application/rss+xml"/>'
    + '<description>The newest free 4K, 5K and 8K wallpapers for desktop, mobile and tablet.</description>'
    + '<language>en</language>'
    + (newest && !isNaN(newest) ? '<lastBuildDate>' + newest.toUTCString() + '</lastBuildDate>' : '')
    + '<image><url>' + x(origin + '/icon-512.png') + '</url><title>8K Wallpapers — New Wallpapers</title><link>' + x(origin + '/') + '</link></image>'
    + '\n' + items + '\n</channel></rss>\n';

  return new Response(body, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=1800'
    }
  });
}
