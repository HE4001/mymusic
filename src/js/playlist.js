// ═══════════════════════════════════════════════════════
// Playlist — Playlist management and rendering
// ═══════════════════════════════════════════════════════


export class PlaylistManager {
  songs = [];
  filteredSongs = [];
  favorites = new Set();
  currentFilter = 'all';
  searchQuery = '';
  currentSongId = null;
  queue = [];

  onSongsLoaded;
  onFilterChange;
  onFavoriteChange;

  constructor() {
    this.loadFavorites();
  }

  setSongs(songs) {
    this.songs = songs;
    this.applyFilter();
    this.onSongsLoaded?.(this.filteredSongs);
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this.applyFilter();
    this.onFilterChange?.(this.filteredSongs, filter);
  }

  setSearchQuery(query) {
    this.searchQuery = query;
    this.applyFilter();
    this.onFilterChange?.(this.filteredSongs, this.currentFilter);
  }

  getCurrentSong() {
    return this.songs.find(s => s.id === this.currentSongId);
  }

  getSongById(id) {
    return this.songs.find(s => s.id === id);
  }

  getNextSong(currentId) {
    const idx = this.queue.findIndex(s => s.id === currentId);
    if (idx === -1 || idx >= this.queue.length - 1) return undefined;
    return this.queue[idx + 1];
  }

  getPrevSong(currentId) {
    const idx = this.queue.findIndex(s => s.id === currentId);
    if (idx <= 0) return undefined;
    return this.queue[idx - 1];
  }

  toggleFavorite(songId) {
    const isFav = this.favorites.has(songId);
    if (isFav) {
      this.favorites.delete(songId);
    } else {
      this.favorites.add(songId);
    }
    this.saveFavorites();
    this.onFavoriteChange?.(songId, !isFav);
    return !isFav;
  }

  isFavorite(songId) {
    return this.favorites.has(songId);
  }

  setQueue(songs) {
    this.queue = [...songs];
  }

  applyFilter() {
    let result = [...this.songs];

    // Apply search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q))
      );
    }

    // Apply filter
    if (this.currentFilter === 'favorites') {
      result = result.filter(s => this.favorites.has(s.id));
    }

    this.filteredSongs = result;
  }

  loadFavorites() {
    try {
      const stored = localStorage.getItem('mymusic-favorites');
      if (stored) {
        this.favorites = new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem('mymusic-favorites', JSON.stringify([...this.favorites]));
    } catch {
      // ignore
    }
  }
}
