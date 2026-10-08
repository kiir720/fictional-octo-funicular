// GET /api/ads — tells the page whether ads are configured, and whether this
// visitor must be asked for consent first.
//
// The publisher ID is public (it ships in the ad tag), so it lives in a plain
// var. Consent is required for visitors in the EEA/UK/Switzerland under GDPR
// and Google's EU user consent policy — Cloudflare gives us the country on
// every request, so we can ask only the people we have to.
import { json, cors, preflight } from './_utils.js';

const CONSENT_REQUIRED = new Set([
  // EEA
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO',
  // UK + Switzerland
  'GB','CH'
]);

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  const client = String(env.ADS_CLIENT || '').trim();      // e.g. ca-pub-1234567890123456
  const country = (request.cf && request.cf.country) || '';
  return cors(json({
    configured: !!client,
    client: client || null,
    country: country || null,
    needsConsent: CONSENT_REQUIRED.has(country)
  }, { headers: { 'cache-control': 'no-store' } }));
}
