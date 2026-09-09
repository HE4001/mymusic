import { clearSessionCookie, hasSession, passwordMatches, sessionCookie, sitePassword, type AuthEnv } from '../../server/auth';
import { ApiHttpError, jsonResponse } from '../../server/http';

// Best-effort per-isolate throttling; no database or raw IP logging.
const attempts = new Map<string, { count: number; until: number }>();

export const onRequest: PagesFunction<AuthEnv> = async ({ request, env }) => {
  sitePassword(env);
  if (request.method === 'GET') return jsonResponse({ authenticated: await hasSession(request, env) });
  if (!['POST', 'DELETE'].includes(request.method)) return jsonResponse({ error: { message: '请求方法不支持' } }, 405, { Allow: 'GET, POST, DELETE' });
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new ApiHttpError(403, 'INVALID_ORIGIN', '请求来源无效');
  if (request.method === 'DELETE') return jsonResponse({ authenticated: false }, 200, { 'Set-Cookie': clearSessionCookie(request) });
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const now = Date.now();
  for (const [id, value] of attempts) if (value.until <= now) attempts.delete(id);
  const entry = attempts.get(ip) ?? { count: 0, until: now + 60_000 };
  if (entry.count >= 10 || (!attempts.has(ip) && attempts.size >= 1000)) throw new ApiHttpError(429, 'TOO_MANY_ATTEMPTS', '尝试过于频繁，请一分钟后重试');
  entry.count++; attempts.set(ip, entry);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ApiHttpError(400, 'INVALID_INPUT', '请输入密码');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiHttpError(400, 'INVALID_INPUT', '请输入密码');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 4096) throw new ApiHttpError(413, 'INPUT_TOO_LARGE', '密码过长');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  let input: unknown;
  try {
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw new ApiHttpError(400, 'INVALID_INPUT', '请输入密码'); }
  const password = (input as { password?: unknown } | null)?.password;
  if (typeof password !== 'string' || !(await passwordMatches(password, env))) throw new ApiHttpError(401, 'INVALID_PASSWORD', '密码不正确');
  attempts.delete(ip);
  return jsonResponse({ authenticated: true }, 200, { 'Set-Cookie': await sessionCookie(request, env) });
};
