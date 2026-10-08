// Reddit Conversions API: the server-side twin of the Reddit pixel.
//
// Reports the site's two real conversions — a download (LEAD) and a new
// account (SIGN_UP) — straight from this server, so they are counted even when
// an ad blocker stops the pixel. Each carries the SAME conversion_id the pixel
// used for that event, which is how Reddit de-duplicates the pair.
//
// Dormant until the REDDIT_CAPI_TOKEN secret exists. Same consent rule as the
// pixel: in the EEA/UK/CH only with the visitor's consent. Identifiers sent:
// IP address, user agent, Reddit's click id and cookie id, screen size — never
// email, phone or name.
//
// NOTE: Reddit answers 200 even to events it then discards, so a 200 proves
// little. Verify with a test_id in Events Manager -> Event Testing.
import { needsAdConsent } from './_consent.js';

export const PIXEL_ID = 'a2_jgdff6hlgj6w';
const ENDPOINT = 'https://ads-api.reddit.com/api/v3/pixels/' + PIXEL_ID + '/conversion_events';

// The browser's half arrives in request bodies, so take only well-formed values.
export function cleanCtx(raw){
  if(!raw || typeof raw !== 'object') return null;
  const id = String(raw.conversionId || '');
  if(!/^[A-Za-z0-9-]{8,64}$/.test(id)) return null;
  const out = { conversionId: id, consent: raw.consent === true };
  const cid = String(raw.clickId || '');
  if(cid && cid.length <= 512 && /^[\w.\-~%]+$/.test(cid)) out.clickId = cid;
  const uuid = String(raw.uuid || '');
  if(uuid && uuid.length <= 128 && /^[\w.\-]+$/.test(uuid)) out.uuid = uuid;
  const s = raw.screen || {};
  const w = parseInt(s.w, 10), h = parseInt(s.h, 10);
  if(w > 0 && w < 20000 && h > 0 && h < 20000) out.screen = { width: w, height: h };
  return out;
}

// type: 'LEAD' | 'SIGN_UP'. ctx: output of cleanCtx(). testId: only for testing.
// Never throws — a reporting failure must not affect the visitor.
export async function sendRedditConversion(env, request, type, ctx, testId){
  try {
    const token = String(env.REDDIT_CAPI_TOKEN || '').trim();
    if(!token) return { skipped: 'REDDIT_CAPI_TOKEN not set' };
    if(!ctx) return { skipped: 'no conversion context' };
    const country = request.cf && request.cf.country;
    if(needsAdConsent(country) && !ctx.consent) return { skipped: 'no consent (' + (country || 'unknown') + ')' };

    const user = {};
    const ip = request.headers.get('cf-connecting-ip');
    const ua = request.headers.get('user-agent');
    if(ip) user.ip_address = ip;
    if(ua) user.user_agent = ua.slice(0, 512);
    if(ctx.uuid) user.uuid = ctx.uuid;
    if(ctx.screen) user.screen_dimensions = ctx.screen;

    const event = {
      event_at: Date.now(),                    // milliseconds — Reddit v3 wants ms
      action_source: 'WEBSITE',
      type: { tracking_type: type },
      user,
      metadata: { conversion_id: ctx.conversionId }
    };
    if(ctx.clickId) event.click_id = ctx.clickId;
    const data = { events: [event] };
    // Reddit's setup page says to put test_id on the event; their v3 reference
    // has it on data. Test requests carry both; production requests neither.
    if(testId){ data.test_id = testId; event.test_id = testId; }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    const body = (await res.text()).slice(0, 600);
    if(!res.ok) console.log('Reddit CAPI ' + type + ' -> ' + res.status + ' ' + body);
    return { status: res.status, body };
  } catch(e){
    console.log('Reddit CAPI error: ' + (e && e.message));
    return { error: String(e && e.message || e) };
  }
}
