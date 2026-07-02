function detectPlatform(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows|Macintosh|Linux/i.test(ua) && !/Mobi|Android/i.test(ua)) return 'desktop';
  if (/Android/i.test(ua)) return 'android';
  return 'unknown';
}

export async function onRequest(context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> {
  const request = context.request;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = await context.next();

  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');

  // Platform detection header
  const ua = request.headers.get('User-Agent') || '';
  const platform = detectPlatform(ua);
  response.headers.set('X-Detected-Platform', platform);

  // Cache static assets aggressively
  const url = new URL(request.url);
  if (url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp|json)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-cache');
  }

  return response;
}
