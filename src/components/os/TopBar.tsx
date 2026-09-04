import { useEffect, useState } from 'react';
import {
  Search, Bell, LayoutGrid, Wifi, WifiOff, Shield, Zap, Database, Bot, Grid2x2,
} from 'lucide-react';
import { useOSActions, useOSAgent, useOSNotifications, useOSShell, useOSWindows, APPS } from '../../contexts/osState';
import { useAuth } from '../../contexts/authState';
import { QuickSettings } from './QuickSettings';
import { NotificationCenter } from './NotificationCenter';
import { formatClock, formatDate } from '../../os/time';

export function TopBar() {
  const { setOverlay, toggleBuddy, tileWindows } = useOSActions();
  const { windows, activeWindowId } = useOSWindows();
  const { overlay, isEngineConnected, isAutoExecuteActive, isSandboxActive, isBuddyOpen } = useOSShell();
  const { unreadCount } = useOSNotifications();
  const { isAgentConnected } = useOSAgent();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  // Tick on the minute boundary rather than every second: the bar only shows
  // hours and minutes, so a 1 Hz interval would re-render the shell 59 extra
  // times for no visible change.
  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const current = new Date();
      setNow(current);
      const msToNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());
      handle = setTimeout(schedule, msToNextMinute + 20);
    };
    schedule();
    return () => clearTimeout(handle);
  }, []);

  const active = windows.find((entry) => entry.id === activeWindowId);
  const activeMeta = active ? APPS[active.appId] : null;

  return (
    <header className="os-topbar">
      <div className="flex items-center gap-0.5 h-full">
        <button
          onClick={() => setOverlay('apps')}
          data-active={overlay === 'apps'}
          className="os-topbar__item"
          aria-label="Show all applications"
        >
          <LayoutGrid size={14} />
          <span className="font-semibold hidden sm:inline">Apps</span>
        </button>

        <button
          onClick={() => setOverlay('search')}
          data-active={overlay === 'search'}
          className="os-topbar__item"
          aria-label="Search"
        >
          <Search size={13} />
          <span className="hidden md:inline text-[11.5px]">Search</span>
          <kbd className="os-kbd hidden lg:inline-flex">Ctrl K</kbd>
        </button>

        {activeMeta && active && (
          <div className="os-topbar__item pointer-events-none max-w-[280px]">
            <span className={`w-3.5 h-3.5 rounded-[4px] bg-linear-to-br ${activeMeta.tint} flex items-center justify-center text-white shrink-0`}>
              <activeMeta.icon size={9} strokeWidth={3} />
            </span>
            <span className="font-semibold text-[var(--os-text)] truncate">{active.title}</span>
          </div>
        )}

        {windows.length > 1 && (
          <button onClick={tileWindows} className="os-topbar__item" aria-label="Tile all windows" title="Tile all windows">
            <Grid2x2 size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-0.5 h-full">
        <button
          onClick={() => toggleBuddy()}
          data-active={isBuddyOpen}
          className="os-topbar__item"
          aria-label="Toggle Buddy panel"
          title={isAgentConnected ? 'Buddy: connected' : 'Buddy: offline'}
        >
          <Bot size={14} />
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isAgentConnected ? 'var(--os-success)' : 'var(--os-text-dim)' }}
          />
        </button>

        <button
          onClick={() => setOverlay('notifications')}
          data-active={overlay === 'notifications'}
          className="os-topbar__item relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell size={14} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[var(--os-accent)] text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setOverlay('quickSettings')}
          data-active={overlay === 'quickSettings'}
          className="os-topbar__item"
          aria-label="Quick settings"
        >
          {isEngineConnected
            ? <Wifi size={13} style={{ color: 'var(--os-success)' }} />
            : <WifiOff size={13} style={{ color: 'var(--os-danger)' }} />}
          <Zap size={13} style={{ color: isAutoExecuteActive ? 'var(--os-warning)' : 'var(--os-text-dim)' }} />
          <Shield size={13} style={{ color: isSandboxActive ? 'var(--os-info)' : 'var(--os-warning)' }} />
          <Database size={13} className="hidden sm:block" style={{ color: 'var(--os-text-dim)' }} />
        </button>

        <button
          onClick={() => setOverlay('quickSettings')}
          className="os-topbar__item font-medium tabular-nums"
          aria-label="Date and time"
        >
          <span className="hidden md:inline text-[var(--os-text-muted)]">{formatDate(now)}</span>
          <span className="text-[var(--os-text)]">{formatClock(now)}</span>
        </button>

        {user && (
          <div
            className="os-topbar__item"
            title={`${user.name} · ${user.email}`}
            aria-label={`Signed in as ${user.name}`}
          >
            <span className="w-[19px] h-[19px] rounded-full bg-linear-to-br from-indigo-400 to-violet-600 text-white text-[9.5px] font-bold flex items-center justify-center">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <QuickSettings />
      <NotificationCenter />
    </header>
  );
}
