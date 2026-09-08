import { readFile } from 'node:fs/promises';
import { validateLibrary } from '../server/library';

try {
  const raw: unknown = JSON.parse(await readFile(new URL('../server/library.json', import.meta.url), 'utf8'));
  const library = validateLibrary(raw);
  console.log(`曲库校验通过：${library.tracks.length} 首。`);
} catch (error) {
  console.error('曲库校验失败：', error instanceof Error ? error.message : '未知错误');
  process.exitCode = 1;
}
