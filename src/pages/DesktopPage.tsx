/**
 * The desktop shell: background, icons, window layer, dock, overlays and the
 * global keyboard map.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Bot, RefreshCw, Monitor, Settings as SettingsIcon, Grid2x2, Minimize2,
  SortAsc, LayoutGrid, FolderPlus, Palette,
} from 'lucide-react';
import { useOSActions, useOSAgent, useOSShell, useOSWindows, APPS } from '../contexts/osState';
import { TopBar } from '../components/os/TopBar';
import { Dock } from '../components/os/Dock';
import { BuddyPanel } from '../components/os/BuddyPanel';
import { SearchOverlay } from '../components/os/SearchOverlay';
import { AppsOverlay } from '../components/os/AppsOverlay';
import { ContextMenu } from '../components/os/ContextMenu';
import { DesktopIcon } from '../components/os/DesktopIcon';
import { WindowRenderer } from '../components/os/WindowRenderer';
import { SnapPreview } from '../components/os/Window';
import { WindowSwitcher } from '../components/os/WindowSwitcher';
import { Toasts } from '../components/os/Toasts';
import type { AppId, SnapZone } from '../types/os';

export function DesktopPage() {
  const { openApp, closeWindow, toggleBuddy, setOverlay, showContextMenu, closeContextMenu, sortDesktop, tileWindows, minimizeAll, snapWindow, toggleMaximize, resetWorkspace } = useOSActions();
  const { activeWindowId, windows } = useOSWindows();
  const { theme, isBuddyOpen, buddyWidth, overlay, desktopApps } = useOSShell();
  const { isAgentConnected } = useOSAgent();

  const [selected, setSelected] = useState<AppId[]>([]);

  const selectIcon = useCallback((appId: AppId, additive: boolean) => {
    setSelected((current) => {
      if (!additive) return [appId];
      return current.includes(appId)
        ? current.filter((id) => id !== appId)
        : [...current, appId];
    });
  }, []);

  // ── Global keyboard map ──────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(
        target && (
          target.tagName === 'INPUT'
          || target.tagName === 'TEXTAREA'
          || target.isContentEditable
        ),
      );
      const mod = event.ctrlKey || event.metaKey;

      // Escape always closes the frontmost transient surface.
      if (event.key === 'Escape') {
        if (overlay) { setOverlay(null); return; }
        closeContextMenu();
        return;
      }

      // Ctrl/Cmd+K opens search from anywhere, including while typing —
      // it is the one shortcut that should always win.
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOverlay('search');
        return;
      }

      // Everything below would otherwise steal keys from a focused editor.
      if (isTyping) return;

      if (mod && event.key.toLowerCase() === 'w' && activeWindowId) {
        event.preventDefault();
        closeWindow(activeWindowId);
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleBuddy();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        openApp('screenshot');
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        openApp('clipboard');
        return;
      }

      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        minimizeAll();
        return;
      }

      // Super/Meta + arrows tile the focused window, like most desktops.
      if (event.metaKey && activeWindowId && event.key.startsWith('Arrow')) {
        const zone: Record<string, SnapZone | 'restore'> = {
          ArrowLeft: 'left',
          ArrowRight: 'right',
          ArrowUp: 'maximized',
          ArrowDown: 'restore',
        };
        const action = zone[event.key];
        if (action) {
          event.preventDefault();
          if (action === 'restore') snapWindow(activeWindowId, null);
          else snapWindow(activeWindowId, action);
        }
        return;
      }

      if (event.key === 'F11' && activeWindowId) {
        event.preventDefault();
        toggleMaximize(activeWindowId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    overlay, setOverlay, closeContextMenu, activeWindowId, closeWindow,
    toggleBuddy, openApp, minimizeAll, snapWindow, toggleMaximize,
  ]);

  const onDesktopContext = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setSelected([]);
    const notOnDesktop = (Object.keys(APPS) as AppId[]).filter((id) => !desktopApps.includes(id));
    showContextMenu(event, [
      { label: 'New window…', icon: LayoutGrid, onClick: () => setOverlay('apps') },
      ...(notOnDesktop.length
        ? [{
            label: 'Add app to desktop…',
            icon: FolderPlus,
            onClick: () => setOverlay('apps'),
          }]
        : []),
      { label: 'Sort by name', icon: SortAsc, divider: true, onClick: () => sortDesktop('name') },
      { label: 'Sort by category', icon: SortAsc, onClick: () => sortDesktop('category') },
      { label: 'Tile windows', icon: Grid2x2, divider: true, onClick: tileWindows },
      { label: 'Show desktop', icon: Minimize2, shortcut: 'Ctrl+D', onClick: minimizeAll },
      { label: 'Change appearance', icon: Palette, divider: true, onClick: () => openApp('settings', { state: { section: 'appearance' } }) },
      { label: 'Display settings', icon: Monitor, onClick: () => openApp('settings', { state: { section: 'appearance' } }) },
      { label: 'System settings', icon: SettingsIcon, onClick: () => openApp('settings') },
      {
        label: 'Reset workspace',
        icon: RefreshCw,
        variant: 'danger',
        divider: true,
        onClick: () => {
          if (window.confirm('Reset the desktop, files and preferences to their defaults?')) {
            resetWorkspace();
          }
        },
      },
    ]);
  }, [
    desktopApps, showContextMenu, setOverlay, sortDesktop, tileWindows,
    minimizeAll, openApp, resetWorkspace,
  ]);

  return (
    <div className="os-container">
      <div className="os-background" style={{ background: theme.wallpaper }} />

      <TopBar />

      <main className="flex-1 relative min-h-0">
        {/* Desktop surface: icons live in a grid, clicks here clear selection. */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ right: isBuddyOpen ? buddyWidth : 0, transition: 'right 260ms cubic-bezier(0.2,0.9,0.3,1)' }}
          onPointerDown={() => {
            setSelected([]);
            if (overlay === 'quickSettings' || overlay === 'notifications') setOverlay(null);
          }}
          onContextMenu={onDesktopContext}
        >
          <div className="grid grid-cols-[repeat(auto-fill,100px)] auto-rows-[104px] gap-2 content-start p-4 h-full">
            {desktopApps.map((appId) => (
              <DesktopIcon
                key={appId}
                appId={appId}
                isSelected={selected.includes(appId)}
                onSelect={selectIcon}
              />
            ))}
          </div>

          {desktopApps.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-[13px] text-white/40 pointer-events-none">
              Right-click the desktop to add apps
            </p>
          )}
        </div>

        {/* Window layer, inset to match the Buddy panel. */}
        <div
          className="absolute left-0 bottom-0 pointer-events-none z-[5000]"
          style={{
            top: 0,
            right: isBuddyOpen ? buddyWidth : 0,
            transition: 'right 260ms cubic-bezier(0.2,0.9,0.3,1)',
          }}
        >
          <SnapPreview />
          <WindowRenderer />
        </div>

        {/* Dock: always present, lifted when nothing is open. */}
        <div
          className="absolute bottom-3 z-[9000] pointer-events-none"
          style={{
            left: 0,
            right: isBuddyOpen ? buddyWidth : 0,
            display: 'flex',
            justifyContent: 'center',
            transition: 'right 260ms cubic-bezier(0.2,0.9,0.3,1)',
          }}
        >
          <div className="pointer-events-auto">
            <Dock />
          </div>
        </div>

        {/* Buddy panel */}
        <aside
          className="absolute top-0 bottom-0 right-0 z-[9100]"
          style={{
            width: buddyWidth,
            transform: isBuddyOpen ? 'translateX(0)' : `translateX(${buddyWidth}px)`,
            opacity: isBuddyOpen ? 1 : 0,
            pointerEvents: isBuddyOpen ? 'auto' : 'none',
            transition: 'transform 260ms cubic-bezier(0.2,0.9,0.3,1), opacity 200ms ease',
          }}
          aria-hidden={!isBuddyOpen}
        >
          {isBuddyOpen && <BuddyPanel />}
        </aside>

        {!isBuddyOpen && (
          <button
            onClick={() => toggleBuddy(true)}
            className="buddy-toggle"
            data-connected={isAgentConnected}
            aria-label="Open Buddy"
            title="Open Buddy (Ctrl+Shift+B)"
          >
            <Bot size={23} />
          </button>
        )}
      </main>

      <SearchOverlay />
      <AppsOverlay />
      <WindowSwitcher />
      <ContextMenu />
      <Toasts />

      {/* Screen-reader announcement of window count, kept out of the layout. */}
      <span className="sr-only" role="status" aria-live="polite">
        {windows.length} window{windows.length === 1 ? '' : 's'} open
      </span>
    </div>
  );
}
