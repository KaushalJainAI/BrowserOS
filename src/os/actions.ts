/**
 * The agent action registry — the contract between Buddy and the desktop.
 *
 * Every way the agent can affect the OS is declared here exactly once, with a
 * handler and a machine-readable schema. Both delivery paths converge on
 * `dispatch`:
 *
 *   - `POST /api/buddy/commands/` returns `action_details` (synchronous reply)
 *   - the `buddy_{user_id}` channel group pushes `trigger_action` frames
 *
 * Previously the socket path only understood three `frontend_*` actions, so
 * every `os_*` action the backend emitted was dropped on the floor. Routing
 * both paths through one table means an action works the moment it is defined,
 * regardless of which transport carried it, and every invocation lands in the
 * same audit trail.
 */

import type { AgentActionRecord, AppId, NotificationType, Rect, SnapZone } from '../types/os';
import { resolveAppId } from './apps';
import { vfs, appForFile, normalize } from './vfs';

/**
 * What the registry needs from the window manager. `OSProvider` supplies this;
 * keeping it an interface means actions are unit-testable without React.
 */
export interface ActionKernel {
  openApp: (appId: AppId, options?: { state?: Record<string, unknown>; forceNew?: boolean }) => string;
  focusApp: (appId: AppId) => string | null;
  focusWindow: (windowId: string) => void;
  closeApp: (appId: AppId) => boolean;
  closeAllWindows: () => number;
  minimizeApp: (appId: AppId) => boolean;
  maximizeApp: (appId: AppId) => boolean;
  restoreApp: (appId: AppId) => boolean;
  snapApp: (appId: AppId, zone: SnapZone) => boolean;
  setWindowRect: (appId: AppId, rect: Partial<Rect>) => boolean;
  tileWindows: () => number;
  pinApp: (appId: AppId) => void;
  unpinApp: (appId: AppId) => void;
  addToDesktop: (appId: AppId) => void;
  removeFromDesktop: (appId: AppId) => void;
  setWallpaper: (value: string) => void;
  setThemeMode: (mode: 'dark' | 'light') => void;
  setAccent: (value: string) => void;
  notify: (input: { title?: string; message: string; type?: NotificationType; source?: 'system' | 'buddy' }) => void;
  setAppState: (appId: AppId, state: Record<string, unknown>) => boolean;
  writeClipboard: (text: string) => void;
  readClipboard: () => string | null;
  openSearch: (query?: string) => void;
}

export interface ActionSpec {
  name: string;
  /** Shown in Settings > Agent so the user can see what Buddy is allowed to do. */
  summary: string;
  params: string[];
  handler: (params: Record<string, unknown>, kernel: ActionKernel) => string;
}

class ActionError extends Error {}

function fail(message: string): never {
  throw new ActionError(message);
}

function str(params: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function num(params: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

/**
 * Resolve the app an action targets. The backend sends `app_id`, but it also
 * nests a serialized window under `window`, and free-text commands may arrive
 * with just a human name — accept all three rather than failing on shape.
 */
function requireApp(params: Record<string, unknown>): AppId {
  const nested = params.window as Record<string, unknown> | undefined;
  const raw =
    str(params, 'app_id', 'appId', 'app', 'target')
    ?? (nested ? str(nested, 'app_id', 'appId') : null);
  if (!raw) fail('This action needs an app_id.');
  const appId = resolveAppId(raw);
  if (!appId) fail(`Unknown app "${raw}".`);
  return appId;
}

function requirePath(params: Record<string, unknown>): string {
  const raw = str(params, 'path', 'file', 'filename', 'target');
  if (!raw) fail('This action needs a file path.');
  return normalize(raw);
}

const SNAP_ZONES: SnapZone[] = [
  'left', 'right', 'top', 'bottom',
  'top-left', 'top-right', 'bottom-left', 'bottom-right', 'maximized',
];

const SPECS: ActionSpec[] = [
  // ── Windows ──────────────────────────────────────────────────────────────
  {
    name: 'os_open_app',
    summary: 'Open an application, optionally with initial state (e.g. a file to load).',
    params: ['app_id', 'state?', 'new_window?'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      const state = (params.state && typeof params.state === 'object')
        ? params.state as Record<string, unknown>
        : undefined;
      kernel.openApp(appId, { state, forceNew: params.new_window === true });
      return `Opened ${appId}.`;
    },
  },
  {
    name: 'os_focus_app',
    summary: 'Bring an app to the front, launching it if it is not running.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      if (!kernel.focusApp(appId)) kernel.openApp(appId);
      return `Focused ${appId}.`;
    },
  },
  {
    name: 'os_close_app',
    summary: 'Close every window belonging to an app.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      if (!kernel.closeApp(appId)) fail(`${appId} is not running.`);
      return `Closed ${appId}.`;
    },
  },
  {
    name: 'os_close_all',
    summary: 'Close every open window.',
    params: [],
    handler: (_params, kernel) => `Closed ${kernel.closeAllWindows()} window(s).`,
  },
  {
    name: 'os_minimize_app',
    summary: 'Minimise an app to the dock.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      if (!kernel.minimizeApp(appId)) fail(`${appId} is not running.`);
      return `Minimised ${appId}.`;
    },
  },
  {
    name: 'os_maximize_app',
    summary: 'Maximise an app to fill the workspace.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      if (!kernel.maximizeApp(appId)) kernel.openApp(appId);
      return `Maximised ${appId}.`;
    },
  },
  {
    name: 'os_restore_app',
    summary: 'Restore an app to its floating size and position.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      if (!kernel.restoreApp(appId)) fail(`${appId} is not running.`);
      return `Restored ${appId}.`;
    },
  },
  {
    name: 'os_snap_app',
    summary: 'Tile an app into a half or quarter of the screen.',
    params: ['app_id', 'zone'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      const raw = (str(params, 'zone', 'position', 'side') ?? '').toLowerCase().replace(/[\s_]+/g, '-');
      const zone = SNAP_ZONES.find((candidate) => candidate === raw);
      if (!zone) fail(`Unknown snap zone "${raw}". Use one of: ${SNAP_ZONES.join(', ')}.`);
      if (!kernel.snapApp(appId, zone)) kernel.openApp(appId);
      kernel.snapApp(appId, zone);
      return `Snapped ${appId} to ${zone}.`;
    },
  },
  {
    name: 'os_move_window',
    summary: 'Move an app window to explicit workspace coordinates.',
    params: ['app_id', 'x', 'y'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      const x = num(params, 'x', 'position_x');
      const y = num(params, 'y', 'position_y');
      if (x === null && y === null) fail('Provide x and/or y.');
      if (!kernel.setWindowRect(appId, { ...(x !== null && { x }), ...(y !== null && { y }) })) {
        fail(`${appId} is not running.`);
      }
      return `Moved ${appId}.`;
    },
  },
  {
    name: 'os_resize_window',
    summary: 'Resize an app window.',
    params: ['app_id', 'width', 'height'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      const width = num(params, 'width', 'w');
      const height = num(params, 'height', 'h');
      if (width === null && height === null) fail('Provide width and/or height.');
      if (!kernel.setWindowRect(appId, {
        ...(width !== null && { width }),
        ...(height !== null && { height }),
      })) {
        fail(`${appId} is not running.`);
      }
      return `Resized ${appId}.`;
    },
  },
  {
    name: 'os_tile_windows',
    summary: 'Arrange all open windows in a grid.',
    params: [],
    handler: (_params, kernel) => `Tiled ${kernel.tileWindows()} window(s).`,
  },

  // ── Shell ────────────────────────────────────────────────────────────────
  {
    name: 'os_pin_app',
    summary: 'Pin an app to the dock.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      kernel.pinApp(appId);
      return `Pinned ${appId} to the dock.`;
    },
  },
  {
    name: 'os_unpin_app',
    summary: 'Remove an app from the dock.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      kernel.unpinApp(appId);
      return `Unpinned ${appId}.`;
    },
  },
  {
    name: 'os_add_to_desktop',
    summary: 'Put an app shortcut on the desktop.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      kernel.addToDesktop(appId);
      return `Added ${appId} to the desktop.`;
    },
  },
  {
    name: 'os_remove_from_desktop',
    summary: 'Remove an app shortcut from the desktop.',
    params: ['app_id'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      kernel.removeFromDesktop(appId);
      return `Removed ${appId} from the desktop.`;
    },
  },
  {
    name: 'os_set_wallpaper',
    summary: 'Change the desktop wallpaper (preset id or any CSS background value).',
    params: ['wallpaper'],
    handler: (params, kernel) => {
      const wallpaper = str(params, 'wallpaper', 'value', 'background');
      if (!wallpaper) fail('This action needs a wallpaper.');
      kernel.setWallpaper(wallpaper);
      return 'Wallpaper updated.';
    },
  },
  {
    name: 'os_set_theme',
    summary: 'Switch the desktop between dark and light.',
    params: ['mode'],
    handler: (params, kernel) => {
      const mode = (str(params, 'mode', 'theme') ?? '').toLowerCase();
      if (mode !== 'dark' && mode !== 'light') fail('Mode must be "dark" or "light".');
      kernel.setThemeMode(mode);
      return `Switched to ${mode} mode.`;
    },
  },
  {
    name: 'os_set_accent',
    summary: 'Change the system accent colour.',
    params: ['color'],
    handler: (params, kernel) => {
      const color = str(params, 'color', 'accent', 'value');
      if (!color) fail('This action needs a colour.');
      kernel.setAccent(color);
      return `Accent set to ${color}.`;
    },
  },
  {
    name: 'os_notify',
    summary: 'Raise a desktop notification.',
    params: ['message', 'title?', 'type?'],
    handler: (params, kernel) => {
      const nested = params.notification as Record<string, unknown> | undefined;
      const message = str(params, 'message', 'body', 'text')
        ?? (nested ? str(nested, 'message', 'body') : null);
      if (!message) fail('This action needs a message.');
      const type = (str(params, 'type') ?? (nested ? str(nested, 'type') : null) ?? 'info') as NotificationType;
      kernel.notify({
        title: str(params, 'title') ?? (nested ? str(nested, 'title') : null) ?? 'Buddy',
        message,
        type: (['info', 'success', 'warning', 'error'] as const).includes(type) ? type : 'info',
        source: 'buddy',
      });
      return 'Notification delivered.';
    },
  },
  {
    name: 'os_search',
    summary: 'Open the launcher, optionally pre-filled with a query.',
    params: ['query?'],
    handler: (params, kernel) => {
      const query = str(params, 'query', 'q', 'text') ?? '';
      kernel.openSearch(query);
      return query ? `Searching for "${query}".` : 'Opened search.';
    },
  },

  // ── Filesystem ───────────────────────────────────────────────────────────
  {
    name: 'fs_write_file',
    summary: 'Create or overwrite a file, creating parent folders as needed.',
    params: ['path', 'content'],
    handler: (params) => {
      const path = requirePath(params);
      const content = typeof params.content === 'string' ? params.content : '';
      vfs.write(path, content);
      return `Wrote ${content.length} bytes to ${path}.`;
    },
  },
  {
    name: 'fs_append_file',
    summary: 'Append text to a file.',
    params: ['path', 'content'],
    handler: (params) => {
      const path = requirePath(params);
      const addition = typeof params.content === 'string' ? params.content : '';
      vfs.write(path, (vfs.read(path) ?? '') + addition);
      return `Appended to ${path}.`;
    },
  },
  {
    name: 'fs_read_file',
    summary: 'Read a file back to the agent.',
    params: ['path'],
    handler: (params) => {
      const path = requirePath(params);
      const content = vfs.read(path);
      if (content === null) fail(`No such file: ${path}`);
      return content.length > 2000 ? `${content.slice(0, 2000)}\n… (truncated)` : content;
    },
  },
  {
    name: 'fs_list',
    summary: 'List the contents of a directory.',
    params: ['path?'],
    handler: (params) => {
      const path = params.path ? requirePath(params) : '/home';
      const node = vfs.stat(path);
      if (!node) fail(`No such directory: ${path}`);
      const entries = vfs.list(path);
      if (!entries.length) return `${path} is empty.`;
      return entries.map((entry) => (entry.kind === 'dir' ? `${entry.name}/` : entry.name)).join('\n');
    },
  },
  {
    name: 'fs_mkdir',
    summary: 'Create a directory.',
    params: ['path'],
    handler: (params) => {
      const path = requirePath(params);
      vfs.mkdirp(path);
      return `Created ${path}.`;
    },
  },
  {
    name: 'fs_delete',
    summary: 'Delete a file or directory.',
    params: ['path'],
    handler: (params) => {
      const path = requirePath(params);
      if (!vfs.remove(path)) fail(`Could not delete ${path}.`);
      return `Deleted ${path}.`;
    },
  },
  {
    name: 'fs_move',
    summary: 'Move or rename a file or directory.',
    params: ['path', 'destination'],
    handler: (params) => {
      const from = requirePath(params);
      const to = str(params, 'destination', 'to', 'dest', 'new_path');
      if (!to) fail('This action needs a destination.');
      if (!vfs.move(from, normalize(to))) fail(`Could not move ${from}.`);
      return `Moved ${from} → ${normalize(to)}.`;
    },
  },
  {
    name: 'fs_open',
    summary: 'Open a file in whichever app handles its type.',
    params: ['path'],
    handler: (params, kernel) => {
      const path = requirePath(params);
      const node = vfs.stat(path);
      if (!node) fail(`No such file: ${path}`);
      if (node.kind === 'dir') {
        kernel.openApp('explorer', { state: { cwd: path } });
        return `Opened ${path} in Files.`;
      }
      const appId = appForFile(path) as AppId;
      kernel.openApp(appId, { state: { path } });
      return `Opened ${path} in ${appId}.`;
    },
  },

  // ── App state & clipboard ────────────────────────────────────────────────
  {
    name: 'app_set_state',
    summary: "Patch a running app's state (the same shape as OSAppWindow.state_data).",
    params: ['app_id', 'state'],
    handler: (params, kernel) => {
      const appId = requireApp(params);
      const state = params.state;
      if (!state || typeof state !== 'object') fail('This action needs a state object.');
      if (!kernel.setAppState(appId, state as Record<string, unknown>)) fail(`${appId} is not running.`);
      return `Updated ${appId} state.`;
    },
  },
  {
    name: 'os_clipboard_write',
    summary: 'Put text on the clipboard and into clipboard history.',
    params: ['text'],
    handler: (params, kernel) => {
      const text = str(params, 'text', 'content', 'value');
      if (!text) fail('This action needs text.');
      kernel.writeClipboard(text);
      return 'Copied to clipboard.';
    },
  },
  {
    name: 'os_clipboard_read',
    summary: 'Read the most recent clipboard entry.',
    params: [],
    handler: (_params, kernel) => kernel.readClipboard() ?? 'Clipboard is empty.',
  },

  // ── DOM-level fallback ───────────────────────────────────────────────────
  // Used when the agent has no semantic action for what it wants to do. Kept
  // deliberately narrow: prefer an `os_*`/`fs_*` action wherever one exists.
  {
    name: 'frontend_click',
    summary: 'Click a specific element captured in the last screen context.',
    params: ['buddy_id'],
    handler: (params) => {
      const id = str(params, 'buddy_id', 'id', 'selector');
      if (!id) fail('This action needs a buddy_id.');
      const element = document.querySelector<HTMLElement>(`[data-buddy-id="${CSS.escape(id)}"]`)
        ?? document.querySelector<HTMLElement>(id);
      if (!element) fail(`No element matching "${id}".`);
      highlight(element);
      element.click();
      return `Clicked ${id}.`;
    },
  },
  {
    name: 'frontend_fill',
    summary: 'Type a value into an input captured in the last screen context.',
    params: ['buddy_id', 'value'],
    handler: (params) => {
      const id = str(params, 'buddy_id', 'id', 'selector');
      if (!id) fail('This action needs a buddy_id.');
      const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[data-buddy-id="${CSS.escape(id)}"]`,
      ) ?? document.querySelector<HTMLInputElement | HTMLTextAreaElement>(id);
      if (!element) fail(`No input matching "${id}".`);
      const value = str(params, 'value', 'text') ?? '';
      highlight(element);
      // React tracks the previous value on the DOM node; bypass its setter so
      // the synthetic `input` event is not swallowed as a no-op change.
      const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return `Filled ${id}.`;
    },
  },
];

/** Brief outline so the user can watch the agent work. */
function highlight(element: HTMLElement): void {
  element.classList.add('buddy-acting');
  window.setTimeout(() => element.classList.remove('buddy-acting'), 900);
}

const REGISTRY = new Map(SPECS.map((spec) => [spec.name, spec]));

export const ACTION_SPECS: ReadonlyArray<Omit<ActionSpec, 'handler'>> = SPECS.map(
  ({ name, summary, params }) => ({ name, summary, params }),
);

export function isKnownAction(name: string): boolean {
  return REGISTRY.has(name);
}

let sequence = 0;

/**
 * Run one agent action and return an audit record. Never throws: a bad action
 * from the model should surface in the UI as a failed step, not tear down the
 * socket handler or the chat turn that delivered it.
 */
export function dispatchAction(
  action: string,
  parameters: Record<string, unknown>,
  kernel: ActionKernel,
  origin: AgentActionRecord['origin'] = 'socket',
): AgentActionRecord {
  sequence += 1;
  const base = {
    id: `act_${Date.now()}_${sequence}`,
    action,
    parameters,
    at: Date.now(),
    origin,
  };

  const spec = REGISTRY.get(action);
  if (!spec) {
    // `browser_*` actions execute server-side against Puppeteer MCP; the frame
    // is an FYI for the desktop, so log it rather than reporting a failure.
    if (action.startsWith('browser_')) {
      const detail = typeof parameters.url === 'string' ? parameters.url
        : typeof parameters.command_text === 'string' ? parameters.command_text
        : 'browser action';
      kernel.notify({ title: 'Browser', message: detail, type: 'info', source: 'buddy' });
      return { ...base, status: 'ok', message: `Browser command dispatched: ${detail}` };
    }
    return { ...base, status: 'error', message: `Unsupported action "${action}".` };
  }

  try {
    return { ...base, status: 'ok', message: spec.handler(parameters, kernel) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed.';
    return { ...base, status: 'error', message };
  }
}
