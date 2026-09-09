import { readFile, writeFile, rename } from 'node:fs/promises';
import { validateLibrary } from '../server/library';
import { listAudioKeys, makeLibrary } from './library-sync';
import { readAudioTags } from './audio-metadata';

// Run explicitly before build; ordinary local builds remain offline.

try {
  const target = new URL('../server/library.json', import.meta.url);
  const previous = validateLibrary(JSON.parse(await readFile(target, 'utf8')));
  const keys = await listAudioKeys(process.env);
  const library = makeLibrary(keys, previous, await readAudioTags(keys, process.env));
  const temporary = new URL('../server/library.json.tmp', import.meta.url);
  await writeFile(temporary, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
  console.log(`B2 曲库同步成功：${library.tracks.length} 首。`);
} catch {
  // Do not print raw SDK errors, request URLs, keys, or object names.
  console.error('B2 曲库同步失败，原清单未被覆盖。检查五项B2配置及listFiles/readFiles权限。');
  process.exitCode = 1;
}
