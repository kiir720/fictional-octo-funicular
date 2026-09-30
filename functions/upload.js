// GET /upload — public wallpaper submission page (server-rendered).
// Posts to /api/submit, which queues the image for review rather than
// publishing it. The rights checkbox is required by the API too, not just here.
const SITE = '8K Wallpapers';
const CATEGORIES = ['Abstract','Animals','Anime','Architecture','Bikes','Black/Dark','Cars','Celebrations',
  'CGI','Cute','Fantasy','Flowers','Food','Games','Gradients','Lifestyle','Love','Military','Minimal',
  'Movies','Music','Nature','People','Photography','Quotes','Sci-Fi','Space','Sports','Technology','World'];

export async function onRequestGet({ request }){
  const origin = new URL(request.url).origin;
  return new Response(page(origin), {
    // short cache: a 10-minute one meant edits to this page kept serving stale
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' }
  });
}

function svg(paths){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
}
const ICON = {
  upload: svg('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>'),
  user:   svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  tick:   svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>')
};

function page(origin){
  const opts = CATEGORIES.map(c => '<option value="' + c + '">' + c + '</option>').join('');
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Submit a Wallpaper | ${SITE}</title>
<meta name="description" content="Share your own wallpaper with the ${SITE} community. Upload an image you created or have the rights to, and we will review it before it goes live.">
<link rel="canonical" href="${origin}/upload">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0a0a0c">
<link rel="icon" href="/favicon.png" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${STYLE}
</head><body>
<header>
  <a class="logo" href="/"><b>8K</b> WALLPAPERS</a>
  <div class="hright">
    <span class="who" id="who"></span>
    <button class="allbtn" id="signout" hidden>Sign out</button>
    <a class="allbtn" href="/">Browse wallpapers</a>
  </div>
</header>

<main class="wrap">
  <p class="eyebrow">Contribute</p>
  <h1>Submit a wallpaper</h1>
  <p class="lead">Made something you want to share? Upload it here. Every submission is reviewed by hand
    before it appears on the site, so give it a good name and a few tags.</p>

  <div class="grid">
    <section>
      <div class="card gate" id="gate" hidden>
        <div class="gate-ico">${ICON.user}</div>
        <div>
          <h2>Sign in to submit</h2>
          <p>Signing in with Google lets us credit you and contact you about anything you upload.
            It takes a couple of seconds, and we never see your password.</p>
          <div id="gbtn"></div>
          <p class="signin-alt" id="signinAlt"></p>
        </div>
      </div>

      <form class="card" id="f" novalidate>
        <fieldset id="fs">
          <div class="fld">
            <span>Image</span>
            <div class="drop" id="drop">
              <input type="file" id="image" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Choose an image">
              <div class="drop-empty">
                <div class="drop-ico">${ICON.upload}</div>
                <b>Drop your image here</b>
                or <u>browse your files</u>
                <small>JPG, PNG, WebP or AVIF &middot; up to 15&nbsp;MB</small>
              </div>
              <div class="drop-full">
                <img id="prev" alt="Preview of the image you picked">
                <div>
                  <div class="fname" id="fname"></div>
                  <div class="chips" id="chips"></div>
                  <span class="change">Click or drop another file to change it</span>
                </div>
              </div>
            </div>
          </div>
          <p class="warn" id="resWarn" hidden>This image is smaller than Full HD (under 1920&nbsp;px on its
            long side), so it may look soft on large screens.</p>

          <label class="fld"><span>Name</span>
            <input type="text" id="name" maxlength="120" placeholder="e.g. Crimson Nebula" required></label>

          <div class="row">
            <label class="fld"><span>Category</span><select id="category">${opts}</select></label>
            <label class="fld"><span>Credit as <i>(optional)</i></span>
              <input type="text" id="uploader" maxlength="60" placeholder="Your name or handle"></label>
          </div>

          <label class="fld"><span>Tags <i>(comma separated)</i></span>
            <input type="text" id="tags" maxlength="200" placeholder="space, dark, minimal"></label>

          <label class="fld"><span>Source link <i>(optional)</i></span>
            <input type="url" id="source_url" maxlength="300" placeholder="https://… where it came from, if it isn't your own"></label>

          <input type="hidden" id="resolution">

          <label class="check"><input type="checkbox" id="rights">
            <span>I created this image, or I hold the rights to share it. I understand that uploading material
            I do not have the rights to is not permitted, that submissions are reviewed, and that accounts or
            addresses that repeatedly submit infringing material are blocked. See the
            <a href="/copyright">Copyright policy</a>.</span></label>

          <button type="submit" class="primary" id="go">Submit for review</button>
          <p class="msg" id="msg" role="status"></p>
        </fieldset>
      </form>

      <div class="card done" id="done" hidden>
        <div class="done-ico">${ICON.tick}</div>
        <h2>Thanks &mdash; it's in the review queue</h2>
        <p id="doneMsg"></p>
        <div class="done-actions">
          <button type="button" class="primary sm" id="again">Submit another</button>
          <a class="allbtn sm" href="/">Browse wallpapers</a>
        </div>
      </div>
    </section>

    <aside class="aside">
      <div class="card">
        <h3>Before you upload</h3>
        <ul class="tips">
          <li>${ICON.tick}<span><b>Your own work</b>, or an image you have the rights to share.</span></li>
          <li>${ICON.tick}<span><b>Bigger is better.</b> 4K (3840&nbsp;px) or more looks best on today's screens.</span></li>
          <li>${ICON.tick}<span><b>JPG, PNG, WebP or AVIF</b>, up to 15&nbsp;MB.</span></li>
          <li>${ICON.tick}<span><b>A clear name and a few tags</b> help people find it.</span></li>
        </ul>
      </div>
      <div class="card">
        <h3>What happens next</h3>
        <ol class="steps">
          <li><i>1</i><div><strong>It joins the review queue</strong><span>Nothing is published automatically.</span></div></li>
          <li><i>2</i><div><strong>A person checks it</strong><span>The rights, the image, and the details you gave.</span></div></li>
          <li><i>3</i><div><strong>It goes live</strong><span>Approved wallpapers join the library, free for everyone.</span></div></li>
        </ol>
      </div>
      <p class="policy">Found your own work here without permission? See the <a href="/copyright">Copyright policy</a>
        or <a href="/report">report an image</a>.</p>
    </aside>
  </div>
</main>

<footer><a href="/">${SITE}</a> &middot; <a href="/guides">Guides</a> &middot; <a href="/copyright">Copyright</a>
  &middot; <a href="/tos">Terms</a> &middot; <a href="/privacy">Privacy</a></footer>
${SCRIPT}
</body></html>`;
}

// One script for the whole page. Sign-in is Google Identity Services: the
// credential is exchanged for our own session cookie. When sign-in is required
// the form is locked (a disabled fieldset) until the visitor is signed in, so
// nobody fills everything in and only then finds out; when it isn't configured
// the page stays fully usable and submissions are anonymous.
// String.raw keeps the regex backslashes intact.
const SCRIPT = String.raw`<script>(function(){
var $ = function(id){ return document.getElementById(id); };
var f = $('f'), fs = $('fs'), gate = $('gate'), who = $('who'), out = $('signout'), alt = $('signinAlt'),
    go = $('go'), msg = $('msg'), done = $('done'), drop = $('drop'), img = $('image'), prev = $('prev'),
    fname = $('fname'), chips = $('chips'), warn = $('resWarn'), nameEl = $('name'), resEl = $('resolution');
var OK_TYPES = ['image/jpeg','image/png','image/webp','image/avif'];
var MAX_BYTES = 15 * 1024 * 1024;
var authRequired = false, signedIn = false, busy = false, prevUrl = null, gsiLoaded = false;

function say(t, k){ msg.textContent = t || ''; msg.className = 'msg ' + (k || ''); }
function setLocked(on){
  fs.disabled = on;
  f.classList.toggle('locked', on);
  go.textContent = on ? 'Sign in above to submit' : 'Submit for review';
}

// ---- account ----
function paint(me){
  authRequired = !!me.configured;
  signedIn = !!me.user;
  who.textContent = '';
  if(me.user){
    gate.hidden = true; out.hidden = false;
    var label = me.user.name || me.user.email || 'Signed in';
    if(me.user.picture){
      var im = document.createElement('img');
      im.src = me.user.picture; im.alt = ''; im.referrerPolicy = 'no-referrer';
      im.onerror = function(){ im.remove(); };
      who.appendChild(im);
    }
    var sp = document.createElement('span'); sp.textContent = label; who.appendChild(sp);
    $('uploader').placeholder = 'Leave blank to use ' + label;
    setLocked(false);
  } else if(me.configured){
    gate.hidden = false; out.hidden = true;
    setLocked(true);
    loadGsi(me.client_id);
  } else {
    gate.hidden = true; out.hidden = true;
    setLocked(false);
  }
}
function loadGsi(cid){
  if(gsiLoaded) return; gsiLoaded = true;
  var s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = function(){
    try {
      google.accounts.id.initialize({ client_id: cid, callback: function(r){
        alt.textContent = 'Signing you in…';
        fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: r.credential }) })
          .then(function(x){ return x.json().then(function(d){ return { ok: x.ok, d: d }; }); })
          .then(function(res){
            if(res.ok){ alt.textContent = ''; refresh(); }
            else alt.textContent = (res.d && res.d.error) || 'Sign-in failed.';
          })
          .catch(function(){ alt.textContent = 'Could not reach the server.'; });
      }});
      google.accounts.id.renderButton($('gbtn'),
        { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', width: 300 });
    } catch(e){ alt.textContent = 'Google sign-in could not load.'; }
  };
  s.onerror = function(){ alt.textContent = 'Google sign-in could not load — a content or tracker blocker may be stopping it.'; };
  document.head.appendChild(s);
}
function refresh(){
  fetch('/api/auth/me', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(paint).catch(function(){});
}
out.addEventListener('click', function(){
  fetch('/api/auth/logout', { method: 'POST' }).then(function(){ location.reload(); });
});
refresh();

// ---- the image: dropped or browsed, previewed in place ----
function tier(w, h){
  var e = Math.max(w, h);
  return e >= 7680 ? '8K' : e >= 5120 ? '5K' : e >= 3840 ? '4K' : e >= 2560 ? 'QHD' : e >= 1920 ? 'Full HD' : '';
}
function chip(text, cls){
  var c = document.createElement('span');
  c.className = 'chip' + (cls ? ' ' + cls : ''); c.textContent = text;
  chips.appendChild(c);
}
function sizeLabel(n){ return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function clearImage(){
  if(prevUrl){ URL.revokeObjectURL(prevUrl); prevUrl = null; }
  img.value = ''; prev.removeAttribute('src'); resEl.value = '';
  drop.classList.remove('has'); warn.hidden = true; chips.textContent = ''; fname.textContent = '';
}
['dragenter', 'dragover'].forEach(function(t){ drop.addEventListener(t, function(){ drop.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function(t){ drop.addEventListener(t, function(){ drop.classList.remove('over'); }); });
img.addEventListener('change', function(){
  var file = img.files && img.files[0];
  if(!file){ clearImage(); return; }
  if(OK_TYPES.indexOf(file.type) === -1){ clearImage(); say('Use a JPG, PNG, WebP or AVIF image.', 'err'); return; }
  if(file.size > MAX_BYTES){ clearImage(); say('That image is larger than 15 MB.', 'err'); return; }
  say('');
  if(prevUrl) URL.revokeObjectURL(prevUrl);
  prevUrl = URL.createObjectURL(file);
  prev.src = prevUrl;
  drop.classList.add('has');
  fname.textContent = file.name;
  chips.textContent = ''; warn.hidden = true; resEl.value = '';
  chip(sizeLabel(file.size));
  // read the real pixel size so the listing shows a true resolution
  var probe = new Image();
  probe.onload = function(){
    var w = probe.naturalWidth, h = probe.naturalHeight, t = tier(w, h);
    resEl.value = w + 'x' + h;
    chips.textContent = '';
    chip(w + ' × ' + h);
    if(t) chip(t, 'tier'); else { chip('Below Full HD', 'low'); warn.hidden = false; }
    chip(sizeLabel(file.size));
  };
  probe.src = prevUrl;
  if(!nameEl.value.trim()){
    nameEl.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/\b\w/g, function(c){ return c.toUpperCase(); });
  }
});

// ---- submit ----
f.addEventListener('submit', function(e){
  e.preventDefault();
  if(busy) return;
  if(authRequired && !signedIn){ say('Please sign in first.', 'err'); return; }
  if(!img.files || !img.files[0]){ say('Please choose an image.', 'err'); return; }
  if(nameEl.value.trim().length < 2){ say('Please give it a name.', 'err'); nameEl.focus(); return; }
  if(!$('rights').checked){ say('Please confirm you have the right to share this image.', 'err'); return; }
  var fd = new FormData();
  fd.append('image', img.files[0]);
  ['name', 'category', 'tags', 'uploader', 'source_url', 'resolution'].forEach(function(k){
    fd.append(k, ($(k) || {}).value || '');
  });
  fd.append('rights', 'on');
  busy = true; go.disabled = true; go.textContent = 'Uploading…'; say('');
  fetch('/api/submit', { method: 'POST', body: fd })
    .then(function(r){
      return r.json().then(function(d){ return { ok: r.ok, d: d }; }, function(){ return { ok: r.ok, d: {} }; });
    })
    .then(function(res){
      if(!res.ok){ say((res.d && res.d.error) || 'Upload failed. Please try again.', 'err'); return; }
      $('doneMsg').textContent = (res.d && res.d.message) || 'A person will look at it before it appears on the site.';
      f.reset(); clearImage();
      f.hidden = true; done.hidden = false;
      done.scrollIntoView({ block: 'center' });
    })
    .catch(function(){ say('Could not reach the server. Check your connection.', 'err'); })
    .then(function(){ busy = false; go.disabled = false; go.textContent = 'Submit for review'; });
});
$('again').addEventListener('click', function(){ done.hidden = true; f.hidden = false; say(''); });
})();</script>`;

const STYLE = `<style>
:root{--ink:#0a0a0c;--surface:#121216;--surface-2:#1b1b21;--line:#272730;--text:rgba(255,255,255,.95);
  --muted:#98a0ae;--dim:#6b7280;--accent:#6366f1;--accent-2:#818cf8;--good:#7ee29a;--bad:#ff8080;--warn:#fbbf24}
*{margin:0;padding:0;box-sizing:border-box}
[hidden]{display:none!important}
body{background:var(--ink);color:var(--text);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;
  line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
svg{display:block}
/* --- header --- */
header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 24px;
  background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.logo{font-size:19px;font-weight:700}.logo b{color:var(--accent)}
.hright{display:flex;align-items:center;gap:10px}
.allbtn{display:inline-block;background:var(--surface-2);border:1px solid var(--line);padding:8px 14px;border-radius:8px;
  font-size:13px;font-weight:600;color:var(--text);font-family:inherit;cursor:pointer;transition:border-color .15s}
.allbtn:hover{border-color:var(--accent)}
.who{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}
.who img{width:27px;height:27px;border-radius:50%;border:1px solid var(--line)}
/* --- page frame --- */
.wrap{max-width:1080px;margin:0 auto;padding:40px 24px 80px}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:var(--accent-2);
  padding-bottom:7px;margin-bottom:14px;border-bottom:2px solid var(--accent);display:inline-block}
h1{font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-.8px;line-height:1.08;margin-bottom:10px}
.lead{color:var(--muted);font-size:15px;max-width:60ch;margin-bottom:28px}
.grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,.9fr);gap:26px;align-items:start}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:24px}
/* --- sign-in gate --- */
.gate{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;border-color:rgba(99,102,241,.45);
  background:linear-gradient(180deg,rgba(99,102,241,.1),rgba(99,102,241,0) 75%),var(--surface)}
.gate-ico,.drop-ico{display:grid;place-items:center;color:var(--accent-2);flex:0 0 auto}
.gate-ico{width:42px;height:42px;border-radius:11px;background:rgba(99,102,241,.16)}
.gate-ico svg,.drop-ico svg{width:21px;height:21px}
.gate h2{font-size:16.5px;font-weight:700;margin-bottom:4px}
.gate p{color:var(--muted);font-size:13.5px;margin-bottom:14px;max-width:52ch}
#gbtn{min-height:44px}
.gate .signin-alt{color:var(--dim);font-size:12.5px;margin:8px 0 0}
/* --- form --- */
fieldset{border:0;min-width:0}
form.locked fieldset{opacity:.42;filter:saturate(.6)}
.fld{display:block;margin-bottom:18px}
.fld>span{display:block;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;
  color:var(--muted);margin-bottom:8px}
.fld>span i{font-weight:500;font-style:normal;text-transform:none;letter-spacing:0;color:var(--dim)}
input[type=text],input[type=url],select{width:100%;background:var(--ink);border:1px solid var(--line);
  border-radius:10px;color:#fff;padding:12px 14px;font-size:14.5px;font-family:inherit;outline:none;
  transition:border-color .15s,background .15s}
input::placeholder{color:#5c6472}
input:focus,select:focus{border-color:var(--accent);background:var(--surface-2)}
select{appearance:none;-webkit-appearance:none;cursor:pointer;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2398a0ae' stroke-width='2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat:no-repeat;background-position:right 12px center;background-size:17px;padding-right:38px}
select option{background:#1b1b21}
.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
/* --- drop zone: empty, then the picked image in place --- */
.drop{position:relative;border:1.5px dashed #3a4152;border-radius:12px;background:var(--ink);overflow:hidden;
  transition:border-color .15s,background .15s}
.drop:hover,.drop.over,.drop:focus-within{border-color:var(--accent);background:rgba(99,102,241,.06)}
.drop.has{border-style:solid;border-color:var(--line);background:var(--ink)}
.drop.has:hover,.drop.has.over{border-color:var(--accent)}
.drop input{position:absolute;inset:0;z-index:2;opacity:0;width:100%;height:100%;cursor:pointer}
fieldset:disabled .drop input{cursor:not-allowed}
.drop-empty{padding:32px 16px;text-align:center;color:var(--muted);font-size:13.5px}
.drop-ico{width:46px;height:46px;margin:0 auto 12px;border-radius:12px;background:var(--surface-2)}
.drop-empty b{display:block;color:var(--text);font-size:15px;font-weight:700;margin-bottom:2px}
.drop-empty u{color:var(--accent-2);text-decoration:none;border-bottom:1px solid rgba(129,140,248,.5)}
.drop-empty small{display:block;margin-top:10px;font-size:12px;color:var(--dim)}
.drop-full{display:grid;grid-template-columns:176px minmax(0,1fr);gap:16px;align-items:center;padding:12px}
.drop:not(.has) .drop-full,.drop.has .drop-empty{display:none}
#prev{width:176px;aspect-ratio:16/10;object-fit:cover;border-radius:8px;background:var(--surface-2);display:block}
.fname{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.chip{font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:6px;background:var(--surface-2);
  border:1px solid var(--line);color:var(--muted);font-variant-numeric:tabular-nums}
.chip.tier{background:var(--accent);border-color:var(--accent);color:#fff}
.chip.low{background:var(--warn);border-color:var(--warn);color:#1a1204}
.change{display:block;margin-top:10px;font-size:12.5px;color:var(--accent-2)}
.warn{margin:-8px 0 18px;font-size:12.5px;line-height:1.5;color:var(--warn)}
/* --- rights checkbox --- */
.check{display:flex;gap:12px;align-items:flex-start;margin:4px 0 20px;font-size:13px;color:var(--muted);
  line-height:1.6;background:var(--ink);border:1px solid var(--line);border-radius:10px;padding:14px 15px;cursor:pointer}
.check input{margin-top:3px;width:17px;height:17px;accent-color:var(--accent);flex-shrink:0;cursor:pointer}
.check a{color:var(--accent-2);text-decoration:underline}
/* --- buttons + messages --- */
.primary{display:inline-flex;align-items:center;justify-content:center;width:100%;padding:14px;border-radius:10px;
  border:none;background:var(--accent);color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;
  transition:filter .15s,transform .12s}
.primary:hover:not(:disabled){filter:brightness(1.1)}
.primary:active:not(:disabled){transform:translateY(1px)}
.primary:disabled{opacity:.55;cursor:not-allowed}
.sm{width:auto;padding:11px 18px;font-size:14px}
.msg{margin-top:14px;font-size:13.5px;min-height:20px;text-align:center}
.msg.err{color:var(--bad)}.msg.ok{color:var(--good)}
/* --- sent --- */
.done{text-align:center;padding:44px 24px}
.done-ico{width:54px;height:54px;border-radius:50%;margin:0 auto 16px;background:rgba(126,226,154,.14);
  color:var(--good);display:grid;place-items:center}
.done-ico svg{width:26px;height:26px}
.done h2{font-size:21px;font-weight:700;margin-bottom:6px}
.done p{color:var(--muted);font-size:14px;max-width:46ch;margin:0 auto}
.done-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px}
/* --- side column --- */
.aside{display:grid;gap:16px;position:sticky;top:80px}
.aside h3{font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.tips{list-style:none;display:grid;gap:12px}
.tips li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:10px;font-size:13.5px;line-height:1.5;color:#c4c8cf}
.tips svg{width:18px;height:18px;color:var(--good);margin-top:1px}
.tips b{color:var(--text);font-weight:600}
.steps{list-style:none;display:grid;gap:16px}
.steps li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:12px}
.steps i{width:24px;height:24px;border-radius:50%;border:1px solid var(--line);background:var(--surface-2);
  display:grid;place-items:center;font-style:normal;font-size:11.5px;font-weight:700;color:var(--muted)}
.steps strong{display:block;font-size:13.5px;font-weight:600}
.steps span{display:block;font-size:12.5px;color:var(--muted)}
.policy{font-size:12.5px;color:var(--muted);line-height:1.6;padding:0 4px}
.policy a{color:var(--accent-2);text-decoration:underline}
footer{text-align:center;color:var(--muted);font-size:13px;padding:26px;border-top:1px solid var(--line)}
footer a:hover{color:var(--accent-2)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(max-width:900px){.grid{grid-template-columns:1fr}.aside{position:static}}
@media(max-width:560px){.wrap{padding:28px 16px 64px}.card{padding:18px}.row{grid-template-columns:1fr}
  .gate{flex-direction:column}.drop-full{grid-template-columns:1fr}#prev{width:100%}
  header{padding:10px 14px}.who span{display:none}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>`;
