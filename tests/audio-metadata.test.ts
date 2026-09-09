import { afterEach, expect, it, vi } from 'vitest';
import { readAudioTags } from '../scripts/audio-metadata';

const env = { B2_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com', B2_REGION: 'us-east-005',
  B2_BUCKET: 'test-bucket', B2_ACCESS_KEY_ID: 'test-key', B2_SECRET_ACCESS_KEY: 'test-secret' };
afterEach(() => vi.restoreAllMocks());

function id3() {
  const frame = (id: string, text: string) => {
    const data = Buffer.concat([Buffer.from([3]), Buffer.from(text)]);
    const header = Buffer.alloc(10);
    header.write(id); header.writeUInt32BE(data.length, 4);
    return Buffer.concat([header, data]);
  };
  const body = Buffer.concat([frame('TIT2', '歌曲'), frame('TPE1', '歌手'), frame('TALB', '专辑')]);
  return Buffer.concat([Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, body.length]), body]);
}

it('reads actual ID3 tags using a signed range request and credential aliases', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(id3(), {
    status: 206, headers: { 'Content-Range': 'bytes 0-1023/9000000' },
  }));
  const tags = await readAudioTags(['中文/歌曲.mp3'], env);
  expect(tags.get('中文/歌曲.mp3')).toMatchObject({ title: '歌曲', artist: '歌手', album: '专辑', duration: undefined });
  const request = fetchMock.mock.calls[0][0] as Request;
  expect(request.headers.get('range')).toBe('bytes=0-2097151');
  expect(request.headers.has('authorization')).toBe(true);
  expect(request.url).not.toContain(env.B2_SECRET_ACCESS_KEY);
});

it('cancels a server that ignores Range at the byte limit', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const cancel = vi.fn();
  let reads = 0;
  const stream = new ReadableStream({ pull(controller) {
    reads++;
    controller.enqueue(reads === 1 ? id3() : new Uint8Array(1024 * 1024));
  }, cancel });
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream));
  await readAudioTags(['song.mp3'], env);
  expect(cancel).toHaveBeenCalledOnce();
  expect(reads).toBeLessThanOrEqual(4);
});
