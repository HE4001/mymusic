import { B2Auth, signRequest, generatePresignedUrl } from '../../b2.ts';
import { findSong } from '../../song-manifest.ts';
import type { Env } from '../../types.ts';

interface KVEnv extends Env {
  URL_CACHE: KVNamespace;
  PRESIGN_EXPIRY: string;
}

export async function onRequestGet(context: {
  env: KVEnv;
  params: { id: string };
}): Promise<Response> {
  const { env, params } = context;
  const songId = decodeURIComponent(params.id);

  // Validate songId format
  if (!/^[a-zA-Z0-9一-鿿-]+$/.test(songId)) {
    return jsonResponse({ error: 'Invalid song ID' }, 400);
  }

  const cacheKey = `stream:${songId}`;
  const ttl = parseInt(env.PRESIGN_EXPIRY || '3600');

  // Check cache
  if (env.URL_CACHE) {
    try {
      const cached = await env.URL_CACHE.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() < data.expiresAt) {
          return jsonResponse({ url: data.url, expiresIn: Math.floor((data.expiresAt - Date.now()) / 1000) });
        }
      }
    } catch { /* cache miss */ }
  }

  // Find song in server-side manifest
  const song = findSong(songId);
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
    if (env.URL_CACHE) {
      try {
        await env.URL_CACHE.put(cacheKey, JSON.stringify({ url, expiresAt }), {
          expirationTtl: ttl,
        });
      } catch { /* cache write failed */ }
    }

    return jsonResponse({ url, expiresIn: ttl });
  } catch (err) {
    console.error('B2 stream error:', err);
    return jsonResponse({ error: 'Failed to generate stream URL' }, 500);
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
