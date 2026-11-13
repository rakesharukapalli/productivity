/**
 * Cloudflare Pages Function: /api/*
 * Set GAS_WEB_APP_URL and API_SECRET as Cloudflare environment variables.
 * The browser never receives the API secret.
 */
export async function onRequest(context) {
  const { request, env } = context;
  if (!env.GAS_WEB_APP_URL || !env.API_SECRET) {
    return Response.json({ok:false,error:'Server API environment is not configured'}, {status:500});
  }
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(env.GAS_WEB_APP_URL);
  if (request.method === 'GET') {
    upstreamUrl.searchParams.set('action', incomingUrl.searchParams.get('action') || 'bootstrap');
    upstreamUrl.searchParams.set('token', env.API_SECRET);
    const upstream = await fetch(upstreamUrl.toString(), {redirect:'follow'});
    return new Response(await upstream.text(), {status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  if (request.method === 'POST') {
    const body = await request.json();
    body.token = env.API_SECRET;
    const upstream = await fetch(env.GAS_WEB_APP_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body),
      redirect:'follow'
    });
    return new Response(await upstream.text(), {status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  return new Response('Method Not Allowed', {status:405});
}