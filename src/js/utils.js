// ═══════════════════════════════════════════════════════
// Utils — Shared utility functions
// ═══════════════════════════════════════════════════════

export function detectPlatform(ua) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux/i.test(ua) && !/Mobi|Android/i.test(ua)) return 'desktop';
  return 'unknown';
}

export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function parseFileName(fileName) {
  // Remove extension
  const name = fileName.replace(/\.(mp3|flac|ogg|wav|m4a|aac)$/i, '');

  // Try "Artist - Title" format
  const dashSplit = name.split(/\s*-\s*/);
  if (dashSplit.length >= 2) {
    return {
      artist: dashShift(dashSplit, 0),
      title: dashShift(dashSplit, 1),
    };
  }

  // Try "Title by Artist" format
  const byMatch = name.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
  }

  // Fallback: use full name as title
  return { title: name, artist: 'Unknown Artist' };
}

function dashShift(parts, startIndex) {
  return parts.slice(startIndex).join(' - ').trim();
}

export function generateId(fileName) {
  return fileName
    .replace(/\.(mp3|flac|ogg|wav|m4a|aac)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getCoverUrl(env, songId) {
  // Try to find a cover image with the same base name
  return `${env.B2_ENDPOINT}/${env.B2_BUCKET}/covers/${songId}.jpg`;
}
