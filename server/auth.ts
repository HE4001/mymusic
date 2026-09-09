import { ApiHttpError } from './http';

export interface AuthEnv { SITE_PASSWORD?: string }
const TTL = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();
const cookieName = (request: Request) => new URL(request.url).protocol === 'https:' ? '__Host-music_session' : 'music_session';

export function sitePassword(env: AuthEnv): string {
  if (!env.SITE_PASSWORD || env.SITE_PASSWORD.length < 12) {
    throw new ApiHttpError(503, 'PASSWORD_NOT_CONFIGURED', '管理员尚未配置访问密码');
  }
  return env.SITE_PASSWORD;
}

async function key(env: AuthEnv) {
  return crypto.subtle.importKey('raw', encoder.encode(sitePassword(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function passwordMatches(input: string, env: AuthEnv): Promise<boolean> {
  const digest = (value: string) => crypto.subtle.digest('SHA-256', encoder.encode(value));
  const [left, right] = await Promise.all([digest(input), digest(sitePassword(env))]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function sessionCookie(request: Request, env: AuthEnv): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + TTL;
  const payload = `${expires}.${crypto.randomUUID()}`;
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await key(env), encoder.encode(payload)));
  const token = `${payload}.${Array.from(signature, n => n.toString(16).padStart(2, '0')).join('')}`;
  return cookie(request, token, TTL);
}

function cookie(request: Request, token: string, maxAge: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export const clearSessionCookie = (request: Request) => cookie(request, '', 0);

export async function hasSession(request: Request, env: AuthEnv): Promise<boolean> {
  sitePassword(env);
  const token = request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName(request)}=`))?.split('=')[1];
  if (!token || token.length > 160) return false;
  const match = /^(\d{10})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const now = Math.floor(Date.now() / 1000), expires = Number(match[1]);
  if (expires <= now || expires > now + TTL) return false;
  const bytes = Uint8Array.from(match[3].match(/../g)!, s => parseInt(s, 16));
  return crypto.subtle.verify('HMAC', await key(env), bytes, encoder.encode(`${match[1]}.${match[2]}`));
}
