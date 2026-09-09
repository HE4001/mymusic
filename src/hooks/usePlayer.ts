import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  PlayTicket,
  PlaybackMode,
  PlaybackStatus,
  PlayerController,
  PlayerOptions,
  Track,
} from '../types';
import { ApiError, getPlayTicket } from '../lib/api';
import { getDemoPlayTicket, revokeDemoAudioUrls } from '../lib/demo';
import {
  clearMediaSession,
  registerMediaSessionActionHandlers,
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
} from '../lib/media-session';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  prunePreferences,
  savePreferences,
  type PlayerPreferences,
} from '../lib/preferences';
import { clampMediaTime, isTicketNearExpiry, mayContinueAsyncPlayback } from '../lib/player';
import {
  createQueueSnapshot,
  getSequentialNext,
  getSequentialPrevious,
  getShuffleNext,
} from '../lib/queue';

const SAVE_INTERVAL_MS = 5_000;
const METADATA_TIMEOUT_MS = 20_000;

class MediaLoadError extends Error {
  constructor(message = '音频元数据加载失败') {
    super(message);
    this.name = 'MediaLoadError';
  }
}

interface MetadataWait {
  operationId: number;
  cancel: (reason?: Error) => void;
}

interface LoadTrackOptions {
  resetRecovery: boolean;
}

function createAbortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('操作已取消', 'AbortError');
  const error = new Error('操作已取消');
  error.name = 'AbortError';
  return error;
}

function isNamedError(error: unknown, name: string): boolean {
  return (
    (error instanceof Error && error.name === name) ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: unknown }).name === name)
  );
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function validMediaDuration(audio: HTMLAudioElement): number | null {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
}

function playbackErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof MediaLoadError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return '播放失败，请重试';
}

export function usePlayer(tracks: Track[], options: PlayerOptions = {}): PlayerController {
  const demoEnabled = import.meta.env.DEV && options.demo === true;
  const directPlayback = options.directPlayback === true && !demoEnabled;
  const initialPreferencesRef = useRef<PlayerPreferences | null>(null);
  if (initialPreferencesRef.current === null) {
    initialPreferencesRef.current = demoEnabled
      ? { ...DEFAULT_PREFERENCES, favorites: [] }
      : loadPreferences();
  }
  const initialPreferences = initialPreferencesRef.current;

  const [currentTrackId, setCurrentTrackIdState] = useState<string | null>(
    initialPreferences.recentTrackId,
  );
  const [queue, setQueueState] = useState<string[]>([]);
  const [status, setStatusState] = useState<PlaybackStatus>('idle');
  const [currentTime, setCurrentTimeState] = useState(initialPreferences.position);
  const [duration, setDurationState] = useState<number | null>(null);
  const [volume, setVolumeState] = useState(initialPreferences.volume);
  const [mode, setModeState] = useState<PlaybackMode>(initialPreferences.mode);
  const [favorites, setFavoritesState] = useState<string[]>(initialPreferences.favorites);
  const [mediaReady, setMediaReadyState] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [notice, setNoticeState] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const currentTrackIdRef = useRef(currentTrackId);
  const queueRef = useRef(queue);
  const statusRef = useRef(status);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);
  const modeRef = useRef(mode);
  const favoritesRef = useRef(favorites);
  const mediaReadyRef = useRef(mediaReady);
  const wantsPlaybackRef = useRef(false);
  const operationIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const metadataWaitRef = useRef<MetadataWait | null>(null);
  const activeTrackIdRef = useRef<string | null>(null);
  const ticketRef = useRef<PlayTicket | null>(null);
  const recoveryUsedRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const shuffleVisitedRef = useRef<Set<string>>(new Set());
  const lastSavedAtRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const reconciledTrackIdsRef = useRef<string[] | null>(null);

  const loadTrackRef = useRef<
    (id: string, position: number, shouldPlay: boolean, options: LoadTrackOptions) => Promise<void>
  >(async () => undefined);
  const handleMediaFailureRef = useRef<(operationId: number, trackId: string) => void>(
    () => undefined,
  );
  const handleEndedRef = useRef<() => void>(() => undefined);

  tracksRef.current = tracks;

  const setCurrentTrackId = useCallback((value: string | null) => {
    currentTrackIdRef.current = value;
    setCurrentTrackIdState(value);
  }, []);

  const setQueue = useCallback((value: string[]) => {
    queueRef.current = value;
    setQueueState(value);
  }, []);

  const setStatus = useCallback((value: PlaybackStatus) => {
    statusRef.current = value;
    setStatusState(value);
  }, []);

  const setCurrentTime = useCallback((value: number) => {
    currentTimeRef.current = value;
    setCurrentTimeState(value);
  }, []);

  const setDuration = useCallback((value: number | null) => {
    durationRef.current = value;
    setDurationState(value);
  }, []);

  const setMediaReady = useCallback((value: boolean) => {
    mediaReadyRef.current = value;
    setMediaReadyState(value);
  }, []);

  const writePreferences = useCallback(() => {
    if (demoEnabled) return;
    savePreferences({
      favorites: favoritesRef.current,
      recentTrackId: currentTrackIdRef.current,
      position: currentTrackIdRef.current ? Math.max(0, currentTimeRef.current) : 0,
      mode: modeRef.current,
      volume: volumeRef.current,
    });
    lastSavedAtRef.current = Date.now();
  }, [demoEnabled]);

  const persistPreferences = useCallback(
    (force = false) => {
      if (demoEnabled) return;
      const elapsed = Date.now() - lastSavedAtRef.current;
      if (force || elapsed >= SAVE_INTERVAL_MS) {
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        writePreferences();
        return;
      }
      if (saveTimerRef.current === null) {
        saveTimerRef.current = window.setTimeout(() => {
          saveTimerRef.current = null;
          writePreferences();
        }, SAVE_INTERVAL_MS - elapsed);
      }
    },
    [demoEnabled, writePreferences],
  );

  const beginOperation = useCallback((resetRecovery: boolean): number => {
    operationIdRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    metadataWaitRef.current?.cancel(createAbortError());
    metadataWaitRef.current = null;
    if (resetRecovery) recoveryUsedRef.current = false;
    return operationIdRef.current;
  }, []);

  const waitForMetadata = useCallback(
    (audio: HTMLAudioElement, operationId: number): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          window.clearTimeout(timeoutId);
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audio.removeEventListener('error', onError);
          if (metadataWaitRef.current?.operationId === operationId) metadataWaitRef.current = null;
        };
        const finish = (complete: () => void) => {
          if (settled) return;
          settled = true;
          cleanup();
          complete();
        };
        const onLoadedMetadata = () => {
          if (operationId !== operationIdRef.current) {
            finish(() => reject(createAbortError()));
            return;
          }
          finish(resolve);
        };
        const onError = () => finish(() => reject(new MediaLoadError()));
        const timeoutId = window.setTimeout(() => {
          finish(() => reject(new MediaLoadError('等待音频元数据超时')));
        }, METADATA_TIMEOUT_MS);

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('error', onError);
        metadataWaitRef.current = {
          operationId,
          cancel: (reason = createAbortError()) => finish(() => reject(reason)),
        };
        if (audio.readyState >= 1) finish(resolve);
      }),
    [],
  );

  const setFailure = useCallback(
    (message: string) => {
      wantsPlaybackRef.current = false;
      audioRef.current?.pause();
      setNoticeState(null);
      setErrorState(message);
      setStatus('error');
      persistPreferences(true);
    },
    [persistPreferences, setStatus],
  );

  const safePlay = useCallback(
    async (audio: HTMLAudioElement, operationId: number, trackId: string): Promise<void> => {
      try {
        await audio.play();
        if (
          !mayContinueAsyncPlayback(
            operationId,
            operationIdRef.current,
            wantsPlaybackRef.current,
          ) ||
          currentTrackIdRef.current !== trackId
        ) {
          if (!wantsPlaybackRef.current) audio.pause();
          return;
        }
        setStatus('playing');
        setNoticeState(null);
      } catch (playError) {
        if (operationId !== operationIdRef.current || !wantsPlaybackRef.current) return;
        if (isNamedError(playError, 'NotAllowedError')) {
          wantsPlaybackRef.current = false;
          setStatus('paused');
          setErrorState(null);
          setNoticeState('浏览器阻止了播放，请点击播放键继续');
          return;
        }
        if (isNamedError(playError, 'AbortError')) {
          setFailure('播放被浏览器中断，请重试');
          return;
        }
        handleMediaFailureRef.current(operationId, trackId);
      }
    },
    [setFailure, setStatus],
  );

  const requestTicket = useCallback(
    async (id: string, signal: AbortSignal): Promise<PlayTicket> => {
      if (demoEnabled) {
        if (signal.aborted) throw createAbortError();
        const ticket = getDemoPlayTicket(id);
        if (signal.aborted) throw createAbortError();
        return ticket;
      }
      return getPlayTicket(id, signal);
    },
    [demoEnabled],
  );

  const loadTrack = useCallback(
    async (
      id: string,
      position: number,
      shouldPlay: boolean,
      loadOptions: LoadTrackOptions,
    ): Promise<void> => {
      const track = tracksRef.current.find((candidate) => candidate.id === id);
      if (!track) {
        setFailure('歌曲不存在或已从曲库移除');
        return;
      }
      const audio = audioRef.current;
      if (!audio) {
        setFailure('播放器尚未就绪，请重试');
        return;
      }

      const operationId = beginOperation(loadOptions.resetRecovery);
      const abortController = new AbortController();
      requestAbortRef.current = abortController;
      wantsPlaybackRef.current = shouldPlay;
      activeTrackIdRef.current = null;
      ticketRef.current = null;
      setCurrentTrackId(id);
      setCurrentTime(Math.max(0, position));
      setDuration(track.duration);
      setMediaReady(false);
      setErrorState(null);
      setNoticeState(null);
      setStatus('loading');
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      persistPreferences();

      try {
        const ticket: PlayTicket = directPlayback
          ? { trackId: id, url: `/api/stream?id=${encodeURIComponent(id)}`, expiresAt: Date.now() + 60_000 }
          : await requestTicket(id, abortController.signal);
        if (operationId !== operationIdRef.current || abortController.signal.aborted) return;

        ticketRef.current = ticket;
        activeTrackIdRef.current = id;
        audio.preload = 'metadata';
        audio.src = ticket.url;
        audio.load();
        // Invoke play before any await so Safari retains the user's tap gesture.
        const startedPlay = directPlayback && shouldPlay ? safePlay(audio, operationId, id) : null;
        await waitForMetadata(audio, operationId);
        if (operationId !== operationIdRef.current) return;

        const nextDuration = validMediaDuration(audio) ?? track.duration;
        setDuration(nextDuration);
        const nextPosition =
          nextDuration === null ? Math.max(0, position) : clampMediaTime(position, nextDuration);
        try {
          audio.currentTime = nextPosition;
        } catch {
          // A browser may reject assignment until metadata is completely ready.
        }
        setCurrentTime(nextPosition);
        setMediaReady(true);

        if (shouldPlay && wantsPlaybackRef.current) {
          if (startedPlay) await startedPlay;
          else { setStatus('buffering'); await safePlay(audio, operationId, id); }
        } else {
          setStatus('paused');
        }
      } catch (loadError) {
        if (operationId !== operationIdRef.current || isNamedError(loadError, 'AbortError')) return;
        if (directPlayback) window.dispatchEvent(new Event('session-check'));
        if (
          ticketRef.current !== null &&
          isTicketNearExpiry(ticketRef.current) &&
          !recoveryUsedRef.current
        ) {
          recoveryUsedRef.current = true;
          await loadTrackRef.current(
            id,
            Math.max(0, audio.currentTime || currentTimeRef.current),
            wantsPlaybackRef.current,
            { resetRecovery: false },
          );
          return;
        }
        setFailure(playbackErrorMessage(loadError));
      } finally {
        if (requestAbortRef.current === abortController) requestAbortRef.current = null;
      }
    },
    [
      directPlayback,
      beginOperation,
      persistPreferences,
      requestTicket,
      safePlay,
      setCurrentTime,
      setCurrentTrackId,
      setDuration,
      setFailure,
      setMediaReady,
      setStatus,
      waitForMetadata,
    ],
  );
  loadTrackRef.current = loadTrack;

  const handleMediaFailure = useCallback(
    (operationId: number, trackId: string) => {
      if (
        operationId !== operationIdRef.current ||
        currentTrackIdRef.current !== trackId ||
        activeTrackIdRef.current !== trackId
      ) {
        return;
      }
      if (
        ticketRef.current !== null &&
        isTicketNearExpiry(ticketRef.current) &&
        !recoveryUsedRef.current
      ) {
        recoveryUsedRef.current = true;
        const audio = audioRef.current;
        const position = Math.max(0, audio?.currentTime || currentTimeRef.current);
        void loadTrackRef.current(trackId, position, wantsPlaybackRef.current, {
          resetRecovery: false,
        });
        return;
      }
      setFailure('音频加载失败，请重试');
    },
    [setFailure],
  );
  handleMediaFailureRef.current = handleMediaFailure;

  const finishQueue = useCallback(() => {
    wantsPlaybackRef.current = false;
    audioRef.current?.pause();
    setStatus('paused');
    persistPreferences(true);
  }, [persistPreferences, setStatus]);

  const advance = useCallback(
    (natural: boolean) => {
      const currentId = currentTrackIdRef.current;
      if (!currentId) return;
      let nextId: string | null;
      if (natural && modeRef.current === 'repeat-one') {
        nextId = currentId;
      } else if (modeRef.current === 'shuffle') {
        nextId = getShuffleNext(queueRef.current, shuffleVisitedRef.current);
      } else {
        nextId = getSequentialNext(queueRef.current, currentId);
      }
      if (!nextId) {
        finishQueue();
        return;
      }
      if (nextId !== currentId) historyRef.current.push(currentId);
      shuffleVisitedRef.current.add(nextId);
      void loadTrackRef.current(nextId, 0, true, { resetRecovery: true });
    },
    [finishQueue],
  );
  handleEndedRef.current = () => advance(true);

  const pause = useCallback(() => {
    if (!currentTrackIdRef.current) return;
    wantsPlaybackRef.current = false;
    setStatus('paused');
    setNoticeState(null);
    audioRef.current?.pause();
    persistPreferences(true);
  }, [persistPreferences, setStatus]);

  const toggle = useCallback(() => {
    const currentId = currentTrackIdRef.current;
    if (!currentId) {
      const firstId = queueRef.current[0] ?? tracksRef.current[0]?.id;
      if (!firstId) return;
      if (queueRef.current.length === 0) {
        setQueue(createQueueSnapshot(tracksRef.current, firstId));
      }
      shuffleVisitedRef.current = new Set([firstId]);
      void loadTrackRef.current(firstId, 0, true, { resetRecovery: true });
      return;
    }
    if (wantsPlaybackRef.current) {
      pause();
      return;
    }

    const audio = audioRef.current;
    if (
      audio &&
      mediaReadyRef.current &&
      activeTrackIdRef.current === currentId
    ) {
      wantsPlaybackRef.current = true;
      setErrorState(null);
      setNoticeState(null);
      if (isTicketNearExpiry(ticketRef.current)) {
        void loadTrackRef.current(currentId, currentTimeRef.current, true, {
          resetRecovery: true,
        });
      } else {
        setStatus('buffering');
        void safePlay(audio, operationIdRef.current, currentId);
      }
      return;
    }
    void loadTrackRef.current(currentId, currentTimeRef.current, true, {
      resetRecovery: true,
    });
  }, [pause, safePlay, setQueue, setStatus]);

  const selectTrack = useCallback(
    (track: Track, nextTracks: Track[]) => {
      if (track.id === currentTrackIdRef.current) {
        toggle();
        return;
      }
      setQueue(createQueueSnapshot(nextTracks, track.id));
      historyRef.current = [];
      shuffleVisitedRef.current = new Set([track.id]);
      void loadTrackRef.current(track.id, 0, true, { resetRecovery: true });
    },
    [setQueue, toggle],
  );

  const playQueued = useCallback(
    (id: string) => {
      if (!queueRef.current.includes(id) || !tracksRef.current.some((track) => track.id === id)) {
        return;
      }
      if (id === currentTrackIdRef.current) {
        toggle();
        return;
      }
      if (currentTrackIdRef.current) historyRef.current.push(currentTrackIdRef.current);
      shuffleVisitedRef.current.add(id);
      void loadTrackRef.current(id, 0, true, { resetRecovery: true });
    },
    [toggle],
  );

  const next = useCallback(() => advance(false), [advance]);

  const previous = useCallback(() => {
    const currentId = currentTrackIdRef.current;
    if (!currentId) return;
    if (currentTimeRef.current > 3) {
      if (audioRef.current && mediaReadyRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      persistPreferences(true);
      return;
    }
    const previousId =
      modeRef.current === 'shuffle'
        ? historyRef.current.pop() ?? null
        : getSequentialPrevious(queueRef.current, currentId);
    if (!previousId) {
      if (audioRef.current && mediaReadyRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    void loadTrackRef.current(previousId, 0, true, { resetRecovery: true });
  }, [persistPreferences, setCurrentTime]);

  const seek = useCallback(
    (seconds: number) => {
      const currentId = currentTrackIdRef.current;
      const knownDuration = durationRef.current;
      if (!currentId || knownDuration === null || !Number.isFinite(seconds)) return;
      const nextTime = clampMediaTime(seconds, knownDuration);
      const audio = audioRef.current;
      if (!audio || !mediaReadyRef.current || activeTrackIdRef.current !== currentId) {
        setCurrentTime(nextTime);
        persistPreferences();
        return;
      }
      if (isTicketNearExpiry(ticketRef.current)) {
        void loadTrackRef.current(currentId, nextTime, wantsPlaybackRef.current, {
          resetRecovery: true,
        });
        return;
      }
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
      persistPreferences();
    },
    [persistPreferences, setCurrentTime],
  );

  const setVolume = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return;
      const nextVolume = Math.min(1, Math.max(0, value));
      volumeRef.current = nextVolume;
      setVolumeState(nextVolume);
      if (audioRef.current) audioRef.current.volume = nextVolume;
      persistPreferences();
    },
    [persistPreferences],
  );

  const setMode = useCallback(
    (value: PlaybackMode) => {
      modeRef.current = value;
      setModeState(value);
      shuffleVisitedRef.current = currentTrackIdRef.current
        ? new Set([currentTrackIdRef.current])
        : new Set();
      historyRef.current = [];
      persistPreferences(true);
    },
    [persistPreferences],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!tracksRef.current.some((track) => track.id === id)) return;
      const nextFavorites = favoritesRef.current.includes(id)
        ? favoritesRef.current.filter((favoriteId) => favoriteId !== id)
        : [...favoritesRef.current, id];
      favoritesRef.current = nextFavorites;
      setFavoritesState(nextFavorites);
      persistPreferences(true);
    },
    [persistPreferences],
  );

  const retry = useCallback(() => {
    const currentId = currentTrackIdRef.current;
    if (!currentId) return;
    void loadTrackRef.current(currentId, currentTimeRef.current, true, {
      resetRecovery: true,
    });
  }, []);

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentTrackId) ?? null,
    [currentTrackId, tracks],
  );

  useEffect(() => {
    const audio = new Audio();
    // Native audio playback does not need CORS; no Web Audio processing is used.
    audio.preload = 'metadata';
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!mediaReadyRef.current || !Number.isFinite(audio.currentTime)) return;
      setCurrentTime(Math.max(0, audio.currentTime));
      persistPreferences();
    };
    const onDurationChange = () => {
      const nextDuration = validMediaDuration(audio);
      if (nextDuration !== null) setDuration(nextDuration);
    };
    const onPlaying = () => {
      if (wantsPlaybackRef.current) setStatus('playing');
    };
    const onWaiting = () => {
      if (wantsPlaybackRef.current) setStatus('buffering');
    };
    const onPause = () => {
      if (
        activeTrackIdRef.current &&
        statusRef.current !== 'loading' &&
        statusRef.current !== 'error' &&
        !audio.ended
      ) {
        wantsPlaybackRef.current = false;
        setStatus('paused');
      }
    };
    const onError = () => {
      if (!mediaReadyRef.current || !activeTrackIdRef.current) return;
      handleMediaFailureRef.current(operationIdRef.current, activeTrackIdRef.current);
    };
    const onEnded = () => {
      if (mediaReadyRef.current && wantsPlaybackRef.current) handleEndedRef.current();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const currentId = currentTrackIdRef.current;
      if (!currentId || activeTrackIdRef.current !== currentId || !mediaReadyRef.current) return;

      if (Number.isFinite(audio.currentTime)) setCurrentTime(Math.max(0, audio.currentTime));
      const nextDuration = validMediaDuration(audio);
      if (nextDuration !== null) setDuration(nextDuration);

      if (audio.ended || audio.paused) {
        wantsPlaybackRef.current = false;
        if (statusRef.current !== 'error') setStatus('paused');
      } else {
        wantsPlaybackRef.current = true;
        setStatus('playing');
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      operationIdRef.current += 1;
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      metadataWaitRef.current?.cancel(createAbortError());
      metadataWaitRef.current = null;
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (audioRef.current === audio) audioRef.current = null;
      activeTrackIdRef.current = null;
      ticketRef.current = null;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      writePreferences();
      if (demoEnabled) revokeDemoAudioUrls();
    };
  }, [demoEnabled, persistPreferences, setCurrentTime, setDuration, setStatus, writePreferences]);

  useEffect(() => {
    setMediaSessionMetadata(currentTrack);
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrackId || !audio) {
      setMediaSessionPlaybackState('none');
      setMediaSessionPositionState(null, 0, 1);
      return;
    }

    setMediaSessionPlaybackState(!audio.paused && !audio.ended ? 'playing' : 'paused');
    setMediaSessionPositionState(
      mediaReady ? duration : null,
      audio.currentTime,
      audio.playbackRate,
    );
  }, [currentTime, currentTrackId, duration, mediaReady, status]);

  useEffect(
    () =>
      registerMediaSessionActionHandlers({
        play: () => {
          if (!wantsPlaybackRef.current) toggle();
        },
        pause: () => pause(),
        previoustrack: () => previous(),
        nexttrack: () => next(),
        seekto: (details) => {
          if (typeof details.seekTime === 'number') seek(details.seekTime);
        },
        seekbackward: (details) => {
          seek(currentTimeRef.current - (details.seekOffset ?? 10));
        },
        seekforward: (details) => {
          seek(currentTimeRef.current + (details.seekOffset ?? 10));
        },
      }),
    [next, pause, previous, seek, toggle],
  );

  useEffect(() => () => clearMediaSession(), []);

  useEffect(() => {
    if (demoEnabled) return undefined;
    const onPageHide = () => writePreferences();
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [demoEnabled, writePreferences]);

  useEffect(() => {
    if (options.libraryLoaded !== true) {
      reconciledTrackIdsRef.current = null;
      return;
    }
    const trackIds = tracks.map((track) => track.id);
    if (reconciledTrackIdsRef.current && sameIds(reconciledTrackIdsRef.current, trackIds)) return;
    reconciledTrackIdsRef.current = trackIds;

    const validIds = new Set(trackIds);
    const pruned = prunePreferences(
      {
        favorites: favoritesRef.current,
        recentTrackId: currentTrackIdRef.current,
        position: currentTimeRef.current,
        mode: modeRef.current,
        volume: volumeRef.current,
      },
      validIds,
    );
    if (!sameIds(favoritesRef.current, pruned.favorites)) {
      favoritesRef.current = pruned.favorites;
      setFavoritesState(pruned.favorites);
    }

    const currentId = currentTrackIdRef.current;
    if (currentId && !validIds.has(currentId)) {
      beginOperation(true);
      wantsPlaybackRef.current = false;
      audioRef.current?.pause();
      audioRef.current?.removeAttribute('src');
      audioRef.current?.load();
      activeTrackIdRef.current = null;
      ticketRef.current = null;
      setCurrentTrackId(null);
      setCurrentTime(0);
      setDuration(null);
      setMediaReady(false);
      setQueue([]);
      setStatus('idle');
    } else if (currentId) {
      shuffleVisitedRef.current.add(currentId);
      const validQueue = queueRef.current.filter((id) => validIds.has(id));
      setQueue(validQueue.includes(currentId) ? validQueue : trackIds);
      setDuration(tracks.find((track) => track.id === currentId)?.duration ?? null);
      if (statusRef.current === 'idle') setStatus('paused');
    } else if (queueRef.current.length > 0) {
      setQueue(queueRef.current.filter((id) => validIds.has(id)));
    }
    writePreferences();
  }, [
    beginOperation,
    options.libraryLoaded,
    setCurrentTime,
    setCurrentTrackId,
    setDuration,
    setMediaReady,
    setQueue,
    setStatus,
    tracks,
    writePreferences,
  ]);

  return {
    currentTrack,
    queue,
    status,
    currentTime,
    duration,
    volume,
    mode,
    favorites,
    canSeek: mediaReady && duration !== null && duration > 0,
    error,
    notice,
    selectTrack,
    playQueued,
    toggle,
    pause,
    next,
    previous,
    seek,
    setVolume,
    setMode,
    toggleFavorite,
    retry,
  };
}
