/**
 * WebSocket URL resolution, shared by every BrowserOS socket.
 *
 * Extracted from `useBuddy` when the HITL reminder channel became the second
 * consumer: the VITE_WS_URL → VITE_API_BASE_URL → origin fallback chain is the
 * part that breaks in deployment, and it should only exist once.
 */

/** Exponential backoff with jitter, capped, so a downed backend is not hammered. */
export function reconnectDelay(attempt: number): number {
  const base = Math.min(30_000, 1_000 * 2 ** attempt);
  return base * (0.7 + Math.random() * 0.6);
}

/**
 * Absolute ws:// URL for a backend socket path.
 *
 * @param path Consumer path including slashes, e.g. `/ws/hitl/`.
 * @param token JWT; the consumers authenticate from the query string.
 */
export function buildSocketUrl(path: string, token: string): string {
  const suffix = `${path}?token=${encodeURIComponent(token)}`;

  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) {
    return `${configured.replace(/\/$/, '')}${suffix}`;
  }

  // Derive from the API base so a frontend deployed on a different origin than
  // the backend still reaches the right host.
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}${suffix}`;
    } catch {
      // Malformed env value — fall through to origin inference.
    }
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isDevServer = window.location.port === '5173' || window.location.port === '3000';
  const host = isDevServer ? `${window.location.hostname}:8000` : window.location.host;
  return `${protocol}//${host}${suffix}`;
}
