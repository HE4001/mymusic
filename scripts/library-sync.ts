import { createHash } from 'node:crypto';
import { AwsClient } from 'aws4fetch';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { validateLibrary, type ServerLibrary } from '../server/library';

const formats: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
  flac: 'audio/flac', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg',
};
const parser = new XMLParser({ parseTagValue: false, ignoreAttributes: true });

export function parseListing(xml: string): { keys: string[]; next?: string } {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) {
    throw new Error('B2 文件列表格式无效');
  }
  const page = parser.parse(xml).ListBucketResult;
  if (!page || page.EncodingType !== 'url' || !['true', 'false'].includes(page.IsTruncated)) {
    throw new Error('B2 文件列表缺少必要字段');
  }
  const contents = page.Contents ? (Array.isArray(page.Contents) ? page.Contents : [page.Contents]) : [];
  const keys = contents.map((entry: { Key?: unknown }) => {
    if (typeof entry.Key !== 'string') throw new Error('B2 文件列表包含无效对象');
    try { return decodeURIComponent(entry.Key); }
    catch { throw new Error('B2 对象名称编码无效'); }
  });
  const next = page.IsTruncated === 'true' ? page.NextContinuationToken : undefined;
  if (page.IsTruncated === 'true' && (typeof next !== 'string' || !next)) {
    throw new Error('B2 文件列表缺少分页标记');
  }
  return { keys, next };
}

export async function listAudioKeys(env: NodeJS.ProcessEnv): Promise<string[]> {
  const { B2_ENDPOINT: endpoint, B2_REGION: region, B2_BUCKET: bucket,
    B2_KEY_ID: accessKeyId, B2_APPLICATION_KEY: secretAccessKey } = env;
  if (!region || !/^[a-z0-9-]+$/.test(region) || endpoint !== `https://s3.${region}.backblazeb2.com`
    || !bucket || !/^[A-Za-z0-9][A-Za-z0-9-]{4,48}[A-Za-z0-9]$/.test(bucket)
    || !accessKeyId?.trim() || !secretAccessKey?.trim()) {
    throw new Error('曲库同步需要正确的五项 B2 环境配置');
  }
  const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: 's3', retries: 0 });
  const keys = new Set<string>();
  const tokens = new Set<string>();
  let next: string | undefined;
  for (let page = 0; page < 100; page++) {
    const url = new URL(`/${encodeURIComponent(bucket)}/`, endpoint);
    url.search = new URLSearchParams({ 'list-type': '2', 'encoding-type': 'url', prefix: 'music/', 'max-keys': '1000' }).toString();
    if (next) url.searchParams.set('continuation-token', next);
    let response: Response;
    try {
      const request = await client.sign(url.toString(), { method: 'GET' });
      response = await fetch(request, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
    } catch { throw new Error('B2 文件列表请求失败，请检查网络和配置'); }
    if (!response.ok) throw new Error(`B2 文件列表读取失败（HTTP ${response.status}），请检查密钥的 listFiles 权限`);
    const listing = parseListing(await response.text());
    for (const key of listing.keys) {
      const ext = key.split('.').at(-1)?.toLowerCase() ?? '';
      if (key.startsWith('music/') && formats[ext]) keys.add(key);
    }
    next = listing.next;
    if (!next) return [...keys].sort();
    if (tokens.has(next)) throw new Error('B2 返回重复分页标记，停止同步');
    tokens.add(next);
  }
  throw new Error('文件列表超过100页，停止同步，请缩小曲库范围');
}

export function makeLibrary(keys: string[], previous: ServerLibrary): ServerLibrary {
  const existing = new Map(previous.tracks.map(track => [track.objectKey, track]));
  if (!keys.length) throw new Error('music/ 下没有支持的音频，未修改曲库。请检查目录和密钥范围');
  return validateLibrary({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    tracks: [...new Set(keys)].sort().map(objectKey => {
      const old = existing.get(objectKey);
      if (old) return old;
      const filename = objectKey.split('/').at(-1)!;
      const extension = filename.split('.').at(-1)!.toLowerCase();
      return {
        id: `b2_${createHash('sha256').update(objectKey).digest('hex').slice(0, 24)}`,
        title: filename.slice(0, -(extension.length + 1)).slice(0, 300),
        artist: '', album: '', duration: null,
        mimeType: formats[extension], objectKey,
      };
    }),
  });
}
