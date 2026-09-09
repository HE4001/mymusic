import { onRequest as playUrl } from './play-url';
import type { B2Env } from '../../server/b2';

// A same-origin media URL lets Safari start play() inside the tap event.
export const onRequest: PagesFunction<B2Env> = async context => {
  const response = await playUrl(context);
  if (!response.ok) return response;
  const { url } = await response.json() as { url: string };
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
};
