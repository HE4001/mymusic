import type { Track } from '../types';

export type MediaSessionHandlers = Partial<
  Record<MediaSessionAction, (details: MediaSessionActionDetails) => void>
>;

function getMediaSession(): MediaSession | null {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return null;
  try {
    return navigator.mediaSession;
  } catch {
    return null;
  }
}

export function setMediaSessionMetadata(track: Track | null): void {
  const mediaSession = getMediaSession();
  if (!mediaSession) return;
  try {
    mediaSession.metadata =
      track && typeof MediaMetadata !== 'undefined'
        ? new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
          })
        : null;
  } catch {
    // Media Session implementations can expose only part of the API.
  }
}

export function setMediaSessionPlaybackState(state: MediaSessionPlaybackState): void {
  const mediaSession = getMediaSession();
  if (!mediaSession) return;
  try {
    mediaSession.playbackState = state;
  } catch {
    // Older Safari versions may expose a read-only or incomplete implementation.
  }
}

export function setMediaSessionPositionState(
  duration: number | null,
  position: number,
  playbackRate: number,
): void {
  const mediaSession = getMediaSession();
  if (!mediaSession || typeof mediaSession.setPositionState !== 'function') return;
  try {
    if (
      duration === null ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(position) ||
      position < 0 ||
      position > duration ||
      !Number.isFinite(playbackRate) ||
      playbackRate <= 0
    ) {
      mediaSession.setPositionState();
      return;
    }
    mediaSession.setPositionState({ duration, position, playbackRate });
  } catch {
    // Invalid state and partially implemented APIs must not interrupt playback.
  }
}

// Publish from native events as well as React: Safari may recreate its media session.
export function publishMediaSession(track: Track, audio: HTMLAudioElement): void {
  setMediaSessionMetadata(track);
  setMediaSessionPlaybackState(!audio.paused && !audio.ended ? 'playing' : 'paused');
  setMediaSessionPositionState(audio.duration, audio.currentTime, audio.playbackRate);
}

export function registerMediaSessionActionHandlers(
  handlers: MediaSessionHandlers,
): () => void {
  const mediaSession = getMediaSession();
  if (!mediaSession || typeof mediaSession.setActionHandler !== 'function') return () => undefined;

  const registered: MediaSessionAction[] = [];
  for (const [action, handler] of Object.entries(handlers) as Array<
    [MediaSessionAction, (details: MediaSessionActionDetails) => void]
  >) {
    try {
      mediaSession.setActionHandler(action, handler);
      registered.push(action);
    } catch {
      // Unsupported actions are expected on browsers with partial Media Session support.
    }
  }

  return () => {
    for (const action of registered) {
      try {
        mediaSession.setActionHandler(action, null);
      } catch {
        // Teardown is best-effort for partially implemented browsers.
      }
    }
  };
}

export function clearMediaSession(): void {
  const mediaSession = getMediaSession();
  if (!mediaSession) return;
  try {
    mediaSession.metadata = null;
  } catch {
    // Best-effort cleanup.
  }
  try {
    mediaSession.playbackState = 'none';
  } catch {
    // Best-effort cleanup.
  }
  try {
    mediaSession.setPositionState?.();
  } catch {
    // Best-effort cleanup.
  }
}
