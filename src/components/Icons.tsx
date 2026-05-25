// Inline-SVG icon set matching the reference design language.
// All icons are 24x24 viewBox, currentColor stroke.

type IconName =
  | 'cash' | 'trend' | 'wrench' | 'receipt' | 'map' | 'target'
  | 'up' | 'down' | 'download' | 'search' | 'bell' | 'settings'
  | 'calendar' | 'filter' | 'check' | 'x' | 'star';

const PATHS: Record<IconName, string> = {
  cash:     'M2 6h20v12H2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM5 9v.01M19 14.99V15',
  trend:    'M3 17l6-6 4 4 8-8M14 7h7v7',
  wrench:   'M14.7 6.3a4 4 0 0 1 .8 4.5l5.2 5.2a2 2 0 1 1-2.8 2.8l-5.2-5.2a4 4 0 0 1-5.3-4.7l2.5 2.5 3.5-3.5-2.5-2.5a4 4 0 0 1 3.8 0z',
  receipt:  'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3zM8 8h8M8 12h8M8 16h5',
  map:      'M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  target:   'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  up:       'M5 15l7-7 7 7',
  down:     'M5 9l7 7 7-7',
  download: 'M12 3v14M5 12l7 7 7-7M5 21h14',
  search:   'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  bell:     'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9zM10.3 21a1.94 1.94 0 0 0 3.4 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  filter:   'M3 5h18l-7 9v6l-4-2v-4z',
  check:    'M5 12l5 5L20 7',
  x:        'M6 6l12 12M18 6L6 18',
  star:     'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z',
};

export function Icon({
  name, size = 16, stroke = 1.6, className,
}: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export type { IconName };
