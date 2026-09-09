import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

class SessionRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'SessionRequestError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function session(method = 'GET', password?: string) {
  const response = await fetch('/api/session', {
    method, credentials: 'same-origin', cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    ...(password === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SessionRequestError(
      response.status === 401 ? '登录已过期，请重新进入' : '服务返回了无效的登录状态',
      response.status,
      response.ok ? 'INVALID_RESPONSE' : undefined,
    );
  }

  const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
  const message = typeof error?.message === 'string' ? error.message : undefined;
  const code = typeof error?.code === 'string' ? error.code : undefined;
  if (!response.ok) {
    throw new SessionRequestError(
      message || (response.status === 401 ? '登录已过期，请重新进入' : '暂时无法验证登录，请重试'),
      response.status,
      code,
    );
  }

  if (!isRecord(body) || typeof body.authenticated !== 'boolean') {
    throw new SessionRequestError('服务返回了无效的登录状态', response.status, 'INVALID_RESPONSE');
  }
  return body.authenticated;
}

function isDefinitiveSessionFailure(error: unknown) {
  return error instanceof SessionRequestError && (
    error.status === 401 ||
    error.code === 'PASSWORD_NOT_CONFIGURED' ||
    error.code === 'SESSION_INVALID' ||
    error.code === 'LOGIN_REQUIRED'
  );
}

function sessionErrorMessage(error: unknown, fallback: string) {
  return error instanceof SessionRequestError && error.message ? error.message : fallback;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryable, setRetryable] = useState(false);
  const operation = useRef(0);
  const submitting = useRef(false);
  const authenticatedRef = useRef(false);
  const hasChecked = useRef(false);
  const mounted = useRef(false);
  const checkInFlight = useRef<Promise<boolean> | null>(null);
  const retryCheck = useRef<() => void>(() => undefined);

  const setAuthenticatedState = (value: boolean) => {
    authenticatedRef.current = value;
    setAuthenticated(value);
  };

  useEffect(() => {
    mounted.current = true;
    const check = () => {
      if (submitting.current) return;
      if (checkInFlight.current) return;

      const initial = !hasChecked.current;
      const id = ++operation.current;
      const current = () => mounted.current && id === operation.current;
      const request = session();
      checkInFlight.current = request;

      void request.then(value => {
        hasChecked.current = true;
        if (!current()) return;

        const wasAuthenticated = authenticatedRef.current;
        setAuthenticatedState(value);
        if (value || wasAuthenticated) setPassword('');
        setRetryable(false);
        setError(value || !wasAuthenticated ? '' : '登录已过期，请重新进入');
      }).catch(checkError => {
        hasChecked.current = true;
        if (!current()) return;

        if (initial || !authenticatedRef.current) {
          setAuthenticatedState(false);
          setRetryable(false);
          setError(sessionErrorMessage(checkError, '暂时无法验证登录，请重试'));
        } else if (isDefinitiveSessionFailure(checkError)) {
          setAuthenticatedState(false);
          setPassword('');
          setRetryable(false);
          setError(sessionErrorMessage(checkError, '登录已过期，请重新进入'));
        } else {
          setError('暂时无法验证登录，已保留当前播放器；网络恢复后请重试。');
          setRetryable(true);
        }
      }).finally(() => {
        if (current()) setChecking(false);
        if (checkInFlight.current === request) checkInFlight.current = null;
      });
    };

    const expired = () => {
      operation.current++;
      setAuthenticatedState(false);
      setPassword('');
      setRetryable(false);
      setError('登录已过期，请重新进入');
      setChecking(false);
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    retryCheck.current = check;
    check();
    window.addEventListener('focus', checkWhenVisible);
    window.addEventListener('pageshow', checkWhenVisible);
    window.addEventListener('session-check', check);
    window.addEventListener('session-expired', expired);
    document.addEventListener('visibilitychange', checkWhenVisible);
    return () => {
      mounted.current = false;
      retryCheck.current = () => undefined;
      window.removeEventListener('focus', checkWhenVisible);
      window.removeEventListener('pageshow', checkWhenVisible);
      window.removeEventListener('session-check', check);
      window.removeEventListener('session-expired', expired);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true;
    const id = ++operation.current;
    const current = () => mounted.current && id === operation.current;
    setBusy(true); setError('');
    try {
      const value = await session('POST', password);
      if (!current()) return;
      setAuthenticatedState(value);
      setPassword('');
      setRetryable(false);
      setError(value ? '' : '登录失败，请重试');
    }
    catch (loginError) { if (current()) setError(loginError instanceof Error ? loginError.message : '登录失败'); }
    finally {
      setPassword('');
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const logout = async () => {
    if (submitting.current) return;
    submitting.current = true;
    const id = ++operation.current;
    const current = () => mounted.current && id === operation.current;
    setBusy(true); setError('');
    try {
      await session('DELETE');
      if (current()) {
        setAuthenticatedState(false);
        setPassword('');
        setRetryable(false);
      }
    } catch (logoutError) {
      if (!current()) return;
      if (isDefinitiveSessionFailure(logoutError)) {
        setAuthenticatedState(false);
        setPassword('');
        setRetryable(false);
        setError(sessionErrorMessage(logoutError, '登录已过期，请重新进入'));
      } else {
        setError('退出失败，请重试');
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  if (checking) return <main className="login-screen"><p role="status">正在进入…</p></main>;
  if (authenticated) return <>
    <div className="session-actions">
      {error ? <span role="alert">{error}</span> : null}
      {retryable ? <button type="button" onClick={() => retryCheck.current()} disabled={busy}>重试</button> : null}
      <button type="button" onClick={() => void logout()} disabled={busy}>退出</button>
    </div>
    {children}
  </>;
  return <main className="login-screen">
    <form className="login-form" onSubmit={event => void login(event)}>
      <p className="eyebrow">私人音乐收藏</p><h1>欢迎回来</h1>
      <label htmlFor="site-password">访问密码</label>
      <input id="site-password" name="password" type="password" autoComplete="current-password" autoCapitalize="none" spellCheck={false} required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} aria-describedby="login-error" />
      <p id="login-error" role="alert">{error}</p>
      <button type="submit" disabled={busy}>{busy ? '正在验证…' : '进入音乐库'}</button>
    </form>
  </main>;
}
