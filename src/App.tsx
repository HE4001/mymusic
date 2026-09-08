import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './components/Icon';
import { PlayerBar } from './components/PlayerBar';
import { QueuePanel } from './components/QueuePanel';
import { TrackList } from './components/TrackList';
import { usePlayer } from './hooks/usePlayer';
import { getLibrary } from './lib/api';
import { demoLibrary } from './lib/demo';
import type { Library, Track } from './types';
import './styles.css';

type LibraryState = 'loading' | 'ready' | 'error';
type Filter = 'all' | 'favorites';

interface LoadError {
  message: string;
}

function normalizeSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
}

function describeLibraryError(error: unknown): LoadError {
  return {
    message: error instanceof Error && error.message
      ? error.message
      : '暂时无法读取曲库，请检查网络后重试。',
  };
}

function FilterButtons({
  value,
  favoriteCount,
  onChange,
}: {
  value: Filter;
  favoriteCount: number;
  onChange: (filter: Filter) => void;
}) {
  return (
    <nav className="library-filters" aria-label="曲库筛选">
      <button
        type="button"
        className="filter-button"
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
      >
        <Icon name="queue" />
        <span>全部音乐</span>
      </button>
      <button
        type="button"
        className="filter-button"
        aria-pressed={value === 'favorites'}
        onClick={() => onChange('favorites')}
      >
        <Icon name="heart" />
        <span>我的收藏</span>
        {favoriteCount > 0 ? <span className="filter-count">{favoriteCount}</span> : null}
      </button>
    </nav>
  );
}

export default function App() {
  const demoMode =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === '1';
  const [library, setLibrary] = useState<Library | null>(demoMode ? demoLibrary : null);
  const [libraryState, setLibraryState] = useState<LibraryState>(demoMode ? 'ready' : 'loading');
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    if (demoMode) {
      setLibrary(demoLibrary);
      setLibraryState('ready');
      setLoadError(null);
      return undefined;
    }

    const request = new AbortController();
    setLibrary(null);
    setLibraryState('loading');
    setLoadError(null);

    void getLibrary(request.signal)
      .then((nextLibrary) => {
        if (request.signal.aborted) return;
        setLibrary(nextLibrary);
        setLibraryState('ready');
      })
      .catch((error: unknown) => {
        if (request.signal.aborted) return;
        setLoadError(describeLibraryError(error));
        setLibraryState('error');
      });

    return () => request.abort();
  }, [demoMode, reloadKey]);

  const tracks = library?.tracks ?? [];
  const player = usePlayer(tracks, {
    demo: demoMode,
    libraryLoaded: libraryState === 'ready',
  });
  const favoriteIds = useMemo(() => new Set(player.favorites), [player.favorites]);
  const normalizedQuery = normalizeSearch(query);
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      if (filter === 'favorites' && !favoriteIds.has(track.id)) return false;
      if (!normalizedQuery) return true;
      const searchable = normalizeSearch(`${track.title} ${track.artist} ${track.album}`);
      return searchable.includes(normalizedQuery);
    });
  }, [favoriteIds, filter, normalizedQuery, tracks]);

  const retryLibrary = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.code !== 'Space') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const isEditing =
          target.isContentEditable ||
          Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"]'));
        if (isEditing) return;
      }

      event.preventDefault();
      player.toggle();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player.toggle]);

  const selectTrack = useCallback(
    (track: Track, queue: Track[]) => {
      const isCurrent = player.currentTrack?.id === track.id;
      const isActive =
        player.status === 'playing' ||
        player.status === 'loading' ||
        player.status === 'buffering';

      if (isCurrent && isActive) {
        player.pause();
        return;
      }

      player.selectTrack(track, queue);
    },
    [player.currentTrack?.id, player.pause, player.selectTrack, player.status],
  );

  const sectionTitle = filter === 'favorites' ? '我的收藏' : '全部音乐';
  const noResults = tracks.length > 0 && filteredTracks.length === 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="search-field">
          <span className="search-icon"><Icon name="search" /></span>
          <label className="visually-hidden" htmlFor="library-search">搜索曲库</label>
          <input
            id="library-search"
            type="search"
            value={query}
            placeholder="搜索歌曲、歌手、专辑"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="clear-search" aria-label="清空搜索" onClick={() => setQuery('')}>
              <Icon name="close" />
            </button>
          ) : null}
        </div>
      </header>

      {demoMode ? (
        <div className="demo-banner" role="status">
          <strong>演示曲库</strong>
          <span>本地试听 · {demoLibrary.tracks.length} 段测试音频</span>
        </div>
      ) : null}

      <div className="workspace">

        <main className="library-panel" id="main-content">
          <div className="library-heading">
            <div>
              <p className="eyebrow">我的资料库</p>
              <h1>{sectionTitle}</h1>
            </div>
            {libraryState === 'ready' ? (
              <span className="track-total" aria-live="polite">
                {filteredTracks.length} 首
              </span>
            ) : null}
          </div>

          <div className="library-toolbar">
            <FilterButtons value={filter} favoriteCount={player.favorites.length} onChange={setFilter} />
            <span className="keyboard-hint"><kbd>Space</kbd> 播放 / 暂停</span>
          </div>

          {libraryState === 'loading' ? (
            <div className="state-panel" role="status" aria-live="polite">
              <span className="loading-indicator" aria-hidden="true" />
              <h3>正在加载曲库</h3>
              <p>正在读取歌曲列表。</p>
            </div>
          ) : null}

          {libraryState === 'error' && loadError ? (
            <div className="state-panel state-panel-error" role="alert">
              <span className="state-icon" aria-hidden="true">!</span>
              <h3>曲库加载失败</h3>
              <p>{loadError.message}</p>
              <div className="state-actions">
                <button type="button" className="secondary-action" onClick={retryLibrary}>重试</button>
              </div>
            </div>
          ) : null}

          {libraryState === 'ready' && tracks.length === 0 ? (
            <div className="state-panel" role="status">
              <span className="state-icon"><Icon name="queue" /></span>
              <h3>曲库还没有歌曲</h3>
              <p>添加歌曲后，即可在这里浏览和播放。</p>
            </div>
          ) : null}

          {libraryState === 'ready' && noResults ? (
            <div className="state-panel" role="status">
              <span className="state-icon"><Icon name="search" /></span>
              <h3>{filter === 'favorites' && !query ? '还没有收藏歌曲' : '没有找到匹配歌曲'}</h3>
              <p>{query ? '换个关键词，或清空搜索后再试。' : '在歌曲列表中点按爱心即可收藏。'}</p>
              {query ? (
                <button type="button" className="secondary-action" onClick={() => setQuery('')}>清空搜索</button>
              ) : null}
            </div>
          ) : null}

          {libraryState === 'ready' && filteredTracks.length > 0 ? (
            <TrackList
              tracks={filteredTracks}
              currentTrackId={player.currentTrack?.id ?? null}
              playbackStatus={player.status}
              favorites={favoriteIds}
              onSelect={selectTrack}
              onToggleFavorite={player.toggleFavorite}
            />
          ) : null}
        </main>
      </div>

      <PlayerBar controller={player} onOpenQueue={() => setQueueOpen(true)} />
      <QueuePanel
        open={queueOpen}
        queue={player.queue}
        tracks={tracks}
        currentTrackId={player.currentTrack?.id ?? null}
        playbackStatus={player.status}
        favorites={favoriteIds}
        onClose={() => setQueueOpen(false)}
        onPlay={player.playQueued}
        onToggleFavorite={player.toggleFavorite}
      />
    </div>
  );
}
