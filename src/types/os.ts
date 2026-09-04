import React from 'react';

export type AppId =
  | 'explorer' | 'settings' | 'clock' | 'terminal'
  | 'chatbot' | 'image-editor' | 'video-editor'
  | 'presentation-editor' | 'word-editor' | 'diagram-editor'
  | 'analyst' | 'svg-maker' | 'sheets-editor'
  | 'drive' | 'frontend-expert' | 'calculator'
  | 'game' | 'simulator' | 'clipboard' | 'screenshot';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Half/quarter tiling slots, mirroring what the snap gesture produces. */
export type SnapZone =
  | 'left' | 'right' | 'top' | 'bottom'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'maximized';

export interface OSWindow {
  id: string;
  appId: AppId;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  /** Floating geometry. Preserved while maximized/snapped so restore is exact. */
  rect: Rect;
  /** Active tiling slot, or null when the window is free-floating. */
  snap: SnapZone | null;
  /**
   * Per-window app state (open file, cursor, tool selection...). Mirrors
   * `OSAppWindow.state_data` on the backend and is what Buddy addresses when
   * it acts on a document rather than on a window.
   */
  state: Record<string, unknown>;
}

export interface AppDefinition {
  id: AppId;
  title: string;
  icon: React.FC<{ size: number; color?: string; className?: string }>;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface OSNotificationItem {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  isRead?: boolean;
  /** Epoch ms; rendered as a live relative time rather than a frozen string. */
  createdAt: number;
  /** Set when the notification came from Buddy, so the UI can badge it. */
  source?: 'system' | 'buddy';
}

export interface ClipboardEntry {
  id: string;
  text: string;
  copiedAt: number;
}

export type ThemeMode = 'dark' | 'light';

export interface OSTheme {
  mode: ThemeMode;
  accent: string;
  wallpaper: string;
  /** Disables blur/animation for low-power machines. */
  reducedEffects: boolean;
}

/** One entry in the agent's audit trail, shown in the Buddy panel. */
export interface AgentActionRecord {
  id: string;
  action: string;
  parameters: Record<string, unknown>;
  status: 'ok' | 'error';
  message: string;
  at: number;
  /** Where the action arrived from: the command response or the live socket. */
  origin: 'http' | 'socket' | 'local';
}
