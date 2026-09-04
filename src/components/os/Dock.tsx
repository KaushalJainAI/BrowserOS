import { memo, useMemo } from 'react';
import { Grid, Trash2 } from 'lucide-react';
import { useOSActions, useOSShell, useOSWindows, APPS } from '../../contexts/osState';
import type { AppId } from '../../types/os';

/**
 * The dock lists pinned apps plus anything running that isn't pinned, so a
 * window opened by the agent is always reachable even if it was never pinned.
 */
export const Dock = memo(function Dock() {
  const { openApp, focusWindow, toggleMinimize, setOverlay, pinApp, unpinApp, showContextMenu, addToDesktop, closeWindow } = useOSActions();
  const { windows, activeWindowId } = useOSWindows();
  const { pinnedApps } = useOSShell();

  const entries = useMemo(() => {
    const running = Array.from(new Set(windows.map((entry) => entry.appId)));
    const unpinned = running.filter((id) => !pinnedApps.includes(id));
    return [...pinnedApps, ...unpinned];
  }, [windows, pinnedApps]);

  const onContext = (event: React.MouseEvent, appId: AppId) => {
    event.preventDefault();
    const instances = windows.filter((entry) => entry.appId === appId);
    const isPinned = pinnedApps.includes(appId);
    const canFork = Boolean(APPS[appId].multiInstance) && instances.length > 0;
    showContextMenu(event, [
      {
        label: canFork ? 'New window' : 'Open',
        onClick: () => openApp(appId, { forceNew: canFork }),
      },
      {
        label: isPinned ? 'Unpin from dock' : 'Pin to dock',
        onClick: () => (isPinned ? unpinApp(appId) : pinApp(appId)),
        divider: true,
      },
      { label: 'Add to desktop', onClick: () => addToDesktop(appId) },
      ...(instances.length
        ? [{
            label: instances.length > 1 ? `Close all ${instances.length} windows` : 'Close',
            icon: Trash2,
            variant: 'danger' as const,
            divider: true,
            onClick: () => instances.forEach((entry) => closeWindow(entry.id)),
          }]
        : []),
    ]);
  };

  return (
    <nav className="os-dock" aria-label="Dock">
      {entries.map((appId) => {
        const meta = APPS[appId];
        const instances = windows.filter((entry) => entry.appId === appId);
        const isOpen = instances.length > 0;
        const isActive = instances.some((entry) => entry.id === activeWindowId && !entry.isMinimized);
        const Icon = meta.icon;

        return (
          <button
            key={appId}
            className={`os-dock__item bg-linear-to-br ${meta.tint}`}
            style={{ filter: isOpen ? 'none' : 'saturate(0.82) brightness(0.92)' }}
            aria-label={isOpen ? `${meta.title} (running)` : `Open ${meta.title}`}
            title={meta.title}
            onContextMenu={(event) => onContext(event, appId)}
            onClick={() => {
              if (!isOpen) {
                openApp(appId);
                return;
              }
              // Clicking the active app minimizes it; otherwise raise the
              // topmost of its windows.
              if (isActive) {
                const front = instances.find((entry) => entry.id === activeWindowId);
                if (front) toggleMinimize(front.id);
                return;
              }
              const front = [...instances].sort((a, b) => b.zIndex - a.zIndex)[0];
              focusWindow(front.id);
            }}
          >
            <Icon size={24} strokeWidth={1.9} />
            <span
              className="os-dock__indicator"
              style={{
                width: isActive ? 18 : isOpen ? 6 : 0,
                opacity: isOpen ? (isActive ? 1 : 0.55) : 0,
              }}
            />
            {instances.length > 1 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--os-surface-solid)] border border-[var(--os-border)] text-[9px] font-bold flex items-center justify-center text-[var(--os-text)]">
                {instances.length}
              </span>
            )}
          </button>
        );
      })}

      <span className="w-px h-8 self-center bg-[var(--os-border)] mx-1" />

      <button
        onClick={() => setOverlay('apps')}
        className="os-dock__item bg-linear-to-br from-slate-500 to-slate-700"
        aria-label="Show all applications"
        title="All applications"
      >
        <Grid size={22} strokeWidth={2} />
      </button>
    </nav>
  );
});
