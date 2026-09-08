import type { Library, PlayTicket, Track } from '../types';

const DEMO_TRACKS: Track[] = [
  {
    id: 'demo-tone-morning',
    title: '演示音频 1 · 清晨',
    artist: '本地合成演示',
    album: '演示曲库',
    duration: 4,
    mimeType: 'audio/wav',
  },
  {
    id: 'demo-tone-harbor',
    title: '演示音频 2 · 港湾',
    artist: '本地合成演示',
    album: '演示曲库',
    duration: 4,
    mimeType: 'audio/wav',
  },
  {
    id: 'demo-tone-night',
    title: '演示音频 3 · 夜色',
    artist: '本地合成演示',
    album: '演示曲库',
    duration: 4,
    mimeType: 'audio/wav',
  },
];

export const demoLibrary: Library = {
  schemaVersion: 1,
  updatedAt: '2026-09-07T00:00:00.000Z',
  tracks: DEMO_TRACKS,
};

const frequenciesByTrack = new Map<string, readonly number[]>([
  ['demo-tone-morning', [261.63, 329.63, 392]],
  ['demo-tone-harbor', [220, 277.18, 329.63]],
  ['demo-tone-night', [196, 246.94, 293.66]],
]);
const generatedUrls = new Map<string, string>();

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function createToneWav(frequencies: readonly number[], durationSeconds: number): Blob {
  const sampleRate = 22_050;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const time = sample / sampleRate;
    const fadeIn = Math.min(1, time / 0.08);
    const fadeOut = Math.min(1, (durationSeconds - time) / 0.15);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const noteIndex = Math.min(
      frequencies.length - 1,
      Math.floor((time / durationSeconds) * frequencies.length),
    );
    const frequency = frequencies[noteIndex] ?? 220;
    const value = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.22;
    view.setInt16(44 + sample * bytesPerSample, Math.round(value * 0x7fff), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function getDemoPlayTicket(trackId: string): PlayTicket {
  const track = DEMO_TRACKS.find((candidate) => candidate.id === trackId);
  const frequencies = frequenciesByTrack.get(trackId);
  if (!track || !frequencies) throw new Error('演示曲目不存在');
  if (typeof URL.createObjectURL !== 'function') throw new Error('当前环境无法生成演示音频');

  let url = generatedUrls.get(trackId);
  if (!url) {
    url = URL.createObjectURL(createToneWav(frequencies, track.duration ?? 4));
    generatedUrls.set(trackId, url);
  }

  return { trackId, url, expiresAt: Number.MAX_SAFE_INTEGER };
}

export function revokeDemoAudioUrls(): void {
  for (const url of generatedUrls.values()) URL.revokeObjectURL(url);
  generatedUrls.clear();
}
