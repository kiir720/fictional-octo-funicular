// GET /tag/<slug>[?page=N] — a crawlable page for each substantial tag
// ("samurai", "blue", "mountains"…), which is how people actually search.
// Same look and paging as the category pages. A tag that is really a category
// (or a synonym of one) redirects there instead of duplicating it.
import { readList, escapeHtml, wallpaperSlug } from '../api/_utils.js';
import {
  SITE, PER_PAGE, groupByCategory, groupByTag, tagSlug, longEdge, TAG_MIN_INDEX,
  thumbUrl, cardHtml, pageShell, htmlResponse, notFoundPage, pagerHtml
} from '../category/_shared.js';

export async function onRequestGet({ params, env, request }){
  const url = new URL(request.url);
  const origin = url.origin;
  const asked = String(params.slug || '');
  const list = await readList(env);
  const groups = groupByCategory(list);
  const catSlugs = new Set(groups.map(g => g.slug));
  const slug = tagSlug(asked);                       // lower-case, synonyms folded

  // a tag that is a category ("anime") or a synonym of one ("minimalist")
  if(catSlugs.has(slug)) return Response.redirect(origin + '/category/' + slug, 301);
  const tags = groupByTag(list, catSlugs);
  const tag = tags.get(slug);
  if(!tag) return notFoundPage(groups, 'No wallpapers are tagged “' + asked.replace(/-/g, ' ') + '” yet');

  const base = origin + '/tag/' + tag.slug;
  const pages = Math.max(1, Math.ceil(tag.rows.length / PER_PAGE));
  const raw = url.searchParams.get('page');
  let pageNo = 1;
  if(raw !== null){
    pageNo = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    if(!(pageNo >= 1 && pageNo <= pages)) return notFoundPage(groups, 'That page of ' + tag.name + ' does not exist');
  }
  if(asked !== tag.slug || raw === '1') return Response.redirect(base + (pageNo > 1 ? '?page=' + pageNo : ''), 301);

  const n = tag.rows.length;
  const rows = tag.rows.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const canonical = base + (pageNo > 1 ? '?page=' + pageNo : '');
  const label = tag.name + ' Wallpapers';
  const hi = tag.rows.filter(r => longEdge(r.resolution) >= 3840).length;

  // which categories this tag spans, and which other tag pages it travels with
  const catCount = new Map();
  for(const r of tag.rows){ const c = r.category || 'Abstract'; catCount.set(c, (catCount.get(c) || 0) + 1); }
  const topCats = [...catCount.entries()].sort((a, b) => b[1] - a[1]);
  const co = new Map();
  for(const r of tag.rows){
    const seen = new Set();
    for(const t of (r.tags || [])){
      const s = tagSlug(t);
      if(s === tag.slug || seen.has(s) || !tags.has(s)) continue;
      seen.add(s); co.set(s, (co.get(s) || 0) + 1);
    }
  }
  const related = [...co.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([s]) => tags.get(s));

  const catNames = topCats.slice(0, 3).map(([c]) => c);
  const spread = catNames.length === 1 ? 'all of them in ' + catNames[0]
    : 'mostly from ' + catNames.slice(0, -1).join(', ') + ' and ' + catNames[catNames.length - 1];
  const lead = n + ' wallpaper' + (n === 1 ? '' : 's') + ' tagged “' + tag.name + '”, ' + spread + '.';
  const stats = (hi === n ? (n > 1 ? 'All' : 'It is') + ' 4K or sharper' : (hi ? hi + ' of them are 4K or sharper' : 'Free'))
    + (hi ? ', and every one is free to download' : ' to download') + ' at its full original resolution.';
  const title = label + (pageNo > 1 ? ' — Page ' + pageNo : '') + ' — Free 4K Backgrounds | ' + SITE;
  const desc = 'Browse ' + n + ' free ' + tag.name.toLowerCase() + ' wallpapers' + (hi ? ' in 4K and higher' : '')
    + ', ' + spread + '. Download for desktop, mobile and tablet.';

  const body = '<nav class="crumbs"><a href="/">Home</a> / <span>' + escapeHtml(label) + '</span></nav>'
    + '<h1>' + escapeHtml(label) + (pageNo > 1 ? ' <span style="color:rgba(255,255,255,.45);font-size:.6em">page ' + pageNo + '</span>' : '') + '</h1>'
    + '<p class="lead">' + escapeHtml(lead) + '</p>'
    + '<p class="stats">' + escapeHtml(stats) + '</p>'
    + (related.length ? '<div class="tagrow"><span class="lbl">Related</span>'
        + related.map(t => '<a href="/tag/' + escapeHtml(t.slug) + '">' + escapeHtml(t.name) + '</a>').join('') + '</div>' : '')
    + '<div class="grid">' + rows.map((r, i) => cardHtml(r, origin, i < 4)).join('') + '</div>'
    + pagerHtml(base, pageNo, pages)
    + '<section class="more"><h2>' + escapeHtml(tag.name) + ' wallpapers by category</h2><div class="chips">'
      + topCats.map(([c, k]) => {
          const g = groups.find(x => x.name === c);
          return g ? '<a class="chip" href="/category/' + escapeHtml(g.slug) + '">' + escapeHtml(c) + ' <em>' + k + '</em></a>' : '';
        }).join('')
      + '<a class="chip" href="/categories">All categories</a></div></section>';

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: label, description: desc, url: canonical,
      isPartOf: { '@type': 'WebSite', name: SITE, url: origin + '/' },
      mainEntity: {
        '@type': 'ItemList', numberOfItems: n,
        itemListElement: rows.map((r, i) => ({
          '@type': 'ListItem', position: (pageNo - 1) * PER_PAGE + i + 1,
          url: origin + '/wallpaper/' + wallpaperSlug(r), name: r.name || 'Wallpaper'
        }))
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: label, item: base }
      ]
    }
  ];

  return htmlResponse(pageShell({
    title, desc, canonical, jsonld, body,
    robots: n >= TAG_MIN_INDEX ? undefined : 'noindex, follow',
    ogTitle: label,
    ogImage: rows[0] ? thumbUrl(origin, rows[0]) : ''
  }));
}
