import { Icon } from './Icon';
import { useEffect, useState } from 'react';
import type { PlaybackStatus, Track } from '../types';

const PAGE_SIZE = 100;

interface TrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  playbackStatus: PlaybackStatus;
  favorites: ReadonlySet<string>;
  onSelect: (track: Track, queue: Track[]) => void;
  onToggleFavorite: (id: string) => void;
}

export function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '--:--';
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function trackPlayLabel(track: Track, isCurrent: boolean, status: PlaybackStatus): string {
  if (!isCurrent) return `播放《${track.title}》`;
  if (status === 'playing') return `暂停《${track.title}》`;
  if (status === 'loading' || status === 'buffering') return `暂停《${track.title}》`;
  return `继续播放《${track.title}》`;
}

export function TrackList({
  tracks,
  currentTrackId,
  playbackStatus,
  favorites,
  onSelect,
  onToggleFavorite,
}: TrackListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => setVisibleCount(PAGE_SIZE), [tracks]);

  const visibleTracks = tracks.slice(0, visibleCount);
  const remaining = tracks.length - visibleTracks.length;

  return (
    <div className="track-list" aria-label="歌曲列表">
      <div className="track-list-header" aria-hidden="true">
        <span className="track-number">#</span>
        <span>歌曲</span>
        <span>歌手</span>
        <span>专辑</span>
        <span className="track-duration">时长</span>
        <span />
      </div>
      <ol className="track-rows">
        {visibleTracks.map((track, index) => {
          const isCurrent = track.id === currentTrackId;
          const isPlaying = isCurrent && playbackStatus === 'playing';
          const isBusy = isCurrent && (playbackStatus === 'loading' || playbackStatus === 'buffering');
          const isFavorite = favorites.has(track.id);
          const artist = track.artist || '未知歌手';
          const album = track.album || '未知专辑';

          return (
            <li className="track-row" data-current={isCurrent || undefined} key={track.id}>
              <span className="track-number" aria-hidden="true">{index + 1}</span>
              <button
                type="button"
                className="track-main-action"
                aria-label={trackPlayLabel(track, isCurrent, playbackStatus)}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => onSelect(track, tracks)}
              >
                <span className={`row-play-icon${isBusy ? ' is-busy' : ''}`} aria-hidden="true">
                  <Icon name={isPlaying || isBusy ? 'pause' : 'play'} filled={!isPlaying && !isBusy} />
                </span>
                <span className="track-title-block">
                  <strong title={track.title}>{track.title}</strong>
                  <span className="mobile-track-artist" title={`${artist} · ${album}`}>{artist} · {album}</span>
                </span>
              </button>
              <span className="track-cell track-artist" title={artist}>{artist}</span>
              <span className="track-cell track-album" title={album}>{album}</span>
              <span className="track-cell track-duration">{formatTime(track.duration)}</span>
              <button
                type="button"
                className="favorite-button"
                aria-label={isFavorite ? `取消收藏《${track.title}》` : `收藏《${track.title}》`}
                aria-pressed={isFavorite}
                onClick={() => onToggleFavorite(track.id)}
              >
                <Icon name="heart" filled={isFavorite} />
              </button>
            </li>
          );
        })}
      </ol>
      {remaining > 0 ? (
        <div className="load-more-wrap">
          <button
            type="button"
            className="secondary-action load-more-button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            加载更多（还有 {remaining} 首）
          </button>
        </div>
      ) : null}
    </div>
  );
}

