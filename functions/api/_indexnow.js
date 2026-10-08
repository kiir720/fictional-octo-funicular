// IndexNow: tell Bing, Yandex, Seznam, Naver and the other participating search
// engines about new or changed URLs the moment they exist, instead of waiting
// for a crawl. Bing also powers DuckDuckGo, Yahoo and ChatGPT search results.
// One POST reaches every participating engine.
//
// The key is public by design: the engines fetch it from
// https://8k-wallpapers.com/<key>.txt (public/<key>.txt) to confirm the ping
// really comes from this site. Google does not use IndexNow — for Google the
// sitemap is what counts.
import { wallpaperSlug, nameSlug } from './_utils.js';

export const INDEXNOW_KEY = '584ed168b8af53862a5bae261ae5586a';
const HOST = '8k-wallpapers.com';

// Fire-and-forget from a request handler (pass to waitUntil). Only ever pings
// for the live host, so local or preview traffic can't submit anything.
export async function pingIndexNow(urls){
  try {
    const list = [...new Set(urls)].filter(u => typeof u === 'string' && u.startsWith('https://' + HOST + '/'));
    if(!list.length) return { skipped: 'no live URLs' };
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: 'https://' + HOST + '/' + INDEXNOW_KEY + '.txt',
        urlList: list.slice(0, 10000)
      })
    });
    if(res.status >= 300) console.log('IndexNow -> ' + res.status + ' ' + (await res.text()).slice(0, 300));
    return { status: res.status, submitted: list.length };
  } catch(e){
    console.log('IndexNow error: ' + (e && e.message));
    return { error: String(e && e.message || e) };
  }
}

// The pages a newly published wallpaper changes: its own page, its category,
// the category index, the homepage and the feed.
export function urlsForNewWallpaper(entry){
  const base = 'https://' + HOST;
  return [
    base + '/wallpaper/' + wallpaperSlug(entry),
    base + '/category/' + nameSlug(entry.category || 'Abstract'),
    base + '/categories',
    base + '/'
  ];
}
