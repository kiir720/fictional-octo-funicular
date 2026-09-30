// GET /category/<slug>[?page=N] — a crawlable page per category: an intro,
// every wallpaper in it (PER_PAGE at a time, newest first) and links to the
// other categories. Server-rendered, same as the wallpaper and guide pages.
import { readList, escapeHtml, wallpaperSlug } from '../api/_utils.js';
import {
  SITE, PER_PAGE, MIN_INDEXABLE, BLURBS, groupByCategory, longEdge, topTags,
  thumbUrl, cardHtml, pageShell, htmlResponse, notFoundPage
} from './_shared.js';

export async function onRequestGet({ params, env, request }){
  const url = new URL(request.url);
  const origin = url.origin;
  const asked = String(params.slug || '');
  const groups = groupByCategory(await readList(env));
  const cat = groups.find(g => g.slug === asked.toLowerCase());
  if(!cat) return notFoundPage(groups);

  // one URL per page: /category/Anime -> /category/anime, ?page=1 -> no query
  const base = origin + '/category/' + cat.slug;
  const pages = Math.max(1, Math.ceil(cat.rows.length / PER_PAGE));
  const raw = url.searchParams.get('page');
  let pageNo = 1;
  if(raw !== null){
    pageNo = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    if(!(pageNo >= 1 && pageNo <= pages)) return notFoundPage(groups, 'That page of ' + cat.name + ' does not exist');
  }
  if(asked !== cat.slug || raw === '1'){
    return Response.redirect(base + (pageNo > 1 ? '?page=' + pageNo : ''), 301);
  }

  const canonical = base + (pageNo > 1 ? '?page=' + pageNo : '');
  const rows = cat.rows.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const n = cat.rows.length;
  const hi = cat.rows.filter(r => longEdge(r.resolution) >= 3840).length;
  const tags = topTags(cat.rows, cat.name, 10);
  const label = cat.name + ' Wallpapers';
  const indexable = n >= MIN_INDEXABLE;

  const blurb = BLURBS[cat.name] || (cat.name + ' wallpapers for desktop, mobile and tablet.');
  const stats = n + ' wallpaper' + (n === 1 ? '' : 's')
    + (hi === n ? (n > 1 ? ', all' : ', and it is') + ' 4K or sharper' : (hi ? ', ' + hi + ' of them 4K or sharper' : ''))
    + '. Each one is free to download at its full original resolution.';
  const title = label + (pageNo > 1 ? ' — Page ' + pageNo : '') + ' — Free 4K Backgrounds | ' + SITE;
  const desc = 'Browse ' + n + ' free ' + cat.name.toLowerCase() + ' wallpapers'
    + (hi ? ' in 4K and higher' : '') + ' for desktop, mobile and tablet. ' + blurb;

  const pager = pages > 1 ? '<nav class="pager" aria-label="Pages">'
    + (pageNo > 1 ? '<a href="' + escapeHtml(pageNo === 2 ? base : base + '?page=' + (pageNo - 1)) + '" rel="prev">&larr; Prev</a>' : '')
    + Array.from({ length: pages }, (_, i) => i + 1).map(p => p === pageNo
        ? '<span class="cur" aria-current="page">' + p + '</span>'
        : '<a href="' + escapeHtml(p === 1 ? base : base + '?page=' + p) + '">' + p + '</a>').join('')
    + (pageNo < pages ? '<a href="' + escapeHtml(base + '?page=' + (pageNo + 1)) + '" rel="next">Next &rarr;</a>' : '')
    + '</nav>' : '';

  const others = groups.map(g => '<a class="chip' + (g === cat ? ' on' : '') + '" href="/category/' + escapeHtml(g.slug) + '"'
      + (g === cat ? ' aria-current="page"' : '') + '>'
      + escapeHtml(g.name) + ' <em>' + g.rows.length + '</em></a>').join('');

  const body = '<nav class="crumbs"><a href="/">Home</a> / <a href="/categories">Categories</a> / <span>'
      + escapeHtml(cat.name) + '</span></nav>'
    + '<h1>' + escapeHtml(label) + (pageNo > 1 ? ' <span style="color:rgba(255,255,255,.45);font-size:.6em">page ' + pageNo + '</span>' : '') + '</h1>'
    + '<p class="lead">' + escapeHtml(blurb) + '</p>'
    + '<p class="stats">' + escapeHtml(stats) + '</p>'
    + (tags.length ? '<div class="tagrow"><span class="lbl">Popular</span>'
        + tags.map(t => '<a href="/#q=' + encodeURIComponent(String(t).toLowerCase()) + '">' + escapeHtml(t) + '</a>').join('')
        + '</div>' : '')
    + '<div class="grid">' + rows.map((r, i) => cardHtml(r, origin, i < 4)).join('') + '</div>'
    + pager
    + '<section class="more"><h2>Browse other categories</h2><div class="chips">' + others + '</div></section>';

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: label,
      description: desc,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: SITE, url: origin + '/' },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: n,
        itemListElement: rows.map((r, i) => ({
          '@type': 'ListItem',
          position: (pageNo - 1) * PER_PAGE + i + 1,
          url: origin + '/wallpaper/' + wallpaperSlug(r),
          name: r.name || 'Wallpaper'
        }))
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: 'Categories', item: origin + '/categories' },
        { '@type': 'ListItem', position: 3, name: label, item: base }
      ]
    }
  ];

  return htmlResponse(pageShell({
    title, desc, canonical, jsonld, body,
    robots: indexable ? undefined : 'noindex, follow',
    ogTitle: label,
    ogImage: rows[0] ? thumbUrl(origin, rows[0]) : ''
  }));
}
