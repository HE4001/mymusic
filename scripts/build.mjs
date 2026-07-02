import {
  copyFileSync, mkdirSync, cpSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, rmSync,
} from 'fs';
import { execSync } from 'child_process';

import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SRC = `${__dirname}../src`;
const DIST = `${__dirname}../dist`;

// ═══════════════════════════════════════════════════════
//  Build — Copy source to dist for deployment
// ═══════════════════════════════════════════════════════

function build() {
  console.log('🔨 Building MyMusic...\n');

  mkdirSync(`${DIST}/css`, { recursive: true });
  mkdirSync(`${DIST}/js`, { recursive: true });
  mkdirSync(`${DIST}/functions/api/stream`, { recursive: true });

  console.log('📄 Copying files...');

  // CSS
  const cssFiles = ['variables.css', 'base.css', 'layout.css', 'components.css', 'desktop.css', 'ios.css'];
  for (const f of cssFiles) copyFileSync(`${SRC}/css/${f}`, `${DIST}/css/${f}`);

  // JS
  const jsFiles = ['utils.js', 'platform.js', 'api.js', 'playlist.js', 'player.js', 'shortcuts.js', 'gestures.js', 'visualizer.js'];
  for (const f of jsFiles) copyFileSync(`${SRC}/js/${f}`, `${DIST}/js/${f}`);
  copyFileSync(`${SRC}/js/app.js`, `${DIST}/js/app.js`);

  // HTML
  copyFileSync(`${SRC}/index.html`, `${DIST}/index.html`);

  // Functions (TypeScript, compiled by Wrangler)
  copyFileSync(`${SRC}/_middleware.ts`, `${DIST}/_middleware.ts`);
  copyFileSync(`${SRC}/functions/b2.ts`, `${DIST}/functions/b2.ts`);
  copyFileSync(`${SRC}/functions/types.ts`, `${DIST}/functions/types.ts`);
  copyFileSync(`${SRC}/functions/song-manifest.ts`, `${DIST}/functions/song-manifest.ts`);
  copyFileSync(`${SRC}/functions/api/stream/[id].ts`, `${DIST}/functions/api/stream/[id].ts`);

  // Public assets
  const PUBLIC = `${__dirname}../public`;
  if (existsSync(PUBLIC)) {
    cpSync(PUBLIC, DIST, { recursive: true });
  }

  // Inject build version into service worker
  const pkg = JSON.parse(readFileSync(`${__dirname}../package.json`, 'utf-8'));
  const buildVersion = `${pkg.version}-${Date.now()}`;
  let swContent = readFileSync(`${DIST}/sw.js`, 'utf-8');
  swContent = swContent.replace('__VERSION__', buildVersion);
  writeFileSync(`${DIST}/sw.js`, swContent, 'utf-8');
  console.log(`🧹 Service Worker cache version: ${buildVersion}`);

  // Icons: convert SVG → PNG
  console.log('🖼️  Icons...');
  try {
    if (existsSync(`${PUBLIC}/icon-192.svg`)) {
      execSync(`rsvg-convert -w 192 -h 192 "${PUBLIC}/icon-192.svg" -o "${DIST}/icon-192.png"`, { stdio: 'ignore' });
      execSync(`rsvg-convert -w 512 -h 512 "${PUBLIC}/icon-512.svg" -o "${DIST}/icon-512.png"`, { stdio: 'ignore' });
      execSync(`rsvg-convert -w 512 -h 512 "${PUBLIC}/icon-mask.svg" -o "${DIST}/icon-mask.png"`, { stdio: 'ignore' });
    }
  } catch {
    console.log('   ⚠️  Icon conversion skipped (install rsvg-convert or use online tool)');
    console.log('   ℹ️  SVG icons will be used as fallback.');
  }

  console.log('\n✅ Build complete! Output: dist/\n');
}

// ═══════════════════════════════════════════════════════
//  Sync Manifest — Scan B2 bucket, update song list
// ═══════════════════════════════════════════════════════

async function syncManifest() {
  console.log('🔍 Scanning B2 bucket...\n');

  const B2_KEY = process.env.B2_ACCESS_KEY_ID;
  const B2_SECRET = process.env.B2_SECRET_ACCESS_KEY;
  const B2_BUCKET = process.env.B2_BUCKET || 'lizhinb123';
  const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';

  if (!B2_KEY || !B2_SECRET) {
    console.error('❌ Missing B2 credentials.');
    console.log('   Set env vars: B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY');
    console.log('   Or create .env:');
    console.log('   B2_ACCESS_KEY_ID=your-key-id');
    console.log('   B2_SECRET_ACCESS_KEY=your-secret');
    process.exit(1);
  }

  // Inline B2 client (avoids importing TypeScript)
  let authToken = null;
  let authExpiry = 0;
  let apiUrl = '';

  async function b2Auth() {
    if (authToken && Date.now() < authExpiry) {
      return { authorizationToken: authToken, apiUrl, bucketId: '' };
    }
    const creds = Buffer.from(`${B2_KEY}:${B2_SECRET}`).toString('base64');
    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${creds}` },
    });
    if (!res.ok) throw new Error(`B2 auth failed: ${res.status}`);
    const data = await res.json();
    authToken = data.authorizationToken;
    apiUrl = data.apiUrl;
    authExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return data;
  }

  async function b2ListFiles(bucketId) {
    const auth = await b2Auth();
    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId, maxFileCount: 10000 }),
    });
    if (!res.ok) throw new Error(`B2 list failed: ${res.status}`);
    const data = await res.json();
    return data.files || [];
  }

  try {
    // First, get bucket ID
    const auth = await b2Auth();
    const bucketId = auth.allowed?.bucketId || '';

    // List files
    let files;
    if (bucketId) {
      files = await b2ListFiles(bucketId);
    } else {
      // Need to find bucket ID first
      const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: auth.accountId }),
      });
      if (res.ok) {
        const data = await res.json();
        const bucket = data.buckets?.find(b => b.bucketName === B2_BUCKET);
        if (bucket) files = await b2ListFiles(bucket.bucketId);
      }
    }

    if (!files) {
      console.log('   ⚠️  Could not list files. Using empty manifest.');
      files = [];
    }

    const audioExts = ['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.aac'];
    const audioFiles = files.filter(f => audioExts.some(ext => f.fileName.toLowerCase().endsWith(ext)));

    console.log(`   Found ${audioFiles.length} audio files\n`);

    // Parse songs
    const songs = audioFiles.map(file => {
      const name = file.fileName.replace(/\.(mp3|flac|ogg|wav|m4a|aac)$/i, '');
      const dashParts = name.split(/\s*-\s*/);
      const title = dashParts.length >= 2 ? dashParts.slice(1).join(' - ').trim() : name;
      const artist = dashParts.length >= 2 ? dashParts[0].trim() : 'Unknown Artist';
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return {
        id,
        title,
        artist,
        album: '',
        duration: 0,
        coverUrl: '',
        fileName: file.fileName,
        size: file.size,
        contentType: file.contentType,
      };
    });

    songs.sort((a, b) => a.fileName.localeCompare(b.fileName));

    // Generate manifest code
    const lines = songs.map(s =>
      `  { id: '${esc(s.id)}', title: '${esc(s.title)}', artist: '${esc(s.artist)}', album: '', duration: 0, coverUrl: '', fileName: '${esc(s.fileName)}', size: ${s.size}, contentType: '${s.contentType}' },`
    ).join('\n');

    // Update app.js
    let appJs = readFileSync(`${SRC}/js/app.js`, 'utf-8');
    const replacement =
`// IMPORTANT: Run \`npm run sync-manifest\` to update this from B2
export const SONGS_MANIFEST = [
${lines}
];`;

    const startMarker = 'export const SONGS_MANIFEST';
    const startIdx = appJs.indexOf(startMarker);
    if (startIdx !== -1) {
      const endIdx = appJs.indexOf('];', startIdx) + 2;
      appJs = appJs.substring(0, startIdx) + replacement + appJs.substring(endIdx);
      writeFileSync(`${SRC}/js/app.js`, appJs, 'utf-8');
      console.log(`✅ Manifest updated: ${songs.length} songs baked into src/js/app.js`);
    } else {
      console.error('❌ Could not find SONGS_MANIFEST in app.js');
      process.exit(1);
    }

    console.log('\nNext: npm run build\n');
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}

// ═══════════════════════════════════════════════════════
//  CLI
// ═══════════════════════════════════════════════════════

const cmd = process.argv[2];

if (cmd === 'sync-manifest') {
  syncManifest();
} else {
  build();
}
