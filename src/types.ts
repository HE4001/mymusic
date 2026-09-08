export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number | null;
  mimeType: string;
}

export interface Library {
  schemaVersion: 1;
  updatedAt: string;
  tracks: Track[];
}

export interface PlayTicket {
  trackId: string;
  url: string;
  expiresAt: number;
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';
export type PlaybackMode = 'sequence' | 'shuffle' | 'repeat-one';

export interface PlayerOptions {
  demo?: boolean;
  /** Only reconcile saved IDs after the library has actually loaded. */
  libraryLoaded?: boolean;
}

export interface PlayerController {
  currentTrack: Track | null;
  queue: string[];
  status: PlaybackStatus;
  currentTime: number;
  duration: number | null;
  volume: number;
  mode: PlaybackMode;
  favorites: string[];
  canSeek: boolean;
  error: string | null;
  notice: string | null;
  selectTrack: (track: Track, queue: Track[]) => void;
  playQueued: (id: string) => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMode: (mode: PlaybackMode) => void;
  toggleFavorite: (id: string) => void;
  retry: () => void;
}
