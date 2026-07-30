// GET /ads.txt — the authorised-sellers file ad networks look for.
// Generated from the ADS_CLIENT secret so there's nothing to keep in sync by
// hand; 404s until a publisher ID is set, which is the correct state for a
// site that isn't running ads yet (an ads.txt naming a publisher you don't
// have would be worse than none).
export async function onRequestGet({ env }){
  const client = String(env.ADS_CLIENT || '').trim();
  if(!client) return new Response('Not found', { status: 404 });

  // AdSense publisher IDs look like ca-pub-XXXXXXXXXXXXXXXX; ads.txt wants the
  // bare pub-XXXX form, and f08c47fec0942fa0 is Google's certification id.
  const pub = client.replace(/^ca-/, '');
  const lines = [
    '# Authorised digital sellers for this site.',
    'google.com, ' + pub + ', DIRECT, f08c47fec0942fa0'
  ];
  return new Response(lines.join('\n') + '\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
}
