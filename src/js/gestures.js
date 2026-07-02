// ═══════════════════════════════════════════════════════
// Gestures — iOS touch gesture handling
// ═══════════════════════════════════════════════════════

import { Player } from './player.js';
import { PlaylistManager } from './playlist.js';

export class GestureHandler {
  #player;
  #playlist;

  // Swipe state
  touchStartX = 0;
  touchStartY = 0;
  touchStartTime = 0;
  isSwiping = false;
  swipeThreshold = 80;
  longPressTimer = null;

  // Mini player expand
  #miniPlayerExpanded = false;

  constructor(player, playlist) {
    this.#player = player;
    this.#playlist = playlist;
  }

  init() {
    this.initMiniPlayerGestures();
    this.initFullPlayerGestures();
    this.initListGestures();
    this.initProgressGestures();
  }

  // ── Mini Player ──
  initMiniPlayerGestures() {
    const mini = document.getElementById('ios-mini-player');
    if (!mini) return;

    // Tap to expand
    mini.addEventListener('click', (e) => {
      // Don't expand if clicking controls
      if ((e.target).closest('.ios-mini-controls')) return;
      this.expandFullPlayer();
    });

    // Touch swipe up to expand
    mini.addEventListener('touchstart', (e) => {
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
    }, { passive: true });

    mini.addEventListener('touchmove', (e) => {
      const deltaY = this.touchStartY - e.touches[0].clientY;
      if (deltaY > 50 && !this.#miniPlayerExpanded) {
        this.expandFullPlayer();
      }
    }, { passive: true });
  }

  // ── Full Player ──
  initFullPlayerGestures() {
    const full = document.getElementById('ios-full-player');
    const handleArea = document.getElementById('ios-full-handle-area');
    if (!full || !handleArea) return;

    // Swipe down to collapse
    full.addEventListener('touchstart', (e) => {
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
    }, { passive: true });

    full.addEventListener('touchmove', (e) => {
      const deltaY = e.touches[0].clientY - this.touchStartY;
      if (deltaY > 100) {
        this.collapseFullPlayer();
      }
    }, { passive: true });

    // Swipe left/right on cover to change song
    let startX = 0;
    full.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    full.addEventListener('touchend', (e) => {
      const deltaX = e.changedTouches[0].clientX - startX;
      if (Math.abs(deltaX) > 100) {
        if (deltaX < 0) {
          window.dispatchEvent(new CustomEvent('play-next'));
        } else {
          window.dispatchEvent(new CustomEvent('play-prev'));
        }
      }
    });
  }

  // ── List Gestures ──
  initListGestures() {
    const list = document.getElementById('playlist-ios');
    if (!list) return;

    list.addEventListener('touchstart', (e) => {
      const item = (e.target).closest('.playlist-item');
      if (!item) return;

      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();

      // Long press detection
      this.longPressTimer = setTimeout(() => {
        const songId = item.dataset.songId;
        if (songId) {
          this.showActionSheet(songId);
          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate(10);
        }
      }, 500);
    }, { passive: true });

    list.addEventListener('touchmove', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });

    list.addEventListener('touchend', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });

    // Tap on song to play
    list.addEventListener('click', (e) => {
      const item = (e.target).closest('.playlist-item');
      if (!item) return;
      // Don't play if tapping action buttons
      if ((e.target).closest('.item-action-btn')) return;

      const songId = item.dataset.songId;
      if (songId) {
        window.dispatchEvent(new CustomEvent('play-song', { detail: { songId } }));
      }
    });
  }

  // ── Progress Bar Gestures ──
  initProgressGestures() {
    const bars = document.querySelectorAll('.ios-full-progress-bar');
    bars.forEach(bar => {
      bar.addEventListener('click', (e) => {
        const rect = bar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        const duration = this.#player.audio.duration || 0;
        this.#player.seek(pct * duration);
      });
    });
  }

  // ── Actions ──
  expandFullPlayer() {
    this.#miniPlayerExpanded = true;
    const mini = document.getElementById('ios-mini-player');
    const full = document.getElementById('ios-full-player');
    mini?.classList.add('hidden');
    full?.classList.remove('hidden');

    // Setup Media Session
    if (this.#player.currentSong) {
      this.setupMediaSession(this.#player.currentSong);
    }
  }

  collapseFullPlayer() {
    this.#miniPlayerExpanded = false;
    const mini = document.getElementById('ios-mini-player');
    const full = document.getElementById('ios-full-player');
    mini?.classList.remove('hidden');
    full?.classList.add('hidden');
  }

  showActionSheet(songId) {
    const sheet = document.getElementById('ios-action-sheet');
    const title = document.getElementById('ios-action-title');
    const song = this.#playlist.getSongById(songId);
    if (!sheet || !song) return;

    if (title) title.textContent = `${song.artist} - ${song.title}`;
    sheet.classList.remove('hidden');

    // Wire up action buttons
    sheet.querySelectorAll('.ios-action-btn[data-action]').forEach(btn => {
      btn.onclick = () => {
        const action = (btn).dataset.action;
        this.handleAction(action, songId);
        sheet.classList.add('hidden');
      };
    });
  }

  handleAction(action, songId) {
    switch (action) {
      case 'play':
        window.dispatchEvent(new CustomEvent('play-song', { detail: { songId } }));
        break;
      case 'play-next':
        // Insert after current
        const current = this.#playlist.getCurrentSong();
        if (current) {
          const song = this.#playlist.getSongById(songId);
          if (song) {
            const idx = this.#playlist.queue.findIndex(s => s.id === current.id);
            this.#playlist.queue.splice(idx + 1, 0, song);
          }
        }
        break;
      case 'favorite':
        this.#playlist.toggleFavorite(songId);
        break;
    }
  }

  setupMediaSession(song) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album || 'Unknown Album',
      artwork: [
        { src: song.coverUrl || '/icon-192.png', sizes: '96x96', type: 'image/png' },
        { src: song.coverUrl || '/icon-512.png', sizes: '128x128', type: 'image/png' },
        { src: song.coverUrl || '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: song.coverUrl || '/icon-512.png', sizes: '256x256', type: 'image/png' },
        { src: song.coverUrl || '/icon-512.png', sizes: '384x384', type: 'image/png' },
        { src: song.coverUrl || '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => this.#player.play());
    navigator.mediaSession.setActionHandler('pause', () => this.#player.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      window.dispatchEvent(new CustomEvent('play-prev'));
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      window.dispatchEvent(new CustomEvent('play-next'));
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      this.#player.seek(details.seekTime);
    });
  }
}
