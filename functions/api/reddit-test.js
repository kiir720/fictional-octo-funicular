// /api/reddit-test — admin-only check of the Reddit Conversions API set-up.
//   GET   -> { configured } : is the REDDIT_CAPI_TOKEN secret present?
//   POST  { test_id, type? } -> sends ONE event marked with that test id, so it
//         appears in Reddit Events Manager -> Event Testing and never counts as
//         a real conversion; returns Reddit's raw answer.
// Reddit replies 200 even to events it later discards, so the real check is
// the Event Testing panel, not this response.
import { json, cors, preflight, authorized } from './_utils.js';
import { sendRedditConversion } from './_reddit.js';

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(!authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));

  const configured = !!String(env.REDDIT_CAPI_TOKEN || '').trim();
  if(request.method === 'GET') return cors(json({ configured }));
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));

  let body = {};
  try { body = await request.json(); } catch(e){}
  const testId = String(body.test_id || '').trim();
  if(!/^t2_[a-z0-9]{4,20}$/i.test(testId)) return cors(json({ error: 'test_id (t2_…) is required' }, 400));
  const type = body.type === 'SIGN_UP' ? 'SIGN_UP' : 'LEAD';

  const conversionId = crypto.randomUUID();
  const result = await sendRedditConversion(env, request, type,
    { conversionId, consent: true, screen: { width: 1920, height: 1080 } }, testId);
  return cors(json({ configured, type, conversionId, result }));
}
