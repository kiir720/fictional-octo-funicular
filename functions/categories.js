// GET /categories — every category with a cover image and a count, each
// linking to its /category/<slug> page.
import { readList, escapeHtml } from './api/_utils.js';
import {
  SITE, groupByCategory, thumbUrl, fullUrl, pageShell, htmlResponse, loadStats, pickCover
} from './category/_shared.js';

export async function onRequestGet({ env, request }){
  const origin = new URL(request.url).origin;
  const [list, stats] = await Promise.all([readList(env), loadStats(env)]);
  const groups = groupByCategory(list);
  const total = groups.reduce((s, g) => s + g.rows.length, 0);
  const covers = new Map(groups.map(g => [g, pickCover(g.rows, stats)]));

  const tiles = groups.map((g, i) => {
    const cover = covers.get(g);                  // the one people download most
    return '<a class="tile" href="/category/' + escapeHtml(g.slug) + '">'
      + '<img ' + (i < 6 ? '' : 'loading="lazy" ') + 'decoding="async" width="480" height="270"'
        + ' src="' + escapeHtml(thumbUrl(origin, cover)) + '"'
        + ' alt="' + escapeHtml(g.name + ' wallpapers') + '"'
        + ' onerror="this.onerror=null;this.src=\'' + escapeHtml(fullUrl(origin, cover)) + '\'">'
      + '<span class="cap"><b>' + escapeHtml(g.name) + '</b><i>' + g.rows.length + '</i></span></a>';
  }).join('');

  const desc = 'Browse all ' + total + ' free 4K, 5K and 8K wallpapers by subject — '
    + groups.slice(0, 6).map(g => g.name.toLowerCase()).join(', ') + ' and more.';

  const body = '<nav class="crumbs"><a href="/">Home</a> / <span>Categories</span></nav>'
    + '<h1>Wallpaper Categories</h1>'
    + '<p class="lead">' + total + ' wallpapers across ' + groups.length + ' subjects. '
      + 'Pick one to see everything in it, newest first — every wallpaper is free to download '
      + 'at its full original resolution.</p>'
    + '<div class="tiles" style="margin-top:22px">' + tiles + '</div>';

  const jsonld = [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Wallpaper Categories',
    description: desc,
    url: origin + '/categories',
    isPartOf: { '@type': 'WebSite', name: SITE, url: origin + '/' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: groups.length,
      itemListElement: groups.map((g, i) => ({
        '@type': 'ListItem', position: i + 1,
        url: origin + '/category/' + g.slug, name: g.name + ' Wallpapers'
      }))
    }
  }];

  return htmlResponse(pageShell({
    title: 'Wallpaper Categories — Browse by Subject | ' + SITE,
    desc, jsonld, body,
    canonical: origin + '/categories',
    ogTitle: 'Wallpaper Categories',
    ogImage: groups[0] ? thumbUrl(origin, covers.get(groups[0])) : ''
  }));
}
