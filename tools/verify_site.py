"""Live-site regression checks for 8K Wallpapers.

    python -I tools/verify_site.py https://8k-wallpapers.com
    python -I tools/verify_site.py https://<hash>.8k-wallpapers.pages.dev   # a preview

Read-only: GET requests only, nothing is posted. Run it against a preview
deploy before shipping, and against production after. (Cloudflare rejects
Python's default user agent, so every request sends a browser-like one.)
Not deployed — only public/ and functions/ are."""
import json, re, sys, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, parse_qs

B = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://8k-wallpapers.com"
UA = {"User-Agent": "Mozilla/5.0 (verify_site)"}
fails = []

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
_opener = urllib.request.build_opener(_NoRedirect)

def get(path, follow=True):
    url = path if path.startswith("http") else B + path
    req = urllib.request.Request(url, headers=UA)
    try:
        r = (urllib.request.urlopen if follow else _opener.open)(req, timeout=40)
        return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read().decode("utf-8", "replace")

def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  -- {detail}" if detail != "" else ""))
    if not cond: fails.append(name)

def jsonld(html):
    return [json.loads(m) for m in re.findall(r'(?s)<script type="application/ld\+json">(.*?)</script>', html)]

# ---- core pages
LIVE = urlparse(B).hostname == "8k-wallpapers.com"
for p in ["/", "/about", "/privacy", "/tos", "/copyright", "/contact", "/upload", "/guides", "/report",
          "/categories", "/robots.txt", "/sitemap.xml", "/feed.xml"] + (["/ads.txt"] if LIVE else []):
    s, h, _ = get(p)
    check(f"{p} 200", s == 200, s)
# ads.txt comes from the ADS_CLIENT secret, which only the production environment has
if LIVE:
    s, h, body = get("/ads.txt")
    check("ads.txt names the AdSense publisher", "pub-1600729162514032, DIRECT" in body, body[:80])

# ---- homepage
s, h, html = get("/")
check("home: one static canonical", html.count('<link rel="canonical"') == 1)
types = [n.get("@type") for x in jsonld(html) for n in x.get("@graph", [x])]
check("home: static WebSite + Organization JSON-LD", "WebSite" in types and "Organization" in types, types)
check("home: advertises the RSS feed", 'href="/feed.xml"' in html)

# ---- sitemap
s, h, xml = get("/sitemap.xml")
root = ET.fromstring(xml.encode())
ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9", "i": "http://www.google.com/schemas/sitemap-image/1.1"}
locs = [u.find("s:loc", ns).text for u in root.findall("s:url", ns)]
wp = [l for l in locs if "/wallpaper/" in l]
check("sitemap: well-formed, has categories + tags", any("/category/" in l for l in locs) and any("/tag/" in l for l in locs))
check("sitemap: one image per wallpaper page", len(root.findall(".//i:image", ns)) == len(wp), len(wp))
print(f"     sitemap: {len(locs)} URLs ({len(wp)} wallpapers)")

# ---- redirects + 404s
for path, want in [("/category/Anime", "/category/anime"), ("/category/anime?page=1", "/category/anime"),
                   ("/tag/anime", "/category/anime"), ("/tag/Samurai", "/tag/samurai"), ("/category", "/categories")]:
    s, h, _ = get(path, follow=False)
    check(f"{path} -> {want}", s in (301, 308) and h.get("location", "").rstrip("/").endswith(want), (s, h.get("location")))
for p in ["/category/not-a-category", "/tag/iphone", "/no-such-page-xyz", "/category/anime?page=99"]:
    s, h, html = get(p)
    check(f"{p} -> 404 with a real page", s == 404 and len(html) > 500, s)

# ---- security headers on server-rendered pages (Pages' _headers doesn't reach Functions)
for p in ["/", "/category/anime", "/api/wallpapers", wp[0].replace(B, "") if wp[0].startswith(B) else urlparse(wp[0]).path]:
    s, h, _ = get(p)
    miss = [k for k in ["strict-transport-security", "x-content-type-options", "x-frame-options", "referrer-policy"] if k not in h]
    check(f"security headers on {p[:40]}", not miss, miss)

# ---- category / tag pages
s, h, html = get("/category/anime")
check("category: cards + pager + JSON-LD", html.count('class="card"') == 48 and "?page=2" in html and len(jsonld(html)) == 2)
check("category: title leads with '<Name> Wallpapers 4K'", re.search(r"<title>Anime Wallpapers 4K — \d+ Free", html) is not None,
      re.search(r"<title>([^<]*)", html).group(1))
s, h, html = get("/tag/samurai")
check("tag page renders, indexable, related tags", s == 200 and 'content="index, follow' in html and html.count('href="/tag/') >= 5)

# ---- a wallpaper page
lib = json.loads(get("/api/wallpapers")[2])
def page_of(r):
    base = re.sub(r"[^a-z0-9]+", "-", (r.get("name") or "").lower()).strip("-")
    m = re.search(r"(\d{6,})(?=\.[a-z0-9]+$)", r["image_path"], re.I)
    return "/wallpaper/" + base + ("-" + m.group(1) if m else "")
row = next((r for r in lib if r.get("description")), lib[0])
s, h, html = get(page_of(row))
check("wallpaper page 200", s == 200, s)
title = re.search(r"<title>([^<]*)", html).group(1)
check("wallpaper title carries its size class", re.search(r"\b(4K|5K|8K|HD) Wallpaper — ", title) is not None
      or re.search(r"\b(4k|5k|8k|hd)\b", row["name"], re.I) is not None, title)
if row.get("description"):
    lead = re.search(r'<p class="lead">([^<]*)</p>', html).group(1)
    check("described wallpaper: lead is its description", lead.startswith(row["description"][:40].replace("&", "&amp;")[:30]), lead[:60])
share = re.search(r'class="share">(.*?)</div>', html)
check("share bar present, Pinterest pins the full image", share and "/images/" in parse_qs(urlparse(
      next(l for l in re.findall(r'href="([^"]+)"', share.group(1)) if "pinterest" in l).replace("&amp;", "&")).query)["media"][0])
check("no '>' inside onclick attributes", not re.search(r'onclick="[^"]*>', html))
check("wallpaper JSON-LD parses", [x["@type"] for x in jsonld(html)] == ["ImageObject", "BreadcrumbList"])
rel = re.findall(r'<a class="rel" href="([^"]+)"', html)
check("12 related wallpapers", len(rel) == 12, len(rel))

# ---- feed + IndexNow key
s, h, xml = get("/feed.xml")
items = ET.fromstring(xml.encode()).findall("./channel/item")
check("feed: 50 items, each with a full-size image", len(items) == 50 and xml.count("<media:content") == 50)
s, h, body = get("/584ed168b8af53862a5bae261ae5586a.txt")
check("IndexNow key file", s == 200 and body.strip() == "584ed168b8af53862a5bae261ae5586a")

print("\n" + ("ALL PASSED" if not fails else f"{len(fails)} FAILED: {fails}"))
sys.exit(1 if fails else 0)
