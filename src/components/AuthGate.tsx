import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

async function session(method = 'GET', password?: string) {
  const response = await fetch('/api/session', {
    method, credentials: 'same-origin', cache: 'no-store',
    ...(password === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }),
  });
  const body = await response.json() as { authenticated?: boolean; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || '暂时无法登录，请重试');
  return body.authenticated === true;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef(0);
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    const check = () => {
      if (submitting.current) return;
      const id = ++operation.current;
      const current = () => active && id === operation.current;
      void session().then(value => {
        if (current()) { setAuthenticated(value); setError(''); }
      }).catch(() => { if (current()) { setAuthenticated(false); setError('暂时无法验证登录，请重试'); } })
        .finally(() => { if (current()) setChecking(false); });
    };
    const expired = () => { operation.current++; setAuthenticated(false); setPassword(''); };
    check();
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    window.addEventListener('session-check', check);
    window.addEventListener('session-expired', expired);
    return () => {
      active = false;
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
      window.removeEventListener('session-check', check);
      window.removeEventListener('session-expired', expired);
    };
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; operation.current++;
    setBusy(true); setError('');
    try { setAuthenticated(await session('POST', password)); setPassword(''); }
    catch (error) { setError(error instanceof Error ? error.message : '登录失败'); }
    finally { submitting.current = false; setBusy(false); }
  };
  const logout = async () => {
    if (submitting.current) return;
    submitting.current = true; operation.current++;
    setBusy(true); setError('');
    try { await session('DELETE'); setAuthenticated(false); }
    catch { setError('退出失败，请重试'); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (checking) return <main className="login-screen"><p role="status">正在进入…</p></main>;
  if (authenticated) return <>
    <div className="session-actions"><span role="alert">{error}</span><button type="button" onClick={() => void logout()} disabled={busy}>退出</button></div>
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
