// GET /guides/<slug> — a single guide article.
import { renderGuide } from './_render.js';
export async function onRequestGet({ params, request }){
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : String(params.slug || '');
  const res = renderGuide(slug.toLowerCase(), request);
  return res || new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
}
