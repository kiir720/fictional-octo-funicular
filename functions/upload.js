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
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' }
  });
}

function page(origin){
  const opts = CATEGORIES.map(c => '<option value="' + c + '">' + c + '</option>').join('');
  return '<!DOCTYPE html><html lang="en"><head>'
  + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<title>Submit a Wallpaper | ' + SITE + '</title>'
  + '<meta name="description" content="Share your own wallpaper with the ' + SITE + ' community. Upload an image you created or have the rights to, and we will review it before it goes live.">'
  + '<link rel="canonical" href="' + origin + '/upload">'
  + '<meta name="robots" content="index, follow">'
  + '<meta name="theme-color" content="#0f1116">'
  + STYLE + '</head><body>'
  + '<header><a class="logo" href="/"><b>8K</b> WALLPAPERS</a>'
    + '<a class="allbtn" href="/">Browse wallpapers</a></header>'
  + '<main>'
    + '<h1>Submit a wallpaper</h1>'
    + '<p class="lead">Made something you want to share? Upload it here. Every submission is reviewed '
      + 'by hand before it appears on the site, so give it a good name and a few tags.</p>'

    + '<form id="f" novalidate>'
      + '<label class="fld"><span>Image</span>'
        + '<div class="drop" id="drop"><input type="file" id="image" name="image" accept="image/jpeg,image/png,image/webp,image/avif" required>'
        + '<span class="drop-t" id="dropT">Choose a JPG, PNG, WebP or AVIF &middot; up to 15&nbsp;MB</span></div>'
        + '<img id="prev" alt="" hidden></label>'

      + '<label class="fld"><span>Name</span>'
        + '<input type="text" id="name" name="name" maxlength="120" placeholder="e.g. Crimson Nebula" required></label>'

      + '<div class="row">'
        + '<label class="fld"><span>Category</span><select id="category" name="category">' + opts + '</select></label>'
        + '<label class="fld"><span>Resolution</span><input type="text" id="resolution" name="resolution" placeholder="detected automatically" readonly></label>'
      + '</div>'

      + '<label class="fld"><span>Tags</span>'
        + '<input type="text" id="tags" name="tags" maxlength="200" placeholder="space, dark, minimal (comma separated)"></label>'

      + '<label class="fld"><span>Your name <i>(optional &mdash; shown as the credit)</i></span>'
        + '<input type="text" id="uploader" name="uploader" maxlength="60" placeholder="How you want to be credited"></label>'

      + '<label class="fld"><span>Source link <i>(optional)</i></span>'
        + '<input type="url" id="source_url" name="source_url" maxlength="300" placeholder="https://… where it came from, if not your own"></label>'

      + '<label class="check"><input type="checkbox" id="rights" name="rights" required>'
        + '<span>I created this image, or I hold the rights to share it. I understand that uploading '
        + 'material I do not have the rights to is not permitted, that submissions are reviewed, and that '
        + 'accounts or addresses that repeatedly submit infringing material are blocked. '
        + 'See the <a href="/#copyright">Copyright policy</a>.</span></label>'

      + '<button type="submit" id="go">Submit for review</button>'
      + '<p class="msg" id="msg"></p>'
    + '</form>'
  + '</main>'
  + '<footer><a href="/">' + SITE + '</a> &middot; <a href="/#copyright">Copyright</a> &middot; <a href="/#tos">Terms</a></footer>'
  + SCRIPT + '</body></html>';
}

const SCRIPT = '<script>(function(){'
+ 'var f=document.getElementById("f"),img=document.getElementById("image"),prev=document.getElementById("prev"),'
+ 'dropT=document.getElementById("dropT"),msg=document.getElementById("msg"),go=document.getElementById("go"),'
+ 'nameEl=document.getElementById("name"),resEl=document.getElementById("resolution");'
+ 'function say(t,k){msg.textContent=t;msg.className="msg "+(k||"");}'
+ 'img.addEventListener("change",function(){'
  + 'var file=img.files&&img.files[0];if(!file)return;'
  + 'if(file.size>15*1024*1024){say("That image is larger than 15 MB.","err");img.value="";return;}'
  + 'dropT.textContent=file.name+" \\u00b7 "+Math.round(file.size/1024)+" KB";'
  + 'var u=URL.createObjectURL(file);prev.src=u;prev.hidden=false;'
  // read the real pixel size so the listing shows a true resolution
  + 'var probe=new Image();probe.onload=function(){resEl.value=probe.naturalWidth+"x"+probe.naturalHeight;URL.revokeObjectURL(u);};probe.src=u;'
  + 'if(!nameEl.value.trim()){nameEl.value=file.name.replace(/\\.[^.]+$/,"").replace(/[_-]+/g," ").replace(/\\b\\w/g,function(c){return c.toUpperCase();});}'
  + 'say("");'
+ '});'
+ 'f.addEventListener("submit",function(e){'
  + 'e.preventDefault();'
  + 'if(!img.files||!img.files[0]){say("Please choose an image.","err");return;}'
  + 'if(!nameEl.value.trim()){say("Please give it a name.","err");return;}'
  + 'if(!document.getElementById("rights").checked){say("Please confirm you have the right to share this image.","err");return;}'
  + 'var fd=new FormData();'
  + 'fd.append("image",img.files[0]);'
  + '["name","category","tags","uploader","source_url","resolution"].forEach(function(k){fd.append(k,(document.getElementById(k)||{}).value||"");});'
  + 'fd.append("rights","on");'
  + 'go.disabled=true;go.textContent="Uploading\\u2026";say("");'
  + 'fetch("/api/submit",{method:"POST",body:fd}).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})'
  + '.then(function(res){'
    + 'if(!res.ok){say((res.d&&res.d.error)||"Upload failed. Please try again.","err");return;}'
    + 'f.reset();prev.hidden=true;dropT.textContent="Choose a JPG, PNG, WebP or AVIF \\u00b7 up to 15 MB";'
    + 'say((res.d&&res.d.message)||"Thanks! Your wallpaper is queued for review.","ok");'
  + '}).catch(function(){say("Could not reach the server. Check your connection.","err");})'
  + '.then(function(){go.disabled=false;go.textContent="Submit for review";});'
+ '});'
+ '})();</script>';

const STYLE = '<style>'
+ '*{margin:0;padding:0;box-sizing:border-box}'
+ 'body{background:#0f1116;color:rgba(255,255,255,.95);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.5}'
+ 'a{color:inherit;text-decoration:none}'
+ 'header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 28px;background:#171a21;border-bottom:1px solid #2b303c}'
+ '.logo{font-size:22px;font-weight:800}.logo b{color:#6366f1}'
+ '.allbtn{background:#21252f;border:1px solid #2b303c;padding:9px 16px;border-radius:100px;font-size:13px;font-weight:600}'
+ '.allbtn:hover{border-color:#6366f1}'
+ 'main{max-width:640px;margin:0 auto;padding:30px 22px 70px}'
+ 'h1{font-size:26px;font-weight:800;letter-spacing:-.3px;margin-bottom:8px}'
+ '.lead{color:#c4c8cf;font-size:15px;margin-bottom:26px}'
+ '.fld{display:block;margin-bottom:16px}'
+ '.fld>span{display:block;font-size:13px;font-weight:700;color:rgba(255,255,255,.72);margin-bottom:7px}'
+ '.fld>span i{font-weight:500;font-style:normal;color:rgba(255,255,255,.45)}'
+ 'input[type=text],input[type=url],select{width:100%;background:#171a21;border:1px solid #2b303c;border-radius:10px;'
  + 'color:#fff;padding:12px 13px;font-size:14px;font-family:inherit;outline:none}'
+ 'input[readonly]{color:rgba(255,255,255,.5)}'
+ 'input:focus,select:focus{border-color:#6366f1}'
+ '.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
+ '.drop{position:relative;border:1px dashed #3a4152;border-radius:12px;background:#171a21;padding:22px 14px;text-align:center;cursor:pointer}'
+ '.drop:hover{border-color:#6366f1}'
+ '.drop input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}'
+ '.drop-t{font-size:13px;color:rgba(255,255,255,.6)}'
+ '#prev{width:100%;margin-top:10px;border-radius:12px;border:1px solid #2b303c;display:block}'
+ '.check{display:flex;gap:11px;align-items:flex-start;margin:6px 0 20px;font-size:13px;color:#c4c8cf;line-height:1.55}'
+ '.check input{margin-top:3px;width:17px;height:17px;accent-color:#6366f1;flex-shrink:0}'
+ '.check a{color:#818cf8;text-decoration:underline}'
+ 'button{width:100%;padding:14px;border-radius:12px;border:none;background:#6366f1;color:#fff;'
  + 'font-size:15px;font-weight:700;font-family:inherit;cursor:pointer}'
+ 'button:hover{box-shadow:0 10px 24px rgba(99,102,241,.4)}'
+ 'button:disabled{opacity:.6;cursor:default;box-shadow:none}'
+ '.msg{margin-top:14px;font-size:13.5px;min-height:20px}'
+ '.msg.err{color:#ff8080}.msg.ok{color:#7ee29a}'
+ 'footer{text-align:center;color:rgba(255,255,255,.55);font-size:13px;padding:24px;border-top:1px solid #2b303c}'
+ 'footer a:hover{color:#818cf8}'
+ '@media(max-width:560px){.row{grid-template-columns:1fr}}'
+ '</style>';
