import { Icon } from './Icon';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { PlaybackMode, PlaybackStatus, PlayerController } from '../types';
import { formatTime } from './TrackList';

interface PlayerBarProps {
  controller: PlayerController;
  onOpenQueue: () => void;
}

const MODE_ORDER: PlaybackMode[] = ['sequence', 'shuffle', 'repeat-one'];
const MODE_LABEL: Record<PlaybackMode, string> = {
  sequence: '顺序播放',
  shuffle: '随机播放',
  'repeat-one': '单曲循环',
};
function statusText(status: PlaybackStatus): string {
  switch (status) {
    case 'loading': return '正在载入';
    case 'playing': return '正在播放';
    case 'paused': return '已暂停';
    case 'buffering': return '正在缓冲';
    case 'error': return '播放出错';
    default: return '选择一首歌曲开始播放';
  }
}

function nextMode(mode: PlaybackMode): PlaybackMode {
  const index = MODE_ORDER.indexOf(mode);
  return MODE_ORDER[(index + 1) % MODE_ORDER.length];
}

export function PlayerBar({ controller, onOpenQueue }: PlayerBarProps) {
  const {
    currentTrack,
    status,
    currentTime,
    duration,
    volume,
    mode,
    canSeek,
    error,
    notice,
    toggle,
    pause,
    next,
    previous,
    seek,
    setVolume,
    setMode,
    toggleFavorite,
    retry,
    favorites,
  } = controller;
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const seekPreviewRef = useRef<number | null>(null);
  const seekInteractionRef = useRef<{
    pointerId: number;
    input: HTMLInputElement;
    changed: boolean;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const expandedDialog = useRef<HTMLDialogElement>(null);

  const cancelSeek = useCallback(() => {
    const interaction = seekInteractionRef.current;
    seekInteractionRef.current = null;
    seekPreviewRef.current = null;
    setSeekPreview(null);
    if (interaction?.input.hasPointerCapture?.(interaction.pointerId)) {
      interaction.input.releasePointerCapture?.(interaction.pointerId);
    }
  }, []);

  useEffect(() => {
    cancelSeek();
    return cancelSeek;
  }, [cancelSeek, currentTrack?.id]);

  useEffect(() => {
    const dialog = expandedDialog.current;
    if (!dialog) return;
    if (expanded && !dialog.open) dialog.showModal();
    if (!expanded && dialog.open) dialog.close();
  }, [expanded]);

  const hasTrack = currentTrack !== null;
  const isPlaying = status === 'playing';
  const isBusy = status === 'loading' || status === 'buffering';
  const shouldPause = isPlaying || isBusy;
  const shownTime = seekPreview ?? currentTime;
  const safeDuration = duration !== null && Number.isFinite(duration) && duration > 0 ? duration : null;
  const rangeMax = safeDuration ?? 1;
  const rangeValue = Math.min(Math.max(shownTime, 0), rangeMax);
  const isFavorite = currentTrack ? favorites.includes(currentTrack.id) : false;
  const mobileMessage = error || notice;

  useEffect(() => {
    if (!canSeek || safeDuration === null) cancelSeek();
  }, [canSeek, cancelSeek, safeDuration]);

  const previewSeek = (seconds: number, input: HTMLInputElement) => {
    const interaction = seekInteractionRef.current;
    if (interaction && interaction.input !== input) return;
    seekPreviewRef.current = seconds;
    if (interaction) interaction.changed = true;
    setSeekPreview(seconds);
  };

  const commitSeek = () => {
    const interaction = seekInteractionRef.current;
    if (interaction && !interaction.changed) {
      cancelSeek();
      return;
    }
    const seconds = seekPreviewRef.current;
    if (seconds === null) {
      cancelSeek();
      return;
    }
    cancelSeek();
    if (canSeek) seek(seconds);
  };

  const beginPointerSeek = (event: ReactPointerEvent<HTMLInputElement>, initialValue: number) => {
    if (event.button !== 0 || !event.isPrimary || seekInteractionRef.current) return;
    seekInteractionRef.current = {
      pointerId: event.pointerId,
      input: event.currentTarget,
      changed: false,
    };
    // Keep the thumb on the current position until the native range emits its first change.
    seekPreviewRef.current = initialValue;
    setSeekPreview(initialValue);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const commitPointerSeek = (event: ReactPointerEvent<HTMLInputElement>) => {
    const interaction = seekInteractionRef.current;
    if (interaction && interaction.pointerId !== event.pointerId) return;
    commitSeek();
  };

  const cancelPointerSeek = (event: ReactPointerEvent<HTMLInputElement>) => {
    const interaction = seekInteractionRef.current;
    if (!interaction || interaction.pointerId === event.pointerId) cancelSeek();
  };

  const openQueueFromExpanded = () => {
    setExpanded(false);
    onOpenQueue();
  };

  const renderProgress = (inputId: string) => (
    <div className="progress-control">
      <span className="time-readout">{formatTime(shownTime)}</span>
      <label className="visually-hidden" htmlFor={inputId}>播放进度</label>
      <input
        id={inputId}
        className="progress-range"
        type="range"
        min="0"
        max={rangeMax}
        step="0.1"
        value={rangeValue}
        disabled={!canSeek || safeDuration === null}
        aria-valuetext={`${formatTime(shownTime)} / ${formatTime(safeDuration)}`}
        onPointerDown={(event) => beginPointerSeek(event, rangeValue)}
        onChange={(event) => previewSeek(Number(event.target.value), event.currentTarget)}
        onPointerUp={commitPointerSeek}
        onPointerCancel={cancelPointerSeek}
        onLostPointerCapture={cancelPointerSeek}
        onKeyUp={commitSeek}
        onBlur={commitSeek}
      />
      <span className="time-readout">{formatTime(safeDuration)}</span>
    </div>
  );

  const transport = (compact = false) => (
    <div className={`transport-controls${compact ? ' compact' : ''}`}>
      {!compact ? (
        <button type="button" className="icon-button" aria-label="上一首" disabled={!hasTrack} onClick={previous}>
          <Icon name="previous" />
        </button>
      ) : null}
      <button
        type="button"
        className="primary-play-button"
        aria-label={shouldPause ? '暂停' : '播放'}
        disabled={!hasTrack}
        onClick={shouldPause ? pause : toggle}
      >
        <Icon name={shouldPause ? 'pause' : 'play'} filled={!shouldPause} />
      </button>
      <button type="button" className="icon-button" aria-label="下一首" disabled={!hasTrack} onClick={next}>
        <Icon name="next" />
      </button>
    </div>
  );

  const renderCurrentTrackInfo = (showMessage = false) => {
    const secondaryText =
      showMessage && mobileMessage
        ? mobileMessage
        : currentTrack
          ? currentTrack.artist || '未知歌手'
          : statusText(status);

    return (
      <>
        <span className="now-art" aria-hidden="true" />
        <span className="now-copy">
          <strong title={currentTrack?.title}>{currentTrack?.title || '还没有播放歌曲'}</strong>
          <span
            className={showMessage && mobileMessage ? (error ? 'is-error' : 'is-notice') : undefined}
            title={secondaryText}
          >
            {secondaryText}
          </span>
        </span>
      </>
    );
  };

  return (
    <>
      <footer className="player-bar" aria-label="播放器">
        <div className="desktop-player">
          <div className="now-playing">
            {renderCurrentTrackInfo()}
            {currentTrack ? (
              <button
                type="button"
                className="favorite-button player-favorite"
                aria-label={isFavorite ? '取消收藏当前歌曲' : '收藏当前歌曲'}
                aria-pressed={isFavorite}
                onClick={() => toggleFavorite(currentTrack.id)}
              >
                <Icon name="heart" filled={isFavorite} />
              </button>
            ) : null}
          </div>

          <div className="desktop-center-controls">
            {transport()}
            {renderProgress('desktop-player-progress')}
          </div>

          <div className="player-tools">
            <button
              type="button"
              className="tool-button"
              aria-label={`当前为${MODE_LABEL[mode]}，点击切换`}
              title={MODE_LABEL[mode]}
              onClick={() => setMode(nextMode(mode))}
            >
              <Icon name={mode === 'repeat-one' ? 'repeat' : mode} />
              <span>{MODE_LABEL[mode]}</span>
            </button>
            <label className="volume-control">
              <Icon name="volume" />
              <span className="visually-hidden">音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                aria-valuetext={`${Math.round(volume * 100)}%`}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </label>
            <button type="button" className="tool-button" aria-label="打开播放队列" onClick={onOpenQueue}>
              <Icon name="queue" />
              <span>队列</span>
            </button>
          </div>
        </div>

        <div className="player-message" aria-live="polite">
          {error ? (
            <span className="player-error" role="alert">
              {error}
              <button type="button" onClick={retry}>重试</button>
            </span>
          ) : notice ? <span>{notice}</span> : <span>{hasTrack ? statusText(status) : ''}</span>}
        </div>

        <div className="mobile-mini-player">
          <div
            className="mini-progress"
            aria-hidden="true"
            style={{ '--player-progress': `${safeDuration ? Math.min(currentTime / safeDuration, 1) * 100 : 0}%` } as React.CSSProperties}
          />
          <button
            type="button"
            className="mobile-now-button"
            aria-label={hasTrack ? `打开完整播放器${mobileMessage ? `：${mobileMessage}` : ''}` : '还没有播放歌曲'}
            disabled={!hasTrack}
            onClick={() => setExpanded(true)}
          >
            {renderCurrentTrackInfo(true)}
          </button>
          {transport(true)}
        </div>
      </footer>

      <dialog
        ref={expandedDialog}
        className="expanded-player-dialog"
        aria-labelledby="expanded-player-title"
        onCancel={() => setExpanded(false)}
        onClose={() => setExpanded(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setExpanded(false);
        }}
      >
        <div className="expanded-player-card">
          <div className="dialog-heading">
            <span>{statusText(status)}</span>
            <button type="button" className="icon-button" aria-label="关闭完整播放器" onClick={() => setExpanded(false)}><Icon name="close" /></button>
          </div>
          <div className="expanded-art" aria-hidden="true"><span>33⅓</span></div>
          <div className="expanded-track-copy">
            <h2 id="expanded-player-title">{currentTrack?.title || '还没有播放歌曲'}</h2>
            <p>{currentTrack?.artist || '未知歌手'}{currentTrack?.album ? ` · ${currentTrack.album}` : ''}</p>
          </div>
          <div className="expanded-progress">{renderProgress('expanded-player-progress')}</div>
          {transport()}
          <div className="expanded-tools">
            <button
              type="button"
              className="tool-button"
              aria-label={`当前为${MODE_LABEL[mode]}，点击切换`}
              onClick={() => setMode(nextMode(mode))}
            >
              <Icon name={mode === 'repeat-one' ? 'repeat' : mode} />
              <span>{MODE_LABEL[mode]}</span>
            </button>
            <button
              type="button"
              className="tool-button"
              aria-label={isFavorite ? '取消收藏当前歌曲' : '收藏当前歌曲'}
              aria-pressed={isFavorite}
              disabled={!currentTrack}
              onClick={() => currentTrack && toggleFavorite(currentTrack.id)}
            >
              <Icon name="heart" filled={isFavorite} />
              <span>{isFavorite ? '已收藏' : '收藏'}</span>
            </button>
            <button type="button" className="tool-button" aria-label="打开播放队列" onClick={openQueueFromExpanded}>
              <Icon name="queue" />
              <span>队列</span>
            </button>
          </div>
          {error ? (
            <div className="expanded-message player-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={retry}>重试</button>
            </div>
          ) : notice ? <p className="expanded-message" role="status">{notice}</p> : null}
        </div>
      </dialog>
    </>
  );
}

