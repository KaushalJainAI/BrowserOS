/**
 * Spotlight-style launcher.
 *
 * Searches apps, the filesystem, open windows and clipboard history in one
 * list, and is fully keyboard-driven — arrows move, Enter runs, Escape closes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, X, CornerDownLeft, FileText, Folder, ClipboardList, type LucideIcon,
} from 'lucide-react';
import { useOSActions, useOSNotifications, useOSShell, useOSWindows, APPS } from '../../contexts/osState';
import { searchApps } from '../../os/apps';
import { vfs, appForFile } from '../../os/vfs';
import type { AppId } from '../../types/os';

type ResultKind = 'app' | 'file' | 'folder' | 'window' | 'clipboard';

interface Result {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  /** Set for apps and windows, which render as their app tile. */
  tint?: string;
  icon?: LucideIcon;
  run: () => void;
}

const KIND_LABEL: Record<ResultKind, string> = {
  app: 'Applications',
  window: 'Open windows',
  file: 'Files',
  folder: 'Folders',
  clipboard: 'Clipboard',
};


/**
 * Mounted only while open, so the query starts from `searchSeed` on every
 * launch without an effect resetting it afterwards. `os_search` from the agent
 * sets the seed, which means an agent-opened launcher arrives pre-filled.
 */
export function SearchOverlay() {
  const { overlay, searchSeed } = useOSShell();
  // `key` forces a fresh panel when the agent seeds a new query into an
  // already-open launcher.
  return overlay === 'search' ? <SearchPanel key={searchSeed} seed={searchSeed} /> : null;
}

function SearchPanel({ seed }: { seed: string }) {
  const { setOverlay, openApp, focusWindow, addToClipboard } = useOSActions();
  const { windows } = useOSWindows();
  const { clipboard } = useOSNotifications();

  const [query, setQuery] = useState(seed);
  const [requestedCursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOverlay(null), [setOverlay]);

  useEffect(() => {
    // Focus after paint so the input exists and the caret lands at the end.
    const handle = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLowerCase();
    const out: Result[] = [];

    for (const entry of windows) {
      if (needle && !entry.title.toLowerCase().includes(needle)) continue;
      out.push({
        id: `win:${entry.id}`,
        kind: 'window',
        title: entry.title,
        subtitle: entry.isMinimized ? 'Minimized' : 'Open window',
        tint: APPS[entry.appId].tint,
        icon: APPS[entry.appId].icon,
        run: () => focusWindow(entry.id),
      });
    }

    for (const app of searchApps(query).slice(0, needle ? 8 : 20)) {
      out.push({
        id: `app:${app.id}`,
        kind: 'app',
        title: app.title,
        subtitle: app.description,
        tint: app.tint,
        icon: app.icon,
        run: () => openApp(app.id as AppId),
      });
    }

    if (needle) {
      for (const node of vfs.search(query, 8)) {
        out.push({
          id: `fs:${node.path}`,
          kind: node.kind === 'dir' ? 'folder' : 'file',
          title: node.name,
          subtitle: node.path,
          run: () => {
            if (node.kind === 'dir') openApp('explorer', { state: { cwd: node.path } });
            else openApp(appForFile(node.path) as AppId, { state: { path: node.path } });
          },
        });
      }

      for (const entry of clipboard.filter((item) => item.text.toLowerCase().includes(needle)).slice(0, 4)) {
        out.push({
          id: `clip:${entry.id}`,
          kind: 'clipboard',
          title: entry.text.slice(0, 70),
          subtitle: 'Copy again',
          run: () => {
            navigator.clipboard.writeText(entry.text).catch(() => undefined);
            addToClipboard(entry.text);
          },
        });
      }
    }

    return out;
  }, [query, windows, clipboard, openApp, focusWindow, addToClipboard]);

  // Clamped on read rather than corrected in an effect: refining a query can
  // shrink the list under the cursor, and a render must never point past the
  // end of it even for one frame.
  const cursor = Math.min(requestedCursor, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((current) => (current + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((current) => (current - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[cursor];
      if (selected) {
        selected.run();
        close();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }, [results, cursor, close]);

  // Group headers are emitted inline while keeping one flat index space, so
  // arrow keys traverse the visible order without extra bookkeeping.
  let lastKind: ResultKind | null = null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-start justify-center pt-[12vh] px-4 os-anim-fade">
      <div className="os-scrim" onClick={close} />

      <div
        className="os-panel relative w-full max-w-2xl overflow-hidden os-anim-drop flex flex-col max-h-[70vh]"
        role="dialog"
        aria-label="Search"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--os-border)] shrink-0">
          <Search size={18} className="text-[var(--os-text-dim)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search apps, files, windows…"
            aria-label="Search query"
            className="flex-1 bg-transparent border-none outline-none text-[16px] text-[var(--os-text)] placeholder:text-[var(--os-text-dim)]"
          />
          <button onClick={close} className="os-icon-button" aria-label="Close search">
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-14 text-center text-[var(--os-text-dim)]">
              <Search size={30} className="mx-auto mb-3 opacity-30" />
              <p className="text-[13px]">No results for “{query}”</p>
            </div>
          ) : (
            results.map((result, index) => {
              const header = result.kind !== lastKind ? KIND_LABEL[result.kind] : null;
              lastKind = result.kind;
              return (
                <div key={result.id}>
                  {header && <p className="os-field-label px-3 pt-3 pb-1.5">{header}</p>}
                  <button
                    data-index={index}
                    data-selected={index === cursor}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => { result.run(); close(); }}
                    className="os-row group"
                  >
                    <ResultGlyph kind={result.kind} tint={result.tint} icon={result.icon} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-[var(--os-text)] truncate">
                        {result.title}
                      </span>
                      <span className="block text-[11px] text-[var(--os-text-dim)] truncate">
                        {result.subtitle}
                      </span>
                    </span>
                    {index === cursor && (
                      <CornerDownLeft size={13} className="shrink-0 text-[var(--os-text-dim)]" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="h-9 px-4 flex items-center gap-4 border-t border-[var(--os-border)] text-[10.5px] text-[var(--os-text-dim)] shrink-0">
          <span className="flex items-center gap-1.5"><kbd className="os-kbd">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1.5"><kbd className="os-kbd">↵</kbd> open</span>
          <span className="flex items-center gap-1.5"><kbd className="os-kbd">esc</kbd> close</span>
          <span className="ml-auto">{results.length} result{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}

function ResultGlyph({ kind, tint, icon }: { kind: ResultKind; tint?: string; icon?: LucideIcon }) {
  if (tint && icon) {
    const Icon = icon;
    return (
      <span className={`w-8 h-8 rounded-lg shrink-0 bg-linear-to-br ${tint} flex items-center justify-center text-white`}>
        <Icon size={15} strokeWidth={2} />
      </span>
    );
  }
  const Icon = kind === 'folder' ? Folder : kind === 'clipboard' ? ClipboardList : FileText;
  return (
    <span className="w-8 h-8 rounded-lg shrink-0 bg-[var(--os-hover)] flex items-center justify-center text-[var(--os-text-muted)]">
      <Icon size={15} />
    </span>
  );
}
