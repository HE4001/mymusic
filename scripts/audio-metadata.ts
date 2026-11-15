import { AwsClient } from 'aws4fetch';
import { parseFromTokenizer } from 'music-metadata';
import { validateObjectKey } from '../server/library';
import type { AudioTags } from './library-sync';
import { METADATA_BLOCK_BYTES, RangeTokenizer } from './range-tokenizer';

const clean = (value?: string) => value?.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300) || undefined;

// Called only after listAudioKeys has validated the endpoint and credentials.
export async function readAudioTags(keys: string[], env: NodeJS.ProcessEnv) {
  const client = new AwsClient({
    accessKeyId: (env.B2_KEY_ID ?? env.B2_ACCESS_KEY_ID)!,
    secretAccessKey: (env.B2_APPLICATION_KEY ?? env.B2_SECRET_ACCESS_KEY)!,
    region: env.B2_REGION, service: 's3', retries: 0,
  });
  const tags = new Map<string, AudioTags>();
  let cursor = 0, completed = 0, failed = 0, durations = 0, bytesRead = 0;
  await Promise.all(Array.from({ length: Math.min(3, keys.length) }, async () => {
    while (cursor < keys.length) {
      const key = keys[cursor++];
      let tokenizer: RangeTokenizer | undefined;
      try {
        validateObjectKey(key);
        const url = new URL(`/${encodeURIComponent(env.B2_BUCKET!)}/${key.split('/').map(encodeURIComponent).join('/')}`, env.B2_ENDPOINT);
        const deadline = AbortSignal.timeout(60_000);
        let expectedSize: number | undefined, etag: string | null = null;
        const readRange = async (start: number, end: number) => {
          for (let attempt = 0; ; attempt++) {
            try {
              const headers: Record<string, string> = { Range: `bytes=${start}-${end}` };
              if (etag) headers['If-Match'] = etag;
              const request = await client.sign(url.toString(), { method: 'GET', headers });
              const response = await fetch(request, {
                redirect: 'error', signal: AbortSignal.any([deadline, AbortSignal.timeout(30_000)]),
              });
              const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range') ?? '');
              const size = range ? Number(range[3]) : Number(response.headers.get('content-length'));
              const validRange = response.status === 206 && range && Number(range[1]) === start && Number(range[2]) === Math.min(end, size - 1);
              const smallWholeFile = response.status === 200 && start === 0 && size <= end + 1;
              if ((!validRange && !smallWholeFile) || !response.body || !Number.isSafeInteger(size) || size <= 0 ||
                (expectedSize !== undefined && expectedSize !== size) || (etag && response.headers.get('etag') !== etag)) {
                await response.body?.cancel();
                throw new Error('音频 Range 响应无效或文件已改变');
              }
              const length = Math.min(end + 1, size) - start;
              const bytes = new Uint8Array(length);
              const reader = response.body.getReader();
              let offset = 0;
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  if (offset + value.length > length) throw new Error('音频响应超出请求范围');
                  bytes.set(value, offset); offset += value.length;
                }
              } finally { await reader.cancel(); }
              if (offset !== length) throw new Error('音频分块不完整');
              expectedSize = size;
              etag = response.headers.get('etag');
              return { bytes, size };
            } catch {
              if (attempt >= 2 || deadline.aborted) throw new Error('音频元数据读取失败');
              await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
            }
          }
        };
        const first = await readRange(0, METADATA_BLOCK_BYTES - 1);
        tokenizer = new RangeTokenizer(key, first.size, first.bytes, async (start, end) => (await readRange(start, end)).bytes);
        const metadata = await parseFromTokenizer(tokenizer, { skipCovers: true, duration: false });
        const duration = metadata.format.duration;
        const validDuration = typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : undefined;
        if (validDuration !== undefined) durations++;
        tags.set(key, {
          title: clean(metadata.common.title), artist: clean(metadata.common.artist ?? metadata.common.albumartist),
          album: clean(metadata.common.album), duration: validDuration,
        });
      } catch { failed++; }
      finally {
        bytesRead += tokenizer?.bytesRead ?? 0;
        await tokenizer?.close();
        completed++;
        if (completed % 25 === 0) console.log(`音频标签进度：${completed}/${keys.length}，已取得 ${durations} 首时长。`);
      }
    }
  }));
  console.log(`音频标签：成功 ${tags.size} 首，时长 ${durations} 首，失败 ${failed} 首，读取 ${(bytesRead / 1024 / 1024).toFixed(2)} MiB。`);
  return tags;
}
