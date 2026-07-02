# Wallpaper-site checklist — status

Stack decision: **Cloudflare Pages (hosting + CDN + SSL) · GitHub `wallpapers.json`
(metadata) · Supabase Storage (images)**. No app server or SQL database — that is
deliberate (see `GITHUB-SETUP.md`); revisit only if user accounts/comments are needed.

| # | Item | Status |
| --- | --- | --- |
| 1–3 | Hosting + CDN | ✅ Cloudflare Pages — deploy steps in `CLOUDFLARE-SETUP.md` |
| 4 | Backend | ✅ Serverless by design: GitHub API is the write path, raw CDN the read path |
| 5 | Database | ✅ `wallpapers.json` in git (wallpapers, categories, tags); favorites/views/downloads per-browser in localStorage |
| 6 | Frontend | ✅ HTML/CSS/JS, no framework |
| 7 | Image storage | ✅ Supabase Storage bucket (option to move to Cloudflare R2 later) |
| 8–9 | Compression / resizing | ✅ Client-side: canvas resize to any of ~25 device resolutions at download time. Server-side AVIF/WebP variants = future Cloudflare Images upgrade |
| 10 | Categories | ✅ 30 categories with dropdown browser |
| 11 | Tags | ✅ Per-wallpaper tags + popular-tags cloud |
| 12 | Search | ✅ Title, category, tag, resolution ("8k", "3840"…). Color search: via color tags |
| 13 | Filters | ✅ 4K / 5K / 8K / Portrait / Landscape chip bar (new) |
| 14 | Wallpaper page | ✅ Preview, download, resolution, views, downloads, upload date, file size, related wallpapers |
| 15 | Multiple download buttons | ✅ Desktop / Mobile / Tablet / iPhone / iPad resolution lists |
| 16 | User accounts | ⚠️ Favorites work without login (localStorage). Login/comments/user uploads need a real backend — out of scope for the static architecture |
| 17 | Admin panel | ✅ Upload, delete, rename (edit titles), and a 📊 Stats dashboard (totals, per-resolution/tab/category/tag breakdowns, latest publish). Approve/manage-users N/A (single admin) |
| 18 | SEO | ✅ Meta description, canonical, Open Graph, Twitter cards, Schema.org JSON-LD, robots.txt, sitemap.xml |
| 19 | Analytics | 🔧 GA4 snippet is in `wallpapers.html` head, commented — paste your G-ID and uncomment. Search Console steps in setup guide |
| 20 | Ads | 🔧 Needs an approved AdSense account — steps in setup guide |
| 21 | Security | ✅ SSL/DDoS/rate limiting via Cloudflare, security headers in `_headers`, admin auth (Supabase + GitHub token + optional Cloudflare Access), backups = git history |
| 22 | Performance | ✅ Lazy loading, CDN, cache headers, skeleton shimmer, batched rendering |
| 23 | Features | ✅ Dark **and light** mode, infinite scroll, popular/latest/random tabs, related wallpapers, favorites, working share buttons + copy link + native share |
| 24 | Mobile support | ✅ Responsive 4→3→2→1 column grid |
| 25 | Legal pages | ✅ About (new), Privacy, TOS, Copyright/DMCA, Contact |
| 26 | API | ✅ `wallpapers.json` on GitHub's raw CDN *is* a public read API |
| 27 | Folder structure | ✅ Flat static site — appropriate for this stack |
| 28 | Tech stack | ✅ Decided (Cloudflare, see top) |
| 29 | Future features | 📋 Ideas list — R2, Workers counters, per-wallpaper sitemap, AI search |

**Deployed 2026-07-02:** live at <https://8k-wallpapers.pages.dev> (Wrangler direct
upload, project `8k-wallpapers`; admin.html deliberately not deployed).
Re-deploy after changes with:
`npx wrangler pages deploy <folder> --project-name 8k-wallpapers --branch main`

**Manual steps left (need your accounts):** optional custom domain (then update
robots.txt/sitemap.xml URLs), uncomment GA4 with your ID, submit the sitemap in
Search Console, apply for AdSense.
