import type { Track } from '../types';

export function createQueueSnapshot(tracks: readonly Track[], selectedId: string): string[] {
  const ids = [...new Set(tracks.map((track) => track.id).filter((id) => id.length > 0))];
  return ids.includes(selectedId) ? ids : [selectedId, ...ids];
}

export function getSequentialNext(
  queue: readonly string[],
  currentId: string,
): string | null {
  const index = queue.indexOf(currentId);
  return index >= 0 && index + 1 < queue.length ? queue[index + 1] : null;
}

export function getSequentialPrevious(
  queue: readonly string[],
  currentId: string,
): string | null {
  const index = queue.indexOf(currentId);
  return index > 0 ? queue[index - 1] : null;
}

export function getShuffleNext(
  queue: readonly string[],
  visited: ReadonlySet<string>,
  random: () => number = Math.random,
): string | null {
  const remaining = queue.filter((id) => !visited.has(id));
  if (remaining.length === 0) return null;
  const randomValue = Math.min(Math.max(random(), 0), 0.9999999999999999);
  return remaining[Math.floor(randomValue * remaining.length)] ?? null;
}
