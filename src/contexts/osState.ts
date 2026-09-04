/**
 * OS state contract: context objects, published slices, and the hooks that read
 * them.
 *
 * Split out from `OSContext.tsx` so the provider file exports only a component.
 * That is what the `react-refresh` rule asks for, and it matters in practice:
 * with contexts and hooks in the same module as the provider, every edit here
 * forced a full page reload and threw away the open workspace.
 */

import { createContext, useCallback, useContext, useMemo } from 'react';
import React from 'react';
import type {
  AgentActionRecord, AppId, ClipboardEntry, NotificationType,
  OSNotificationItem, OSTheme, OSWindow, Rect, SnapZone,
} from '../types/os';
import { APPS } from '../os/apps';

export { APPS };

export interface ContextMenuOption {
  label: string;
  icon?: React.FC<{ size: number; className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
  /** Renders a separator above this item. */
  divider?: boolean;
  shortcut?: string;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  options: ContextMenuOption[];
}

/** Which single overlay owns the screen. One field prevents two being open. */
export type OverlayId = 'search' | 'apps' | 'quickSettings' | 'notifications' | 'switcher' | null;

export interface OpenOptions {
  state?: Record<string, unknown>;
  /** Force a second window even for an app that is already running. */
  forceNew?: boolean;
}

/**
 * Published state is split by *how often it changes*, not by feature area.
 *
 * Every method below is referentially stable, so `OSActionsContext` hands out a
 * value that never changes identity. The majority of apps only ever call
 * actions (`notify`, `openApp`), and subscribing to this context alone means
 * they no longer re-render when an unrelated notification arrives or another
 * window moves.
 */
export interface OSActions {
  // Windows
  openApp: (appId: AppId, options?: OpenOptions) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string, e?: React.MouseEvent) => void;
  toggleMaximize: (id: string, e?: React.MouseEvent) => void;
  setWindowRect: (id: string, rect: Partial<Rect>) => void;
  snapWindow: (id: string, zone: SnapZone | null) => void;
  setWindowState: (id: string, patch: Record<string, unknown>) => void;
  setWindowTitle: (id: string, title: string) => void;
  tileWindows: () => number;
  closeAllWindows: () => number;
  minimizeAll: () => void;
  nextWindow: (backwards?: boolean) => void;
  setSnapPreview: (zone: SnapZone | null) => void;

  // Shell
  setOverlay: (id: OverlayId) => void;
  toggleBuddy: (state?: boolean) => void;
  setBuddyWidth: (width: number) => void;
  pinApp: (appId: AppId) => void;
  unpinApp: (appId: AppId) => void;
  addToDesktop: (appId: AppId) => void;
  removeFromDesktop: (appId: AppId) => void;
  sortDesktop: (criteria: 'name' | 'category') => void;
  setTheme: (patch: Partial<OSTheme>) => void;
  showContextMenu: (e: React.MouseEvent | MouseEvent, options: ContextMenuOption[]) => void;
  closeContextMenu: () => void;
  resetWorkspace: () => void;

  // Notifications & clipboard
  notify: (input: { title?: string; message: string; type?: NotificationType; source?: 'system' | 'buddy' }) => void;
  dismissNotification: (id: number) => void;
  dismissToast: (id: number) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  addToClipboard: (text: string) => void;
  removeClipboardEntry: (id: string) => void;
  clearClipboard: () => void;

  // Agent
  runAgentAction: (
    action: string,
    parameters: Record<string, unknown>,
    origin?: AgentActionRecord['origin'],
  ) => AgentActionRecord;
  /** Back-compat alias for the original BuddyPanel call site. */
  applyBuddyAction: (action: string, parameters: Record<string, unknown>) => void;
  setAgentConnected: (state: boolean) => void;
  setScreenContextEnabled: (state: boolean) => void;
  setAutoApproveActions: (state: boolean) => void;

  // System toggles surfaced in Quick Settings
  toggleEngine: (state?: boolean) => void;
  toggleAutoExecute: (state?: boolean) => void;
  toggleSandbox: (state?: boolean) => void;
}

/** Changes on window open/close/move/focus and on viewport resize. */
export interface OSWindowsState {
  windows: OSWindow[];
  activeWindowId: string | null;
  workAreaRect: Rect;
  /** Snap preview driven by the drag gesture in `Window`. */
  snapPreview: SnapZone | null;
}

/** Chrome around the windows: overlays, docks, theme, context menu. */
export interface OSShellState {
  overlay: OverlayId;
  searchSeed: string;
  isBuddyOpen: boolean;
  buddyWidth: number;
  pinnedApps: AppId[];
  desktopApps: AppId[];
  theme: OSTheme;
  contextMenu: ContextMenuState;
  isEngineConnected: boolean;
  isAutoExecuteActive: boolean;
  isSandboxActive: boolean;
}

/** Notification centre, transient toasts, and clipboard history. */
export interface OSNotifyState {
  notifications: OSNotificationItem[];
  toasts: OSNotificationItem[];
  unreadCount: number;
  clipboard: ClipboardEntry[];
}

/** Buddy's connection status and its action audit log. */
export interface OSAgentState {
  agentLog: AgentActionRecord[];
  isAgentConnected: boolean;
  screenContextEnabled: boolean;
  autoApproveActions: boolean;
}

export type OSContextType = OSActions & OSWindowsState & OSShellState & OSNotifyState & OSAgentState;

export const OSActionsContext = createContext<OSActions | undefined>(undefined);
export const OSWindowsContext = createContext<OSWindowsState | undefined>(undefined);
export const OSShellContext = createContext<OSShellState | undefined>(undefined);
export const OSNotifyContext = createContext<OSNotifyState | undefined>(undefined);
export const OSAgentContext = createContext<OSAgentState | undefined>(undefined);

function useOSSlice<T>(context: React.Context<T | undefined>, name: string): T {
  const value = useContext(context);
  if (value === undefined) {
    throw new Error(`${name} must be used within an OSProvider`);
  }
  return value;
}

/** Window-manager commands and every other side-effecting OS call. Never changes identity. */
export const useOSActions = () => useOSSlice(OSActionsContext, 'useOSActions');
/** Open windows, focus, and the current work area. */
export const useOSWindows = () => useOSSlice(OSWindowsContext, 'useOSWindows');
/** Overlays, dock/desktop contents, theme, and system toggles. */
export const useOSShell = () => useOSSlice(OSShellContext, 'useOSShell');
/** Notification centre, toasts, and clipboard history. */
export const useOSNotifications = () => useOSSlice(OSNotifyContext, 'useOSNotifications');
/** Buddy connection status and action log. */
export const useOSAgent = () => useOSSlice(OSAgentContext, 'useOSAgent');

/**
 * Everything at once.
 *
 * Convenient, but it subscribes to all four state slices — prefer the narrow
 * hooks above in anything that renders often.
 */
export function useOS(): OSContextType {
  return {
    ...useOSActions(),
    ...useOSWindows(),
    ...useOSShell(),
    ...useOSNotifications(),
    ...useOSAgent(),
  };
}

/** Identifies which window an app instance is rendered inside. */
export const WindowScope = createContext<string>('');

/**
 * Scoped accessor for the window an app is rendered in. Apps read and persist
 * their own `state_data` through this — the same field Buddy patches via
 * `app_set_state`, so user edits and agent edits converge on one store and
 * survive a reload.
 */
export function useWindowState<T extends Record<string, unknown>>(defaults: T) {
  const { setWindowState, setWindowTitle } = useOSActions();
  const { windows } = useOSWindows();
  const windowId = useContext(WindowScope);
  const owner = windows.find((entry) => entry.id === windowId);

  const state = useMemo(
    () => ({ ...defaults, ...(owner?.state ?? {}) }) as T,
    // `defaults` is a literal at every call site; keying on the stored state is
    // what actually determines the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [owner?.state],
  );

  const setState = useCallback((patch: Partial<T>) => {
    if (windowId) setWindowState(windowId, patch as Record<string, unknown>);
  }, [windowId, setWindowState]);

  const setTitle = useCallback((title: string) => {
    if (windowId) setWindowTitle(windowId, title);
  }, [windowId, setWindowTitle]);

  return { state, setState, setTitle, windowId };
}
