import { memo } from 'react';
import { ExternalLink, Pin, PinOff, Trash2 } from 'lucide-react';
import { useOSActions, useOSShell, APPS } from '../../contexts/osState';
import type { AppId } from '../../types/os';

interface DesktopIconProps {
  appId: AppId;
  isSelected: boolean;
  onSelect: (appId: AppId, additive: boolean) => void;
}

/**
 * Desktop icons live in a CSS grid rather than being freely positioned. The
 * previous version wrapped each one in a draggable inside a grid, so dragging
 * moved an element the grid immediately re-laid-out — the icon snapped back,
 * and the only working "drag" was the one onto the trash. Grid order is the
 * real model here, so ordering is exposed through the context menu and sorting
 * instead of a gesture that cannot persist.
 */
export const DesktopIcon = memo(function DesktopIcon({ appId, isSelected, onSelect }: DesktopIconProps) {
  const { openApp, showContextMenu, pinApp, unpinApp, removeFromDesktop } = useOSActions();
  const { pinnedApps } = useOSShell();
  const meta = APPS[appId];
  const Icon = meta.icon;
  const isPinned = pinnedApps.includes(appId);

  return (
    <button
      className="os-desktop-icon"
      data-selected={isSelected}
      aria-label={`${meta.title}. ${meta.description}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(appId, event.ctrlKey || event.metaKey);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        openApp(appId);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openApp(appId);
        }
      }}
      onContextMenu={(event) => {
        event.stopPropagation();
        onSelect(appId, false);
        showContextMenu(event, [
          { label: 'Open', icon: ExternalLink, onClick: () => openApp(appId) },
          ...(meta.multiInstance
            ? [{ label: 'Open in new window', onClick: () => openApp(appId, { forceNew: true }) }]
            : []),
          {
            label: isPinned ? 'Unpin from dock' : 'Pin to dock',
            icon: isPinned ? PinOff : Pin,
            divider: true,
            onClick: () => (isPinned ? unpinApp(appId) : pinApp(appId)),
          },
          {
            label: 'Remove from desktop',
            icon: Trash2,
            variant: 'danger',
            onClick: () => removeFromDesktop(appId),
          },
        ]);
      }}
    >
      <span className={`os-desktop-icon__glyph bg-linear-to-br ${meta.tint}`}>
        <Icon size={25} strokeWidth={1.9} />
      </span>
      <span className="os-desktop-icon__label">{meta.title}</span>
    </button>
  );
});
