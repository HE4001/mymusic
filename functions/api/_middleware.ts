import { B2ConfigurationError } from '../../server/b2';
import { ApiHttpError, errorResponse } from '../../server/http';
import { hasSession, type AuthEnv } from '../../server/auth';

const API_PATHS = new Set(['/api/library', '/api/play-url', '/api/stream', '/api/session']);

function responseForError(error: unknown): Response {
  if (error instanceof ApiHttpError) {
    return errorResponse(error.status, error.code, error.clientMessage);
  }
  if (error instanceof B2ConfigurationError) {
    return errorResponse(500, 'B2_CONFIG_ERROR', '音频存储配置错误');
  }
  return errorResponse(500, 'INTERNAL_ERROR', '服务暂时不可用');
}

export const onRequest: PagesFunction<AuthEnv> = async (context) => {
  const pathname = new URL(context.request.url).pathname;
  if (!API_PATHS.has(pathname)) {
    return errorResponse(404, 'API_NOT_FOUND', '接口不存在');
  }

  try {
    if (pathname !== '/api/session' && !(await hasSession(context.request, context.env))) {
      return errorResponse(401, 'LOGIN_REQUIRED', '请输入访问密码');
    }
    const response = await context.next();
    const headers = new Headers(response.headers);
    if (pathname !== '/api/stream') headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return responseForError(error);
  }
};
