export const onRequest = async (context: {
  fetch: (request: Request) => Promise<Response>;
  request: Request;
  env: { ASSETS: { fetch: (req: Request) => Promise<Response> } };
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  passThroughOnException: () => void;
}) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // API routes - let Pages Functions routing handle them
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Static assets - let Pages handle them
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|json|mp3|flac|ogg|wav|m4a)$/)) {
    return next();
  }

  // Everything else → serve index.html (SPA routing)
  try {
    const index = await env.ASSETS.fetch('http://fake.local/index.html');
    if (index.ok) return index;
  } catch {
    // fall through
  }

  // Last resort: serve index.html from the same origin
  const response = await next();
  if (response.status === 404) {
    const index = await env.ASSETS.fetch(`${url.origin}/index.html`);
    if (index.ok) return index;
  }
  return response;
};
