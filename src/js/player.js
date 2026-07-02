// ═══════════════════════════════════════════════════════
// Player — Audio playback engine
// ═══════════════════════════════════════════════════════

import { formatTime } from './utils.js';

export class Player {
  audio;
  currentSong = null;
  isPlaying = false;
  repeatMode = 'none';
  shuffleOn = false;
  volume = 0.8;
  isMuted = false;

  // Time update throttle
  #lastTimeUpdate = 0;
  #TIME_UPDATE_INTERVAL = 250; // ms

  // Callbacks
  onPlayStateChange;
  onTimeUpdate;
  onSongChange;
  onLoaded;
  onError;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.volume = this.volume;

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.onPlayStateChange?.(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.onPlayStateChange?.(false);
    });

    this.audio.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - this.#lastTimeUpdate >= this.#TIME_UPDATE_INTERVAL) {
        this.#lastTimeUpdate = now;
        this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.onLoaded?.(this.audio.duration);
    });

    this.audio.addEventListener('ended', () => {
      this.handleSongEnd();
    });

    this.audio.addEventListener('error', () => {
      this.onError?.(`无法播放: ${this.currentSong?.title || '未知歌曲'}`);
    });
  }

  async loadAndPlay(song, streamUrl) {
    try {
      // Show loading state
      this.onPlayStateChange?.(false);

      // Load new source
      this.audio.src = streamUrl;
      this.currentSong = song;
      this.onSongChange?.(song);

      await this.audio.play();
    } catch (err) {
      console.error('Playback error:', err);
      this.onError?.(`播放失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  play() {
    if (this.audio.src) {
      this.audio.play().catch(() => {});
    }
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time) {
    this.audio.currentTime = clamp(time, 0, this.audio.duration || 0);
  }

  seekRelative(delta) {
    this.seek(this.audio.currentTime + delta);
  }

  setVolume(value) {
    this.volume = clamp(value, 0, 1);
    this.audio.volume = this.isMuted ? 0 : this.volume;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.volume = this.isMuted ? 0 : this.volume;
    return this.isMuted;
  }

  setRepeat(mode) {
    this.repeatMode = mode;
    this.audio.loop = (mode === 'one');
  }

  cycleRepeat() {
    const modes = ['none', 'all', 'one'];
    const idx = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(idx + 1) % modes.length];
    this.audio.loop = this.repeatMode === 'one';
    return this.repeatMode;
  }

  toggleShuffle() {
    this.shuffleOn = !this.shuffleOn;
    return this.shuffleOn;
  }

  getProgress() {
    const current = this.audio.currentTime || 0;
    const total = this.audio.duration || 0;
    const percent = total > 0 ? (current / total) * 100 : 0;
    return { current, total, percent };
  }

  handleSongEnd() {
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.play();
      return;
    }

    // Let the app handle next song logic
    const event = new CustomEvent('songended', { detail: { song: this.currentSong } });
    document.dispatchEvent(event);
  }

  destroy() {
    this.audio.pause();
    this.audio.src = '';
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
