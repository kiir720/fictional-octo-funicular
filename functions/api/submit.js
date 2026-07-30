// POST /api/submit — public wallpaper submission (multipart form).
// Fields: image, name, category, tags, uploader, source_url, rights
//
// Nothing published here goes live: the image is parked under
// images/pending/<token>-<file> and a row is queued for the admin to approve
// or reject. The rights checkbox is a hard requirement — it's the attestation
// that makes the DMCA safe-harbour posture meaningful, and the IP hash is what
// lets a repeat-infringer policy actually be enforced.
import { json, cors, preflight, putObject, sanitizeName } from './_utils.js';
import { readSession } from './_auth.js';

const MAX_BYTES = 15 * 1024 * 1024;
const PER_IP_PER_HOUR = 10;
const MAX_PENDING = 500;          // stop the queue being flooded
const OK_TYPES = ['image/jpeg','image/png','image/webp','image/avif'];

async function hashIp(ip, salt){
  const data = new TextEncoder().encode(String(salt || '') + '|' + String(ip || ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function onRequest({ request, env }){
  if(request.method === 'OPTIONS') return preflight();
  if(request.method !== 'POST') return cors(json({ error: 'method not allowed' }, 405));
  if(!env.DB) return cors(json({ error: 'submissions are not available right now' }, 503));

  let form;
  try { form = await request.formData(); }
  catch(e){ return cors(json({ error: 'send the form as multipart/form-data' }, 400)); }

  const file = form.get('image');
  if(!file || typeof file === 'string' || !file.arrayBuffer){
    return cors(json({ error: 'Please choose an image file.' }, 400));
  }
  const type = String(file.type || '').toLowerCase();
  if(OK_TYPES.indexOf(type) === -1){
    return cors(json({ error: 'Use a JPG, PNG, WebP or AVIF image.' }, 400));
  }
  if(file.size > MAX_BYTES){
    return cors(json({ error: 'That image is larger than 15 MB.' }, 413));
  }
  // the uploader must assert they have the right to share it
  const rights = String(form.get('rights') || '').toLowerCase();
  if(['1','on','true','yes'].indexOf(rights) === -1){
    return cors(json({ error: 'Please confirm you have the right to share this image.' }, 400));
  }
  const name = String(form.get('name') || '').trim().slice(0, 120);
  if(name.length < 2) return cors(json({ error: 'Give the wallpaper a name.' }, 400));

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ipHash = await hashIp(ip, env.ADMIN_KEY || 'salt');

  // A signed-in submitter gets a real identity attached, which is what makes
  // the repeat-infringer policy enforceable — and a suspended account is
  // refused outright.
  const secret = String(env.SESSION_SECRET || env.ADMIN_KEY || '').trim();
  const sess = secret ? await readSession(request, secret) : null;
  let userId = null;
  if(sess && sess.uid){
    const u = await env.DB.prepare('SELECT id, blocked, name FROM users WHERE id = ?').bind(sess.uid).first();
    if(u){
      if(u.blocked) return cors(json({ error: 'This account is not permitted to submit wallpapers.' }, 403));
      userId = u.id;
    }
  }

  // --- abuse limits ---
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM submissions WHERE ip_hash = ? AND created_at > datetime('now','-1 hour')"
  ).bind(ipHash).first();
  if(recent && recent.n >= PER_IP_PER_HOUR){
    return cors(json({ error: 'You have submitted a lot recently — please try again later.' }, 429));
  }
  const queued = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'").first();
  if(queued && queued.n >= MAX_PENDING){
    return cors(json({ error: 'The review queue is full right now. Please try again later.' }, 503));
  }

  // --- store the file out of public listings until it is approved ---
  const ext = type.split('/')[1].replace('jpeg','jpg');
  const token = crypto.randomUUID().slice(0, 8);
  const path = 'pending/' + sanitizeName(name) + '-' + token + '.' + ext;
  await putObject(env, 'images/' + path, await file.arrayBuffer(), type);

  const tags = String(form.get('tags') || '').split(',').map(t=>t.trim()).filter(Boolean).slice(0,10).join(', ');
  // fall back to the signed-in display name for the credit line
  const credit = String(form.get('uploader') || '').trim() || (sess && sess.name) || '';
  await env.DB.prepare(
    'INSERT INTO submissions (image_path, name, category, tags, resolution, uploader, source_url, rights_ack, ip_hash, user_id, status, created_at) ' +
    "VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'pending', datetime('now'))"
  ).bind(
    path, name,
    String(form.get('category') || 'Abstract').slice(0, 40),
    tags,
    String(form.get('resolution') || '').slice(0, 20),
    credit.slice(0, 60),
    String(form.get('source_url') || '').trim().slice(0, 300),
    ipHash, userId
  ).run();

  return cors(json({ ok: true, message: 'Thanks! Your wallpaper is queued for review.' }, 201));
}
