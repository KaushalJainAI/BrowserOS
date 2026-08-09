/**
 * The BrowserOS window manager and shell state.
 *
 * Also the host for the agent kernel: every capability exposed to Buddy in
 * `os/actions.ts` is backed by a method here, so a user clicking a button and
 * the agent invoking an action travel the exact same code path.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AgentActionRecord, AppId, ClipboardEntry, NotificationType,
  OSNotificationItem, OSTheme, OSWindow, Rect, SnapZone,
} from '../types/os';
import { APPS } from '../os/apps';
import {
  OSActionsContext, OSAgentContext, OSNotifyContext, OSShellContext, OSWindowsContext,
  type ContextMenuOption, type ContextMenuState, type OSActions, type OSAgentState,
  type OSNotifyState, type OSShellState, type OSWindowsState, type OverlayId, type OpenOptions,
} from './osState';
import { dispatchAction, type ActionKernel } from '../os/actions';
import { applyTheme, DEFAULT_THEME, resolveWallpaper } from '../os/theme';
import { cascadeRect, clampRect, effectiveRect, workArea, type Viewport } from '../os/geometry';
import { loadPersisted, clearWorkspace, usePersistedSnapshot } from '../os/persistence';
import { vfs } from '../os/vfs';

const BUDDY_MIN_WIDTH = 300;
const BUDDY_MAX_WIDTH = 720;

function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setViewport({ width: window.innerWidth, height: window.innerHeight }),
      );
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return viewport;
}

export function OSProvider({ children }: { children: ReactNode }) {
  const viewport = useViewport();

  // ── Persisted shell state ────────────────────────────────────────────────
  // Plain `useState` seeded from storage; the matching writes are declared once
  // in the `usePersistedSnapshot` call below rather than as one effect per field.
  const [windows, setWindows] = useState<OSWindow[]>(() => loadPersisted('windows', []));
  const [activeWindowId, setActiveWindowId] = useState<string | null>(
    () => loadPersisted('activeWindow', null),
  );
  const [pinnedApps, setPinnedApps] = useState<AppId[]>(
    () => loadPersisted('pinnedApps', ['explorer', 'terminal', 'word-editor', 'sheets-editor', 'settings']),
  );
  const [desktopApps, setDesktopApps] = useState<AppId[]>(
    () => loadPersisted('desktopApps', ['explorer', 'terminal', 'word-editor', 'calculator', 'analyst', 'image-editor']),
  );
  const [theme, setThemeState] = useState<OSTheme>(() => loadPersisted('theme', DEFAULT_THEME));
  const [clipboard, setClipboard] = useState<ClipboardEntry[]>(() => loadPersisted('clipboard', []));
  const [notifications, setNotifications] = useState<OSNotificationItem[]>(
    () => loadPersisted('notifications', []),
  );
  const [buddyWidth, setBuddyWidthState] = useState<number>(() => loadPersisted('buddyWidth', 380));
  const [isBuddyOpen, setBuddyOpen] = useState<boolean>(() => loadPersisted('buddyOpen', false));
  const [screenContextEnabled, setScreenContextEnabled] = useState<boolean>(
    () => loadPersisted('screenContext', true),
  );
  const [autoApproveActions, setAutoApproveActions] = useState<boolean>(
    () => loadPersisted('autoApprove', true),
  );

  // ── Ephemeral state ──────────────────────────────────────────────────────
  const [overlay, setOverlayState] = useState<OverlayId>(null);
  const [searchSeed, setSearchSeed] = useState('');
  const [snapPreview, setSnapPreview] = useState<SnapZone | null>(null);
  const [toasts, setToasts] = useState<OSNotificationItem[]>([]);
  const [agentLog, setAgentLog] = useState<AgentActionRecord[]>([]);
  const [isAgentConnected, setAgentConnected] = useState(false);
  const [isEngineConnected, setEngineConnected] = useState(true);
  const [isAutoExecuteActive, setAutoExecuteActive] = useState(false);
  const [isSandboxActive, setSandboxActive] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, options: [] });

  const zCounter = useRef(
    Math.max(100, ...loadPersisted<OSWindow[]>('windows', []).map((entry) => entry.zIndex)),
  );

  // One declaration of what survives a reload, replacing eleven near-identical
  // save effects. Writes are debounced and only touch keys that actually changed.
  usePersistedSnapshot({
    windows,
    activeWindow: activeWindowId,
    pinnedApps,
    desktopApps,
    theme,
    clipboard,
    notifications,
    buddyWidth,
    buddyOpen: isBuddyOpen,
    screenContext: screenContextEnabled,
    autoApprove: autoApproveActions,
  });

  // Theme is the one persisted field with a side effect beyond storage.
  useEffect(() => { applyTheme(theme); }, [theme]);

  // The Buddy panel insets the workspace so tiled windows never sit under it.
  const rightInset = isBuddyOpen ? buddyWidth : 0;
  const workAreaRect = useMemo(() => workArea(viewport, rightInset), [viewport, rightInset]);

  /**
   * On-screen geometry, derived rather than stored.
   *
   * `windows[].rect` in state is always the *floating* box — what a window
   * returns to when un-tiled — so maximized and snapped windows re-flow for
   * free when the viewport resizes or the Buddy panel opens, and a window
   * dragged off the edge is clamped back without a write. Publishing this
   * instead of reconciling in an effect also means no render ever shows stale
   * geometry, and persistence keeps storing the floating box it should.
   */
  const laidOutWindows = useMemo(
    () => windows.map((entry) => ({
      ...entry,
      rect: effectiveRect(entry, workAreaRect, APPS[entry.appId].minSize),
    })),
    [windows, workAreaRect],
  );

  // ── Window operations ────────────────────────────────────────────────────

  const focusWindow = useCallback((id: string) => {
    zCounter.current += 1;
    const nextZ = zCounter.current;
    setWindows((prev) => prev.map((entry) => (
      entry.id === id ? { ...entry, zIndex: nextZ, isMinimized: false } : entry
    )));
    setActiveWindowId(id);
  }, []);

  const openApp = useCallback((appId: AppId, options: OpenOptions = {}): string => {
    const meta = APPS[appId];
    let openedId = '';

    setWindows((prev) => {
      if (!options.forceNew) {
        // A multi-instance app asked to show a document it already has open
        // should surface that window rather than duplicating it.
        if (meta.multiInstance && typeof options.state?.path === 'string') {
          const sameDoc = prev.find((entry) => (
            entry.appId === appId && entry.state.path === options.state?.path
          ));
          if (sameDoc) {
            openedId = sameDoc.id;
            zCounter.current += 1;
            const nextZ = zCounter.current;
            return prev.map((entry) => (
              entry.id === sameDoc.id ? { ...entry, isMinimized: false, zIndex: nextZ } : entry
            ));
          }
        }
        // Single-instance apps always reuse their window, re-seeding state so
        // "open X in Settings" lands on the right pane.
        if (!meta.multiInstance) {
          const existing = prev.find((entry) => entry.appId === appId);
          if (existing) {
            openedId = existing.id;
            zCounter.current += 1;
            const nextZ = zCounter.current;
            return prev.map((entry) => (
              entry.id === existing.id
                ? {
                    ...entry,
                    isMinimized: false,
                    zIndex: nextZ,
                    state: options.state ? { ...entry.state, ...options.state } : entry.state,
                  }
                : entry
            ));
          }
        }
        // Multi-instance app with no document specified: reuse the front one.
        if (meta.multiInstance && !options.state) {
          const existing = [...prev]
            .filter((entry) => entry.appId === appId)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
          if (existing) {
            openedId = existing.id;
            zCounter.current += 1;
            const nextZ = zCounter.current;
            return prev.map((entry) => (
              entry.id === existing.id ? { ...entry, isMinimized: false, zIndex: nextZ } : entry
            ));
          }
        }
      }

      zCounter.current += 1;
      openedId = `win_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const created: OSWindow = {
        id: openedId,
        appId,
        title: meta.title,
        isMinimized: false,
        isMaximized: false,
        zIndex: zCounter.current,
        rect: cascadeRect(meta.defaultSize, workAreaRect, prev.length, meta.minSize),
        snap: null,
        state: options.state ?? {},
      };
      return [...prev, created];
    });

    setActiveWindowId(openedId);
    return openedId;
  }, [workAreaRect]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      setActiveWindowId((current) => {
        if (current !== id) return current;
        // Focus falls to the topmost remaining window, matching what a user
        // expects after closing the front one.
        const candidates = next.filter((entry) => !entry.isMinimized);
        if (!candidates.length) return null;
        return candidates.reduce((top, entry) => (entry.zIndex > top.zIndex ? entry : top)).id;
      });
      return next;
    });
  }, []);

  const closeAllWindows = useCallback(() => {
    let count = 0;
    setWindows((prev) => {
      count = prev.length;
      return [];
    });
    setActiveWindowId(null);
    return count;
  }, []);

  const toggleMinimize = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWindows((prev) => prev.map((entry) => (
      entry.id === id ? { ...entry, isMinimized: !entry.isMinimized } : entry
    )));
    setActiveWindowId((current) => (current === id ? null : current));
  }, []);

  const toggleMaximize = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWindows((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;
      // `rect` keeps holding the floating geometry while maximized, so
      // restoring is exact rather than a guess.
      return { ...entry, isMaximized: !entry.isMaximized, snap: null };
    }));
    focusWindow(id);
  }, [focusWindow]);

  const setWindowRect = useCallback((id: string, patch: Partial<Rect>) => {
    setWindows((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;
      const merged = { ...entry.rect, ...patch };
      return {
        ...entry,
        rect: clampRect(merged, workAreaRect, APPS[entry.appId].minSize),
        // Any manual geometry change breaks the tiling relationship.
        isMaximized: false,
        snap: null,
      };
    }));
  }, [workAreaRect]);

  const snapWindow = useCallback((id: string, zone: SnapZone | null) => {
    setWindows((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;
      if (zone === null) return { ...entry, snap: null, isMaximized: false };
      if (zone === 'maximized') return { ...entry, snap: null, isMaximized: true };
      // No geometry write: the tiled box is derived from `snap`, so the window
      // keeps its floating rect to restore to.
      return { ...entry, snap: zone, isMaximized: false };
    }));
    focusWindow(id);
  }, [focusWindow]);

  const setWindowState = useCallback((id: string, patch: Record<string, unknown>) => {
    setWindows((prev) => prev.map((entry) => (
      entry.id === id ? { ...entry, state: { ...entry.state, ...patch } } : entry
    )));
  }, []);

  const setWindowTitle = useCallback((id: string, title: string) => {
    setWindows((prev) => prev.map((entry) => (
      entry.id === id && entry.title !== title ? { ...entry, title } : entry
    )));
  }, []);

  /** Lay every visible window out in the tightest grid that fits them. */
  const tileWindows = useCallback(() => {
    let count = 0;
    setWindows((prev) => {
      const visible = prev.filter((entry) => !entry.isMinimized);
      count = visible.length;
      if (!count) return prev;
      const columns = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);
      const cellWidth = Math.floor(workAreaRect.width / columns);
      const cellHeight = Math.floor(workAreaRect.height / rows);
      const order = new Map(visible.map((entry, index) => [entry.id, index]));

      return prev.map((entry) => {
        const index = order.get(entry.id);
        if (index === undefined) return entry;
        const column = index % columns;
        const row = Math.floor(index / columns);
        return {
          ...entry,
          isMaximized: false,
          snap: null,
          rect: {
            x: workAreaRect.x + column * cellWidth,
            y: workAreaRect.y + row * cellHeight,
            width: cellWidth,
            height: cellHeight,
          },
        };
      });
    });
    return count;
  }, [workAreaRect]);

  const minimizeAll = useCallback(() => {
    setWindows((prev) => prev.map((entry) => ({ ...entry, isMinimized: true })));
    setActiveWindowId(null);
  }, []);

  /** Alt+Tab ordering: most recently focused first. */
  const nextWindow = useCallback((backwards = false) => {
    setWindows((prev) => {
      const ordered = [...prev].sort((a, b) => b.zIndex - a.zIndex);
      if (ordered.length < 2) return prev;
      const currentIndex = ordered.findIndex((entry) => entry.id === activeWindowId);
      const step = backwards ? -1 : 1;
      const nextIndex = (currentIndex + step + ordered.length) % ordered.length;
      const target = ordered[nextIndex];
      zCounter.current += 1;
      const nextZ = zCounter.current;
      setActiveWindowId(target.id);
      return prev.map((entry) => (
        entry.id === target.id ? { ...entry, zIndex: nextZ, isMinimized: false } : entry
      ));
    });
  }, [activeWindowId]);

  // ── Overlays ─────────────────────────────────────────────────────────────

  const setOverlay = useCallback((id: OverlayId) => {
    setOverlayState((current) => (current === id ? null : id));
    if (id !== 'search') setSearchSeed('');
  }, []);

  const toggleBuddy = useCallback((state?: boolean) => {
    setBuddyOpen((current) => (state === undefined ? !current : state));
  }, []);

  const setBuddyWidth = useCallback((width: number) => {
    setBuddyWidthState(Math.max(BUDDY_MIN_WIDTH, Math.min(BUDDY_MAX_WIDTH, Math.round(width))));
  }, []);

  // ── Shell surfaces ───────────────────────────────────────────────────────

  const pinApp = useCallback((appId: AppId) => {
    setPinnedApps((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
  }, []);
  const unpinApp = useCallback((appId: AppId) => {
    setPinnedApps((prev) => prev.filter((id) => id !== appId));
  }, []);
  const addToDesktop = useCallback((appId: AppId) => {
    setDesktopApps((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
  }, []);
  const removeFromDesktop = useCallback((appId: AppId) => {
    setDesktopApps((prev) => prev.filter((id) => id !== appId));
  }, []);
  const sortDesktop = useCallback((criteria: 'name' | 'category') => {
    setDesktopApps((prev) => [...prev].sort((a, b) => (
      criteria === 'name'
        ? APPS[a].title.localeCompare(APPS[b].title)
        : APPS[a].category.localeCompare(APPS[b].category) || APPS[a].title.localeCompare(APPS[b].title)
    )));
  }, []);

  const setTheme = useCallback((patch: Partial<OSTheme>) => {
    setThemeState((prev) => ({
      ...prev,
      ...patch,
      ...(patch.wallpaper ? { wallpaper: resolveWallpaper(patch.wallpaper) } : {}),
    }));
  }, []);

  // ── Notifications ────────────────────────────────────────────────────────

  const notify = useCallback((input: {
    title?: string; message: string; type?: NotificationType; source?: 'system' | 'buddy';
  }) => {
    const item: OSNotificationItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: input.title ?? 'BrowserOS',
      message: input.message,
      type: input.type ?? 'info',
      createdAt: Date.now(),
      isRead: false,
      source: input.source ?? 'system',
    };
    setNotifications((prev) => [item, ...prev].slice(0, 50));
    setToasts((prev) => [...prev, item].slice(-4));
    // Toasts auto-retire; the entry stays in the notification centre.
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== item.id));
    }, 5200);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((entry) => entry.id !== id));
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((entry) => ({ ...entry, isRead: true })));
  }, []);
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setToasts([]);
  }, []);
  const unreadCount = useMemo(
    () => notifications.filter((entry) => !entry.isRead).length,
    [notifications],
  );

  // ── Clipboard ────────────────────────────────────────────────────────────

  const addToClipboard = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setClipboard((prev) => [
      { id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: trimmed, copiedAt: Date.now() },
      ...prev.filter((entry) => entry.text !== trimmed),
    ].slice(0, 100));
  }, []);
  const removeClipboardEntry = useCallback((id: string) => {
    setClipboard((prev) => prev.filter((entry) => entry.id !== id));
  }, []);
  const clearClipboard = useCallback(() => setClipboard([]), []);

  // ── Context menu ─────────────────────────────────────────────────────────

  const showContextMenu = useCallback((e: React.MouseEvent | MouseEvent, options: ContextMenuOption[]) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, options });
  }, []);
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  // ── Agent kernel ─────────────────────────────────────────────────────────
  // Window lookups read through a ref so the kernel identity stays stable and
  // long-lived socket handlers never close over a stale window list.

  const windowsRef = useRef(windows);
  useEffect(() => { windowsRef.current = windows; }, [windows]);
  const clipboardRef = useRef(clipboard);
  useEffect(() => { clipboardRef.current = clipboard; }, [clipboard]);

  const findByApp = useCallback((appId: AppId): OSWindow | undefined => (
    [...windowsRef.current]
      .filter((entry) => entry.appId === appId)
      .sort((a, b) => b.zIndex - a.zIndex)[0]
  ), []);

  const kernel = useMemo<ActionKernel>(() => ({
    openApp: (appId, options) => openApp(appId, options),
    focusApp: (appId) => {
      const target = findByApp(appId);
      if (!target) return null;
      focusWindow(target.id);
      return target.id;
    },
    focusWindow,
    closeApp: (appId) => {
      const targets = windowsRef.current.filter((entry) => entry.appId === appId);
      if (!targets.length) return false;
      targets.forEach((entry) => closeWindow(entry.id));
      return true;
    },
    closeAllWindows,
    minimizeApp: (appId) => {
      const target = findByApp(appId);
      if (!target) return false;
      setWindows((prev) => prev.map((entry) => (
        entry.id === target.id ? { ...entry, isMinimized: true } : entry
      )));
      setActiveWindowId((current) => (current === target.id ? null : current));
      return true;
    },
    maximizeApp: (appId) => {
      const target = findByApp(appId);
      if (!target) return false;
      setWindows((prev) => prev.map((entry) => (
        entry.id === target.id
          ? { ...entry, isMaximized: true, isMinimized: false, snap: null }
          : entry
      )));
      focusWindow(target.id);
      return true;
    },
    restoreApp: (appId) => {
      const target = findByApp(appId);
      if (!target) return false;
      setWindows((prev) => prev.map((entry) => (
        entry.id === target.id
          ? { ...entry, isMaximized: false, isMinimized: false, snap: null }
          : entry
      )));
      focusWindow(target.id);
      return true;
    },
    snapApp: (appId, zone) => {
      const target = findByApp(appId);
      if (!target) return false;
      snapWindow(target.id, zone);
      return true;
    },
    setWindowRect: (appId, rect) => {
      const target = findByApp(appId);
      if (!target) return false;
      setWindowRect(target.id, rect);
      return true;
    },
    tileWindows,
    pinApp,
    unpinApp,
    addToDesktop,
    removeFromDesktop,
    setWallpaper: (value) => setTheme({ wallpaper: value }),
    setThemeMode: (mode) => setTheme({ mode }),
    setAccent: (value) => setTheme({ accent: value }),
    notify,
    setAppState: (appId, state) => {
      const target = findByApp(appId);
      if (!target) return false;
      setWindowState(target.id, state);
      return true;
    },
    writeClipboard: (text) => {
      addToClipboard(text);
      navigator.clipboard?.writeText(text).catch(() => {
        // Clipboard permission denied — history still has the entry.
      });
    },
    readClipboard: () => clipboardRef.current[0]?.text ?? null,
    openSearch: (query) => {
      setSearchSeed(query ?? '');
      setOverlayState('search');
    },
  }), [
    openApp, focusWindow, closeWindow, closeAllWindows, findByApp, snapWindow,
    setWindowRect, tileWindows, pinApp, unpinApp, addToDesktop, removeFromDesktop,
    setTheme, notify, setWindowState, addToClipboard,
  ]);

  const runAgentAction = useCallback((
    action: string,
    parameters: Record<string, unknown>,
    origin: AgentActionRecord['origin'] = 'socket',
  ) => {
    const record = dispatchAction(action, parameters, kernel, origin);
    setAgentLog((prev) => [record, ...prev].slice(0, 100));
    if (record.status === 'error') {
      notify({ title: 'Buddy action failed', message: record.message, type: 'error', source: 'buddy' });
    }
    return record;
  }, [kernel, notify]);

  const applyBuddyAction = useCallback((action: string, parameters: Record<string, unknown>) => {
    runAgentAction(action, parameters, 'http');
  }, [runAgentAction]);

  const resetWorkspace = useCallback(() => {
    clearWorkspace();
    vfs.reset();
    window.location.reload();
  }, []);

  // ── Global copy capture ──────────────────────────────────────────────────
  useEffect(() => {
    const onCopy = () => {
      const selection = window.getSelection()?.toString();
      if (selection) addToClipboard(selection);
    };
    window.addEventListener('copy', onCopy);
    return () => window.removeEventListener('copy', onCopy);
  }, [addToClipboard]);

  const toggleEngine = useCallback((state?: boolean) => {
    setEngineConnected((current) => state ?? !current);
  }, []);
  const toggleAutoExecute = useCallback((state?: boolean) => {
    setAutoExecuteActive((current) => state ?? !current);
  }, []);
  const toggleSandbox = useCallback((state?: boolean) => {
    setSandboxActive((current) => state ?? !current);
  }, []);

  // Stable for the provider's lifetime: every member is a `useCallback` with no
  // reactive dependencies, so consumers of actions alone never re-render.
  const actions = useMemo<OSActions>(() => ({
    openApp, closeWindow, focusWindow, toggleMinimize, toggleMaximize, setWindowRect,
    snapWindow, setWindowState, setWindowTitle, tileWindows, closeAllWindows, minimizeAll,
    nextWindow, setSnapPreview,
    setOverlay, toggleBuddy, setBuddyWidth, pinApp, unpinApp, addToDesktop, removeFromDesktop,
    sortDesktop, setTheme, showContextMenu, closeContextMenu, resetWorkspace,
    notify, dismissNotification, dismissToast, markAllRead, clearNotifications,
    addToClipboard, removeClipboardEntry, clearClipboard,
    runAgentAction, applyBuddyAction, setAgentConnected, setScreenContextEnabled,
    setAutoApproveActions,
    toggleEngine, toggleAutoExecute, toggleSandbox,
  }), [
    openApp, closeWindow, focusWindow, toggleMinimize, toggleMaximize, setWindowRect,
    snapWindow, setWindowState, setWindowTitle, tileWindows, closeAllWindows, minimizeAll,
    nextWindow, setSnapPreview, setOverlay, toggleBuddy, setBuddyWidth, pinApp, unpinApp,
    addToDesktop, removeFromDesktop, sortDesktop, setTheme, showContextMenu, closeContextMenu,
    resetWorkspace, notify, dismissNotification, dismissToast, markAllRead, clearNotifications,
    addToClipboard, removeClipboardEntry, clearClipboard, runAgentAction, applyBuddyAction,
    setAgentConnected, setScreenContextEnabled, setAutoApproveActions, toggleEngine,
    toggleAutoExecute, toggleSandbox,
  ]);

  const windowsState = useMemo<OSWindowsState>(
    () => ({ windows: laidOutWindows, activeWindowId, workAreaRect, snapPreview }),
    [laidOutWindows, activeWindowId, workAreaRect, snapPreview],
  );

  const shellState = useMemo<OSShellState>(() => ({
    overlay, searchSeed, isBuddyOpen, buddyWidth, pinnedApps, desktopApps, theme, contextMenu,
    isEngineConnected, isAutoExecuteActive, isSandboxActive,
  }), [
    overlay, searchSeed, isBuddyOpen, buddyWidth, pinnedApps, desktopApps, theme, contextMenu,
    isEngineConnected, isAutoExecuteActive, isSandboxActive,
  ]);

  const notifyState = useMemo<OSNotifyState>(
    () => ({ notifications, toasts, unreadCount, clipboard }),
    [notifications, toasts, unreadCount, clipboard],
  );

  const agentState = useMemo<OSAgentState>(
    () => ({ agentLog, isAgentConnected, screenContextEnabled, autoApproveActions }),
    [agentLog, isAgentConnected, screenContextEnabled, autoApproveActions],
  );

  return (
    <OSActionsContext.Provider value={actions}>
      <OSWindowsContext.Provider value={windowsState}>
        <OSShellContext.Provider value={shellState}>
          <OSNotifyContext.Provider value={notifyState}>
            <OSAgentContext.Provider value={agentState}>
              {children}
            </OSAgentContext.Provider>
          </OSNotifyContext.Provider>
        </OSShellContext.Provider>
      </OSWindowsContext.Provider>
    </OSActionsContext.Provider>
  );
}

