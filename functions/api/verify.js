// GET /api/verify  (admin) — the admin lock screen checks the pasted key here
// before letting the admin in, so a bad key is rejected at the door.
import { json, cors, preflight, authorized } from './_utils.js';

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));
  return cors(json({ ok: true }));
}
