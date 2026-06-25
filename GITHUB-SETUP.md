# 8K Wallpapers — GitHub setup

The wallpaper **list** now lives in `wallpapers.json` in a GitHub repo (no database, no
Supabase RLS). The image **files** still live in your Supabase Storage bucket. This is the
"hybrid" setup.

- **Public page** (`wallpapers.html`) reads `wallpapers.json` from GitHub's raw CDN — no
  login, no token.
- **Admin page** (`admin.html`) commits to `wallpapers.json` with a GitHub token, and
  uploads image files to Supabase Storage (your existing email/password sign-in).

---

## One-time setup

### 1. Create a GitHub repo
Create a repo to hold the site, e.g. `8k-wallpapers`.

> **The repo must be PUBLIC.** The public page reads `wallpapers.json` over the raw CDN
> with no token, which only works for public repos. (Image files are served by Supabase,
> so they're public regardless.)

Commit at least `wallpapers.json` (already seeded with `[]`). Committing `wallpapers.html`
and `admin.html` too lets you host the site on GitHub Pages later.

### 2. Point both pages at your repo
Edit the constants near the top of **both** `wallpapers.html` and `admin.html`:

```js
const GH_OWNER  = 'your-github-username';
const GH_REPO   = 'your-repo-name';
const GH_BRANCH = 'main';            // or 'master', whatever your default branch is
const GH_FILE   = 'wallpapers.json';
```

### 3. Create a GitHub token (admin only)
GitHub → **Settings → Developer settings → Fine-grained personal access tokens → Generate**:
- **Repository access:** Only select repositories → your wallpapers repo.
- **Permissions → Repository permissions → Contents:** **Read and write**.
- Generate and copy the token (`github_pat_…`).

### 4. Use the admin page
Open `admin.html`, then on the lock screen:
- Email + password = your existing Supabase admin login (authorizes image uploads).
- GitHub token = the token from step 3 (authorizes writing `wallpapers.json`).

The token is stored **only in that browser's localStorage** — it is never committed or
uploaded anywhere except GitHub's own API. Keep `admin.html` private; don't deploy it
publicly with a token baked in.

---

## How it behaves
- **Publish:** image → Supabase Storage, then a new entry is prepended to `wallpapers.json`
  on GitHub.
- **Delete:** entry removed from `wallpapers.json`, then the Storage file is removed
  (best-effort).
- **Public page freshness:** GitHub's raw CDN caches files for up to ~5 minutes, so a new
  post can take up to a few minutes to appear publicly. The page polls every 60s. (The
  admin reads via the GitHub API, so it sees its own changes immediately.)

## Notes / gotchas
- If you change the default branch, update `GH_BRANCH` in both files.
- A token with only **read** access will publish-fail with a 403 — it needs Contents
  **write**.
- Fine-grained tokens can be set to expire; if publishing suddenly 401s, generate a new
  one and re-paste it on the lock screen.
