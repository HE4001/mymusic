// @vitest-environment happy-dom
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from '../src/components/AuthGate';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

let root: Root;
let host: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;

function gate() {
  return createElement(
    AuthGate,
    null,
    createElement('div', { 'data-testid': 'player' }, 'player'),
  );
}

async function renderGate(strict = true) {
  await act(async () => {
    root.render(strict ? createElement(StrictMode, null, gate()) : gate());
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AuthGate session lifecycle', () => {
  it('fails closed when the initial session check cannot reach the server', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));

    await renderGate();

    expect(host.querySelector('[data-testid="player"]')).toBeNull();
    expect(host.querySelector('#site-password')).not.toBeNull();
    expect(host.textContent).toContain('暂时无法验证登录');
  });

  it('coalesces lifecycle checks and keeps the player on a temporary failure', async () => {
    const refresh = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ authenticated: true }))
      .mockReturnValueOnce(refresh.promise);

    await renderGate();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('pageshow'));
      window.dispatchEvent(new Event('session-check'));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[data-testid="player"]')).not.toBeNull();

    await act(async () => refresh.reject(new TypeError('offline')));

    expect(host.querySelector('[data-testid="player"]')).not.toBeNull();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('已保留当前播放器');
    expect(host.textContent).toContain('重试');
  });

  it('checks again after a visible BFCache return but ignores hidden lifecycle events', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ authenticated: true })));
    await renderGate();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => {
      window.dispatchEvent(new Event('pageshow'));
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => {
      window.dispatchEvent(new Event('pageshow'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[data-testid="player"]')).not.toBeNull();
  });

  it.each([
    ['an explicit unauthenticated response', () => jsonResponse({ authenticated: false })],
    ['a 401 response', () => jsonResponse({ error: { code: 'LOGIN_REQUIRED', message: '登录已过期，请重新进入' } }, 401)],
    ['a missing password configuration', () => jsonResponse({ error: { code: 'PASSWORD_NOT_CONFIGURED', message: '管理员尚未配置访问密码' } }, 503)],
  ])('closes the player on %s', async (_description, nextResponse) => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ authenticated: true }))
      .mockReturnValueOnce(nextResponse());

    await renderGate();
    await act(async () => window.dispatchEvent(new Event('pageshow')));

    expect(host.querySelector('[data-testid="player"]')).toBeNull();
    expect(host.querySelector('#site-password')).not.toBeNull();
  });

  it('does not let an older check re-authenticate after a successful logout', async () => {
    const refresh = deferred<Response>();
    const logout = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ authenticated: true }))
      .mockReturnValueOnce(refresh.promise)
      .mockReturnValueOnce(logout.promise);

    await renderGate();
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const logoutButton = Array.from(host.querySelectorAll('button')).find(button => button.textContent === '退出');
    expect(logoutButton).not.toBeUndefined();
    await act(async () => (logoutButton as HTMLButtonElement).click());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });

    await act(async () => logout.resolve(jsonResponse({ authenticated: false })));
    expect(host.querySelector('[data-testid="player"]')).toBeNull();

    await act(async () => refresh.resolve(jsonResponse({ authenticated: true })));
    expect(host.querySelector('[data-testid="player"]')).toBeNull();
  });
});
