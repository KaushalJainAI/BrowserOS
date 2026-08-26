/**
 * HITL reminder channel for the desktop shell.
 *
 * Listens on the same per-user `ws/hitl/` group the web frontend uses, and
 * turns each nudge into a BrowserOS notification. The backend owns all the
 * timing (escalation at +0/+1h/+1d, optional hourly, daily digest — see
 * `notifications/reminders.py`); this only renders what arrives.
 *
 * Like the Buddy socket this is a push channel, never a sync stream: nothing
 * is uploaded from here.
 */

import { useEffect, useRef, useState } from 'react';
import { useOSActions } from '../contexts/osState';
import { getAccessToken } from '../api/auth';
import { buildSocketUrl, reconnectDelay } from '../lib/socketUrl';
import type { NotificationType } from '../types/os';

interface ReminderPayload {
  kind?: 'hitl_request' | 'hitl_reminder' | 'hitl_digest';
  title?: string;
  body?: string;
  request_id?: string;
  stage?: number;
  pending_count?: number;
}

/** Later rungs read as more urgent; the digest is a neutral roll-up. */
function severityFor(payload: ReminderPayload): NotificationType {
  if (payload.kind === 'hitl_digest') return 'info';
  return (payload.stage ?? 0) >= 2 ? 'error' : 'warning';
}

export function useHITLReminders(enabled: boolean = true): { isConnected: boolean } {
  const { notify } = useOSActions();
  const [isConnected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // `notify` is stable (OSActionsContext never changes identity) but reading it
  // through a ref keeps this effect off the dependency treadmill regardless.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) {
      console.info('[HITL] No auth token — reminder channel idle.');
      return;
    }

    let disposed = false;
    let attempt = 0;
    let retryHandle: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(buildSocketUrl('/ws/hitl/', token));
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        let frame: { type?: string; data?: ReminderPayload };
        try {
          frame = JSON.parse(event.data);
        } catch {
          console.warn('[HITL] Dropped unparseable frame.');
          return;
        }
        // `reminder` is the nudge channel. `new_request` also arrives here for
        // in-app state, but the backend already sends a stage-0 reminder for
        // every new request, so surfacing both would double every alert.
        if (frame.type !== 'reminder' || !frame.data) return;

        const payload = frame.data;
        notifyRef.current({
          title: payload.title || 'An agent needs you',
          message: payload.body || 'Open your Inbox to respond.',
          type: severityFor(payload),
          source: 'system',
        });
      };

      socket.onclose = () => {
        // Guard against a stale socket's close event clobbering the state of a
        // newer one that has already replaced it.
        if (disposed || socketRef.current !== socket) return;
        setConnected(false);
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
    };
  }, [enabled]);

  return { isConnected };
}

export default useHITLReminders;
