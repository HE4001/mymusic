// ═══════════════════════════════════════════════════════
// App — Main entry point
// ═══════════════════════════════════════════════════════

import { Platform } from './platform.js';
import { API } from './api.js';
import { PlaylistManager } from './playlist.js';
import { Player } from './player.js';
import { ShortcutHandler } from './shortcuts.js';
import { GestureHandler } from './gestures.js';
import { Visualizer } from './visualizer.js';
import { formatTime, generateId } from './utils.js';

// ── Song Manifest (baked in at build time) ──
export const SONGS_MANIFEST = [
  // (run `npm run sync-manifest` to populate)
];

// ═══════════════════════════════════════════════════════
//  App Controller
// ═══════════════════════════════════════════════════════

export class App {
  #platform;
  #api;
  #playlist;
  #player;
  #shortcuts;
  #gestures;
  #visualizer = new Visualizer();
  #streamCache = new Map();

  constructor() {
    this.#platform = Platform;
    this.#api = new API('');
    this.#playlist = new PlaylistManager();
    this.#player = new Player();

    this.#playlist.onSongsLoaded = (songs) => this.renderPlaylists(songs);
    this.#playlist.onFilterChange = (songs, filter) => this.renderPlaylists(songs);
    this.#playlist.onFavoriteChange = (id, isFav) => this.updateFavoriteUI(id, isFav);

    this.#player.onPlayStateChange = (playing) => this.updatePlayButtons(playing);
    this.#player.onTimeUpdate = (current, total) => this.updateProgress(current, total);
    this.#player.onSongChange = (song) => this.onSongChanged(song);
    this.#player.onLoaded = (duration) => this.onSongLoaded(duration);
    this.#player.onError = (err) => this.showToast(err);

    document.addEventListener('songended', () => this.playNext());
    document.addEventListener('play-song', (e) => {
      const detail = e.detail;
      this.playSong(detail.songId);
    });
    document.addEventListener('play-next', () => this.playNext());
    document.addEventListener('play-prev', () => this.playPrev());
  }

  async init() {
    Platform.init();
    this.#playlist.setSongs(SONGS_MANIFEST);

    if (this.#platform.isDesktop) {
      this.initDesktop();
    } else if (this.#platform.isIOS) {
      this.initIOS();
    }

    this.setupGlobalListeners();
    this.registerServiceWorker();
    console.log(`🎵 MyMusic v1.0 ready — ${SONGS_MANIFEST.length} songs — platform: ${this.#platform.type}`);
  }

  // ═══════════════════════════════════════════════════
  //  Desktop Initialization
  // ═══════════════════════════════════════════════════

  initDesktop() {
    const desktop = document.getElementById('app-desktop');
    const ios = document.getElementById('app-ios');
    desktop?.classList.add('visible');
    ios?.classList.add('hidden');

    const searchInput = document.getElementById('search-desktop');
    this.#shortcuts = new ShortcutHandler(this.#player, this.#playlist);
    this.#shortcuts.init(searchInput);

    const visCanvas = document.getElementById('visualizer-desktop');
    if (visCanvas) {
      this.#visualizer.init(visCanvas);
    }

    searchInput?.addEventListener('input', (e) => {
      const target = e.target;
      this.#playlist.setSearchQuery(target.value);
    });

    this.bindDesktopControls();
    this.bindPlaylistEvents();

    document.getElementById('btn-shortcuts')?.addEventListener('click', () => {
      document.getElementById('shortcuts-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-shortcuts')?.addEventListener('click', () => {
      document.getElementById('shortcuts-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-queue')?.addEventListener('click', () => {
      this.renderQueue();
      document.getElementById('queue-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-queue')?.addEventListener('click', () => {
      document.getElementById('queue-modal')?.classList.add('hidden');
    });

    document.getElementById('queue-backdrop')?.addEventListener('click', () => {
      document.getElementById('queue-modal')?.classList.add('hidden');
    });

    this.bindContextMenu();

    document.querySelectorAll('.modal-backdrop').forEach((bg) => {
      bg.addEventListener('click', () => {
        bg.closest('.modal')?.classList.add('hidden');
      });
    });
  }

  // ═══════════════════════════════════════════════════
  //  iOS Initialization
  // ═══════════════════════════════════════════════════

  initIOS() {
    const desktop = document.getElementById('app-desktop');
    const ios = document.getElementById('app-ios');
    desktop?.classList.add('hidden');
    ios?.classList.remove('hidden');

    this.#gestures = new GestureHandler(this.#player, this.#playlist);
    this.#gestures.init();

    document.getElementById('btn-ios-search')?.addEventListener('click', () => {
      document.getElementById('ios-search-bar')?.classList.remove('hidden');
      const input = document.getElementById('search-ios');
      input?.focus();
    });

    document.getElementById('btn-ios-search-cancel')?.addEventListener('click', () => {
      document.getElementById('ios-search-bar')?.classList.add('hidden');
      const input = document.getElementById('search-ios');
      if (input) {
        input.value = '';
        this.#playlist.setSearchQuery('');
      }
    });

    const searchInput = document.getElementById('search-ios');
    searchInput?.addEventListener('input', (e) => {
      const target = e.target;
      this.#playlist.setSearchQuery(target.value);
    });

    document.querySelectorAll('.ios-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ios-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        this.#playlist.setFilter(filter);
      });
    });

    document.getElementById('btn-play-mini')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#player.toggle();
    });

    document.getElementById('btn-next-mini')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playNext();
    });

    document.getElementById('btn-play-ios')?.addEventListener('click', () => this.#player.toggle());
    document.getElementById('btn-prev-ios')?.addEventListener('click', () => this.playPrev());
    document.getElementById('btn-next-ios')?.addEventListener('click', () => this.playNext());

    document.getElementById('btn-ios-collapse')?.addEventListener('click', () => {
      this.#gestures['collapseFullPlayer']?.();
    });

    document.getElementById('btn-fav-ios')?.addEventListener('click', () => {
      if (this.#player.currentSong) {
        this.#playlist.toggleFavorite(this.#player.currentSong.id);
      }
    });

    document.getElementById('btn-ios-action-cancel')?.addEventListener('click', () => {
      document.getElementById('ios-action-sheet')?.classList.add('hidden');
    });

    document.getElementById('ios-action-backdrop')?.addEventListener('click', () => {
      document.getElementById('ios-action-sheet')?.classList.add('hidden');
    });
  }

  // ═══════════════════════════════════════════════════
  //  Playback
  // ═══════════════════════════════════════════════════

  async playSong(songId) {
    const song = this.#playlist.getSongById(songId);
    if (!song) return;

    this.#playlist.currentSongId = songId;

    if (this.#playlist.queue.length === 0) {
      this.#playlist.setQueue(this.#playlist.filteredSongs);
    }

    try {
      let streamData = this.#streamCache.get(songId);
      if (!streamData || Date.now() > streamData.expiresAt) {
        streamData = await this.#api.getStreamUrl(songId);
        this.#streamCache.set(songId, streamData);
      }
      await this.#player.loadAndPlay(song, streamData.url);
    } catch (err) {
      console.error('Failed to get stream URL:', err);
      this.showToast('无法获取播放链接');
    }

    this.updateActiveSong(songId);
  }

  playNext() {
    const current = this.#player.currentSong;
    if (!current) return;

    const next = this.#playlist.getNextSong(current.id);
    if (next) {
      this.playSong(next.id);
    } else if (this.#player.repeatMode === 'all') {
      const first = this.#playlist.queue[0];
      if (first) this.playSong(first.id);
    }
  }

  playPrev() {
    const current = this.#player.currentSong;
    if (!current) return;

    if (this.#player.audio.currentTime > 3) {
      this.#player.seek(0);
      return;
    }

    const prev = this.#playlist.getPrevSong(current.id);
    if (prev) {
      this.playSong(prev.id);
    }
  }

  // ═══════════════════════════════════════════════════
  //  UI Rendering
  // ═══════════════════════════════════════════════════

  renderPlaylists(songs) {
    this.#playlist.setQueue(songs);

    const desktopList = document.getElementById('playlist-desktop');
    if (desktopList) {
      desktopList.innerHTML = songs.map((song, i) => this.renderDesktopItem(song, i)).join('');
      document.getElementById('playlist-empty-desktop')?.classList.add('hidden');
    }

    const iosList = document.getElementById('playlist-ios');
    if (iosList) {
      iosList.innerHTML = songs.map((song, i) => this.renderIOSItem(song, i)).join('');
      document.getElementById('ios-list-empty')?.classList.add('hidden');
    }

    document.getElementById('song-count').textContent = `${songs.length} 首`;
  }

  renderDesktopItem(song, index) {
    const isActive = song.id === this.#playlist.currentSongId;
    const isFav = this.#playlist.isFavorite(song.id);
    const duration = formatTime(song.duration || 0);

    return `
      <div class="playlist-item ${isActive ? 'active' : ''}"
           data-song-id="${song.id}" data-index="${index}">
        <div class="item-index">
          <span class="item-index-num">${index + 1}</span>
          <svg class="item-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
        <div class="item-info">
          <div class="item-title">${this.escapeHtml(song.title)}</div>
          <div class="item-artist">${this.escapeHtml(song.artist)}</div>
        </div>
        <div class="item-album">${this.escapeHtml(song.album || '')}</div>
        <div class="item-duration">${duration}</div>
        <div class="item-actions">
          <button class="item-action-btn btn-fav ${isFav ? 'favorited' : ''}"
                  data-action="favorite" data-song-id="${song.id}"
                  title="${isFav ? '取消收藏' : '收藏'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  renderIOSItem(song, index) {
    const isActive = song.id === this.#playlist.currentSongId;
    const isFav = this.#playlist.isFavorite(song.id);
    const duration = formatTime(song.duration || 0);

    return `
      <div class="playlist-item ${isActive ? 'active' : ''}"
           data-song-id="${song.id}" data-index="${index}">
        <div class="item-info">
          <div class="item-title">${this.escapeHtml(song.title)}</div>
          <div class="item-artist">${this.escapeHtml(song.artist)}</div>
        </div>
        <div class="item-duration">${duration}</div>
        <div class="item-actions">
          <button class="item-action-btn btn-fav ${isFav ? 'favorited' : ''}"
                  data-action="favorite" data-song-id="${song.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button class="item-action-btn" data-action="more" data-song-id="${song.id}" title="更多">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════
  //  UI Updates
  // ═══════════════════════════════════════════════════

  updatePlayButtons(playing) {
    const playIconClass = playing ? 'icon-pause' : 'icon-play';
    const pauseIconClass = playing ? 'icon-play' : 'icon-pause';

    document.querySelectorAll('#btn-play-desktop .icon-play, #btn-play-desktop .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });

    document.querySelectorAll('#btn-play-bar .icon-play, #btn-play-bar .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });

    document.querySelectorAll('#btn-play-mini .icon-play, #btn-play-mini .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });

    document.querySelectorAll('#btn-play-ios .icon-play, #btn-play-ios .icon-pause').forEach((el) => {
      el.classList.toggle('hidden', el.classList.contains(playIconClass));
    });
  }

  updateProgress(current, total) {
    const percent = total > 0 ? (current / total) * 100 : 0;
    const currentStr = formatTime(current);
    const totalStr = formatTime(total);

    this.setProgress('np-progress-fill', percent);
    this.setProgress('bar-progress-fill', percent);
    this.setProgress('ios-progress-fill', percent);

    document.getElementById('np-time-current').textContent = currentStr;
    document.getElementById('np-time-total').textContent = totalStr;
    document.getElementById('bar-time-current').textContent = currentStr;
    document.getElementById('bar-time-total').textContent = totalStr;
    document.getElementById('ios-time-current').textContent = currentStr;
    document.getElementById('ios-time-total').textContent = totalStr;

    const miniFill = document.getElementById('ios-mini-progress');
    if (miniFill) {
      const fill = document.createElement('div');
      fill.className = 'ios-mini-progress-fill';
      fill.style.width = `${percent}%`;
      miniFill.innerHTML = '';
      miniFill.appendChild(fill);
    }

    if (this.#player.currentSong) {
      document.title = `${this.#player.currentSong.title} — ${this.#player.currentSong.artist} | MyMusic`;
    }

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: total,
          playbackRate: this.#player.audio.playbackRate,
          position: current,
        });
      } catch { /* ignore */ }
    }
  }

  setProgress(elementId, percent) {
    const el = document.getElementById(elementId);
    if (el) {
      el.style.width = `${percent}%`;
    }
  }

  onSongChanged(song) {
    if (!song) return;

    document.getElementById('np-title').textContent = song.title;
    document.getElementById('np-artist').textContent = song.artist;
    document.getElementById('np-cover').src = song.coverUrl || '/icon-512.png';

    document.getElementById('bar-title').textContent = song.title;
    document.getElementById('bar-artist').textContent = song.artist;
    document.getElementById('bar-cover').src = song.coverUrl || '/icon-192.png';

    document.getElementById('ios-full-title').textContent = song.title;
    document.getElementById('ios-full-artist').textContent = song.artist;
    document.getElementById('ios-full-cover').src = song.coverUrl || '/icon-512.png';
    document.getElementById('ios-full-source').textContent = this.#platform.isIOS ? '本地音乐' : 'Cloudflare + B2';

    document.getElementById('ios-mini-title').textContent = song.title;
    document.getElementById('ios-mini-artist').textContent = song.artist;
    document.getElementById('ios-mini-cover').src = song.coverUrl || '/icon-192.png';

    const fullBg = document.getElementById('ios-full-bg');
    if (fullBg && song.coverUrl) {
      fullBg.style.backgroundImage = `url(${song.coverUrl})`;
    }

    document.getElementById('np-placeholder')?.classList.add('hidden');
    document.getElementById('np-active')?.classList.remove('hidden');
    document.getElementById('ios-mini-player')?.classList.remove('hidden');

    this.#visualizer.connect(this.#player.audio);
    this.#visualizer.start();

    this.setupMediaSession(song);
    this.updateActiveSong(song.id);
  }

  onSongLoaded(duration) {
    if (this.#player.currentSong) {
      this.#player.currentSong.duration = duration;
    }
  }

  updateActiveSong(songId) {
    document.querySelectorAll('.playlist-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.songId === songId);
    });
  }

  updateFavoriteUI(songId, isFav) {
    document.querySelectorAll(`.item-action-btn[data-song-id="${songId}"]`).forEach((btn) => {
      if ((btn).dataset.action === 'favorite') {
        btn.classList.toggle('favorited', isFav);
        const svg = btn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════
  //  Media Session
  // ═══════════════════════════════════════════════════

  setupMediaSession(song) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'MyMusic',
        artwork: [
          { src: song.coverUrl || '/icon-192.png', sizes: '96x96', type: 'image/png' },
          { src: song.coverUrl || '/icon-512.png', sizes: '256x256', type: 'image/png' },
          { src: song.coverUrl || '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => this.#player.play());
      navigator.mediaSession.setActionHandler('pause', () => this.#player.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        this.#player.seek(details.seekTime);
      });
    } catch { /* ignore */ }
  }

  // ═══════════════════════════════════════════════════
  //  Desktop Controls Binding
  // ═══════════════════════════════════════════════════

  bindDesktopControls() {
    document.getElementById('btn-play-desktop')?.addEventListener('click', () => this.#player.toggle());
    document.getElementById('btn-play-bar')?.addEventListener('click', () => this.#player.toggle());

    document.getElementById('btn-prev-desktop')?.addEventListener('click', () => this.playPrev());
    document.getElementById('btn-prev-bar')?.addEventListener('click', () => this.playPrev());
    document.getElementById('btn-next-desktop')?.addEventListener('click', () => this.playNext());
    document.getElementById('btn-next-bar')?.addEventListener('click', () => this.playNext());

    document.getElementById('btn-shuffle')?.addEventListener('click', (e) => {
      const on = this.#player.toggleShuffle();
      e.currentTarget.classList.toggle('active', on);
    });

    document.getElementById('btn-repeat')?.addEventListener('click', (e) => {
      const mode = this.#player.cycleRepeat();
      const el = e.currentTarget;
      el.classList.toggle('active', mode !== 'none');
      if (mode === 'one') {
        el.setAttribute('title', '单曲循环');
      } else if (mode === 'all') {
        el.setAttribute('title', '列表循环');
      } else {
        el.setAttribute('title', '不循环');
      }
    });

    document.getElementById('btn-fav-desktop')?.addEventListener('click', () => {
      if (this.#player.currentSong) {
        this.#playlist.toggleFavorite(this.#player.currentSong.id);
      }
    });

    document.getElementById('btn-fav-bar')?.addEventListener('click', () => {
      if (this.#player.currentSong) {
        this.#playlist.toggleFavorite(this.#player.currentSong.id);
      }
    });

    const volSlider = document.getElementById('volume-slider-desktop');
    const volSliderBar = document.getElementById('volume-slider-bar');

    volSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      this.#player.setVolume(val);
      if (volSliderBar) volSliderBar.value = e.target.value;
    });

    volSliderBar?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      this.#player.setVolume(val);
      if (volSlider) volSlider.value = e.target.value;
    });

    document.getElementById('btn-volume-desktop')?.addEventListener('click', () => this.#player.toggleMute());
    document.getElementById('btn-volume-bar')?.addEventListener('click', () => this.#player.toggleMute());

    this.bindProgressBar('np-progress-bar');
    this.bindProgressBar('bar-progress-bar');

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        const filter = item.dataset.filter;
        this.#playlist.setFilter(filter);
        document.getElementById('playlist-title').textContent =
          filter === 'favorites' ? '我的收藏' : '全部歌曲';
      });
    });
  }

  bindContextMenu() {
    const desktopList = document.getElementById('playlist-desktop');
    if (!desktopList) return;

    desktopList.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const item = e.target.closest('.playlist-item');
      if (!item) return;
      this.showContextMenu(e.clientX, e.clientY, item.dataset.songId || '');
    });
  }

  bindProgressBar(elementId) {
    const bar = document.getElementById(elementId);
    if (!bar) return;

    let isDragging = false;

    const seek = (e) => {
      const rect = bar.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
      const duration = this.#player.audio.duration || 0;
      this.#player.seek(pct * duration);
    };

    bar.addEventListener('mousedown', (e) => {
      isDragging = true;
      seek(e);
    });

    bar.addEventListener('touchstart', (e) => {
      isDragging = true;
      seek(e);
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) seek(e);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) seek(e);
    }, { passive: true });

    document.addEventListener('mouseup', () => { isDragging = false; });
    document.addEventListener('touchend', () => { isDragging = false; });
  }

  // ═══════════════════════════════════════════════════
  //  Playlist Event Binding
  // ═══════════════════════════════════════════════════

  bindPlaylistEvents() {
    const desktopList = document.getElementById('playlist-desktop');

    desktopList?.addEventListener('click', (e) => {
      const btn = e.target.closest('.item-action-btn');
      if (btn) {
        e.stopPropagation();
        const action = btn.dataset.action;
        const songId = btn.dataset.songId;
        if (action === 'favorite' && songId) {
          this.#playlist.toggleFavorite(songId);
        }
        return;
      }

      const item = e.target.closest('.playlist-item');
      if (item) {
        const songId = item.dataset.songId;
        if (songId) this.playSong(songId);
      }
    });

    desktopList?.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.playlist-item');
      if (item) {
        const songId = item.dataset.songId;
        if (songId) this.playSong(songId);
      }
    });

    desktopList?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const item = e.target.closest('.playlist-item');
      if (!item) return;
      this.showContextMenu(e.clientX, e.clientY, item.dataset.songId || '');
    });
  }

  showContextMenu(x, y, songId) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');

    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 8}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 8}px`;
      }
    });

    menu.querySelectorAll('.ctx-item').forEach((item) => {
      item.onclick = () => {
        const action = item.dataset.action;
        this.handleContextAction(action, songId);
        menu.classList.add('hidden');
      };
    });

    const close = () => {
      menu.classList.add('hidden');
      document.removeEventListener('click', close);
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  handleContextAction(action, songId) {
    switch (action) {
      case 'play':
        this.playSong(songId);
        break;
      case 'play-next':
        const current = this.#player.currentSong;
        if (current) {
          const song = this.#playlist.getSongById(songId);
          if (song) {
            const idx = this.#playlist.queue.findIndex((s) => s.id === current.id);
            this.#playlist.queue.splice(idx + 1, 0, song);
            this.showToast('已添加到下一首播放');
          }
        }
        break;
      case 'favorite':
        this.#playlist.toggleFavorite(songId);
        break;
      case 'copy-name':
        const song = this.#playlist.getSongById(songId);
        if (song) {
          navigator.clipboard.writeText(song.fileName).then(() => {
            this.showToast('已复制文件名');
          });
        }
        break;
    }
  }

  renderQueue() {
    const list = document.getElementById('queue-list');
    if (!list) return;

    const currentIdx = this.#playlist.queue.findIndex((s) => s.id === this.#player.currentSong?.id);

    list.innerHTML = this.#playlist.queue.map((song, i) => `
      <div class="playlist-item ${i === currentIdx ? 'active' : ''}"
           data-song-id="${song.id}" data-index="${i}">
        <div class="item-index">
          <span class="item-index-num">${i + 1}</span>
        </div>
        <div class="item-info">
          <div class="item-title">${this.escapeHtml(song.title)}</div>
          <div class="item-artist">${this.escapeHtml(song.artist)}</div>
        </div>
        <div class="item-duration">${formatTime(song.duration || 0)}</div>
      </div>
    `).join('');
  }

  // ═══════════════════════════════════════════════════
  //  Global Listeners
  // ═══════════════════════════════════════════════════

  setupGlobalListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.#player.isPlaying) {
        // Page hidden, keep playing
      }
    });
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
    }).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  }

  // ═══════════════════════════════════════════════════
  //  Toast Notifications
  // ═══════════════════════════════════════════════════

  showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // ═══════════════════════════════════════════════════
  //  Utilities
  // ═══════════════════════════════════════════════════

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ═══════════════════════════════════════════════════════
//  Bootstrap
// ═══════════════════════════════════════════════════════

const app = new App();
app.init().catch(console.error);
