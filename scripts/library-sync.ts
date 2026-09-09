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
    B2_KEY_ID = env.B2_ACCESS_KEY_ID, B2_APPLICATION_KEY = env.B2_SECRET_ACCESS_KEY } = env;
  const accessKeyId = B2_KEY_ID, secretAccessKey = B2_APPLICATION_KEY;
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
    url.search = new URLSearchParams({ 'list-type': '2', 'encoding-type': 'url', 'max-keys': '1000' }).toString();
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
      if (formats[ext]) keys.add(key);
    }
    next = listing.next;
    if (!next) return [...keys].sort();
    if (tokens.has(next)) throw new Error('B2 返回重复分页标记，停止同步');
    tokens.add(next);
  }
  throw new Error('文件列表超过100页，停止同步，请缩小曲库范围');
}

export interface AudioTags { title?: string; artist?: string; album?: string; duration?: number }

export function cleanTag(value = ''): string {
  // Older ID3 writers sometimes stored GBK bytes with an ISO-8859-1 label.
  if (/^[\u0000-\u00ff]+$/.test(value) && /[\u0080-\u00ff]{2}/.test(value)) {
    try {
      const decoded = new TextDecoder('gb18030', { fatal: true }).decode(Buffer.from(value, 'latin1'));
      if (/[\u3400-\u9fff]/.test(decoded)) value = decoded;
    } catch { /* Keep legitimate Latin text unchanged. */ }
  }
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300);
}

function albumFolders(key: string): string[] {
  const folders = key.split('/').slice(0, -1).filter((part, index, all) => index === 0 || part !== all[index - 1]);
  if (folders[0] === 'music') folders.shift();
  if (/^(?:cd|disc|disk)\s*\d+$/i.test(folders.at(-1) ?? '')) folders.pop();
  return folders;
}

export function makeLibrary(keys: string[], previous: ServerLibrary, tags = new Map<string, AudioTags>()): ServerLibrary {
  const existing = new Map(previous.tracks.map(track => [track.objectKey, track]));
  if (!keys.length) throw new Error('桶内没有支持的音频，未修改曲库。请检查密钥范围');
  const unique = [...new Set(keys)].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  const groups = new Map<string, string[]>();
  for (const key of unique) {
    const group = albumFolders(key).join('/');
    if (!group) continue;
    const names = groups.get(group) ?? [];
    names.push(cleanTag(tags.get(key)?.album).replace(/\s*[-–(（]?\s*(?:CD|disc|disk)\s*\d+[)）]?$/i, '').trim());
    groups.set(group, names);
  }
  const albumNames = new Map<string, string>();
  for (const [group, names] of groups) {
    const counts = new Map<string, number>();
    for (const name of names) if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    const dominant = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (dominant && dominant[1] > names.length / 2) albumNames.set(group, dominant[0]);
  }
  return validateLibrary({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    tracks: unique.map(objectKey => {
      const old = existing.get(objectKey);
      const filename = objectKey.split('/').at(-1)!;
      const extension = filename.split('.').at(-1)!.toLowerCase();
      const filenameTitle = filename.slice(0, -(extension.length + 1)).slice(0, 300);
      const metadata = tags.get(objectKey) ?? {};
      const folders = albumFolders(objectKey);
      return {
        id: old?.id ?? `b2_${createHash('sha256').update(objectKey).digest('hex').slice(0, 24)}`,
        title: old?.title && old.title !== filenameTitle ? old.title : cleanTag(metadata.title) || filenameTitle,
        artist: old?.artist || cleanTag(metadata.artist) || (folders.length > 1 ? cleanTag(folders[0]) : ''),
        album: old?.album || albumNames.get(folders.join('/')) || cleanTag(metadata.album) || cleanTag(folders.at(-1)),
        duration: old?.duration ?? metadata.duration ?? null,
        mimeType: formats[extension], objectKey,
      };
    }),
  });
}
