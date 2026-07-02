# 8K Wallpapers — Cloudflare setup (the whole stack)

**Live site:** <https://8k-wallpapers.pages.dev>

Everything runs on one Cloudflare Pages project — no Supabase, no GitHub tokens:

| Piece | Where it lives |
| --- | --- |
| Public page | `public/wallpapers.html`, served by Cloudflare Pages (CDN + SSL + DDoS included) |
| API | `functions/` → Pages Functions at `/api/*` and `/images/*` |
| Wallpaper list | one JSON document in Workers KV (`meta/wallpapers.json`) |
| Image files | Workers KV (`images/<name>`), served by the site at `/images/<name>` |
| Admin auth | a single `ADMIN_KEY` secret checked by the API |
| Admin page | `admin.html` — a LOCAL file on your PC, never deployed (returns 404 on the site) |

## Day-to-day

- **Publish / rename / delete wallpapers:** open `admin.html` locally, sign in with
  the admin key. Everything appears on the public site within ~30 seconds.
- **Deploy site changes** (after editing files):
  `npx wrangler pages deploy --branch main`
- **Rotate the admin key** (if it ever leaks):
  `npx wrangler pages secret put ADMIN_KEY --project-name 8k-wallpapers`
  then paste the new key into `admin.html`'s sign-in screen (old key stops working
  after the next deploy).

## API quick reference

| Endpoint | Auth | What it does |
| --- | --- | --- |
| `GET /api/wallpapers` | public | full wallpaper list (newest first, `no-store`) |
| `POST /api/wallpapers` | `X-Admin-Key` | add an entry (`name`, `category`, `tab`, `resolution`, `tags`, `image_path`) |
| `PATCH /api/wallpapers` | `X-Admin-Key` | rename (`image_path`, `name`) |
| `DELETE /api/wallpapers` | `X-Admin-Key` | remove entry + its stored image |
| `POST /api/upload?name=…` | `X-Admin-Key` | store raw image bytes, returns `{path}` (max 15 MB) |
| `POST /api/import` | `X-Admin-Key` | server-side fetch of an Unsplash/Pexels URL into storage |
| `GET /api/verify` | `X-Admin-Key` | key check used by the admin sign-in |
| `GET /images/<path>` | public | the image bytes, cached immutable for 1 year |

## Storage limits (Workers KV, free — no card)

- 1 GB total storage (≈ 200–500 wallpapers at 2–5 MB each)
- 100,000 image/list reads per day, 1,000 writes per day
- max 25 MB per file

**When the site outgrows KV, move to R2** (needs a payment method on the account;
free tier is 10 GB + unlimited free downloads): enable R2 in the dashboard,
`npx wrangler r2 bucket create 8k-wallpapers-media`, swap the three object helpers
(`putObject` / `getObject` / `deleteObject`) in `functions/api/_utils.js` to the R2
binding, and replace the `kv_namespaces` block in `wrangler.toml` with an
`r2_buckets` one. Nothing else changes.

## Custom domain + Google

1. Pages project → **Custom domains → Add** (SSL is automatic). Then update the
   URLs in `public/robots.txt` and `public/sitemap.xml` and redeploy.
2. **GA4:** paste your Measurement ID into the commented snippet in
   `public/wallpapers.html`'s `<head>` and uncomment it.
3. **Search Console:** verify the domain, submit `/sitemap.xml`.
4. **AdSense:** apply once there's a custom domain + some traffic; paste its
   snippet next to the GA one.

## Security notes

- SSL, CDN and DDoS protection are automatic on Pages.
- Rate limiting / Bot Fight Mode: dashboard → Security (free tier includes both).
- The admin key never leaves your browser except to the site's own API over HTTPS.
- Backups: the site code is in git; the wallpaper list + images live in KV —
  export occasionally with `npx wrangler kv key list/get --namespace-id 2ca57291d77147c998164738214212b1`
  (or just keep original image files).
