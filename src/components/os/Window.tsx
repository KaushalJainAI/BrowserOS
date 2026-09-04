/**
 * A desktop window: drag, eight-way resize, edge-snap tiling, and the standard
 * title-bar controls.
 *
 * Geometry is committed to the window manager only when a gesture ends. During
 * a drag or resize the element is moved by writing style directly, so React
 * re-renders (and localStorage writes) do not run on every pointer move.
 */

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Minus, Square, Copy as RestoreIcon, X } from 'lucide-react';
import { useOSActions, useOSShell, useOSWindows, APPS } from '../../contexts/osState';
import { rectForZone, workArea, zoneForPointer, TOP_BAR_HEIGHT } from '../../os/geometry';
import type { AppId, Rect, SnapZone } from '../../types/os';

interface WindowProps {
  id: string;
  appId: AppId;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  snap: SnapZone | null;
  zIndex: number;
  isActive: boolean;
  rect: Rect;
  children: ReactNode;
}

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const RESIZE_HANDLES: Array<{ edge: ResizeEdge; className: string; cursor: string }> = [
  { edge: 'n', className: 'top-0 left-3 right-3 h-1.5 -mt-0.5', cursor: 'ns-resize' },
  { edge: 's', className: 'bottom-0 left-3 right-3 h-1.5 -mb-0.5', cursor: 'ns-resize' },
  { edge: 'w', className: 'left-0 top-3 bottom-3 w-1.5 -ml-0.5', cursor: 'ew-resize' },
  { edge: 'e', className: 'right-0 top-3 bottom-3 w-1.5 -mr-0.5', cursor: 'ew-resize' },
  { edge: 'nw', className: 'top-0 left-0 w-3.5 h-3.5 -mt-0.5 -ml-0.5', cursor: 'nwse-resize' },
  { edge: 'ne', className: 'top-0 right-0 w-3.5 h-3.5 -mt-0.5 -mr-0.5', cursor: 'nesw-resize' },
  { edge: 'sw', className: 'bottom-0 left-0 w-3.5 h-3.5 -mb-0.5 -ml-0.5', cursor: 'nesw-resize' },
  { edge: 'se', className: 'bottom-0 right-0 w-3.5 h-3.5 -mb-0.5 -mr-0.5', cursor: 'nwse-resize' },
];

export const Window = memo(function Window({
  id, appId, title, isMinimized, isMaximized, snap, zIndex, isActive, rect, children,
}: WindowProps) {
  const { toggleMinimize, toggleMaximize, closeWindow, focusWindow, setWindowRect, snapWindow, setSnapPreview, showContextMenu } = useOSActions();
  const { buddyWidth, isBuddyOpen } = useOSShell();

  const nodeRef = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<'drag' | 'resize' | null>(null);
  const meta = APPS[appId];

  /**
   * Live geometry during a gesture. Held in a ref (not state) so pointer moves
   * write straight to the DOM at input rate without re-rendering the subtree —
   * app contents can be expensive (canvases, big grids).
   */
  const live = useRef<Rect>(rect);

  const applyLive = useCallback((next: Rect) => {
    live.current = next;
    const node = nodeRef.current;
    if (!node) return;
    node.style.transform = `translate(${next.x}px, ${next.y}px)`;
    node.style.width = `${next.width}px`;
    node.style.height = `${next.height}px`;
  }, []);

  // Re-sync when the manager changes geometry from outside a gesture (snap,
  // tile, viewport reflow, or an agent action).
  useEffect(() => {
    if (gesture) return;
    live.current = rect;
    const node = nodeRef.current;
    if (!node) return;
    if (isMaximized) {
      node.style.transform = '';
      node.style.width = '';
      node.style.height = '';
    } else {
      node.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
      node.style.width = `${rect.width}px`;
      node.style.height = `${rect.height}px`;
    }
  }, [rect, isMaximized, gesture]);

  const currentArea = useCallback(
    () => workArea({ width: window.innerWidth, height: window.innerHeight }, isBuddyOpen ? buddyWidth : 0),
    [isBuddyOpen, buddyWidth],
  );

  // ── Drag ─────────────────────────────────────────────────────────────────

  const onTitleBarPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-window-control]')) return;

    focusWindow(id);
    event.preventDefault();

    const area = currentArea();
    const startX = event.clientX;
    const startY = event.clientY;
    // Dragging a maximized/tiled window restores it to floating size, with the
    // cursor keeping its proportional grip on the title bar.
    const wasTiled = isMaximized || snap !== null;
    const floatWidth = wasTiled ? meta.defaultSize.width : rect.width;
    const floatHeight = wasTiled ? meta.defaultSize.height : rect.height;
    const tiledX = isMaximized ? area.x : rect.x;
    const tiledWidth = isMaximized ? area.width : rect.width;
    const grabRatio = tiledWidth > 0 ? (startX - tiledX) / tiledWidth : 0.5;
    const originX = wasTiled ? startX - floatWidth * grabRatio : rect.x;
    const originY = wasTiled ? startY - TOP_BAR_HEIGHT - 16 : rect.y;

    let moved = false;
    let pendingZone: SnapZone | null = null;
    setGesture('drag');
    if (wasTiled) applyLive({ x: originX, y: originY, width: floatWidth, height: floatHeight });

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      if (!moved && Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;
      moved = true;

      applyLive({
        x: originX + deltaX,
        y: Math.max(area.y - 4, originY + deltaY),
        width: floatWidth,
        height: floatHeight,
      });

      // Snap arming reads the pointer, not the window box, so flicking into a
      // corner tiles predictably regardless of where the window was grabbed.
      const zone = zoneForPointer(moveEvent.clientX, moveEvent.clientY - TOP_BAR_HEIGHT, area);
      if (zone !== pendingZone) {
        pendingZone = zone;
        setSnapPreview(zone);
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setGesture(null);
      setSnapPreview(null);
      // A click without movement must not un-tile the window.
      if (!moved) return;
      if (pendingZone) snapWindow(id, pendingZone);
      else setWindowRect(id, live.current);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [
    id, rect, isMaximized, snap, meta.defaultSize, focusWindow, applyLive,
    setSnapPreview, snapWindow, setWindowRect, currentArea,
  ]);

  // ── Resize ───────────────────────────────────────────────────────────────

  const onResizePointerDown = useCallback((event: React.PointerEvent, edge: ResizeEdge) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    focusWindow(id);

    const area = currentArea();
    const start = { ...(isMaximized ? area : rect) };
    const startX = event.clientX;
    const startY = event.clientY;
    const min = meta.minSize;
    setGesture('resize');

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const next = { ...start };

      if (edge.includes('e')) next.width = Math.max(min.width, start.width + deltaX);
      if (edge.includes('s')) next.height = Math.max(min.height, start.height + deltaY);
      if (edge.includes('w')) {
        // Dragging the left edge moves the origin, so clamp the delta rather
        // than the width — otherwise the window walks away at minimum size.
        const clamped = Math.min(deltaX, start.width - min.width);
        next.x = start.x + clamped;
        next.width = start.width - clamped;
      }
      if (edge.includes('n')) {
        const clamped = Math.min(deltaY, start.height - min.height);
        next.y = Math.max(area.y, start.y + clamped);
        next.height = start.height - (next.y - start.y);
      }

      applyLive(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setGesture(null);
      setWindowRect(id, live.current);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [id, rect, isMaximized, meta.minSize, focusWindow, applyLive, setWindowRect, currentArea]);

  const onTitleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const zones: Array<[string, SnapZone]> = [
      ['Snap left', 'left'],
      ['Snap right', 'right'],
      ['Snap top-left', 'top-left'],
      ['Snap bottom-right', 'bottom-right'],
    ];
    showContextMenu(event, [
      { label: isMaximized ? 'Restore' : 'Maximize', onClick: () => toggleMaximize(id) },
      { label: 'Minimize', onClick: () => toggleMinimize(id) },
      ...zones.map(([label, zone], index) => ({
        label,
        onClick: () => snapWindow(id, zone),
        divider: index === 0,
      })),
      { label: 'Close', variant: 'danger' as const, shortcut: 'Ctrl+W', divider: true, onClick: () => closeWindow(id) },
    ]);
  }, [id, isMaximized, showContextMenu, toggleMaximize, toggleMinimize, snapWindow, closeWindow]);

  if (isMinimized) return null;

  const Icon = meta.icon;

  return (
    <div
      ref={nodeRef}
      role="dialog"
      aria-label={title}
      className={[
        'os-window absolute top-0 left-0 flex flex-col pointer-events-auto',
        isMaximized ? 'os-window--maximized' : 'rounded-xl',
        isActive ? 'os-window--active' : 'os-window--inactive',
        gesture ? 'os-window--gesture' : '',
      ].join(' ')}
      style={{
        zIndex,
        ...(isMaximized
          ? { inset: 0, width: '100%', height: '100%' }
          : {
              width: rect.width,
              height: rect.height,
              transform: `translate(${rect.x}px, ${rect.y}px)`,
            }),
      }}
      onPointerDownCapture={() => { if (!isActive) focusWindow(id); }}
    >
      <div
        className="os-window__titlebar flex items-center h-9 shrink-0 select-none"
        onPointerDown={onTitleBarPointerDown}
        onDoubleClick={() => toggleMaximize(id)}
        onContextMenu={onTitleContextMenu}
      >
        <div className="flex-1 flex items-center px-3 gap-2 h-full min-w-0 cursor-default">
          <span className={`os-window__icon bg-linear-to-br ${meta.tint}`}>
            <Icon size={11} strokeWidth={2.5} />
          </span>
          <span className="os-window__title truncate">{title}</span>
        </div>

        <div className="flex items-center h-full">
          <button
            data-window-control
            aria-label={`Minimize ${title}`}
            onClick={(event) => { event.stopPropagation(); toggleMinimize(id, event); }}
            className="os-window__button"
          >
            <Minus size={15} />
          </button>
          <button
            data-window-control
            aria-label={isMaximized ? `Restore ${title}` : `Maximize ${title}`}
            onClick={(event) => { event.stopPropagation(); toggleMaximize(id, event); }}
            className="os-window__button"
          >
            {isMaximized ? <RestoreIcon size={12} /> : <Square size={11} />}
          </button>
          <button
            data-window-control
            aria-label={`Close ${title}`}
            onClick={(event) => { event.stopPropagation(); closeWindow(id); }}
            className="os-window__button os-window__button--close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="os-window__body flex-1 min-h-0 relative">
        {children}
        {/* Swallows pointer events over app content while a gesture is live, so
            canvases and inputs cannot steal the drag mid-stroke. */}
        {gesture && <div className="absolute inset-0 z-50" />}
      </div>

      {!isMaximized && RESIZE_HANDLES.map(({ edge, className, cursor }) => (
        <div
          key={edge}
          onPointerDown={(event) => onResizePointerDown(event, edge)}
          className={`absolute z-40 ${className}`}
          style={{ cursor }}
        />
      ))}
    </div>
  );
});

/** Translucent overlay showing where a dragged window will land. */
export function SnapPreview() {
  const { snapPreview, workAreaRect } = useOSWindows();
  if (!snapPreview) return null;
  const target = rectForZone(snapPreview, workAreaRect);
  return (
    <div
      className="os-snap-preview pointer-events-none absolute rounded-xl"
      style={{
        transform: `translate(${target.x}px, ${target.y}px)`,
        width: target.width,
        height: target.height,
      }}
    />
  );
}
