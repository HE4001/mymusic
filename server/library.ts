import type { Library, Track } from '../src/types';
import librarySource from './library.json';

const MAX_TRACK_ID_LENGTH = 128;
const MAX_TEXT_LENGTH = 300;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_OBJECT_KEY_BYTES = 1024;
const TRACK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const AUDIO_MIME_TYPE_PATTERN = /^audio\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export interface LibraryTrack extends Track {
  objectKey: string;
}

export interface ServerLibrary {
  schemaVersion: 1;
  updatedAt: string;
  tracks: LibraryTrack[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(path: string, message: string): never {
  throw new Error(`${path}：${message}`);
}

function readRequiredText(
  value: unknown,
  path: string,
  maximumLength: number,
): string {
  if (typeof value !== 'string') {
    return fail(path, '必须是字符串');
  }
  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    return fail(path, '不能包含控制字符');
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return fail(path, '不能为空');
  }
  if (normalized.length > maximumLength) {
    return fail(path, `长度不能超过 ${maximumLength}`);
  }
  return normalized;
}

function readOptionalText(value: unknown, path: string): string {
  if (value === undefined) {
    return '';
  }
  if (typeof value !== 'string') {
    return fail(path, '必须是字符串或省略');
  }
  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    return fail(path, '不能包含控制字符');
  }

  const normalized = value.trim();
  if (normalized.length > MAX_TEXT_LENGTH) {
    return fail(path, `长度不能超过 ${MAX_TEXT_LENGTH}`);
  }
  return normalized;
}

function readDuration(value: unknown, path: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fail(path, '必须是 null 或正的有限秒数');
  }
  return value;
}

function readUpdatedAt(value: unknown): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    return fail('updatedAt', '必须是带时区的 ISO 日期字符串');
  }
  if (!value.includes('T') || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return fail('updatedAt', '必须是带时区的 ISO 日期字符串');
  }
  if (!Number.isFinite(Date.parse(value))) {
    return fail('updatedAt', '不是有效日期');
  }
  return value;
}

export function isValidTrackId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_TRACK_ID_LENGTH &&
    TRACK_ID_PATTERN.test(value)
  );
}

export function validateObjectKey(value: unknown, path = 'objectKey'): string {
  if (typeof value !== 'string' || value.length === 0) {
    return fail(path, '必须是非空字符串');
  }
  if (!value.startsWith('music/')) {
    return fail(path, '必须位于 music/ 目录');
  }
  if (value.includes('\\')) {
    return fail(path, '不能包含反斜杠');
  }
  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    return fail(path, '不能包含控制字符');
  }
  if (new TextEncoder().encode(value).length > MAX_OBJECT_KEY_BYTES) {
    return fail(path, `UTF-8 长度不能超过 ${MAX_OBJECT_KEY_BYTES} 字节`);
  }

  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return fail(path, '不能包含空、. 或 .. 路径段');
  }
  return value;
}

function validateTrack(value: unknown, index: number): LibraryTrack {
  const path = `tracks[${index}]`;
  if (!isRecord(value)) {
    return fail(path, '必须是对象');
  }

  const id = readRequiredText(value.id, `${path}.id`, MAX_TRACK_ID_LENGTH);
  if (value.id !== id) {
    return fail(`${path}.id`, '不能包含首尾空白');
  }
  if (!isValidTrackId(id)) {
    return fail(
      `${path}.id`,
      '只能使用字母、数字、点、下划线、冒号和连字符，且必须以字母或数字开头',
    );
  }

  const mimeType = readRequiredText(
    value.mimeType,
    `${path}.mimeType`,
    MAX_MIME_TYPE_LENGTH,
  ).toLowerCase();
  if (!AUDIO_MIME_TYPE_PATTERN.test(mimeType)) {
    return fail(`${path}.mimeType`, '必须是合法的 audio/* MIME 类型');
  }

  return {
    id,
    title: readRequiredText(value.title, `${path}.title`, MAX_TEXT_LENGTH),
    artist: readOptionalText(value.artist, `${path}.artist`),
    album: readOptionalText(value.album, `${path}.album`),
    duration: readDuration(value.duration, `${path}.duration`),
    mimeType,
    objectKey: validateObjectKey(value.objectKey, `${path}.objectKey`),
  };
}

export function validateLibrary(value: unknown): ServerLibrary {
  if (!isRecord(value)) {
    return fail('library', '必须是对象');
  }
  if (value.schemaVersion !== 1) {
    return fail('schemaVersion', '必须为 1');
  }
  if (!Array.isArray(value.tracks)) {
    return fail('tracks', '必须是数组');
  }

  const tracks = value.tracks.map(validateTrack);
  const seenIds = new Set<string>();
  for (const track of tracks) {
    if (seenIds.has(track.id)) {
      return fail('tracks', `存在重复 id：${track.id}`);
    }
    seenIds.add(track.id);
  }

  return {
    schemaVersion: 1,
    updatedAt: readUpdatedAt(value.updatedAt),
    tracks,
  };
}

export function toPublicLibrary(library: ServerLibrary): Library {
  return {
    schemaVersion: 1,
    updatedAt: library.updatedAt,
    tracks: library.tracks.map(({ id, title, artist, album, duration, mimeType }) => ({
      id,
      title,
      artist,
      album,
      duration,
      mimeType,
    })),
  };
}

const library = validateLibrary(librarySource as unknown);
const tracksById = new Map(library.tracks.map((track) => [track.id, track]));

export function getLibrary(): Library {
  return toPublicLibrary(library);
}

export function findTrack(id: string): LibraryTrack | undefined {
  return tracksById.get(id);
}
