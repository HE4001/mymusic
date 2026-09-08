import { afterEach, describe, expect, it, vi } from 'vitest';
import { listAudioKeys, makeLibrary, parseListing } from '../scripts/library-sync';

const empty = { schemaVersion: 1 as const, updatedAt: '2026-09-08T00:00:00Z', tracks: [] };
const page = (keys: string[], next?: string) => `<ListBucketResult><EncodingType>url</EncodingType><IsTruncated>${!!next}</IsTruncated>${keys.map(key => `<Contents><Key>${encodeURIComponent(key)}</Key></Contents>`).join('')}${next ? `<NextContinuationToken>${next}</NextContinuationToken>` : ''}</ListBucketResult>`;
const env = {
  B2_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com', B2_REGION: 'us-east-005',
  B2_BUCKET: 'test-bucket', B2_KEY_ID: 'test-key', B2_APPLICATION_KEY: 'test-secret',
};
afterEach(() => vi.unstubAllGlobals());

describe('library sync', () => {
  it('paginates signed listings and decodes object names exactly once', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(page(['music/中文 #?%2e.mp3', 'music/cover.jpg'], 'token&amp;next')))
      .mockResolvedValueOnce(new Response(page(['music/002.FLAC'])));
    vi.stubGlobal('fetch', fetchMock);
    expect(await listAudioKeys(env)).toEqual(['music/002.FLAC', 'music/中文 #?%2e.mp3']);
    const second = fetchMock.mock.calls[1][0] as Request;
    expect(new URL(second.url).searchParams.get('continuation-token')).toBe('token&next');
    expect(second.headers.has('authorization')).toBe(true);
    expect(second.url).not.toContain(env.B2_APPLICATION_KEY);
  });

  it('preserves metadata and stable IDs while rejecting empty replacements', () => {
    const first = makeLibrary(['music/a.mp3'], empty);
    first.tracks[0].title = 'Edited title';
    first.tracks[0].duration = 123;
    const next = makeLibrary(['music/b.wav', 'music/a.mp3'], first);
    expect(next.tracks[0]).toEqual(first.tracks[0]);
    expect(makeLibrary(['music/a.mp3'], empty).tracks[0].id).toBe(first.tracks[0].id);
    expect(() => makeLibrary([], first)).toThrow(/未修改曲库/);
  });

  it('rejects malformed or incomplete responses', () => {
    for (const xml of ['<broken>', '<html>Denied</html>', '<!DOCTYPE x><x/>', page([], 'x').replace('<NextContinuationToken>x</NextContinuationToken>', '')]) {
      expect(() => parseListing(xml)).toThrow();
    }
  });

  it('rejects failed and repeated pages instead of publishing a partial library', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret-value', { status: 403 })));
    await expect(listAudioKeys(env)).rejects.toThrow(/HTTP 403/);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(page(['music/a.mp3'], 'same'))));
    await expect(listAudioKeys(env)).rejects.toThrow(/重复分页/);
  });
});
