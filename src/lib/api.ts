import type { Library, PlayTicket, Track } from '../types';

type ApiErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly cause?: unknown;

  constructor(code: string, message: string, status = 0, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTrack(value: unknown): value is Track {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    typeof value.artist === 'string' &&
    typeof value.album === 'string' &&
    typeof value.mimeType === 'string' &&
    (value.duration === null ||
      (typeof value.duration === 'number' &&
        Number.isFinite(value.duration) &&
        value.duration > 0))
  );
}

function isLibrary(value: unknown): value is Library {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.tracks) &&
    value.tracks.every(isTrack)
  );
}

function isPlayTicket(value: unknown): value is PlayTicket {
  return (
    isRecord(value) &&
    typeof value.trackId === 'string' &&
    value.trackId.length > 0 &&
    typeof value.url === 'string' &&
    value.url.length > 0 &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt)
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : isRecord(error) && error.name === 'AbortError';
}

async function requestJson(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError('NETWORK_ERROR', '网络请求失败，请检查连接后重试', 0, error);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (response.redirected || contentType.includes('text/html')) {
    throw new ApiError('INVALID_RESPONSE', '服务返回了网页，请检查部署或访问限制', response.status);
  }

  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    throw new ApiError('INVALID_RESPONSE', '服务返回了无法识别的内容', response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new ApiError('INVALID_RESPONSE', '服务返回了无效的 JSON', response.status, error);
  }

  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('session-expired'));
    const payload = isRecord(body) ? (body as ApiErrorPayload) : undefined;
    const code =
      typeof payload?.error?.code === 'string' ? payload.error.code : 'REQUEST_FAILED';
    const message =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : response.status === 401
          ? '登录已过期，请重新进入'
          : '请求失败，请稍后重试';
    throw new ApiError(code, message, response.status);
  }

  return body;
}

export async function getLibrary(signal?: AbortSignal): Promise<Library> {
  const value = await requestJson('/api/library', signal);
  if (!isLibrary(value)) {
    throw new ApiError('INVALID_LIBRARY', '曲库数据格式无效');
  }
  return value;
}

export async function getPlayTicket(
  id: string,
  signal?: AbortSignal,
): Promise<PlayTicket> {
  const value = await requestJson(`/api/play-url?id=${encodeURIComponent(id)}`, signal);
  if (!isPlayTicket(value) || value.trackId !== id) {
    throw new ApiError('INVALID_PLAY_TICKET', '播放地址格式无效');
  }
  return value;
}
