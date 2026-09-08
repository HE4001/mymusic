import { Icon } from './Icon';
import { useEffect, useMemo, useRef } from 'react';
import type { PlaybackStatus, Track } from '../types';
import { formatTime } from './TrackList';

interface QueuePanelProps {
  open: boolean;
  queue: string[];
  tracks: Track[];
  currentTrackId: string | null;
  playbackStatus: PlaybackStatus;
  favorites: ReadonlySet<string>;
  onClose: () => void;
  onPlay: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function QueuePanel({
  open,
  queue,
  tracks,
  currentTrackId,
  playbackStatus,
  favorites,
  onClose,
  onPlay,
  onToggleFavorite,
}: QueuePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tracksById = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const queueTracks = queue.flatMap((id) => {
    const track = tracksById.get(id);
    return track ? [track] : [];
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="queue-dialog"
      aria-labelledby="queue-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="queue-panel">
        <header className="queue-heading">
          <div>
            <p className="eyebrow">当前播放顺序</p>
            <h2 id="queue-title">播放队列</h2>
          </div>
          <button type="button" className="icon-button close-dialog" aria-label="关闭播放队列" onClick={onClose}><Icon name="close" /></button>
        </header>

        <p className="queue-summary">{queueTracks.length > 0 ? `${queueTracks.length} 首歌曲` : '选择歌曲后会在这里生成队列'}</p>

        {queueTracks.length > 0 ? (
          <ol className="queue-list">
            {queueTracks.map((track, index) => {
              const isCurrent = track.id === currentTrackId;
              const isPlaying = isCurrent && ['playing', 'loading', 'buffering'].includes(playbackStatus);
              const isFavorite = favorites.has(track.id);
              return (
                <li className="queue-row" data-current={isCurrent || undefined} key={track.id}>
                  <span className="queue-position" aria-hidden="true">{index + 1}</span>
                  <button
                    type="button"
                    className="queue-play-button"
                    aria-label={`${isPlaying ? '暂停' : '播放'}《${track.title}》`}
                    aria-current={isCurrent ? 'true' : undefined}
                    onClick={() => onPlay(track.id)}
                  >
                    <span className="queue-play-icon" aria-hidden="true"><Icon name={isPlaying ? 'pause' : 'play'} filled={!isPlaying} /></span>
                    <span className="queue-track-copy">
                      <strong title={track.title}>{track.title}</strong>
                      <span title={track.artist || '未知歌手'}>{track.artist || '未知歌手'}</span>
                    </span>
                  </button>
                  <span className="queue-duration">{formatTime(track.duration)}</span>
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
        ) : (
          <div className="queue-empty">
            <Icon name="queue" />
            <p>队列还是空的</p>
          </div>
        )}
      </section>
    </dialog>
  );
}

