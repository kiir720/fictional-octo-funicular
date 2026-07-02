# 8K Wallpapers — Cloudflare deployment guide

The site is static (HTML + a JSON "database" on GitHub + images on Supabase Storage),
so it deploys to **Cloudflare Pages** for free: global CDN, automatic SSL, DDoS
protection, and unlimited bandwidth — no server to manage.

---

## 1. Deploy to Cloudflare Pages

1. Push this folder to your GitHub repo (the one from `GITHUB-SETUP.md`),
   **except `admin.html`** — see step 3.
2. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) →
   **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick your repo. Build settings: framework preset **None**, build command
   *(empty)*, output directory `/`. Deploy.
4. Your site is live at `https://<project>.pages.dev`. The `_redirects` file
   already serves `wallpapers.html` at the root URL, and `_headers` applies
   caching + security headers.

Every `git push` after this auto-deploys — that's also your rollback story
(each deployment is kept and can be restored with one click).

## 2. Custom domain + SSL + CDN

1. In the Pages project → **Custom domains → Add**, enter your domain.
   If the domain isn't on Cloudflare yet, add it (free plan) and point its
   nameservers at Cloudflare.
2. SSL is issued automatically; traffic is served from Cloudflare's CDN edge.
3. After the domain works, **replace `YOUR-DOMAIN`** in `robots.txt` and
   `sitemap.xml` with the real domain and push again.

## 3. Keep the admin panel private

`admin.html` writes to GitHub with your token and must not be public:

- **Easiest:** don't commit/deploy `admin.html` at all — keep using it as a
  local file on your PC (it talks to GitHub + Supabase directly, so it works
  from anywhere).
- **Or:** deploy it but protect the path with **Cloudflare Zero Trust → Access →
  Applications → Add** → path `/admin.html` → policy "Allow only
  achumkiir@gmail.com" (free for up to 50 users). `robots.txt` already blocks
  crawlers from it either way.

## 4. Google Analytics + Search Console

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com),
   copy the Measurement ID (`G-XXXXXXXXXX`).
2. In `wallpapers.html` `<head>` there is a **commented-out GA4 snippet** —
   paste your ID on both lines and uncomment it.
3. At [Google Search Console](https://search.google.com/search-console), add the
   domain property, verify via the DNS record Cloudflare offers to add for you,
   then submit `https://your-domain/sitemap.xml`.

## 5. Ads (when ready)

Apply at [Google AdSense](https://adsense.google.com). Approval needs a custom
domain, the legal pages (already on the site: About / Privacy / TOS / Copyright /
Contact), and some content + traffic history. Once approved, paste the AdSense
`<script>` snippet into `wallpapers.html`'s `<head>` next to the GA snippet.

## 6. Security checklist (mostly automatic)

| Item | How it's covered |
| --- | --- |
| SSL | Automatic with Pages / custom domain |
| DDoS protection | Automatic on every Cloudflare zone |
| Rate limiting | Dashboard → Security → WAF → Rate limiting rules (free tier: 1 rule) |
| Bot/CAPTCHA | Security → Bots → Bot Fight Mode (free). Cloudflare Turnstile if you ever add public forms |
| Security headers | Already set in `_headers` |
| Admin auth | Supabase login + GitHub token, plus Cloudflare Access (step 3) |
| Backups | `wallpapers.json` lives in git — full history. Supabase images: enable Storage backups or periodically download the bucket |

## 7. Later upgrades (optional, all Cloudflare)

- **Cloudflare R2** — move images off Supabase Storage to R2 (S3-compatible,
  zero egress fees) once the library grows; only `imageUrl()` in the two HTML
  files needs to change.
- **Cloudflare Images / Image Resizing** — server-side thumbnails and AVIF/WebP
  variants instead of shipping the original to every visitor.
- **Workers + KV** — a tiny API to make view/download counters global (they are
  per-browser today) and to serve a generated sitemap with one URL per wallpaper.
