import { describe, expect, it, vi } from 'vitest';
import { onRequest as middleware } from '../functions/api/_middleware';
import { onRequest as session } from '../functions/api/session';
import { hasSession, sessionCookie } from '../server/auth';

const env = { SITE_PASSWORD: 'test-only-password-123' };
async function call(method: string, password?: string, origin = 'https://music.example', cookie?: string) {
  const request = new Request('https://music.example/api/session', {
    method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(password === undefined ? {} : { body: JSON.stringify({ password }) }),
  });
  const context = { request, env, next: () => session({ request, env } as never) };
  return middleware(context as never);
}

describe('password gate', () => {
  it('protects the library, ticket and stream endpoints and fails closed without configuration', async () => {
    for (const path of ['/api/library', '/api/play-url?id=test', '/api/stream?id=test']) {
      const next = vi.fn();
      const request = new Request(`https://music.example${path}`);
      expect((await middleware({ request, env, next } as never)).status).toBe(401);
      expect((await middleware({ request, env: {}, next } as never)).status).toBe(503);
      expect(next).not.toHaveBeenCalled();
    }
  });
  it('rejects wrong passwords and cross-site login, then issues an HttpOnly secure session', async () => {
    expect((await call('POST', 'wrong')).status).toBe(401);
    expect((await call('POST', env.SITE_PASSWORD, 'https://elsewhere.example')).status).toBe(403);
    const response = await call('POST', env.SITE_PASSWORD);
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!;
    expect(cookie).toMatch(/^__Host-music_session=/);
    expect(cookie).toContain('HttpOnly; SameSite=Strict');
    expect(cookie).toContain('; Secure');
    expect(cookie).not.toContain(env.SITE_PASSWORD);
    expect(await (await call('GET', undefined, undefined, cookie)).json()).toEqual({ authenticated: true });
    expect((await call('DELETE')).headers.get('set-cookie')).toContain('Max-Age=0');
  });
  it('rejects altered, expired and password-rotated sessions', async () => {
    const request = new Request('https://music.example');
    const cookie = await sessionCookie(request, env);
    const authenticated = new Request(request, { headers: { Cookie: cookie } });
    expect(await hasSession(authenticated, env)).toBe(true);
    expect(await hasSession(authenticated, { SITE_PASSWORD: 'another-password-456' })).toBe(false);
    expect(await hasSession(new Request(request, { headers: { Cookie: cookie.replace(/=\d/, '=0') } }), env)).toBe(false);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 8 * 24 * 3600_000);
    try { expect(await hasSession(authenticated, env)).toBe(false); } finally { vi.restoreAllMocks(); }
  });
  it('throttles repeated failed logins', async () => {
    let response: Response | undefined;
    for (let i = 0; i < 11; i++) response = await call('POST', 'wrong');
    expect(response?.status).toBe(429);
  });
});
