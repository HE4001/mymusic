import type { PlayTicket } from '../types';

export const TICKET_REFRESH_WINDOW_MS = 60_000;

export function isTicketNearExpiry(ticket: PlayTicket | null, now = Date.now()): boolean {
  return ticket === null || ticket.expiresAt - now < TICKET_REFRESH_WINDOW_MS;
}

export function clampMediaTime(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(Math.max(0, seconds), Math.max(0, duration - 0.05));
}

export function mayContinueAsyncPlayback(
  operationId: number,
  currentOperationId: number,
  wantsPlayback: boolean,
): boolean {
  return operationId === currentOperationId && wantsPlayback;
}
