import { AwsClient } from 'aws4fetch';
import { parseBuffer } from 'music-metadata';
import { validateObjectKey } from '../server/library';
import type { AudioTags } from './library-sync';

const LIMIT = 2 * 1024 * 1024;
const clean = (value?: string) => value?.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300) || undefined;

// Called only after listAudioKeys has validated the endpoint and credentials.
export async function readAudioTags(keys: string[], env: NodeJS.ProcessEnv) {
  const client = new AwsClient({
    accessKeyId: (env.B2_KEY_ID ?? env.B2_ACCESS_KEY_ID)!,
    secretAccessKey: (env.B2_APPLICATION_KEY ?? env.B2_SECRET_ACCESS_KEY)!,
    region: env.B2_REGION, service: 's3', retries: 0,
  });
  const tags = new Map<string, AudioTags>();
  let cursor = 0, failed = 0;
  await Promise.all(Array.from({ length: Math.min(3, keys.length) }, async () => {
    while (cursor < keys.length) {
      const key = keys[cursor++];
      try {
        validateObjectKey(key);
        const url = new URL(`/${encodeURIComponent(env.B2_BUCKET!)}/${key.split('/').map(encodeURIComponent).join('/')}`, env.B2_ENDPOINT);
        const request = await client.sign(url.toString(), { headers: { Range: `bytes=0-${LIMIT - 1}` } });
        const response = await fetch(request, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
        if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error('Read failed'); }
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (length < LIMIT) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = value.subarray(0, LIMIT - length);
            chunks.push(chunk); length += chunk.length;
          }
        } finally { await reader.cancel(); }
        const bytes = Buffer.concat(chunks);
        const total = Number(response.headers.get('content-range')?.split('/').at(-1) ?? response.headers.get('content-length'));
        const metadata = await parseBuffer(bytes, { path: key }, { skipCovers: true, skipPostHeaders: true, duration: false });
        tags.set(key, {
          title: clean(metadata.common.title), artist: clean(metadata.common.artist ?? metadata.common.albumartist),
          album: clean(metadata.common.album),
          duration: total === length && metadata.format.duration && Number.isFinite(metadata.format.duration) && metadata.format.duration > 0 ? metadata.format.duration : undefined,
        });
      } catch { failed++; }
    }
  }));
  console.log(`音频标签：成功读取 ${tags.size} 首，${failed} 首使用现有信息或目录名称。`);
  return tags;
}
