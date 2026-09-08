import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  type JWK,
} from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { onRequest as accessMiddleware } from '../functions/api/_middleware';
import { AccessUnauthorizedError, verifyAccess } from '../server/access';
import { signTrack, type B2Env } from '../server/b2';
import {
  findTrack,
  toPublicLibrary,
  validateLibrary,
} from '../server/library';

const validManifest = {
  schemaVersion: 1,
  updatedAt: '2026-09-07T00:00:00Z',
  tracks: [
    {
      id: 'trk_0001',
      title: '夜航',
      duration: 222,
      mimeType: 'audio/mpeg',
      objectKey: 'music/林间/远方/01 夜航 #?%.mp3',
    },
  ],
};

const validB2Env: B2Env = {
  B2_ENDPOINT: 'https://s3.us-west-004.backblazeb2.com',
  B2_REGION: 'us-west-004',
  B2_BUCKET: 'music-bucket',
  B2_KEY_ID: 'test-key-id',
  B2_APPLICATION_KEY: 'test-application-key',
  B2_URL_TTL_SECONDS: '60',
};

let accessPrivateKey: CryptoKey;
let accessPublicJwk: JWK;

beforeAll(async () => {
  const keyPair = await generateKeyPair('RS256');
  accessPrivateKey = keyPair.privateKey;
  accessPublicJwk = {
    ...(await exportJWK(keyPair.publicKey)),
    alg: 'RS256',
    kid: 'test-access-key',
    use: 'sig',
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ keys: [accessPublicJwk] }), {
        headers: { 'Content-Type': 'application/json' },
      })),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

async function accessToken(options: {
  issuer: string;
  audience: string;
  expires?: boolean;
}): Promise<string> {
  let token = new SignJWT({ sub: 'test-user' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-access-key' })
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setIssuedAt();

  if (options.expires !== false) {
    token = token.setExpirationTime('5m');
  }
  return token.sign(accessPrivateKey);
}

function middlewareContext(
  request: Request,
  env: Record<string, string> = {
    ACCESS_TEAM_DOMAIN: 'https://example.cloudflareaccess.com',
    ACCESS_AUD: 'test-audience',
  },
  next = vi.fn(async () => new Response('{}')),
) {
  return {
    request,
    env,
    params: {},
    data: {},
    functionPath: '/api/_middleware',
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next,
  };
}

describe('library manifest', () => {
  it('normalizes optional metadata and strips object keys from the public library', () => {
    const library = validateLibrary(validManifest);
    expect(library.tracks[0]).toMatchObject({ artist: '', album: '' });

    const publicLibrary = toPublicLibrary(library);
    expect(publicLibrary.tracks[0]).not.toHaveProperty('objectKey');
    expect(publicLibrary.tracks[0]).toEqual({
      id: 'trk_0001',
      title: '夜航',
      artist: '',
      album: '',
      duration: 222,
      mimeType: 'audio/mpeg',
    });
  });

  it.each([
    'other/song.mp3',
    'music/../song.mp3',
    'music//song.mp3',
    'music/artist\\song.mp3',
    'music/artist/song\u0000.mp3',
  ])('rejects unsafe object key %j', (objectKey) => {
    const manifest = structuredClone(validManifest);
    manifest.tracks[0].objectKey = objectKey;
    expect(() => validateLibrary(manifest)).toThrow(/objectKey/);
  });

  it('rejects duplicate ids and does not resolve an unknown production id', () => {
    const duplicate = structuredClone(validManifest);
    duplicate.tracks.push(structuredClone(duplicate.tracks[0]));
    expect(() => validateLibrary(duplicate)).toThrow(/重复 id/);
    expect(findTrack('missing-track')).toBeUndefined();
  });

  it('requires an explicit duration and does not silently trim stable ids', () => {
    const missingDuration = structuredClone(validManifest) as {
      tracks: Array<Record<string, unknown>>;
    };
    delete missingDuration.tracks[0].duration;
    expect(() => validateLibrary(missingDuration)).toThrow(/duration/);

    const paddedId = structuredClone(validManifest);
    paddedId.tracks[0].id = ' trk_0001 ';
    expect(() => validateLibrary(paddedId)).toThrow(/首尾空白/);
  });
});

describe('B2 signing', () => {
  it('round-trips Unicode and reserved filename characters without signing Range', async () => {
    const signed = await signTrack(validB2Env, validManifest.tracks[0].objectKey);
    const url = new URL(signed.url);

    expect(url.hostname).toBe('s3.us-west-004.backblazeb2.com');
    expect(decodeURIComponent(url.pathname)).toBe(
      '/music-bucket/music/林间/远方/01 夜航 #?%.mp3',
    );
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
    expect(signed.expiresAt).toBeGreaterThan(Date.now() + 55_000);
  });

  it('keeps a literal percent-encoded dot segment distinct from a dot segment', async () => {
    const signed = await signTrack(validB2Env, 'music/%2e/song.mp3');
    const url = new URL(signed.url);

    expect(url.pathname).toContain('/music/%252e/song.mp3');
    expect(decodeURIComponent(url.pathname)).toContain('/music/%2e/song.mp3');
    expect(decodeURIComponent(url.pathname)).not.toContain('/music/./song.mp3');
  });

  it.each([
    { ...validB2Env, B2_ENDPOINT: 'https://user@' + 's3.us-west-004.backblazeb2.com' },
    { ...validB2Env, B2_ENDPOINT: 'https://s3.us-west-004.backblazeb2.com/path' },
    { ...validB2Env, B2_REGION: 'eu-central-003' },
    { ...validB2Env, B2_BUCKET: 'bad/bucket' },
    { ...validB2Env, B2_URL_TTL_SECONDS: '59' },
    { ...validB2Env, B2_URL_TTL_SECONDS: '3601' },
  ])('fails closed for invalid B2 configuration', async (env) => {
    await expect(signTrack(env, 'music/song.mp3')).rejects.toMatchObject({
      name: 'B2ConfigurationError',
    });
  });
});

describe('API middleware', () => {
  it('rejects a missing Access JWT without calling the route', async () => {
    const next = vi.fn(async () => new Response('{}'));
    const context = middlewareContext(
      new Request('https://music.example/api/library'),
      undefined,
      next,
    );

    const response = await accessMiddleware(context as never);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'AUTH_REQUIRED', message: '登录已过期，请重新进入' },
    });
    expect(next).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('fails closed when Access configuration is absent', async () => {
    const next = vi.fn(async () => new Response('{}'));
    const context = middlewareContext(
      new Request('https://music.example/api/library', {
        headers: { 'Cf-Access-Jwt-Assertion': 'header.payload.signature' },
      }),
      {},
      next,
    );

    const response = await accessMiddleware(context as never);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: 'ACCESS_CONFIG_ERROR', message: '服务访问配置错误' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns JSON for unknown API routes without invoking a static fallback', async () => {
    const next = vi.fn(async () => new Response('{"secret":true}'));
    const context = middlewareContext(
      new Request('https://music.example/api/library.json'),
      undefined,
      next,
    );

    const response = await accessMiddleware(context as never);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'API_NOT_FOUND', message: '接口不存在' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('does not expose details from an unexpected signing failure', async () => {
    const env = {
      ACCESS_TEAM_DOMAIN: 'https://example.cloudflareaccess.com',
      ACCESS_AUD: 'test-audience',
    };
    const assertion = await accessToken({
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience: env.ACCESS_AUD,
    });
    const next = vi.fn(async () => {
      throw new Error('application-key-marker X-Amz-Signature=signature-marker');
    });
    const context = middlewareContext(
      new Request('https://music.example/api/play-url?id=trk_test', {
        headers: { 'Cf-Access-Jwt-Assertion': assertion },
      }),
      env,
      next,
    );

    const response = await accessMiddleware(context as never);
    expect(response.status).toBe(500);
    const responseText = await response.text();
    expect(JSON.parse(responseText)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用' },
    });
    expect(responseText).not.toMatch(/application-key-marker|signature-marker|X-Amz-/);
  });
});

describe('Cloudflare Access JWT verification', () => {
  const env = {
    ACCESS_TEAM_DOMAIN: 'https://jwt-test.cloudflareaccess.com',
    ACCESS_AUD: 'expected-audience',
  };

  it('accepts a correctly signed, unexpired RS256 assertion', async () => {
    const assertion = await accessToken({
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience: env.ACCESS_AUD,
    });
    const request = new Request('https://music.example/api/library', {
      headers: { 'Cf-Access-Jwt-Assertion': assertion },
    });

    await expect(verifyAccess(request, env)).resolves.toBeUndefined();
  });

  it('rejects a correctly signed assertion without exp', async () => {
    const assertion = await accessToken({
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience: env.ACCESS_AUD,
      expires: false,
    });
    const request = new Request('https://music.example/api/library', {
      headers: { 'Cf-Access-Jwt-Assertion': assertion },
    });

    await expect(verifyAccess(request, env)).rejects.toBeInstanceOf(AccessUnauthorizedError);
  });

  it('rejects a correctly signed assertion with the wrong audience', async () => {
    const assertion = await accessToken({
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience: 'wrong-audience',
    });
    const request = new Request('https://music.example/api/library', {
      headers: { 'Cf-Access-Jwt-Assertion': assertion },
    });

    await expect(verifyAccess(request, env)).rejects.toBeInstanceOf(AccessUnauthorizedError);
  });
});
