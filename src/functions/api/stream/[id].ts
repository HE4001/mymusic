import { B2Auth, signRequest, parseTimestamp, generatePresignedUrl } from '../b2.ts';

export interface Env {
  B2_ENDPOINT: string;
  B2_BUCKET: string;
  B2_REGION: string;
  B2_ACCESS_KEY_ID: string;
  B2_SECRET_ACCESS_KEY: string;
  PRESIGN_EXPIRY: string;
  URL_CACHE: KVNamespace;
}

export async function onRequestGet(context: {
  env: Env;
  params: { id: string };
}): Promise<Response> {
  const { env, params } = context;
  const songId = decodeURIComponent(params.id);

  // Validate songId format (alphanumeric + dash)
  if (!/^[a-z0-9-]+$/i.test(songId)) {
    return jsonResponse({ error: 'Invalid song ID' }, 400);
  }

  const cacheKey = `stream:${songId}`;
  const ttl = parseInt(env.PRESIGN_EXPIRY || '3600');

  // Check cache
  const cached = await env.URL_CACHE.get(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    if (Date.now() < data.expiresAt) {
      return jsonResponse({ url: data.url, expiresIn: data.expiresAt - Date.now() });
    }
    // Expired — fall through to regenerate
  }

  // Find song in manifest
  const song = SONG_MANIFEST.find(s => s.id === songId);
  if (!song) {
    return jsonResponse({ error: 'Song not found' }, 404);
  }

  try {
    // Step 1: Authorize with B2
    const auth = await B2Auth(env);

    // Step 2: Generate presigned URL
    const url = await generatePresignedUrl(env, auth, song.fileName, ttl);
    const expiresAt = Date.now() + ttl * 1000;

    // Cache the URL
    await env.URL_CACHE.put(cacheKey, JSON.stringify({ url, expiresAt }), {
      expirationTtl: ttl,
    });

    return jsonResponse({ url, expiresIn: ttl });
  } catch (err) {
    console.error('B2 stream error:', err);
    return jsonResponse({ error: 'Failed to generate stream URL' }, 500);
  }
}

async function jsonResponse(data: unknown, status = 200): Promise<Response> {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
