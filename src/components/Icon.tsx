const paths = {
  play: 'm8 5 11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  previous: 'M5 5v14m14-14L8 12l11 7Z',
  next: 'M19 5v14M5 5l11 7-11 7Z',
  heart: 'M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z',
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  queue: 'M4 6h16M4 12h16M4 18h10',
  volume: 'M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  sequence: 'M4 6h16m-4-4 4 4-4 4M4 13h10M4 20h10',
  shuffle: 'M3 5h3c5 0 7 14 12 14h3m-4-4 4 4-4 4M3 19h3c2 0 3-2 4-4m4-6c1-2 2-4 4-4h3m-4-4 4 4-4 4',
  repeat: 'M4 8h14l-4-4m4 12H4l4 4M3 8v5m18-2v5M12 9v6',
  close: 'm6 6 12 12M6 18 18 6',
} as const;

export function Icon({ name, filled = false }: { name: keyof typeof paths; filled?: boolean }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
