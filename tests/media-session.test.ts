// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearMediaSession,
  registerMediaSessionActionHandlers,
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
} from '../src/lib/media-session';
import type { Track } from '../src/types';

class FakeMediaMetadata {
  constructor(init: MediaMetadataInit = {}) { Object.assign(this, init); }
}

class FakeMediaSession {
  metadata: FakeMediaMetadata | null = null;
  playbackState: MediaSessionPlaybackState = 'none';
  handlers = new Map<MediaSessionAction, MediaSessionActionHandler>();
  setActionHandler = vi.fn(
    (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      if (handler) this.handlers.set(action, handler);
      else this.handlers.delete(action);
    },
  );
  setPositionState = vi.fn((_state?: MediaPositionState) => undefined);
}

let mediaSession: FakeMediaSession;

beforeEach(() => {
  mediaSession = new FakeMediaSession();
  Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: mediaSession });
  vi.stubGlobal('MediaMetadata', FakeMediaMetadata);
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaSession');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Media Session adapter', () => {
  it('publishes metadata without invented artwork and only submits valid position values', () => {
    const track: Track = {
      id: 'a', title: 'Song', artist: 'Artist', album: 'Album', duration: 120,
      mimeType: 'audio/mpeg',
    };

    setMediaSessionMetadata(track);
    setMediaSessionPlaybackState('playing');
    setMediaSessionPositionState(120, 30, 1);
    setMediaSessionPositionState(120, Number.NaN, 1);
    setMediaSessionPositionState(120, 121, 1);
    setMediaSessionPositionState(Number.POSITIVE_INFINITY, 30, 1);

    expect(mediaSession.metadata).toMatchObject({
      title: 'Song', artist: 'Artist', album: 'Album',
    });
    expect(mediaSession.metadata).not.toHaveProperty('artwork');
    expect(mediaSession.playbackState).toBe('playing');
    expect(mediaSession.setPositionState).toHaveBeenNthCalledWith(1, {
      duration: 120, position: 30, playbackRate: 1,
    });
    expect(mediaSession.setPositionState.mock.calls.slice(1)).toEqual([
      [], [], [],
    ]);
  });

  it('ignores unsupported actions and removes registered handlers and state on cleanup', () => {
    mediaSession.setActionHandler.mockImplementation((action, handler) => {
      if (action === 'seekforward') throw new Error('unsupported');
      if (handler) mediaSession.handlers.set(action, handler);
      else mediaSession.handlers.delete(action);
    });

    const unregister = registerMediaSessionActionHandlers({
      play: vi.fn(),
      pause: vi.fn(),
      seekforward: vi.fn(),
    });
    expect([...mediaSession.handlers.keys()]).toEqual(['play', 'pause']);

    unregister();
    clearMediaSession();

    expect(mediaSession.handlers.size).toBe(0);
    expect(mediaSession.metadata).toBeNull();
    expect(mediaSession.playbackState).toBe('none');
    expect(mediaSession.setPositionState).toHaveBeenLastCalledWith();
  });
});
