/**
 * The Buddy agent channel.
 *
 * The socket is an *action* channel, not a sync stream: the backend pushes
 * `trigger_action` frames from the `buddy_{user_id}` group, and this hook hands
 * every one of them to the action registry. Context flows the other way, in the
 * body of the command request — not on this socket — so the desktop never
 * streams its DOM upward on a timer.
 *
 * Two defects this replaces:
 *   1. The old `executeAction` understood only `frontend_click` /
 *      `frontend_fill` / `frontend_navigate`. Every `os_*` action the backend
 *      emitted (open app, close, minimize, wallpaper, notify — all implemented
 *      server-side in `buddy/views.py`) was parsed and then discarded, so the
 *      agent could not actually drive the OS.
 *   2. A `MutationObserver` on `document.body` re-sent the whole interactable
 *      list on any DOM change. With a ticking clock in the top bar, that is a
 *      permanent 1 Hz upload of the entire UI.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOSActions, useOSNotifications, useOSShell, useOSWindows } from '../contexts/osState';
import { buildSnapshot, type OSSnapshot } from '../os/snapshot';
import { getAccessToken } from '../api/auth';

/** Exponential backoff with jitter, capped, so a downed backend is not hammered. */
function reconnectDelay(attempt: number): number {
  const base = Math.min(30_000, 1_000 * 2 ** attempt);
  return base * (0.7 + Math.random() * 0.6);
}

function buildSocketUrl(token: string): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) {
    return `${configured.replace(/\/$/, '')}/ws/buddy/?token=${encodeURIComponent(token)}`;
  }

  // Derive from the API base so a frontend deployed on a different origin than
  // the backend still reaches the right host.
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws/buddy/?token=${encodeURIComponent(token)}`;
    } catch {
      // Malformed env value — fall through to origin inference.
    }
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isDevServer = window.location.port === '5173' || window.location.port === '3000';
  const host = isDevServer ? `${window.location.hostname}:8000` : window.location.host;
  return `${protocol}//${host}/ws/buddy/?token=${encodeURIComponent(token)}`;
}

export interface BuddyChannel {
  isConnected: boolean;
  /** Name of the action currently executing, for the "Buddy is …" indicator. */
  activeAction: string | null;
  /** Builds the semantic OS snapshot to send with the next command. */
  captureContext: () => OSSnapshot;
}

export function useBuddy(enabled: boolean = true): BuddyChannel {
  const { runAgentAction, setAgentConnected } = useOSActions();
  const { windows, activeWindowId } = useOSWindows();
  const { theme, pinnedApps, desktopApps } = useOSShell();
  const { clipboard } = useOSNotifications();

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isConnected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Snapshot inputs go through a ref so `captureContext` stays referentially
  // stable and the socket effect never tears down on a window move.
  const snapshotInput = useRef({ windows, activeWindowId, theme, pinnedApps, desktopApps, clipboard });
  useEffect(() => {
    snapshotInput.current = { windows, activeWindowId, theme, pinnedApps, desktopApps, clipboard };
  }, [windows, activeWindowId, theme, pinnedApps, desktopApps, clipboard]);

  const runActionRef = useRef(runAgentAction);
  useEffect(() => { runActionRef.current = runAgentAction; }, [runAgentAction]);

  const captureContext = useCallback(() => buildSnapshot(snapshotInput.current), [snapshotInput]);

  useEffect(() => {
    // Nothing to clear on these paths: `connected` starts false, and when
    // `enabled` flips off it is the *previous* run's cleanup that resets the
    // flags. Setting state synchronously in an effect body would just queue a
    // second render for a value that is already correct.
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) {
      // Without a token the consumer closes us immediately; don't spin on it.
      console.info('[Buddy] No auth token — agent channel idle.');
      return;
    }

    let disposed = false;
    let attempt = 0;
    let retryHandle: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(buildSocketUrl(token));
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setConnected(true);
        setAgentConnected(true);
      };

      socket.onmessage = (event) => {
        let frame: { type?: string; action?: string; parameters?: Record<string, unknown> };
        try {
          frame = JSON.parse(event.data);
        } catch {
          console.warn('[Buddy] Dropped unparseable frame.');
          return;
        }
        if (frame.type !== 'trigger_action' || !frame.action) return;

        // Every action — os_*, fs_*, app_*, frontend_*, browser_* — resolves
        // through the one registry, so a socket-delivered action behaves
        // identically to one returned inline by the command endpoint.
        const name = frame.action;
        setActiveAction(name);
        runActionRef.current(name, frame.parameters ?? {}, 'socket');
        window.setTimeout(() => {
          setActiveAction((current) => (current === name ? null : current));
        }, 1600);
      };

      socket.onclose = () => {
        // Guard against a stale socket's close event clobbering the state of a
        // newer one that has already replaced it.
        if (disposed || socketRef.current !== socket) return;
        setConnected(false);
        setAgentConnected(false);
        const delay = reconnectDelay(attempt);
        attempt += 1;
        retryHandle = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        // `onclose` always follows an error; reconnection is handled there.
        socket.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retryHandle);
      const current = socketRef.current;
      socketRef.current = null;
      if (current && current.readyState <= WebSocket.OPEN) current.close(1000, 'unmounted');
      setConnected(false);
      setAgentConnected(false);
    };
  }, [enabled, setAgentConnected, runActionRef]);

  return { isConnected, activeAction, captureContext };
}
