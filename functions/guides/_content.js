// Editorial guides. Written content, not templated filler — this is the part of
// the site that is prose rather than a gallery listing, so it is deliberately
// specific: real resolutions, real steps, real numbers.
//
// Rendered by functions/guides/_render.js at /guides and /guides/<slug>.

export const GUIDES = {

  // ------------------------------------------------------------------
  'wallpaper-resolution': {
    title: 'How to Pick the Right Wallpaper Resolution for Your Screen',
    desc: 'Find your screen resolution, understand what happens when a wallpaper is too small or too large, and pick a size that stays sharp.',
    updated: '17 August 2026',
    body:
      "<p class='lead'>A wallpaper looks bad for one of two reasons: it is smaller than your screen and has been stretched, or it is a different shape than your screen and has been cropped. Both are avoidable once you know the number your display actually wants.</p>"

      + "<h2>Find your screen resolution first</h2>"
      + "<p>Everything else follows from this number. It is measured in pixels, written as width &times; height.</p>"
      + "<ul>"
      + "<li><b>Windows 11 and 10</b> &mdash; Settings &rsaquo; System &rsaquo; Display &rsaquo; Display resolution. The entry marked <i>(Recommended)</i> is your panel's native resolution.</li>"
      + "<li><b>macOS</b> &mdash; Apple menu &rsaquo; System Settings &rsaquo; Displays. Hold Option and click <i>Scaled</i> to see the true pixel dimensions rather than the scaled description.</li>"
      + "<li><b>iPhone and Android</b> &mdash; you rarely need to look this up. Use a portrait wallpaper and the phone handles the rest.</li>"
      + "</ul>"
      + "<p>On this site you do not have to look it up at all: the download panel on every wallpaper offers a <b>Your screen</b> option that reads your display's real pixel dimensions and resizes the file to match.</p>"

      + "<h2>The resolutions that actually matter</h2>"
      + "<table class='g-table'>"
      + "<tr><th>Name</th><th>Pixels</th><th>Typically</th></tr>"
      + "<tr><td>Full HD (1080p)</td><td>1920 &times; 1080</td><td>Most laptops, older monitors</td></tr>"
      + "<tr><td>QHD (1440p)</td><td>2560 &times; 1440</td><td>27-inch monitors, gaming displays</td></tr>"
      + "<tr><td>4K UHD</td><td>3840 &times; 2160</td><td>Modern monitors and TVs</td></tr>"
      + "<tr><td>5K</td><td>5120 &times; 2880</td><td>27-inch iMac, Studio Display</td></tr>"
      + "<tr><td>8K</td><td>7680 &times; 4320</td><td>High-end displays and TVs</td></tr>"
      + "<tr><td>Ultrawide</td><td>3440 &times; 1440</td><td>21:9 monitors</td></tr>"
      + "<tr><td>Super ultrawide</td><td>5120 &times; 1440</td><td>32:9 monitors</td></tr>"
      + "</table>"

      + "<h2>Bigger is safe. Smaller is not.</h2>"
      + "<p>Downscaling a wallpaper is lossless in the way that matters &mdash; a 4K image shown on a 1080p screen simply has more detail than the screen can display, and it looks perfect. Upscaling is the opposite: the operating system invents pixels that were never captured, and the result is soft edges and mushy detail.</p>"
      + "<p>So when in doubt, take the larger file. The only cost is disk space and a slightly longer download. That is why an 8K wallpaper is a reasonable choice even on a 1080p laptop &mdash; and why a 1280 &times; 720 image will never look right on a 4K monitor no matter what you do to it.</p>"

      + "<h2>The Retina and high-DPI catch</h2>"
      + "<p>This is the part that trips people up. A MacBook Pro might report its resolution as 1728 &times; 1117, but the physical panel has roughly twice that many pixels in each direction. The operating system is describing <i>logical</i> points, not physical pixels, because everything on screen is drawn at 2&times; scale.</p>"
      + "<p>The practical consequence: if you download a wallpaper matching the number macOS shows you, it will look soft, because the display actually needs double. The rule for any Retina Mac, high-DPI Windows laptop, or modern phone is to take a wallpaper at least twice the logical resolution. Our <b>Your screen</b> option already multiplies by your device pixel ratio, so it accounts for this automatically.</p>"

      + "<h2>Shape matters as much as size</h2>"
      + "<p>A 4K wallpaper on an ultrawide monitor is still wrong, because 3840 &times; 2160 is 16:9 and an ultrawide is 21:9. The system will either crop the top and bottom or stretch the width, and neither is what the image was meant to look like.</p>"
      + "<p>Match the aspect ratio and the size takes care of itself:</p>"
      + "<ul>"
      + "<li><b>16:9</b> &mdash; the standard for laptops, monitors and TVs</li>"
      + "<li><b>16:10</b> &mdash; many MacBooks and some Windows laptops; slightly taller</li>"
      + "<li><b>21:9 and 32:9</b> &mdash; ultrawide and super ultrawide monitors</li>"
      + "<li><b>9:16 and 9:19.5</b> &mdash; phones held upright</li>"
      + "</ul>"
      + "<p>You can filter this gallery by orientation and by exact resolution from the sidebar, which is the quickest way to see only wallpapers that fit your display.</p>"

      + "<h2>A short answer</h2>"
      + "<p>If you want one rule: pick the largest file offered, unless your screen is ultrawide, in which case pick a wallpaper that is ultrawide too. Everything else is detail.</p>"
  },

  // ------------------------------------------------------------------
  '4k-5k-8k-explained': {
    title: 'What 4K, 5K and 8K Actually Mean',
    desc: 'The real pixel counts behind the marketing names, where the terms came from, and when the difference is visible to you.',
    updated: '17 August 2026',
    body:
      "<p class='lead'>The names are marketing shorthand, and they are not consistent. Knowing what each one really refers to makes it much easier to tell when a higher number is worth caring about and when it is not.</p>"

      + "<h2>Where the K comes from</h2>"
      + "<p>Older naming conventions counted horizontal lines: 1080p meant 1,080 rows of pixels, 720p meant 720. The K names switched to counting the <i>width</i> instead, in roughly thousands of pixels. 4K is about four thousand pixels wide. That change is the source of most of the confusion, because it means 1080p and 4K are measured along different axes.</p>"

      + "<h2>The numbers</h2>"
      + "<table class='g-table'>"
      + "<tr><th>Name</th><th>Pixels</th><th>Total</th><th>vs 1080p</th></tr>"
      + "<tr><td>Full HD</td><td>1920 &times; 1080</td><td>2.1 million</td><td>&mdash;</td></tr>"
      + "<tr><td>QHD / 1440p</td><td>2560 &times; 1440</td><td>3.7 million</td><td>1.8&times;</td></tr>"
      + "<tr><td>4K UHD</td><td>3840 &times; 2160</td><td>8.3 million</td><td>4&times;</td></tr>"
      + "<tr><td>5K</td><td>5120 &times; 2880</td><td>14.7 million</td><td>7&times;</td></tr>"
      + "<tr><td>8K</td><td>7680 &times; 4320</td><td>33.2 million</td><td>16&times;</td></tr>"
      + "</table>"
      + "<p>Note that each step up doubles the pixels in <i>both</i> directions, which quadruples the total. 4K is not twice 1080p &mdash; it is four times. And 8K is sixteen times, which is why 8K files are so much larger.</p>"

      + "<h2>4K is not always 4K</h2>"
      + "<p>There are two different 4K standards. Consumer displays and TVs use <b>UHD</b>, 3840 &times; 2160, which is exactly double 1080p in each direction and keeps the familiar 16:9 shape. Cinema uses <b>DCI 4K</b>, 4096 &times; 2160, which is slightly wider at roughly 17:9.</p>"
      + "<p>Almost everything sold as a 4K monitor is UHD. When a wallpaper here is labelled 4K, it means 3840 &times; 2160.</p>"

      + "<h2>When can you actually see the difference?</h2>"
      + "<p>Resolution alone does not determine sharpness &mdash; what matters is pixel density combined with viewing distance. A 32-inch 4K monitor at desk distance has visibly finer detail than a 32-inch 1080p one. The same 4K panel as a television across a room is much harder to distinguish from 1440p.</p>"
      + "<p>For wallpapers specifically there is a second reason to go higher than your screen strictly needs: a larger source survives cropping. If a 16:9 image gets cropped to fit a different shape, or you move it to a bigger monitor later, the extra pixels are what keep it sharp.</p>"

      + "<h2>Is 8K worth downloading?</h2>"
      + "<p>Honestly, for most people, not for the resolution itself &mdash; 8K displays are still rare. It is worth it as insurance. An 8K wallpaper downscales perfectly to any screen you own now or will own, crops without falling apart, and looks correct on high-DPI laptops that need double their logical resolution.</p>"
      + "<p>The cost is file size. An 8K image can be several times larger than the 4K version of the same picture. If you are on a metered connection, take the size that matches your screen instead &mdash; the <b>Your screen</b> option on each wallpaper does that for you.</p>"
  },

  // ------------------------------------------------------------------
  'how-to-set-a-wallpaper': {
    title: 'How to Set a Wallpaper on Windows, Mac, iPhone and Android',
    desc: 'Step-by-step instructions for every major platform, including multi-monitor setups and the fit options that decide whether your wallpaper gets cropped.',
    updated: '17 August 2026',
    body:
      "<p class='lead'>Setting a wallpaper takes about ten seconds on every platform. The part worth understanding is the fit setting, because that is what decides whether your image gets cropped, stretched or letterboxed.</p>"

      + "<h2>Windows 11</h2>"
      + "<ol>"
      + "<li>Download the wallpaper and note where it saved &mdash; usually your Downloads folder.</li>"
      + "<li>Right-click the image and choose <b>Set as desktop background</b>. That is the fast route.</li>"
      + "<li>For more control, open Settings &rsaquo; Personalization &rsaquo; Background, set <b>Personalize your background</b> to Picture, then browse to the file.</li>"
      + "<li>Set <b>Choose a fit</b> to <b>Fill</b> if the wallpaper matches your screen shape, or <b>Fit</b> if you would rather see the whole image with bars at the edges.</li>"
      + "</ol>"

      + "<h2>Windows 10</h2>"
      + "<p>The same steps apply, but the path is Settings &rsaquo; Personalization &rsaquo; Background. The fit options are identical.</p>"

      + "<h2>macOS</h2>"
      + "<ol>"
      + "<li>Open Apple menu &rsaquo; System Settings &rsaquo; Wallpaper.</li>"
      + "<li>Scroll to the bottom and click <b>Add Photo</b> or <b>Add Folder</b>, then select your downloaded image.</li>"
      + "<li>Use the dropdown beside the preview to choose <b>Fill Screen</b>, <b>Fit to Screen</b>, <b>Stretch</b>, <b>Centre</b> or <b>Tile</b>.</li>"
      + "</ol>"
      + "<p>On older macOS versions the same settings live in System Preferences &rsaquo; Desktop &amp; Screen Saver.</p>"

      + "<h2>iPhone and iPad</h2>"
      + "<ol>"
      + "<li>Save the wallpaper to Photos by tapping and holding the image, then choosing <b>Save to Photos</b>.</li>"
      + "<li>Open Settings &rsaquo; Wallpaper &rsaquo; <b>Add New Wallpaper</b>.</li>"
      + "<li>Choose <b>Photos</b> and select the image.</li>"
      + "<li>Pinch to position and scale it, then tap <b>Add</b>. You can set it for the Lock Screen, Home Screen, or both.</li>"
      + "</ol>"
      + "<p>Turn off <b>Perspective Zoom</b> if you do not want the image drifting as you tilt the phone &mdash; it crops slightly to make room for the effect.</p>"

      + "<h2>Android</h2>"
      + "<p>Android varies by manufacturer, but the common route works nearly everywhere:</p>"
      + "<ol>"
      + "<li>Long-press an empty area of your home screen.</li>"
      + "<li>Tap <b>Wallpapers</b> or <b>Wallpaper &amp; style</b>.</li>"
      + "<li>Choose <b>My photos</b> or Gallery, then pick the downloaded image.</li>"
      + "<li>Position it, then choose whether it applies to the Home screen, Lock screen or both.</li>"
      + "</ol>"
      + "<p>Alternatively, open the image in your gallery app, tap the menu, and choose <b>Set as wallpaper</b>.</p>"

      + "<h2>Multiple monitors</h2>"
      + "<p>Windows can either repeat one wallpaper on each display or stretch a single image across all of them. In Settings &rsaquo; Personalization &rsaquo; Background, choosing <b>Span</b> stretches one image across the whole desktop &mdash; for which you want a wallpaper as wide as your combined resolution. Two 1920 &times; 1080 monitors side by side need 3840 &times; 1080.</p>"
      + "<p>To set a different wallpaper per monitor, right-click the image you want and choose <b>Set for monitor 1</b> or <b>2</b>. On macOS, System Settings &rsaquo; Wallpaper shows each display separately.</p>"

      + "<h2>Understanding the fit options</h2>"
      + "<ul>"
      + "<li><b>Fill</b> &mdash; scales until the image covers the screen, cropping whatever overflows. Best when the shapes roughly match.</li>"
      + "<li><b>Fit</b> &mdash; scales until the whole image is visible, leaving bars on two sides. Nothing is lost or distorted.</li>"
      + "<li><b>Stretch</b> &mdash; forces the image to the screen's exact shape, distorting it. Avoid this one.</li>"
      + "<li><b>Centre</b> &mdash; places the image at original size without scaling. Only sensible when the image already matches your resolution.</li>"
      + "</ul>"
      + "<p>If you download at the size the <b>Your screen</b> option offers, Fill and Fit produce the same result, because the image already matches your display exactly.</p>"
  },

  // ------------------------------------------------------------------
  'ultrawide-and-multi-monitor': {
    title: 'Wallpapers for Ultrawide and Multi-Monitor Setups',
    desc: 'Why a 4K wallpaper looks wrong on a 21:9 monitor, the exact sizes you need, and how to span one image across several screens.',
    updated: '17 August 2026',
    body:
      "<p class='lead'>Ultrawide and multi-monitor desks are where standard wallpapers fall apart. The problem is never resolution &mdash; it is shape.</p>"

      + "<h2>Why a 4K wallpaper looks wrong on an ultrawide</h2>"
      + "<p>A 4K wallpaper is 3840 &times; 2160, which is 16:9. A 34-inch ultrawide is 3440 &times; 1440, which is 21:9 &mdash; considerably wider relative to its height. Setting a 16:9 image on a 21:9 screen forces the system to choose: crop the top and bottom away to fill the width, or shrink the image until it fits and leave black bars at the sides.</p>"
      + "<p>Neither is what you want, and both are usually blamed on the image being low quality when the real issue is geometry.</p>"

      + "<h2>The sizes you actually need</h2>"
      + "<table class='g-table'>"
      + "<tr><th>Setup</th><th>Resolution</th><th>Ratio</th></tr>"
      + "<tr><td>Ultrawide 1080p</td><td>2560 &times; 1080</td><td>21:9</td></tr>"
      + "<tr><td>Ultrawide 1440p</td><td>3440 &times; 1440</td><td>21:9</td></tr>"
      + "<tr><td>Ultrawide 4K</td><td>3840 &times; 1600</td><td>21:9</td></tr>"
      + "<tr><td>Super ultrawide</td><td>5120 &times; 1440</td><td>32:9</td></tr>"
      + "<tr><td>Two 1080p monitors</td><td>3840 &times; 1080</td><td>32:9</td></tr>"
      + "<tr><td>Two 1440p monitors</td><td>5120 &times; 1440</td><td>32:9</td></tr>"
      + "<tr><td>Three 1080p monitors</td><td>5760 &times; 1080</td><td>48:9</td></tr>"
      + "</table>"
      + "<p>Notice that two 1440p monitors side by side need exactly the same wallpaper size as a single super ultrawide &mdash; both are 5120 &times; 1440. A wallpaper made for one works on the other.</p>"

      + "<h2>Spanning one image across several monitors</h2>"
      + "<p>To stretch a single wallpaper across your whole desk, first work out your combined resolution by adding the widths together and keeping the height &mdash; assuming the monitors are the same size and aligned. Then:</p>"
      + "<ul>"
      + "<li><b>Windows</b> &mdash; Settings &rsaquo; Personalization &rsaquo; Background, then set <b>Choose a fit</b> to <b>Span</b>.</li>"
      + "<li><b>macOS</b> &mdash; there is no built-in span option; macOS treats each display separately. You would need to split the image into per-display files yourself, or use third-party software.</li>"
      + "</ul>"
      + "<p>One thing to plan for: the bezels between monitors cut through the image. Avoid wallpapers where an important subject sits exactly where a bezel will fall &mdash; wide landscapes and abstract gradients span far better than a photo with a single centred subject.</p>"

      + "<h2>Mismatched monitors</h2>"
      + "<p>If your displays have different resolutions, spanning rarely looks good, because the image is stretched across an irregular shape. Setting a separate wallpaper per monitor almost always looks better. Choose one that matches each screen's own resolution and shape, and pick two images that share a palette so the desk still looks deliberate.</p>"

      + "<h2>Finding them here</h2>"
      + "<p>Use the resolution filters in the sidebar to show only ultrawide sizes, or the orientation filter to separate landscape from portrait. Every wallpaper's download panel also lists <b>UltraWide</b> and <b>Super UltraWide</b> presets, which crop the source to 21:9 and 32:9 for you.</p>"
  },

  // ------------------------------------------------------------------
  'why-wallpapers-look-blurry': {
    title: 'Why Your Wallpaper Looks Blurry (and How to Fix It)',
    desc: 'Upscaling, aspect ratio mismatch, compression and phone zoom effects — the four real causes of a soft wallpaper, and what to do about each.',
    updated: '17 August 2026',
    body:
      "<p class='lead'>A wallpaper that looked sharp in the browser can look soft on your desktop. There are four common causes, and they have different fixes.</p>"

      + "<h2>1. The image is smaller than your screen</h2>"
      + "<p>This is by far the most common cause. When a 1920 &times; 1080 wallpaper is placed on a 3840 &times; 2160 monitor, the system has to invent three pixels for every one it was given. No algorithm can recover detail that was never there, so edges go soft and fine texture turns to mush.</p>"
      + "<p><b>Fix:</b> download a wallpaper at least as large as your screen. If the source is smaller, no setting will rescue it &mdash; find a bigger version instead. This is why we mark a size as <i>upscaled</i> when the original file is smaller than your display, rather than quietly handing you a stretched image.</p>"

      + "<h2>2. High-DPI displays need double</h2>"
      + "<p>If you are on a Retina Mac or a high-DPI Windows laptop, your operating system reports a smaller number than the panel physically has. Download a wallpaper matching the reported number and it will be upscaled by 2&times; before you ever see it.</p>"
      + "<p><b>Fix:</b> take a wallpaper at roughly double the resolution your settings show. The <b>Your screen</b> option here already accounts for device pixel ratio, so it asks for the true physical size.</p>"

      + "<h2>3. The aspect ratio does not match</h2>"
      + "<p>Sometimes the image is not blurry at all &mdash; it is distorted. If the wallpaper's shape differs from your screen's and the fit mode is set to <b>Stretch</b>, the image is squashed or pulled to fit. Circles become ovals, faces widen, and the whole picture looks subtly wrong in a way that is hard to name.</p>"
      + "<p><b>Fix:</b> change the fit setting from Stretch to Fill, and choose a wallpaper matching your screen's aspect ratio.</p>"

      + "<h2>4. Compression from the source</h2>"
      + "<p>Some wallpapers were saved as heavily compressed JPEGs at some point in their history. The damage shows up as blocky patches in smooth gradients like skies, and halos around sharp edges. Resolution can be perfectly high while the image still looks poor, because the detail was destroyed by compression rather than by scaling.</p>"
      + "<p><b>Fix:</b> nothing can undo it. Choose a different wallpaper, ideally one saved as PNG or a high-quality JPEG. Gradients and flat colour areas are where compression damage is easiest to spot before you download.</p>"

      + "<h2>The phone-specific cause: zoom effects</h2>"
      + "<p>On iPhone, Perspective Zoom enlarges your wallpaper slightly so it can shift as you tilt the device. That enlargement is an upscale, and it softens the image. Some Android launchers do the same to allow parallax scrolling between home screens.</p>"
      + "<p><b>Fix:</b> turn Perspective Zoom off when setting the wallpaper, or start from an image large enough that the extra zoom does not matter.</p>"

      + "<h2>A quick diagnostic</h2>"
      + "<p>Open the wallpaper file on its own and zoom to 100%. If it looks sharp there but soft on your desktop, the problem is scaling or fit &mdash; fixable. If it already looks soft at 100%, the file itself is the limit, and you need a different image.</p>"
  }
};

// order the index page lists them in
export const GUIDE_ORDER = [
  'wallpaper-resolution',
  '4k-5k-8k-explained',
  'how-to-set-a-wallpaper',
  'ultrawide-and-multi-monitor',
  'why-wallpapers-look-blurry'
];
