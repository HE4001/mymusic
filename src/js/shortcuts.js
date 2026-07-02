// ═══════════════════════════════════════════════════════
// Shortcuts — Desktop keyboard shortcuts (Windows)
// ═══════════════════════════════════════════════════════

import { Player } from './player.js';
import { PlaylistManager } from './playlist.js';

export class ShortcutHandler {
  #player;
  #playlist;
  #enabled = false;
  #searchInput;

  constructor(player, playlist) {
    this.#player = player;
    this.#playlist = playlist;
  }

  init(searchInput) {
    this.#searchInput = searchInput || undefined;
    this.#enabled = true;
    document.addEventListener('keydown', this.handleKeydown);
  }

  destroy() {
    this.#enabled = false;
    document.removeEventListener('keydown', this.handleKeydown);
  }

  handleKeydown = (e) => {
    if (!this.#enabled) return;

    // Ignore when typing in inputs
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      // Only handle Escape to blur
      if (e.key === 'Escape') {
        (document.activeElement).blur();
      }
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;

    switch (e.code) {
      // Playback
      case 'Space':
        e.preventDefault();
        this.#player.toggle();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        this.#player.seekRelative(ctrl ? -30 : -5);
        break;

      case 'ArrowRight':
        e.preventDefault();
        this.#player.seekRelative(ctrl ? 30 : 5);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.#player.setVolume(this.#player.volume + 0.05);
        this.updateVolumeUI();
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.#player.setVolume(this.#player.volume - 0.05);
        this.updateVolumeUI();
        break;

      case 'KeyM':
        e.preventDefault();
        this.#player.toggleMute();
        this.updateVolumeUI();
        break;

      case 'KeyF':
        e.preventDefault();
        this.toggleFullscreen();
        break;

      case 'KeyK':
        if (ctrl || e.metaKey) {
          e.preventDefault();
          this.#searchInput?.focus();
        }
        break;

      case 'Escape':
        this.closeModals();
        break;

      // Number keys 1-9: jump to song
      default:
        if (/^Digit[1-9]$/.test(e.code)) {
          const idx = parseInt(e.code.replace('Digit', '')) - 1;
          const song = this.#playlist.filteredSongs[idx];
          if (song) {
            window.dispatchEvent(new CustomEvent('play-song', { detail: { songId: song.id } }));
          }
        }
        break;
    }
  };

  toggleFullscreen() {
    const np = document.querySelector('.now-playing-panel');
    if (!document.fullscreenElement && np) {
      np.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  closeModals() {
    document.querySelectorAll('.modal.hidden').forEach(m => m.classList.remove('hidden'));
    document.getElementById('shortcuts-modal')?.classList.add('hidden');
    document.getElementById('queue-modal')?.classList.add('hidden');
  }

  updateVolumeUI() {
    const vol = this.#player.isMuted ? 0 : this.#player.volume;
    const pct = Math.round(vol * 100);
    document.querySelectorAll('.volume-slider').forEach(el => {
      el.value = String(pct);
    });
  }
}
