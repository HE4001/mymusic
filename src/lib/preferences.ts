import type { PlaybackMode } from '../types';

export const PREFERENCES_STORAGE_KEY = 'cloud-music:v1';

export interface PlayerPreferences {
  favorites: string[];
  recentTrackId: string | null;
  position: number;
  mode: PlaybackMode;
  volume: number;
}

export const DEFAULT_PREFERENCES: PlayerPreferences = {
  favorites: [],
  recentTrackId: null,
  position: 0,
  mode: 'sequence',
  volume: 0.8,
};

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlaybackMode(value: unknown): value is PlaybackMode {
  return value === 'sequence' || value === 'shuffle' || value === 'repeat-one';
}

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === 'string' && item.length > 0),
    ),
  ];
}

export function parsePreferences(value: unknown): PlayerPreferences {
  if (!isRecord(value)) return { ...DEFAULT_PREFERENCES };

  const recentTrackId =
    typeof value.recentTrackId === 'string' && value.recentTrackId.length > 0
      ? value.recentTrackId
      : null;
  const position =
    typeof value.position === 'number' && Number.isFinite(value.position) && value.position >= 0
      ? value.position
      : DEFAULT_PREFERENCES.position;
  const volume =
    typeof value.volume === 'number' && Number.isFinite(value.volume)
      ? Math.min(1, Math.max(0, value.volume))
      : DEFAULT_PREFERENCES.volume;

  return {
    favorites: uniqueIds(value.favorites),
    recentTrackId,
    position,
    mode: isPlaybackMode(value.mode) ? value.mode : DEFAULT_PREFERENCES.mode,
    volume,
  };
}

export function loadPreferences(storage?: StorageReader): PlayerPreferences {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (!target) return { ...DEFAULT_PREFERENCES };
    const raw = target.getItem(PREFERENCES_STORAGE_KEY);
    return raw === null ? { ...DEFAULT_PREFERENCES } : parsePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(
  preferences: PlayerPreferences,
  storage?: StorageWriter,
): boolean {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (!target) return false;
    target.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(parsePreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}

export function prunePreferences(
  preferences: PlayerPreferences,
  validTrackIds: ReadonlySet<string>,
): PlayerPreferences {
  const recentTrackId =
    preferences.recentTrackId && validTrackIds.has(preferences.recentTrackId)
      ? preferences.recentTrackId
      : null;

  return {
    ...preferences,
    favorites: preferences.favorites.filter((id) => validTrackIds.has(id)),
    recentTrackId,
    position: recentTrackId ? preferences.position : 0,
  };
}
