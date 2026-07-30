// POST /api/auth/logout — drop the session cookie.
import { json, cors, preflight } from '../_utils.js';
import { clearCookie } from '../_auth.js';

export async function onRequest({ request }){
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));
  const res = cors(json({ ok: true }));
  res.headers.append('set-cookie', clearCookie());
  return res;
}
