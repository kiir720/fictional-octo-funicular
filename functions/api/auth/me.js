// GET /api/auth/me — who is signed in on this browser, plus whether sign-in
// is even configured, so the client knows whether to render the button.
import { json, cors, preflight } from '../_utils.js';
import { readSession, googleClientId } from '../_auth.js';

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  const clientId = googleClientId(env);
  const secret = String(env.SESSION_SECRET || env.ADMIN_KEY || '').trim();
  const s = secret ? await readSession(request, secret) : null;
  const res = json({
    configured: !!clientId,
    client_id: clientId || null,
    user: s ? { name: s.name, email: s.email, picture: s.pic } : null
  }, { headers: { 'cache-control': 'no-store' } });
  return cors(res);
}
