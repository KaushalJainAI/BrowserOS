/** Time formatting shared by notifications, the clipboard, files and Buddy. */

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 1000],
  ['minute', 60_000],
  ['hour', 3_600_000],
  ['day', 86_400_000],
  ['week', 604_800_000],
];

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/**
 * "just now" / "3 min ago" / "2 days ago". Timestamps are stored as epoch ms
 * and formatted at render, so a notification left open overnight is not still
 * claiming it arrived "2m ago".
 */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const delta = timestamp - now;
  const magnitude = Math.abs(delta);
  if (magnitude < 45_000) return 'just now';

  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let divisor = 1000;
  for (const [candidate, size] of UNITS) {
    if (magnitude >= size) {
      unit = candidate;
      divisor = size;
    }
  }
  if (magnitude >= 2_592_000_000) return new Date(timestamp).toLocaleDateString();

  return relative.format(Math.round(delta / divisor), unit);
}

export function formatClock(date: Date, seconds = false): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' as const } : {}),
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** `1:04.35` for stopwatch readouts. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, ms);
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const secs = Math.floor((total % 60_000) / 1000);
  const hundredths = Math.floor((total % 1000) / 10);
  const core = `${minutes}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : core;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
