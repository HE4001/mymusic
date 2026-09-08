import { type B2Env, signTrack } from '../../server/b2';
import { findTrack, isValidTrackId } from '../../server/library';
import { ApiHttpError, jsonResponse, methodNotAllowed } from '../../server/http';

export const onRequest: PagesFunction<B2Env> = async ({ request, env }) => {
  if (request.method !== 'GET') {
    return methodNotAllowed();
  }

  const url = new URL(request.url);
  const entries = [...url.searchParams];
  if (entries.length !== 1 || entries[0][0] !== 'id' || !isValidTrackId(entries[0][1])) {
    throw new ApiHttpError(400, 'INVALID_TRACK_ID', '请提供一个合法的歌曲 id');
  }

  const trackId = entries[0][1];
  const track = findTrack(trackId);
  if (!track) {
    throw new ApiHttpError(404, 'TRACK_NOT_FOUND', '歌曲不存在或已移除');
  }

  const signed = await signTrack(env, track.objectKey);
  return jsonResponse({
    trackId,
    url: signed.url,
    expiresAt: signed.expiresAt,
  });
};
