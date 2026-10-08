// Where advertising tracking needs the visitor's consent first: the EEA, the
// UK and Switzerland, plus locations Cloudflare can't place (XX) or Tor (T1).
// Shared by the middleware (Reddit pixel / GTM consent defaults) and the
// server-side Reddit Conversions API, so both always apply the same rule.
// (functions/api/ads.js keeps its own copy of the same list.)
export const CONSENT_REGIONS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];

export function needsAdConsent(country){
  const c = String(country || '').toUpperCase();
  return !c || c === 'XX' || c === 'T1' || CONSENT_REGIONS.includes(c);
}
