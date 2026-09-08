import { describe, expect, it, vi } from 'vitest';
import { onRequest as middleware } from '../functions/api/_middleware';
import { onRequest as library } from '../functions/api/library';
import { onRequest as playUrl } from '../functions/api/play-url';

// JWT cryptography is exercised separately in server.test.ts; these cover route wiring.
vi.mock('../server/access', async (original) => ({
  ...await original<typeof import('../server/access')>(),
  verifyAccess: vi.fn(async () => undefined),
}));

vi.mock('../server/library', async (original) => {
  const library = await original<typeof import('../server/library')>();
  return {
    ...library,
    findTrack: vi.fn((id: string) => id === 'trk_test' ? {
      id,
      title: 'Test track',
      artist: '',
      album: '',
      duration: 60,
      mimeType: 'audio/mpeg',
      objectKey: 'music/test.mp3',
    } : library.findTrack(id)),
  };
});

async function request(
  path: string,
  method = 'GET',
  env: Record<string, string> = {},
) {
  const context = {
    request: new Request(`https://music.example${path}`, { method }),
    env, params: {}, data: {}, functionPath: '/api',
    waitUntil: vi.fn(), passThroughOnException: vi.fn(),
    next: () => path.startsWith('/api/library')
      ? library(context as never) : playUrl(context as never),
  };
  return middleware(context as never);
}

describe('authenticated API route wiring', () => {
  it('serves the manifest as JSON without caching', async () => {
    const response = await request('/api/library');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = await response.json() as { schemaVersion: number; tracks: unknown[] };
    expect(body).toMatchObject({ schemaVersion: 1, tracks: expect.any(Array) });
    for (const track of body.tracks) expect(track).not.toHaveProperty('objectKey');
  });
  it('converts an unknown id into a structured 404', async () => {
    const response = await request('/api/play-url?id=missing');
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'TRACK_NOT_FOUND' } });
  });
  it('rejects duplicate ids and caller-controlled object paths', async () => {
    for (const query of ['id=a&id=b', 'id=a&objectKey=music/x.mp3']) {
      const response = await request(`/api/play-url?${query}`);
      expect(response.status).toBe(400);
    }
  });
  it('returns 405 with Allow GET for unsupported methods', async () => {
    const response = await request('/api/play-url?id=missing', 'POST');
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });
  it('reads B2 secrets from context.env without returning the application key', async () => {
    const applicationKey = 'private-application-key-marker';
    const response = await request('/api/play-url?id=trk_test', 'GET', {
      B2_ENDPOINT: 'https://s3.us-west-004.backblazeb2.com',
      B2_REGION: 'us-west-004',
      B2_BUCKET: 'music-bucket',
      B2_KEY_ID: 'visible-key-id',
      B2_APPLICATION_KEY: applicationKey,
      B2_URL_TTL_SECONDS: '60',
    });

    expect(response.status).toBe(200);
    const responseText = await response.text();
    const body = JSON.parse(responseText) as { url: string };
    const signedUrl = new URL(body.url);
    expect(decodeURIComponent(signedUrl.pathname)).toContain('/music-bucket/');
    expect(signedUrl.searchParams.get('X-Amz-Credential')).toMatch(/^visible-key-id\//);
    expect(responseText).not.toContain(applicationKey);
  });
  it('does not expose B2 configuration or signing details in errors', async () => {
    const response = await request('/api/play-url?id=trk_test', 'GET', {
      B2_ENDPOINT: 'https://s3.us-west-004.backblazeb2.com',
      B2_REGION: 'us-west-004',
      B2_BUCKET: 'bad/bucket-marker',
      B2_KEY_ID: 'key-id-marker',
      B2_APPLICATION_KEY: 'application-key-marker',
    });

    expect(response.status).toBe(500);
    const responseText = await response.text();
    expect(JSON.parse(responseText)).toEqual({
      error: { code: 'B2_CONFIG_ERROR', message: '音频存储配置错误' },
    });
    expect(responseText).not.toMatch(/bucket-marker|key-id-marker|application-key-marker|X-Amz-/);
  });
});
