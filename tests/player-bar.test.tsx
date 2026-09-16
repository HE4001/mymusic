// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerBar } from '../src/components/PlayerBar';
import type { PlayerController, Track } from '../src/types';

const track: Track = {
  id: 'track-a',
  title: 'A',
  artist: 'Artist',
  album: 'Album',
  duration: 180,
  mimeType: 'audio/mpeg',
};

let root: Root;
let host: HTMLDivElement;
let controller: PlayerController;

function createController(overrides: Partial<PlayerController> = {}): PlayerController {
  return {
    currentTrack: track,
    queue: [track.id],
    status: 'playing',
    currentTime: 12,
    duration: 180,
    volume: 0.8,
    mode: 'sequence',
    favorites: [],
    canSeek: true,
    error: null,
    notice: null,
    selectTrack: vi.fn(),
    playQueued: vi.fn(),
    toggle: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    setMode: vi.fn(),
    toggleFavorite: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}

async function render(overrides: Partial<PlayerController> = {}) {
  controller = createController(overrides);
  await act(async () => {
    root.render(createElement(PlayerBar, { controller, onOpenQueue: vi.fn() }));
  });
}

async function rerender(overrides: Partial<PlayerController>) {
  controller = createController({ ...controller, ...overrides });
  await act(async () => {
    root.render(createElement(PlayerBar, { controller, onOpenQueue: vi.fn() }));
  });
}

function progressInput() {
  return host.querySelector('#desktop-player-progress') as HTMLInputElement;
}

function pointerEvent(type: string, pointerId: number, isPrimary = true) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    button: { value: 0 },
    isPrimary: { value: isPrimary },
    pointerId: { value: pointerId },
  });
  return event;
}

function inputValue(input: HTMLInputElement, value: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function stubPointerCapture(input: HTMLInputElement) {
  Object.defineProperties(input, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PlayerBar progress control', () => {
  it('keeps a stable preview while time advances and commits once on pointerup', async () => {
    await render();
    const input = progressInput();
    stubPointerCapture(input);

    await act(async () => input.dispatchEvent(pointerEvent('pointerdown', 1)));
    await rerender({ currentTime: 30 });
    expect(input.value).toBe('12');

    await act(async () => inputValue(input, 45));
    await act(async () => input.dispatchEvent(pointerEvent('pointerup', 1)));
    await act(async () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));

    expect(controller.seek).toHaveBeenCalledTimes(1);
    expect(controller.seek).toHaveBeenCalledWith(45);
    expect(input.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('uses the same native range behavior in the expanded player', async () => {
    await render();
    const dialog = host.querySelector('.expanded-player-dialog') as HTMLDialogElement;
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    const close = vi.fn(() => dialog.removeAttribute('open'));
    Object.defineProperties(dialog, {
      showModal: { configurable: true, value: showModal },
      close: { configurable: true, value: close },
    });

    await act(async () => (host.querySelector('.mobile-now-button') as HTMLButtonElement).click());
    expect(showModal).toHaveBeenCalledOnce();

    const input = host.querySelector('#expanded-player-progress') as HTMLInputElement;
    stubPointerCapture(input);
    await act(async () => input.dispatchEvent(pointerEvent('pointerdown', 1)));
    await act(async () => inputValue(input, 101.5));
    await act(async () => input.dispatchEvent(pointerEvent('pointerup', 1)));

    expect(controller.seek).toHaveBeenCalledOnce();
    expect(controller.seek).toHaveBeenCalledWith(101.5);
  });

  it('cancels a pointer seek on pointercancel or lostpointercapture', async () => {
    await render();
    const input = progressInput();
    stubPointerCapture(input);

    await act(async () => input.dispatchEvent(pointerEvent('pointerdown', 1)));
    await act(async () => inputValue(input, 60));
    await act(async () => input.dispatchEvent(pointerEvent('pointercancel', 1)));
    await act(async () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));

    await act(async () => input.dispatchEvent(pointerEvent('pointerdown', 2)));
    await act(async () => inputValue(input, 90));
    await act(async () => input.dispatchEvent(pointerEvent('lostpointercapture', 2)));
    await act(async () => input.dispatchEvent(pointerEvent('pointerup', 2)));

    expect(controller.seek).not.toHaveBeenCalled();
  });

  it('clears a pending preview when the track becomes unavailable', async () => {
    await render();
    const input = progressInput();
    stubPointerCapture(input);
    await act(async () => input.dispatchEvent(pointerEvent('pointerdown', 1)));
    await act(async () => inputValue(input, 75));

    await rerender({ canSeek: false, duration: 180 });
    expect(input.value).toBe('12');
    await act(async () => input.dispatchEvent(pointerEvent('pointerup', 1)));
    expect(controller.seek).not.toHaveBeenCalled();
  });

  it('commits keyboard changes once even when blur follows keyup', async () => {
    await render();
    const input = progressInput();
    await act(async () => inputValue(input, 33.4));
    await act(async () => input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowRight' })));
    await act(async () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));

    expect(controller.seek).toHaveBeenCalledTimes(1);
    expect(controller.seek).toHaveBeenCalledWith(33.4);
  });
});
