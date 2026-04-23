import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AppId, OSNotificationItem, OSWindow } from '../types/os';
import React from 'react';
import {
  Settings, Folder, Clock, Terminal, MessageSquare, Image, Video,
  Presentation, FileText, Share2, BarChart2, PenTool, Table,
  Cloud, Code, Calculator, Gamepad2, Cpu, Clipboard, Camera
} from 'lucide-react';

export interface ContextMenuOption {
  label: string;
  icon?: React.FC<{ size: number; className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  options: ContextMenuOption[];
}

export interface WindowPosition {
  x: number;
  y: number;
}

export const APPS: Record<AppId, { title: string; icon: React.FC<{ size: number; color?: string; className?: string }> }> = {
  explorer: { title: 'Files', icon: Folder },
  terminal: { title: 'Terminal', icon: Terminal },
  settings: { title: 'Settings', icon: Settings },
  clock: { title: 'Clock', icon: Clock },
  chatbot: { title: 'AskBuddy', icon: MessageSquare },
  'image-editor': { title: 'PixelCanvas', icon: Image },
  'video-editor': { title: 'SceneCraft', icon: Video },
  'presentation-editor': { title: 'SlideMaster', icon: Presentation },
  'word-editor': { title: 'DocWriter', icon: FileText },
  'diagram-editor': { title: 'FlowForge', icon: Share2 },
  analyst: { title: 'DataLab', icon: BarChart2 },
  'svg-maker': { title: 'VectorStudio', icon: PenTool },
  'sheets-editor': { title: 'GridCalc', icon: Table },
  drive: { title: 'CloudVault', icon: Cloud },
  'frontend-expert': { title: 'WebWeaver', icon: Code },
  calculator: { title: 'CalcPro', icon: Calculator },
  game: { title: 'SpaceQuest', icon: Gamepad2 },
  simulator: { title: 'SimWorld', icon: Cpu },
  clipboard: { title: 'Clipboard History', icon: Clipboard },
  screenshot: { title: 'Screen Capture', icon: Camera },
};

interface OSContextType {
  windows: OSWindow[];
  activeWindowId: string | null;
  isBuddyOpen: boolean;
  isSearchOpen: boolean;
  isAppsOpen: boolean;
  isQuickSettingsOpen: boolean;
  isNotificationsOpen: boolean;
  isEngineConnected: boolean;
  isAutoExecuteActive: boolean;
  isSandboxActive: boolean;
  tokenUsage: number;
  pinnedApps: AppId[];
  notifications: OSNotificationItem[];
  openApp: (appId: AppId) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string, e?: React.MouseEvent) => void;
  toggleMaximize: (id: string, e?: React.MouseEvent) => void;
  toggleBuddy: () => void;
  toggleSearch: () => void;
  toggleApps: () => void;
  toggleQuickSettings: (state?: boolean) => void;
  toggleNotifications: (state?: boolean) => void;
  toggleEngine: (state?: boolean) => void;
  toggleAutoExecute: (state?: boolean) => void;
  toggleSandbox: (state?: boolean) => void;
  setTokenUsage: (usage: number) => void;
  pinApp: (appId: AppId) => void;
  unpinApp: (appId: AppId) => void;
  contextMenu: ContextMenuState;
  showContextMenu: (e: React.MouseEvent | MouseEvent, options: ContextMenuOption[]) => void;
  closeContextMenu: () => void;
  clipboardHistory: string[];
  addToClipboard: (item: string) => void;
  nextWindow: () => void;
  wallpaper: string;
  setWallpaper: (wallpaper: string) => void;
  desktopApps: AppId[];
  addToDesktop: (appId: AppId) => void;
  removeFromDesktop: (appId: AppId) => void;
  sortDesktop: (criteria: 'name') => void;
  dismissNotification: (id: number) => void;
  clearNotifications: () => void;
  applyBuddyAction: (action: string, parameters: Record<string, unknown>) => void;
}

const OSContext = createContext<OSContextType | undefined>(undefined);

export function OSProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<OSWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [isBuddyOpen, setIsBuddyOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isEngineConnected, setIsEngineConnected] = useState(true);
  const [isAutoExecuteActive, setIsAutoExecuteActive] = useState(false);
  const [isSandboxActive, setIsSandboxActive] = useState(true);
  const [tokenUsage, setTokenUsage] = useState(35);
  const [pinnedApps, setPinnedApps] = useState<AppId[]>(['explorer', 'settings', 'terminal', 'clock']);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    options: []
  });
  const [clipboardHistory, setClipboardHistory] = useState<string[]>([]);
  const [wallpaper, setWallpaper] = useState('linear-gradient(to bottom right, #4c1d95, #1e1b4b)');
  const [desktopApps, setDesktopApps] = useState<AppId[]>(['explorer', 'settings', 'terminal', 'calculator', 'chatbot']);
  const [notifications, setNotifications] = useState<OSNotificationItem[]>([
    {
      id: 1,
      title: 'System Update',
      message: 'BrowserOS v1.2.4 is available. Restart to apply.',
      type: 'info',
      time: '2m ago'
    },
    {
      id: 2,
      title: 'Task Completed',
      message: 'Calculator redesign deployment finished successfully.',
      type: 'success',
      time: '15m ago'
    }
  ]);

  const openApp = (appId: AppId) => {
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      focusWindow(existing.id);
      return;
    }

    const newWindowId = `win_${Date.now()}`;
    const offset = (windows.length % 10) * 30;
    const topZ = windows.length > 0 ? Math.max(...windows.map(w => w.zIndex)) : 100;

    const newWindow: OSWindow = {
      id: newWindowId,
      appId,
      title: APPS[appId].title,
      isMinimized: false,
      isMaximized: false,
      zIndex: topZ + 1,
      defaultPosition: { x: 50 + offset, y: 50 + offset },
    };

    setWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => {
      const newWindows = prev.filter(w => w.id !== id);
      if (activeWindowId === id) {
        if (newWindows.length > 0) {
          const nextActive = [...newWindows].sort((a, b) => b.zIndex - a.zIndex)[0];
          setActiveWindowId(nextActive.id);
        } else {
          setActiveWindowId(null);
        }
      }
      return newWindows;
    });
  };

  const focusWindow = (id: string) => {
    if (activeWindowId === id) return;
    const topZIndex = windows.length > 0 ? Math.max(...windows.map(w => w.zIndex)) : 0;
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, zIndex: topZIndex + 1, isMinimized: false } : w)));
    setActiveWindowId(id);
  };

  const toggleMinimize = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)));
  };

  const toggleMaximize = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)));
  };

  const toggleBuddy = () => setIsBuddyOpen(!isBuddyOpen);
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setIsAppsOpen(false);
      setIsQuickSettingsOpen(false);
      setIsNotificationsOpen(false);
    }
  };
  const toggleApps = () => {
    setIsAppsOpen(!isAppsOpen);
    if (!isAppsOpen) {
      setIsSearchOpen(false);
      setIsQuickSettingsOpen(false);
      setIsNotificationsOpen(false);
    }
  };
  const toggleQuickSettings = (state?: boolean) => {
    const newState = state !== undefined ? state : !isQuickSettingsOpen;
    setIsQuickSettingsOpen(newState);
    if (newState) {
      setIsSearchOpen(false);
      setIsAppsOpen(false);
      setIsNotificationsOpen(false);
    }
  };
  const toggleNotifications = (state?: boolean) => {
    const newState = state !== undefined ? state : !isNotificationsOpen;
    setIsNotificationsOpen(newState);
    if (newState) {
      setIsSearchOpen(false);
      setIsAppsOpen(false);
      setIsQuickSettingsOpen(false);
    }
  };

  const toggleEngine = (state?: boolean) => setIsEngineConnected(state !== undefined ? state : !isEngineConnected);
  const toggleAutoExecute = (state?: boolean) => setIsAutoExecuteActive(state !== undefined ? state : !isAutoExecuteActive);
  const toggleSandbox = (state?: boolean) => setIsSandboxActive(state !== undefined ? state : !isSandboxActive);

  const pinApp = (appId: AppId) => {
    if (!pinnedApps.includes(appId)) setPinnedApps(prev => [...prev, appId]);
  };

  const unpinApp = (appId: AppId) => {
    setPinnedApps(prev => prev.filter(id => id !== appId));
  };

  const showContextMenu = (e: React.MouseEvent | MouseEvent, options: ContextMenuOption[]) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      options
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const addToClipboard = (item: string) => {
    setClipboardHistory(prev => {
      const filtered = prev.filter(i => i !== item);
      return [item, ...filtered].slice(0, 50);
    });
  };

  const nextWindow = () => {
    if (windows.length < 2) return;
    const sortedWindows = [...windows].sort((a, b) => b.zIndex - a.zIndex);
    const currentIndex = sortedWindows.findIndex(w => w.id === activeWindowId);
    const nextIndex = (currentIndex + 1) % sortedWindows.length;
    focusWindow(sortedWindows[nextIndex].id);
  };

  const addToDesktop = (appId: AppId) => {
    if (!desktopApps.includes(appId)) {
      setDesktopApps(prev => [...prev, appId]);
    }
  };

  const removeFromDesktop = (appId: AppId) => {
    setDesktopApps(prev => prev.filter(id => id !== appId));
  };

  const sortDesktop = (criteria: 'name') => {
    if (criteria === 'name') {
      setDesktopApps(prev => [...prev].sort((a, b) => APPS[a].title.localeCompare(APPS[b].title)));
    }
  };

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const pushNotification = (notification: Omit<OSNotificationItem, 'id'> & { id?: number }) => {
    setNotifications(prev => [
      {
        id: notification.id ?? Date.now(),
        ...notification,
      },
      ...prev,
    ]);
  };

  const applyBuddyAction = (action: string, parameters: Record<string, unknown>) => {
    const appId = typeof parameters.app_id === 'string' ? parameters.app_id as AppId : null;

    if (action === 'os_open_app' && appId) {
      openApp(appId);
      return;
    }

    if (action === 'os_focus_app' && appId) {
      const existing = windows.find(window => window.appId === appId);
      if (existing) {
        focusWindow(existing.id);
      } else {
        openApp(appId);
      }
      return;
    }

    if (action === 'os_close_app' && appId) {
      const existing = windows.find(window => window.appId === appId);
      if (existing) {
        closeWindow(existing.id);
      }
      return;
    }

    if (action === 'os_minimize_app' && appId) {
      const existing = windows.find(window => window.appId === appId);
      if (existing && !existing.isMinimized) {
        toggleMinimize(existing.id);
      }
      return;
    }

    if (action === 'os_maximize_app' && appId) {
      const existing = windows.find(window => window.appId === appId);
      if (existing) {
        setWindows(prev => prev.map(window => (
          window.id === existing.id ? { ...window, isMaximized: true, isMinimized: false } : window
        )));
        setActiveWindowId(existing.id);
      } else {
        openApp(appId);
      }
      return;
    }

    if (action === 'os_pin_app' && appId) {
      pinApp(appId);
      if (!desktopApps.includes(appId)) {
        addToDesktop(appId);
      }
      return;
    }

    if (action === 'os_unpin_app' && appId) {
      unpinApp(appId);
      return;
    }

    if (action === 'os_set_wallpaper' && typeof parameters.wallpaper === 'string') {
      setWallpaper(parameters.wallpaper);
      return;
    }

    if (action === 'os_notify') {
      const notification = parameters.notification as Partial<OSNotificationItem> | undefined;
      pushNotification({
        id: notification?.id,
        title: notification?.title || 'Buddy Notification',
        message: notification?.message || (typeof parameters.message === 'string' ? parameters.message : 'Buddy completed an action.'),
        type: notification?.type || 'info',
        time: 'Just now',
      });
      setIsNotificationsOpen(true);
      return;
    }

    if (action.startsWith('browser_')) {
      pushNotification({
        title: 'Browser Command',
        message: typeof parameters.command_text === 'string' ? parameters.command_text : 'Buddy sent a browser command.',
        type: 'info',
        time: 'Just now',
      });
    }
  };

  return (
    <OSContext.Provider value={{
      windows, activeWindowId, isBuddyOpen, isSearchOpen, isAppsOpen, isQuickSettingsOpen, isNotificationsOpen,
      isEngineConnected, isAutoExecuteActive, isSandboxActive, tokenUsage,
      pinnedApps, notifications, contextMenu, clipboardHistory, wallpaper, desktopApps, openApp, closeWindow, focusWindow,
      toggleMinimize, toggleMaximize, toggleBuddy, toggleSearch, toggleApps, toggleQuickSettings, toggleNotifications,
      toggleEngine, toggleAutoExecute, toggleSandbox, setTokenUsage,
      pinApp, unpinApp, showContextMenu, closeContextMenu, addToClipboard, nextWindow, setWallpaper, addToDesktop, removeFromDesktop, sortDesktop,
      dismissNotification, clearNotifications, applyBuddyAction
    }}>
      {children}
    </OSContext.Provider>
  );
}

export function useOS() {
  const context = useContext(OSContext);
  if (context === undefined) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
}
