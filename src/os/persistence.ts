/**
 * Persisted workspace state.
 *
 * The backend already models this (`OSWorkspace` / `OSAppWindow` carry position,
 * size, z-index and per-app `state_data`). Until the frontend is authenticated
 * against it, localStorage is the source of truth and uses the same shape, so
 * syncing later is a transport swap rather than a rewrite.
 */

import { useEffect, useRef } from 'react';

const PREFIX = 'browseros.';

export function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function savePersisted<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode) — degrade to in-memory state.
  }
}

/**
 * Declares which values survive a reload, as one map instead of one effect per
 * field.
 *
 * Writes are debounced and diffed: dragging a window or typing in an app commits
 * a single `windows` write after the burst settles, and untouched keys are never
 * rewritten. Callers keep plain `useState`, so setters stay referentially stable
 * for the surrounding memoization.
 */
export function usePersistedSnapshot(entries: Record<string, unknown>): void {
  const previous = useRef<Record<string, unknown>>({});

  useEffect(() => {
    const handle = setTimeout(() => {
      for (const [key, value] of Object.entries(entries)) {
        if (previous.current[key] === value) continue;
        previous.current[key] = value;
        savePersisted(key, value);
      }
    }, 200);
    return () => clearTimeout(handle);
    // Compared by identity per key inside the effect; listing the map itself is
    // what schedules the check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(entries)]);
}

export function clearWorkspace() {
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith(PREFIX)) window.localStorage.removeItem(key);
  }
}
