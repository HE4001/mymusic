// Generate TypeScript manifest for Cloudflare Functions
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const content = readFileSync(`${__dirname}../src/js/manifest-generated.js`, 'utf-8');
const match = content.match(/export const SONGS_MANIFEST = (\[[\s\S]*?\]);/);
const songs = eval(match[1]);

const lines = songs.map(s =>
  `  '${s.id}': { title: '${s.title.replace(/'/g, "\\'")}', artist: '${s.artist.replace(/'/g, "\\'")}', album: '${s.album.replace(/'/g, "\\'")}', fileName: '${s.fileName.replace(/'/g, "\\'")}' },`
).join('\n');

const ts = `// Auto-generated song manifest for Cloudflare Functions
// Run \`npm run sync-manifest\` to update from B2

export interface SongMeta {
  title: string;
  artist: string;
  album: string;
  fileName: string;
}

export const SONG_MAP: Record<string, SongMeta> = {
${lines}
};

export function findSong(id: string): SongMeta | undefined {
  return SONG_MAP[id];
}
`;

writeFileSync(`${__dirname}../src/functions/song-manifest.ts`, ts, 'utf-8');
console.log('song-manifest.ts generated with', songs.length, 'songs');
console.log('File size:', (Buffer.byteLength(ts) / 1024).toFixed(1), 'KB');
