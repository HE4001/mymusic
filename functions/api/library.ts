import { getLibrary } from '../../server/library';
import { ApiHttpError, jsonResponse, methodNotAllowed } from '../../server/http';

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method !== 'GET') {
    return methodNotAllowed();
  }

  const url = new URL(request.url);
  if ([...url.searchParams].length !== 0) {
    throw new ApiHttpError(400, 'INVALID_QUERY', '曲库接口不接受查询参数');
  }

  return jsonResponse(getLibrary());
};
