// @vitest-environment happy-dom
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayer } from '../src/hooks/usePlayer';
import { getPlayTicket } from '../src/lib/api';
import { PREFERENCES_STORAGE_KEY } from '../src/lib/preferences';
import type { PlayerController, PlayerOptions, PlayTicket, Track } from '../src/types';

vi.mock('../src/lib/api', async (original) => ({
  ...await original<typeof import('../src/lib/api')>(), getPlayTicket: vi.fn(),
}));

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src = '';
  crossOrigin = '';
  preload = '';
  volume = 1;
  currentTime = 0;
  duration = NaN;
  readyState = 0;
  playbackRate = 1;
  paused = true;
  ended = false;
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
  });
  pause() {
    const changed = !this.paused;
    this.paused = true;
    if (changed) this.dispatchEvent(new Event('pause'));
  }
  load() { this.readyState = 0; this.duration = NaN; this.currentTime = 0; }
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
  metadata() {
    this.duration = 180;
    this.readyState = 1;
    this.dispatchEvent(new Event('loadedmetadata'));
  }
  constructor() { super(); FakeAudio.instances.push(this); }
}

const tracks: Track[] = ['a', 'b'].map(id => ({
  id, title: id, artist: '', album: '', duration: 180, mimeType: 'audio/mpeg',
}));
const ticket = (id: string): PlayTicket => ({
  trackId: id, url: `https://media.example/${id}.mp3`, expiresAt: Date.now() + 3_600_000,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

let root: Root;
let host: HTMLDivElement;
let player: PlayerController;
function Harness({ list, options }: { list: Track[]; options: PlayerOptions }) {
  player = usePlayer(list, options);
  return null;
}
async function render(list: Track[], libraryLoaded = true) {
  await act(async () => {
    root.render(createElement(StrictMode, null,
      createElement(Harness, { list, options: { libraryLoaded } })));
  });
}
const audio = () => FakeAudio.instances.at(-1)!;

class FakeMediaMetadata {
  title = '';
  artist = '';
  album = '';
  artwork?: readonly MediaImage[];
  constructor(init: MediaMetadataInit = {}) { Object.assign(this, init); }
}

class FakeMediaSession {
  metadata: FakeMediaMetadata | null = null;
  playbackState: MediaSessionPlaybackState = 'none';
  handlers = new Map<MediaSessionAction, MediaSessionActionHandler>();
  positionStates: Array<MediaPositionState | undefined> = [];
  setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
    if (handler) this.handlers.set(action, handler);
    else this.handlers.delete(action);
  }
  setPositionState(state?: MediaPositionState) { this.positionStates.push(state); }
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('Audio', FakeAudio);
  FakeAudio.instances = [];
  localStorage.clear();
  vi.mocked(getPlayTicket).mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  Reflect.deleteProperty(navigator, 'mediaSession');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('player flow', () => {
  it('starts the protected media URL within the tap and preserves pause during metadata loading', async () => {
    await act(async () => root.render(createElement(Harness, { list: tracks, options: { libraryLoaded: true, directPlayback: true } })));
    act(() => {
      player.selectTrack(tracks[0], tracks);
      // Must happen synchronously, before any ticket fetch or metadata event.
      expect(audio().play).toHaveBeenCalledOnce();
      expect(audio().src).toBe('/api/stream?id=a');
      player.pause();
    });
    await act(async () => audio().metadata());
    expect(player.status).toBe('paused');
    expect(audio().paused).toBe(true);
    expect(getPlayTicket).not.toHaveBeenCalled();
  });
  it('publishes before native play and restores metadata on lifecycle events without restarting audio', async () => {
    const session = new FakeMediaSession();
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: session });
    vi.stubGlobal('MediaMetadata', FakeMediaMetadata);
    await act(async () => root.render(createElement(Harness, {
      list: tracks, options: { libraryLoaded: true, directPlayback: true },
    })));
    audio().play.mockImplementation(async () => {
      expect(session.metadata?.title).toBe('a');
      audio().paused = false;
      audio().dispatchEvent(new Event('playing'));
    });
    await act(async () => player.selectTrack(tracks[0], tracks));
    await act(async () => audio().metadata());
    for (const [target, event] of [
      [audio(), 'playing'], [audio(), 'loadedmetadata'],
      [window, 'pagehide'], [window, 'pageshow'],
      [document, 'visibilitychange'],
    ] as const) {
      session.metadata = null;
      await act(async () => target.dispatchEvent(new Event(event)));
      expect(session.metadata).toMatchObject({ title: 'a' });
      expect(session.playbackState).toBe('playing');
    }
    expect(audio().play).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
    session.metadata = null;
    window.dispatchEvent(new Event('pageshow'));
    audio().dispatchEvent(new Event('playing'));
    expect(session.metadata).toBeNull();
    root = createRoot(host);
  });

  it('ignores an older ticket that resolves after the latest selection', async () => {
    const a = deferred<PlayTicket>();
    const b = deferred<PlayTicket>();
    vi.mocked(getPlayTicket).mockImplementation(id => id === 'a' ? a.promise : b.promise);
    await render(tracks);
    await act(async () => player.selectTrack(tracks[0], tracks));
    await act(async () => player.selectTrack(tracks[1], tracks));
    await act(async () => b.resolve(ticket('b')));
    await act(async () => audio().metadata());
    await act(async () => a.resolve(ticket('a')));
    expect(player.currentTrack?.id).toBe('b');
    expect(audio().src).toBe('https://media.example/b.mp3');
    expect(player.status).toBe('playing');
    expect(audio().play).toHaveBeenCalledTimes(1);
  });

  it('preserves pause intent through ticket loading and expired-ticket recovery', async () => {
    const first = deferred<PlayTicket>();
    const renewed = deferred<PlayTicket>();
    vi.mocked(getPlayTicket).mockReturnValueOnce(first.promise).mockReturnValueOnce(renewed.promise);
    await render(tracks);
    await act(async () => player.selectTrack(tracks[0], tracks));
    await act(async () => player.pause());
    const originalTicket = ticket('a');
    await act(async () => first.resolve(originalTicket));
    await act(async () => audio().metadata());
    expect(audio().play).not.toHaveBeenCalled();
    expect(player.status).toBe('paused');
    await act(async () => audio().dispatchEvent(new Event('ended')));
    expect(player.currentTrack?.id).toBe('a');
    await act(async () => player.toggle());
    await act(async () => {
      audio().currentTime = 42;
      audio().dispatchEvent(new Event('timeupdate'));
      player.pause();
    });
    vi.spyOn(Date, 'now').mockReturnValue(originalTicket.expiresAt + 1);
    await act(async () => player.toggle());
    await act(async () => player.pause());
    await act(async () => renewed.resolve(ticket('a')));
    await act(async () => audio().metadata());
    expect(getPlayTicket).toHaveBeenCalledTimes(2);
    expect(audio().play).toHaveBeenCalledTimes(1);
    expect(audio().currentTime).toBe(42);
    expect(player.status).toBe('paused');
  });

  it('waits for the library before pruning saved state and never autoplays restoration', async () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({
      favorites: ['a'], recentTrackId: 'a', position: 36, volume: .4, mode: 'shuffle',
    }));
    await render([], false);
    expect(player.favorites).toEqual(['a']);
    expect(player.currentTime).toBe(36);
    await render(tracks);
    expect(player.currentTrack?.id).toBe('a');
    expect(player.status).toBe('paused');
    expect(player.currentTime).toBe(36);
    expect(getPlayTicket).not.toHaveBeenCalled();
    expect(FakeAudio.instances.every(instance => instance.play.mock.calls.length === 0)).toBe(true);
    vi.mocked(getPlayTicket).mockImplementation(id => new Promise(() => {}));
    await act(async () => player.next());
    expect(player.currentTrack?.id).toBe('b');
    await render([]);
    expect(player.favorites).toEqual([]);
    expect(player.currentTrack).toBeNull();
    expect(player.currentTime).toBe(0);
  });

  it('routes system media actions through the player and never resumes on visibility alone', async () => {
    const mediaSession = new FakeMediaSession();
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: mediaSession });
    vi.stubGlobal('MediaMetadata', FakeMediaMetadata);
    vi.mocked(getPlayTicket).mockImplementation(async id => ticket(id));
    const detailedTracks = tracks.map(track => ({
      ...track,
      title: `Title ${track.id}`,
      artist: `Artist ${track.id}`,
      album: `Album ${track.id}`,
    }));

    await render(detailedTracks);
    await act(async () => player.selectTrack(detailedTracks[0], detailedTracks));
    await act(async () => audio().metadata());

    expect(mediaSession.metadata).toMatchObject({
      title: 'Title a', artist: 'Artist a', album: 'Album a',
    });
    expect(mediaSession.metadata?.artwork).toBeUndefined();
    expect(mediaSession.playbackState).toBe('playing');
    expect(mediaSession.positionStates).toContainEqual({
      duration: 180, position: 0, playbackRate: 1,
    });
    expect([...mediaSession.handlers.keys()]).toEqual(expect.arrayContaining([
      'play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward',
    ]));

    await act(async () => mediaSession.handlers.get('nexttrack')?.({ action: 'nexttrack' }));
    await act(async () => audio().metadata());
    expect(player.currentTrack?.id).toBe('b');
    expect(mediaSession.metadata?.title).toBe('Title b');

    await act(async () => mediaSession.handlers.get('previoustrack')?.({ action: 'previoustrack' }));
    await act(async () => audio().metadata());
    expect(player.currentTrack?.id).toBe('a');

    await act(async () => mediaSession.handlers.get('pause')?.({ action: 'pause' }));
    const playCallsAfterPause = audio().play.mock.calls.length;
    expect(player.status).toBe('paused');
    expect(mediaSession.playbackState).toBe('paused');

    audio().currentTime = 37;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(audio().play).toHaveBeenCalledTimes(playCallsAfterPause);
    expect(player.status).toBe('paused');
    expect(player.currentTime).toBe(37);

    await act(async () => mediaSession.handlers.get('play')?.({ action: 'play' }));
    expect(audio().play).toHaveBeenCalledTimes(playCallsAfterPause + 1);
    expect(player.status).toBe('playing');

    await act(async () => mediaSession.handlers.get('seekforward')?.({
      action: 'seekforward', seekOffset: 8,
    }));
    expect(audio().currentTime).toBe(45);
  });
});
