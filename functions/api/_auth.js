// Sign-in plumbing: verifying Google's ID token, and our own session cookie.
// Files starting with "_" are not routed as endpoints.

const COOKIE = 'wp_session';
const SESSION_DAYS = 30;
const GOOGLE_ISS = ['https://accounts.google.com', 'accounts.google.com'];
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

// ---- base64url ----
function b64uToBytes(s){
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while(s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64u(bytes){
  let bin = '';
  for(const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function strToB64u(s){ return bytesToB64u(new TextEncoder().encode(s)); }
function b64uToStr(s){ return new TextDecoder().decode(b64uToBytes(s)); }

// ---- Google ID token ----
// Verifies the RS256 signature against Google's published keys, then the
// issuer, audience and expiry. Returns the claims, or throws.
export async function verifyGoogleIdToken(idToken, clientId){
  const parts = String(idToken || '').split('.');
  if(parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64uToStr(parts[0]));
  const claims = JSON.parse(b64uToStr(parts[1]));
  if(header.alg !== 'RS256') throw new Error('unexpected token algorithm');

  const jwks = await (await fetch(JWKS_URL)).json();
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid);
  if(!jwk) throw new Error('signing key not found');

  const key = await crypto.subtle.importKey(
    'jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1])
  );
  if(!ok) throw new Error('bad token signature');

  if(GOOGLE_ISS.indexOf(claims.iss) === -1) throw new Error('unexpected issuer');
  if(!clientId || claims.aud !== clientId) throw new Error('token was not issued for this site');
  const now = Math.floor(Date.now() / 1000);
  if(!claims.exp || claims.exp < now) throw new Error('token expired');
  if(claims.nbf && claims.nbf > now + 60) throw new Error('token not yet valid');
  if(!claims.sub) throw new Error('token has no subject');
  return claims;
}

// ---- our session cookie: payload.hmac, both base64url ----
async function hmacKey(secret){
  return crypto.subtle.importKey('raw', new TextEncoder().encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function makeSession(user, secret){
  const payload = strToB64u(JSON.stringify({
    uid: user.id, sub: user.google_sub, email: user.email || '',
    name: user.name || '', pic: user.picture || '',
    exp: Math.floor(Date.now()/1000) + SESSION_DAYS * 86400
  }));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload));
  return payload + '.' + bytesToB64u(new Uint8Array(sig));
}
export async function readSession(request, secret){
  const raw = (request.headers.get('cookie') || '')
    .split(';').map(s => s.trim()).find(s => s.indexOf(COOKIE + '=') === 0);
  if(!raw) return null;
  const token = raw.slice(COOKIE.length + 1);
  const dot = token.lastIndexOf('.');
  if(dot < 1) return null;
  const payload = token.slice(0, dot), sig = token.slice(dot + 1);
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret),
      b64uToBytes(sig), new TextEncoder().encode(payload));
    if(!ok) return null;
    const data = JSON.parse(b64uToStr(payload));
    if(!data.exp || data.exp < Math.floor(Date.now()/1000)) return null;
    return data;
  } catch(e){ return null; }
}
export function sessionCookie(token){
  return COOKIE + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + (SESSION_DAYS * 86400);
}
export function clearCookie(){
  return COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

// The client ID is public (it ships in the page), so it lives in a plain var.
export function googleClientId(env){ return String(env.GOOGLE_CLIENT_ID || '').trim(); }
