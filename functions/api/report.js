// POST /api/report — a visitor reporting a problem with an image.
//
// The report page promises "a person will look at this within 48 hours", so the
// report has to actually land somewhere: it is written to D1 and shows up in the
// admin queue. Nothing here auto-removes an image — takedowns stay a human call.
import { json, cors, preflight } from './_utils.js';

const REASONS = new Set(['copyright', 'credit', 'explicit', 'person', 'quality', 'other']);
const MAX = { id: 300, details: 1200, email: 200, name: 200, relation: 200, url: 500 };
const PER_IP_PER_HOUR = 8;

const trim = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

// Salted hash so repeat reporters can be rate-limited without storing an IP.
async function hashIp(ip, salt){
  const data = new TextEncoder().encode(salt + '|' + ip);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));
  if(!env.DB) return cors(json({ error: 'the report database is not configured' }, 503));

  let body;
  try { body = await request.json(); }
  catch(e){ return cors(json({ error: 'invalid JSON' }, 400)); }

  const reason = trim(body.reason, 40);
  const details = trim(body.details, MAX.details);
  const email = trim(body.email, MAX.email);
  const imageId = trim(body.id, MAX.id);

  // the same rules the form enforces, re-checked here — a form can be bypassed
  if(!REASONS.has(reason)) return cors(json({ error: 'pick a reason' }, 400));
  if(details.length < 15) return cors(json({ error: 'add a line or two of detail' }, 400));
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return cors(json({ error: 'add an email we can reply to' }, 400));

  const legalName = trim(body.legalName, MAX.name);
  const relation = trim(body.relation, MAX.relation);
  const original = trim(body.original, MAX.url);
  const sworn = body.sworn === true;
  if(reason === 'copyright' && (!legalName || !relation || !sworn)){
    return cors(json({ error: 'a copyright claim needs your name, your relationship to the work, and the good-faith statement' }, 400));
  }

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ipHash = ip ? await hashIp(ip, env.SESSION_SECRET || 'report') : '';

  if(ipHash){
    const since = new Date(Date.now() - 3600e3).toISOString();
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM reports WHERE ip_hash = ? AND created_at > ?'
    ).bind(ipHash, since).first();
    if(row && row.n >= PER_IP_PER_HOUR){
      return cors(json({ error: 'too many reports from here in the last hour — try again later' }, 429));
    }
  }

  const ref = 'RP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  await env.DB.prepare(
    'INSERT INTO reports (ref, created_at, image_id, reason, details, email, legal_name, relation, original_url, sworn, ip_hash, status) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'open\')'
  ).bind(
    ref, new Date().toISOString(), imageId, reason, details, email,
    legalName, relation, original, sworn ? 1 : 0, ipHash
  ).run();

  return cors(json({ ok: true, ref }));
}
