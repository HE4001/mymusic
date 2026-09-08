export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly clientMessage: string,
  ) {
    super(clientMessage);
    this.name = 'ApiHttpError';
  }
}

export function jsonResponse(
  value: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(value), { status, headers });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extraHeaders?: HeadersInit,
): Response {
  return jsonResponse({ error: { code, message } }, status, extraHeaders);
}

export function methodNotAllowed(): Response {
  return errorResponse(405, 'METHOD_NOT_ALLOWED', '此接口只支持 GET 请求', {
    Allow: 'GET',
  });
}
