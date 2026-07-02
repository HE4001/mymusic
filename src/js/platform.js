// ═══════════════════════════════════════════════════════
// Platform — Platform detection and adaptation
// ═══════════════════════════════════════════════════════

import { detectPlatform } from './utils.js';

export class Platform {
  static type = 'unknown';
  static isTouchDevice = false;
  static isIOS = false;
  static isDesktop = false;
  static viewportWidth = 0;
  static viewportHeight = 0;
  static pixelRatio = 1;

  static init() {
    this.pixelRatio = window.devicePixelRatio || 1;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    const ua = navigator.userAgent;
    this.type = detectPlatform(ua);

    // Override with CSS media query match (more reliable than UA)
    const hasHover = window.matchMedia('(hover: hover)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    if (hasHover && finePointer) {
      this.type = 'desktop';
    } else if ('ontouchstart' in window) {
      this.type = 'ios';
    }

    this.isDesktop = this.type === 'desktop';
    this.isIOS = this.type === 'ios';
    this.isTouchDevice = !this.isDesktop;

    // Listen for viewport changes
    window.addEventListener('resize', () => {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
    });

    // Listen for orientation changes (iOS)
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;
      }, 100);
    });
  }

  static get isLandscape() {
    return this.viewportWidth > this.viewportHeight;
  }

  static get isSmallScreen() {
    return this.viewportWidth < 768;
  }
}
