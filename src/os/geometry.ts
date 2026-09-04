/** Window geometry helpers: tiling slots, clamping and cascade placement. */

import type { Rect, SnapZone } from '../types/os';

/** Height of the top bar; the workspace begins below it. */
export const TOP_BAR_HEIGHT = 34;
/** Reserved strip at the bottom so a tiled window never sits under the dock. */
export const DOCK_RESERVE = 12;

export interface Viewport {
  width: number;
  height: number;
}

/** The rectangle windows are allowed to occupy, in workspace coordinates. */
export function workArea(viewport: Viewport, rightInset = 0): Rect {
  return {
    x: 0,
    y: 0,
    width: Math.max(320, viewport.width - rightInset),
    height: Math.max(240, viewport.height - TOP_BAR_HEIGHT - DOCK_RESERVE),
  };
}

export function rectForZone(zone: SnapZone, area: Rect): Rect {
  const halfWidth = Math.round(area.width / 2);
  const halfHeight = Math.round(area.height / 2);
  switch (zone) {
    case 'maximized':
      return { ...area };
    case 'left':
      return { x: area.x, y: area.y, width: halfWidth, height: area.height };
    case 'right':
      return { x: area.x + halfWidth, y: area.y, width: area.width - halfWidth, height: area.height };
    case 'top':
      return { x: area.x, y: area.y, width: area.width, height: halfHeight };
    case 'bottom':
      return { x: area.x, y: area.y + halfHeight, width: area.width, height: area.height - halfHeight };
    case 'top-left':
      return { x: area.x, y: area.y, width: halfWidth, height: halfHeight };
    case 'top-right':
      return { x: area.x + halfWidth, y: area.y, width: area.width - halfWidth, height: halfHeight };
    case 'bottom-left':
      return { x: area.x, y: area.y + halfHeight, width: halfWidth, height: area.height - halfHeight };
    case 'bottom-right':
      return {
        x: area.x + halfWidth,
        y: area.y + halfHeight,
        width: area.width - halfWidth,
        height: area.height - halfHeight,
      };
  }
}

/** Distance from an edge that arms a snap while dragging. */
const EDGE = 24;
/** Corner zones need a larger bite so they're reachable before the edges win. */
const CORNER = 110;

/**
 * Which tiling slot a drag at (x, y) is hovering, if any. Corners are checked
 * first so dragging into a corner tiles a quarter rather than a half.
 */
export function zoneForPointer(x: number, y: number, area: Rect): SnapZone | null {
  const nearLeft = x <= area.x + EDGE;
  const nearRight = x >= area.x + area.width - EDGE;
  const nearTop = y <= area.y + EDGE;
  const nearBottom = y >= area.y + area.height - EDGE;

  const inLeftCorner = x <= area.x + CORNER;
  const inRightCorner = x >= area.x + area.width - CORNER;
  const inTopCorner = y <= area.y + CORNER;
  const inBottomCorner = y >= area.y + area.height - CORNER;

  if ((nearTop && inLeftCorner) || (nearLeft && inTopCorner)) return 'top-left';
  if ((nearTop && inRightCorner) || (nearRight && inTopCorner)) return 'top-right';
  if ((nearBottom && inLeftCorner) || (nearLeft && inBottomCorner)) return 'bottom-left';
  if ((nearBottom && inRightCorner) || (nearRight && inBottomCorner)) return 'bottom-right';

  if (nearTop) return 'maximized';
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  if (nearBottom) return 'bottom';
  return null;
}

/** Keep a window inside the work area, always leaving its title bar grabbable. */
export function clampRect(rect: Rect, area: Rect, minSize: { width: number; height: number }): Rect {
  const width = Math.max(minSize.width, Math.min(rect.width, area.width));
  const height = Math.max(minSize.height, Math.min(rect.height, area.height));
  // A window may hang off the left/right edge, but at least this much of the
  // title bar must remain on screen to drag it back.
  const grabMargin = 120;
  return {
    width,
    height,
    x: Math.max(area.x - width + grabMargin, Math.min(rect.x, area.x + area.width - grabMargin)),
    y: Math.max(area.y, Math.min(rect.y, area.y + area.height - TOP_BAR_HEIGHT)),
  };
}

/**
 * Where a newly opened window goes: centred-ish, then cascaded by the number of
 * windows already open so a stack of them stays individually clickable.
 */
export function cascadeRect(
  size: { width: number; height: number },
  area: Rect,
  openCount: number,
  minSize: { width: number; height: number },
): Rect {
  const step = 32;
  const offset = (openCount % 8) * step;
  const width = Math.min(size.width, area.width - 40);
  const height = Math.min(size.height, area.height - 40);
  const base = {
    x: Math.round((area.width - width) / 2) - 60 + offset,
    y: Math.round((area.height - height) / 2) - 40 + offset,
    width,
    height,
  };
  return clampRect(base, area, minSize);
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * Where a window actually sits right now.
 *
 * `OSWindow.rect` stores *floating* geometry only — it is what a window
 * returns to when un-maximized or un-tiled, and it is what gets persisted.
 * A maximized or snapped window's on-screen box is a pure function of its
 * state and the current work area, so it is derived here rather than written
 * back into state on every viewport change.
 */
export function effectiveRect(
  window: { rect: Rect; isMaximized: boolean; snap: SnapZone | null },
  area: Rect,
  minSize: { width: number; height: number },
): Rect {
  if (window.isMaximized) return { ...area };
  if (window.snap) return rectForZone(window.snap, area);
  return clampRect(window.rect, area, minSize);
}
