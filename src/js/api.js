// ═══════════════════════════════════════════════════════
// API — Backend communication layer
// ═══════════════════════════════════════════════════════

import { SONGS_MANIFEST } from './app.js';

export class API {
  #baseUrl;

  constructor(baseUrl = '') {
    this.#baseUrl = baseUrl;
  }

  async getSongs() {
    // For fixed songs, we use the baked-in manifest
    // This avoids an API call on every page load
    return SONGS_MANIFEST;
  }

  async getStreamUrl(songId) {
    const res = await fetch(`${this.#baseUrl}/api/stream/${encodeURIComponent(songId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Stream API error: ${res.status}`);
    }
    return res.json();
  }

  async search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return SONGS_MANIFEST;

    return SONGS_MANIFEST.filter(song =>
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      (song.album && song.album.toLowerCase().includes(q))
    );
  }
}
