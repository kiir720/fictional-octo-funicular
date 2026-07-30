# OBSOLETE — replaced by the all-Cloudflare setup (2026-07-02)

This document described the old "GitHub-hybrid" architecture (wallpaper list in a
GitHub `wallpapers.json` committed with a personal access token + image files in
Supabase Storage). That setup is **gone**:

- GitHub tokens kept expiring / losing permissions (401s and 403s locked the
  admin out), and Supabase was a second account to maintain.
- The wallpaper list and the image files now both live in **Cloudflare Workers
  KV**, behind a small API served by the same Cloudflare Pages project as the
  site itself. The admin signs in with one `ADMIN_KEY` secret.

See **CLOUDFLARE-SETUP.md** for the current architecture, the API reference, and
day-to-day instructions.
