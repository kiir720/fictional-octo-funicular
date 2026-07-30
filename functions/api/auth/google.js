// POST /api/auth/google  { credential }
// Takes the ID token from Google Identity Services, verifies it, upserts the
// user and sets our own signed session cookie. No Google client secret is
// involved — the credential flow only needs the (public) client ID.
import { json, cors, preflight } from '../_utils.js';
import { verifyGoogleIdToken, makeSession, sessionCookie, googleClientId } from '../_auth.js';

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));
  if(!env.DB) return cors(json({ error: 'accounts are not available right now' }, 503));

  const clientId = googleClientId(env);
  if(!clientId) return cors(json({ error: 'Google sign-in is not configured (set GOOGLE_CLIENT_ID)' }, 503));
  const secret = String(env.SESSION_SECRET || env.ADMIN_KEY || '').trim();
  if(!secret) return cors(json({ error: 'sessions are not configured' }, 503));

  let body;
  try { body = await request.json(); } catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }

  let claims;
  try { claims = await verifyGoogleIdToken(body && body.credential, clientId); }
  catch(e){ return cors(json({ error: 'Sign-in could not be verified: ' + e.message }, 401)); }

  // Google verifies its own addresses; an unverified one shouldn't become an identity
  if(claims.email && claims.email_verified === false){
    return cors(json({ error: 'Please verify your Google email address first.' }, 403));
  }

  await env.DB.prepare(
    'INSERT INTO users (google_sub, email, name, picture, created_at, last_seen) ' +
    "VALUES (?, ?, ?, ?, datetime('now'), datetime('now')) " +
    'ON CONFLICT(google_sub) DO UPDATE SET email=excluded.email, name=excluded.name, ' +
    "picture=excluded.picture, last_seen=datetime('now')"
  ).bind(claims.sub, claims.email || '', claims.name || '', claims.picture || '').run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE google_sub = ?').bind(claims.sub).first();
  if(!user) return cors(json({ error: 'could not create the account' }, 500));
  if(user.blocked) return cors(json({ error: 'This account has been suspended.' }, 403));

  const res = cors(json({
    ok: true,
    user: { name: user.name, email: user.email, picture: user.picture }
  }));
  res.headers.append('set-cookie', sessionCookie(await makeSession(user, secret)));
  return res;
}
