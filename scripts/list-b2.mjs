// List B2 bucket files and generate song manifest
// Usage: node scripts/list-b2.mjs

import { writeFileSync } from 'fs';

const B2_KEY = process.env.B2_ACCESS_KEY_ID;
const B2_SECRET = process.env.B2_SECRET_ACCESS_KEY;
const B2_BUCKET = process.env.B2_BUCKET || 'lizhinb123';
const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';

if (!B2_KEY || !B2_SECRET) {
  console.error('❌ Missing B2 credentials.');
  console.log('   Set env vars: B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY');
  process.exit(1);
}

async function b2Auth() {
  const creds = Buffer.from(`${B2_KEY}:${B2_SECRET}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${creds}` },
  });
  if (!res.ok) throw new Error(`B2 auth failed: ${res.status}`);
  return res.json();
}

async function b2ListFiles(auth, bucketId) {
  const allFiles = [];
  let nextFileId = null;

  do {
    const body = { bucketId, maxFileCount: 10000 };
    if (nextFileId) body.startFileId = nextFileId;

    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`B2 list failed: ${res.status}`);
    const data = await res.json();
    allFiles.push(...(data.files || []));
    nextFileId = data.nextFileId;
  } while (nextFileId);

  return allFiles;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return 'Unknown';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' GB';
}

function parseSongPath(fileName) {
  // Remove extension
  const name = fileName.replace(/\.(mp3|flac|ogg|wav|m4a|aac)$/i, '');

  // Split by path separator
  const parts = name.split(/[\\/]/);

  if (parts.length >= 3) {
    // Structure: Artist/Album/01 Title
    const artist = parts[0].trim();
    const album = parts[1].trim();
    const title = parts.slice(2).join(' / ').trim();
    return { artist, album, title };
  } else if (parts.length === 2) {
    // Structure: Artist/01 Title
    const artist = parts[0].trim();
    const title = parts[1].trim();
    return { artist, album: '', title };
  } else {
    // Single file: try "Artist - Title" format
    const dashParts = name.split(/\s*-\s*/);
    if (dashParts.length >= 2) {
      const artist = dashParts[0].trim();
      const title = dashParts.slice(1).join(' - ').trim();
      return { artist, album: '', title };
    }
    return { artist: 'Unknown Artist', album: '', title: name };
  }
}

async function main() {
  console.log('Authenticating with B2...');
  const auth = await b2Auth();
  console.log(`API URL: ${auth.apiUrl}`);

  // Find bucket ID
  let bucketId = auth.allowed?.bucketId || '';

  if (!bucketId) {
    console.log('Finding bucket ID...');
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
      if (bucket) bucketId = bucket.bucketId;
    }
  }

  if (!bucketId) {
    console.error('Could not find bucket ID');
    process.exit(1);
  }

  console.log(`Bucket ID: ${bucketId}`);
  console.log('Listing files (this may take a moment)...');

  const files = await b2ListFiles(auth, bucketId);
  console.log(`Total files returned: ${files.length}`);

    const audioExts = ['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.aac'];
    const videoExts = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg', '.3gp'];
    const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.epub'];
    const excludedExts = [...videoExts, ...docExts];

    const audioFiles = files
      .filter(f => !f.fileName.endsWith('.openlist'))
      .filter(f => {
        const lower = f.fileName.toLowerCase();
        const isAudio = audioExts.some(ext => lower.endsWith(ext));
        const isExcluded = excludedExts.some(ext => lower.endsWith(ext));
        return isAudio && !isExcluded;
      });

  console.log(`Audio files: ${audioFiles.length}`);

  // Show sample file structure
  const sample = audioFiles.slice(0, 5);
  console.log('\nSample files:');
  sample.forEach(f => console.log(`  ${f.fileName} (size: ${f.fileSize || 'N/A'})`));

  // Parse songs with folder structure
  const songs = audioFiles.map(file => {
    const parsed = parseSongPath(file.fileName);
    const id = file.fileName
      .replace(/\.(mp3|flac|ogg|wav|m4a|aac)$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      id,
      title: parsed.title,
      artist: parsed.artist,
      album: parsed.album,
      duration: 0,
      coverUrl: '',
      fileName: file.fileName,
      size: file.contentLength || 0,
      contentType: file.contentType || 'audio/mpeg',
    };
  });

  songs.sort((a, b) => a.fileName.localeCompare(b.fileName, 'zh'));

  // Show parsed results
  console.log('\nParsed songs (first 10):');
  songs.slice(0, 10).forEach(s => {
    console.log(`  [${s.artist}] ${s.album} - ${s.title}`);
  });

  // Generate manifest
  const lines = songs.map(s =>
    `  { id: '${esc(s.id)}', title: '${esc(s.title)}', artist: '${esc(s.artist)}', album: '${esc(s.album)}', duration: 0, coverUrl: '', fileName: '${esc(s.fileName)}', size: ${s.size}, contentType: '${s.contentType}' },`
  ).join('\n');

  const manifest = `// IMPORTANT: Run \`npm run sync-manifest\` to update this from B2
export const SONGS_MANIFEST = [
${lines}
];`;

  console.log('\n=== GENERATED MANIFEST ===');
  console.log(manifest);

  // Write to file
  writeFileSync('C:/Users/David/mymusic/src/js/manifest-generated.js', manifest, 'utf-8');
  console.log(`\nManifest written to: src/js/manifest-generated.js`);
  console.log(`Total songs: ${songs.length}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
