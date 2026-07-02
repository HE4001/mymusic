// SPA Fallback — serve index.html for all non-API, non-static paths
export async function onRequestGet(context: {
  env: { ASSETS: { fetch: (request: Request) => Promise<Response> } };
  request: Request;
}): Promise<Response> {
  const url = new URL(context.request);

  // If requesting a static asset, let Pages handle it
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|json|mp3|flac|ogg|wav|m4a|ttf)$/)) {
    return new Response('Not Found', { status: 404 });
  }

  // For API routes that weren't matched
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Serve index.html for SPA routes
  try {
    const index = await context.env.ASSETS.fetch(new Request(url.origin + '/index.html'));
    if (index.ok) return index;
  } catch { /* fall through */ }

  return new Response('Not Found', { status: 404 });
}
