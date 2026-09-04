/**
 * The screen context handed to Buddy.
 *
 * The previous implementation scraped every `button, a, input, …` in the
 * document on a `MutationObserver` and streamed it up the socket. That fired
 * constantly (the clock ticks once a second), sent kilobytes of class names as
 * the agent's only picture of the machine, and made the socket a sync channel
 * instead of an action channel.
 *
 * This builds a semantic snapshot instead — what is running, what is focused,
 * what is on disk — computed on demand at send time and carried in the request
 * body. The DOM listing is still produced, but bounded and secondary: it is a
 * fallback for `frontend_click`, not the primary representation.
 */

import type { AppId, ClipboardEntry, OSTheme, OSWindow } from '../types/os';
import { APPS } from './apps';
import { vfs } from './vfs';

export interface InteractableNode {
  buddy_id: string;
  tag: string;
  role: string;
  text: string;
}

export interface OSSnapshot {
  url: string;
  title: string;
  taken_at: string;
  desktop: {
    theme: OSTheme['mode'];
    accent: string;
    wallpaper: string;
    pinned_apps: AppId[];
    desktop_icons: AppId[];
  };
  windows: Array<{
    id: string;
    app_id: AppId;
    title: string;
    focused: boolean;
    is_minimized: boolean;
    is_maximized: boolean;
    snap: string | null;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    z_index: number;
    state_data: Record<string, unknown>;
  }>;
  focused_app: AppId | null;
  filesystem: {
    cwd: string;
    tree: string;
  };
  clipboard: {
    latest: string | null;
    count: number;
  };
  available_apps: Array<{ id: AppId; title: string; description: string; running: boolean }>;
  interactables: InteractableNode[];
}

/** Cap the DOM listing so a busy desktop cannot blow up the request body. */
const MAX_INTERACTABLES = 60;
const MAX_TEXT = 80;

/**
 * Tag and list the visible interactive elements. Ids are assigned here, at
 * capture time, so the ids the agent receives are the ids that resolve when it
 * sends a `frontend_click` back.
 */
export function captureInteractables(): InteractableNode[] {
  const selector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[role="button"]',
    '[data-buddy-target]',
  ].join(', ');

  const nodes: InteractableNode[] = [];
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  for (const element of elements) {
    if (nodes.length >= MAX_INTERACTABLES) break;
    // `offsetParent` is null for display:none, but also for position:fixed
    // elements — which the top bar and dock are. Use the box instead.
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (box.bottom < 0 || box.top > window.innerHeight) continue;

    const buddyId = `buddy-node-${nodes.length}`;
    element.setAttribute('data-buddy-id', buddyId);

    const label =
      element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.getAttribute('placeholder')
      || element.innerText
      || '';

    nodes.push({
      buddy_id: buddyId,
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role') || element.getAttribute('type') || '',
      text: label.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT),
    });
  }

  return nodes;
}

export interface SnapshotInput {
  windows: OSWindow[];
  activeWindowId: string | null;
  theme: OSTheme;
  pinnedApps: AppId[];
  desktopApps: AppId[];
  clipboard: ClipboardEntry[];
  cwd?: string;
}

export function buildSnapshot(input: SnapshotInput): OSSnapshot {
  const { windows, activeWindowId, theme, pinnedApps, desktopApps, clipboard } = input;
  const runningApps = new Set(windows.map((window) => window.appId));
  const focused = windows.find((window) => window.id === activeWindowId) ?? null;

  return {
    url: window.location.href,
    title: document.title,
    taken_at: new Date().toISOString(),
    desktop: {
      theme: theme.mode,
      accent: theme.accent,
      wallpaper: theme.wallpaper,
      pinned_apps: pinnedApps,
      desktop_icons: desktopApps,
    },
    windows: windows.map((entry) => ({
      id: entry.id,
      app_id: entry.appId,
      title: entry.title,
      focused: entry.id === activeWindowId,
      is_minimized: entry.isMinimized,
      is_maximized: entry.isMaximized,
      snap: entry.snap,
      position_x: Math.round(entry.rect.x),
      position_y: Math.round(entry.rect.y),
      width: Math.round(entry.rect.width),
      height: Math.round(entry.rect.height),
      z_index: entry.zIndex,
      state_data: entry.state,
    })),
    focused_app: focused?.appId ?? null,
    filesystem: {
      cwd: input.cwd ?? '/home',
      tree: vfs.describe(),
    },
    clipboard: {
      latest: clipboard[0]?.text.slice(0, 200) ?? null,
      count: clipboard.length,
    },
    available_apps: (Object.keys(APPS) as AppId[]).map((id) => ({
      id,
      title: APPS[id].title,
      description: APPS[id].description,
      running: runningApps.has(id),
    })),
    interactables: captureInteractables(),
  };
}

/**
 * Compact human-readable rendering. Cheaper for the model to read than the raw
 * JSON, and useful for showing the user exactly what was shared.
 */
export function summarizeSnapshot(snapshot: OSSnapshot): string {
  const lines: string[] = [];
  lines.push(`Desktop: ${snapshot.desktop.theme} theme, accent ${snapshot.desktop.accent}`);
  if (snapshot.windows.length === 0) {
    lines.push('Windows: none open');
  } else {
    lines.push('Windows:');
    for (const entry of snapshot.windows) {
      const flags = [
        entry.focused ? 'focused' : null,
        entry.is_minimized ? 'minimized' : null,
        entry.is_maximized ? 'maximized' : null,
        entry.snap ? `snapped:${entry.snap}` : null,
      ].filter(Boolean).join(', ');
      const state = Object.keys(entry.state_data).length
        ? ` state=${JSON.stringify(entry.state_data).slice(0, 160)}`
        : '';
      lines.push(`  - ${entry.app_id} "${entry.title}" [${flags || 'floating'}]${state}`);
    }
  }
  lines.push(`Filesystem (${snapshot.filesystem.cwd}):`);
  lines.push(snapshot.filesystem.tree.split('\n').map((line) => `  ${line}`).join('\n'));
  return lines.join('\n');
}
