/**
 * BrowserOS Virtual File System.
 *
 * The shared substrate every app reads and writes, and the surface Buddy
 * addresses by path. Persisted to localStorage; mirrored into the OS state
 * snapshot so the agent can reason about files without scraping the DOM.
 */

export type VNodeKind = 'file' | 'dir';

export interface VNode {
  kind: VNodeKind;
  name: string;
  /** Absolute POSIX-style path, e.g. `/home/Documents/notes.md`. */
  path: string;
  /** File payload. Text for text-ish files, data-URL for binary (images). */
  content: string;
  /** MIME-ish hint used to pick the app that opens this file. */
  mime: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'browseros.vfs.v1';

export const ROOT = '/';
export const HOME = '/home';

/** Normalise a path: collapse slashes, resolve `.`/`..`, strip trailing slash. */
export function normalize(path: string): string {
  const absolute = path.startsWith('/') ? path : `${HOME}/${path}`;
  const parts: string[] = [];
  for (const segment of absolute.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return `/${parts.join('/')}`;
}

export function dirname(path: string): string {
  const normalized = normalize(path);
  if (normalized === ROOT) return ROOT;
  const cut = normalized.lastIndexOf('/');
  return cut <= 0 ? ROOT : normalized.slice(0, cut);
}

export function basename(path: string): string {
  const normalized = normalize(path);
  return normalized === ROOT ? '/' : normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function extname(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function join(...segments: string[]): string {
  return normalize(segments.join('/'));
}

const MIME_BY_EXT: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  sheet: 'application/x-browseros-sheet',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  js: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  py: 'text/x-python',
  html: 'text/html',
  css: 'text/css',
  sh: 'text/x-sh',
  log: 'text/plain',
};

export function mimeFor(path: string): string {
  return MIME_BY_EXT[extname(path)] ?? 'text/plain';
}

/** Which app should open a given file. Drives double-click in Files and `open` in the shell. */
export function appForFile(path: string): string {
  const ext = extname(path);
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image-editor';
  if (ext === 'svg') return 'svg-maker';
  if (['csv', 'sheet'].includes(ext)) return 'sheets-editor';
  if (ext === 'json') return 'analyst';
  return 'word-editor';
}

function now() {
  return Date.now();
}

function makeDir(path: string): VNode {
  return {
    kind: 'dir',
    name: basename(path),
    path,
    content: '',
    mime: 'inode/directory',
    createdAt: now(),
    updatedAt: now(),
  };
}

function makeFile(path: string, content: string, mime?: string): VNode {
  return {
    kind: 'file',
    name: basename(path),
    path,
    content,
    mime: mime ?? mimeFor(path),
    createdAt: now(),
    updatedAt: now(),
  };
}

const SEED_README = `# Welcome to BrowserOS

This is a real filesystem. Everything you see here is stored on your machine
and shared between every app on the desktop.

- **Files** browses it.
- **Terminal** speaks a POSIX-ish shell against it (\`ls\`, \`cd\`, \`cat\`, \`mkdir\`, \`open\`, ...).
- **DocWriter** edits and saves back to it.
- **GridCalc** opens the \`.csv\` files in \`Documents\`.
- **Buddy** can read and write any path here on your behalf.

Try asking Buddy: *"open the terminal and list my documents"*.
`;

const SEED_BUDGET = `Month,Revenue,Spend,Net
Jan,42000,18000,24000
Feb,45800,19400,26400
Mar,51200,21000,30200
Apr,49700,22500,27200
May,58300,23100,35200
Jun,61900,24800,37100
`;

function seed(): Record<string, VNode> {
  const nodes: Record<string, VNode> = {};
  const dirs = [
    ROOT,
    HOME,
    `${HOME}/Documents`,
    `${HOME}/Pictures`,
    `${HOME}/Projects`,
    `${HOME}/.trash`,
  ];
  for (const dir of dirs) nodes[dir] = makeDir(dir);

  const files: Array<[string, string]> = [
    [`${HOME}/README.md`, SEED_README],
    [`${HOME}/Documents/budget.csv`, SEED_BUDGET],
    [
      `${HOME}/Documents/notes.md`,
      '# Scratch notes\n\n- Buddy can edit this file directly.\n- Saving here shows up everywhere at once.\n',
    ],
    [
      `${HOME}/Projects/hello.py`,
      'def main():\n    print("hello from BrowserOS")\n\n\nif __name__ == "__main__":\n    main()\n',
    ],
  ];
  for (const [path, content] of files) nodes[path] = makeFile(path, content);
  return nodes;
}

function load(): Record<string, VNode> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Record<string, VNode>;
    // A tree without a root is corrupt; reseed rather than hand apps a broken fs.
    if (!parsed || typeof parsed !== 'object' || !parsed[ROOT]) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

type Listener = () => void;

class VirtualFileSystem {
  private nodes: Record<string, VNode> = load();
  private listeners = new Set<Listener>();
  private flushHandle: ReturnType<typeof setTimeout> | null = null;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Monotonic snapshot token so `useSyncExternalStore` can cache correctly. */
  private snapshot = 0;
  getSnapshot = () => this.snapshot;

  private changed() {
    this.snapshot += 1;
    this.listCache.clear();
    this.listeners.forEach((listener) => listener());
    // Writes come in bursts (typing in the editor); coalesce the serialisation.
    if (this.flushHandle) clearTimeout(this.flushHandle);
    this.flushHandle = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.nodes));
      } catch {
        // Quota exceeded — keep running from memory rather than losing the session.
      }
    }, 250);
  }

  exists(path: string): boolean {
    return normalize(path) in this.nodes;
  }

  stat(path: string): VNode | null {
    return this.nodes[normalize(path)] ?? null;
  }

  /** Direct children of a directory, dirs first then files, alphabetical. */
  list(path: string): VNode[] {
    const dir = normalize(path);
    const prefix = dir === ROOT ? '/' : `${dir}/`;
    return Object.values(this.nodes)
      .filter((node) => {
        if (node.path === dir) return false;
        if (!node.path.startsWith(prefix)) return false;
        return !node.path.slice(prefix.length).includes('/');
      })
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  /** Every path in the tree, for search and for the agent's state snapshot. */
  walk(from: string = ROOT): VNode[] {
    const root = normalize(from);
    const prefix = root === ROOT ? '/' : `${root}/`;
    return Object.values(this.nodes)
      .filter((node) => node.path !== ROOT && (node.path === root || node.path.startsWith(prefix)))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  read(path: string): string | null {
    const node = this.stat(path);
    return node && node.kind === 'file' ? node.content : null;
  }

  /** Create or overwrite a file, creating parent directories as needed. */
  write(path: string, content: string, mime?: string): VNode {
    const target = normalize(path);
    this.mkdirp(dirname(target));
    const existing = this.nodes[target];
    const node: VNode =
      existing && existing.kind === 'file'
        ? { ...existing, content, mime: mime ?? existing.mime, updatedAt: now() }
        : makeFile(target, content, mime);
    this.nodes[target] = node;
    this.changed();
    return node;
  }

  mkdirp(path: string): VNode {
    const target = normalize(path);
    if (target === ROOT) return this.nodes[ROOT];
    const segments = target.slice(1).split('/');
    let current = '';
    for (const segment of segments) {
      current += `/${segment}`;
      if (!this.nodes[current]) this.nodes[current] = makeDir(current);
    }
    this.changed();
    return this.nodes[target];
  }

  /** Remove a path and, for directories, everything beneath it. */
  remove(path: string): boolean {
    const target = normalize(path);
    if (target === ROOT || target === HOME) return false;
    if (!this.nodes[target]) return false;
    const prefix = `${target}/`;
    for (const key of Object.keys(this.nodes)) {
      if (key === target || key.startsWith(prefix)) delete this.nodes[key];
    }
    this.changed();
    return true;
  }

  rename(path: string, nextName: string): VNode | null {
    const from = normalize(path);
    const node = this.nodes[from];
    if (!node || from === ROOT || from === HOME) return null;
    const to = join(dirname(from), nextName);
    if (this.nodes[to]) return null;
    this.move(from, to);
    return this.nodes[to] ?? null;
  }

  /** Move a path (and its subtree) to a new location. */
  move(path: string, nextPath: string): boolean {
    const from = normalize(path);
    const to = normalize(nextPath);
    if (from === ROOT || from === HOME || from === to) return false;
    if (!this.nodes[from]) return false;
    // Refuse to move a directory inside itself — that would orphan the subtree.
    if (to.startsWith(`${from}/`)) return false;

    const prefix = `${from}/`;
    const moving = Object.keys(this.nodes).filter((key) => key === from || key.startsWith(prefix));
    for (const key of moving) {
      const node = this.nodes[key];
      const nextKey = key === from ? to : to + key.slice(from.length);
      delete this.nodes[key];
      this.nodes[nextKey] = { ...node, path: nextKey, name: basename(nextKey), updatedAt: now() };
    }
    this.changed();
    return true;
  }

  copy(path: string, nextPath: string): boolean {
    const from = normalize(path);
    const to = normalize(nextPath);
    const node = this.nodes[from];
    if (!node) return false;
    if (to.startsWith(`${from}/`)) return false;
    const prefix = `${from}/`;
    for (const key of Object.keys(this.nodes)) {
      if (key !== from && !key.startsWith(prefix)) continue;
      const source = this.nodes[key];
      const nextKey = key === from ? to : to + key.slice(from.length);
      this.nodes[nextKey] = {
        ...source,
        path: nextKey,
        name: basename(nextKey),
        createdAt: now(),
        updatedAt: now(),
      };
    }
    this.changed();
    return true;
  }

  /** Pick a non-colliding path, e.g. `notes.md` -> `notes (2).md`. */
  uniquePath(path: string): string {
    const target = normalize(path);
    if (!this.nodes[target]) return target;
    const dir = dirname(target);
    const name = basename(target);
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const suffix = dot > 0 ? name.slice(dot) : '';
    for (let index = 2; index < 1000; index += 1) {
      const candidate = join(dir, `${stem} (${index})${suffix}`);
      if (!this.nodes[candidate]) return candidate;
    }
    return join(dir, `${stem} (${Date.now()})${suffix}`);
  }

  /**
   * Reference-stable reads for `useSyncExternalStore`.
   *
   * The store contract requires `getSnapshot` to return the *same* reference
   * until something actually changes, or React re-renders forever. These caches
   * are keyed by the mutation counter, so repeated reads between writes hand
   * back the identical array or string.
   */
  private listCache = new Map<string, { at: number; value: VNode[] }>();

  listStable(path: string): VNode[] {
    const key = normalize(path);
    const cached = this.listCache.get(key);
    if (cached && cached.at === this.snapshot) return cached.value;
    const value = this.list(key);
    this.listCache.set(key, { at: this.snapshot, value });
    return value;
  }

  search(query: string, limit = 20): VNode[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return this.walk()
      .filter((node) => node.name.toLowerCase().includes(needle))
      .slice(0, limit);
  }

  /** Compact tree rendering handed to Buddy as filesystem context. */
  describe(maxEntries = 80): string {
    return this.walk(HOME)
      .slice(0, maxEntries)
      .map((node) => (node.kind === 'dir' ? `${node.path}/` : `${node.path} (${node.content.length}b)`))
      .join('\n');
  }

  reset() {
    this.nodes = seed();
    this.changed();
  }
}

export const vfs = new VirtualFileSystem();
