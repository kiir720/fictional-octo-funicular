// GET /google24a9d9c00baaa256.html — Google Search Console site verification.
// Served by a Function rather than a static file because Cloudflare Pages strips
// the .html extension and 308-redirects the exact URL Google asks for; a Function
// route answers it with a plain 200. (Same reason ads.txt and sitemap.xml are
// Functions here — a static file at this path would shadow the route.)
export const onRequestGet = () => new Response(
  'google-site-verification: google24a9d9c00baaa256.html\n',
  { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
);
