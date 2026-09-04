/**
 * Files — a working browser over the virtual filesystem.
 *
 * Navigation state (`cwd`) lives in window state, so Buddy can drive this
 * window to a directory with `os_open_app { state: { cwd } }` and the location
 * survives a reload.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Folder, FileText, ChevronRight, ArrowLeft, ArrowUp, Home, Search, Plus,
  Trash2, Pencil, Copy, LayoutGrid, List, FolderPlus, FilePlus, ExternalLink,
  Image as ImageIcon, Table as TableIcon, Braces, FileCode,
} from 'lucide-react';
import { useOSActions } from '../../contexts/osState';
import { useWindowState } from '../../contexts/osState';
import { useDirectory } from '../../hooks/useVfs';
import { vfs, HOME, dirname, basename, join, extname, appForFile, type VNode } from '../../os/vfs';
import { relativeTime, formatBytes } from '../../os/time';
import type { AppId } from '../../types/os';

const PLACES: Array<{ label: string; path: string }> = [
  { label: 'Home', path: HOME },
  { label: 'Documents', path: `${HOME}/Documents` },
  { label: 'Pictures', path: `${HOME}/Pictures` },
  { label: 'Projects', path: `${HOME}/Projects` },
];

function iconFor(node: VNode) {
  if (node.kind === 'dir') return Folder;
  const ext = extname(node.path);
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return ImageIcon;
  if (['csv', 'sheet'].includes(ext)) return TableIcon;
  if (ext === 'json') return Braces;
  if (['js', 'ts', 'tsx', 'py', 'html', 'css', 'sh'].includes(ext)) return FileCode;
  return FileText;
}

function tintFor(node: VNode): string {
  if (node.kind === 'dir') return 'text-amber-400';
  const ext = extname(node.path);
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return 'text-pink-400';
  if (['csv', 'sheet'].includes(ext)) return 'text-emerald-400';
  if (ext === 'json') return 'text-yellow-400';
  if (['js', 'ts', 'tsx', 'py', 'html', 'css', 'sh'].includes(ext)) return 'text-violet-400';
  return 'text-sky-400';
}

export default function FileExplorerApp() {
  const { openApp, showContextMenu, notify, addToClipboard } = useOSActions();
  const { state, setState, setTitle } = useWindowState({ cwd: HOME, view: 'grid' as 'grid' | 'list' });

  const cwd = typeof state.cwd === 'string' ? state.cwd : HOME;
  const view = state.view === 'list' ? 'list' : 'grid';

  const [history, setHistory] = useState<string[]>([cwd]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [query, setQuery] = useState('');

  const entries = useDirectory(cwd);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? entries.filter((node) => node.name.toLowerCase().includes(needle)) : entries;
  }, [entries, query]);

  const navigate = useCallback((path: string, viaHistory = false) => {
    setState({ cwd: path });
    setTitle(`Files — ${basename(path) || '/'}`);
    setSelected(null);
    setQuery('');
    if (!viaHistory) {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), path]);
      setHistoryIndex((index) => index + 1);
    }
  }, [setState, setTitle, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex === 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    navigate(history[next], true);
  }, [history, historyIndex, navigate]);

  const open = useCallback((node: VNode) => {
    if (node.kind === 'dir') {
      navigate(node.path);
      return;
    }
    openApp(appForFile(node.path) as AppId, { state: { path: node.path } });
  }, [navigate, openApp]);

  const createFolder = useCallback(() => {
    const path = vfs.uniquePath(join(cwd, 'New folder'));
    vfs.mkdirp(path);
    setRenaming(path);
    setRenameDraft(basename(path));
  }, [cwd]);

  const createFile = useCallback(() => {
    const path = vfs.uniquePath(join(cwd, 'Untitled.md'));
    vfs.write(path, '');
    setRenaming(path);
    setRenameDraft(basename(path));
  }, [cwd]);

  const commitRename = useCallback(() => {
    if (!renaming) return;
    const name = renameDraft.trim();
    if (name && name !== basename(renaming) && !name.includes('/')) {
      if (!vfs.rename(renaming, name)) {
        notify({ message: `“${name}” already exists here.`, type: 'warning' });
      }
    }
    setRenaming(null);
  }, [renaming, renameDraft, notify]);

  const remove = useCallback((node: VNode) => {
    // Deleting moves to .trash rather than destroying, so an agent-issued
    // delete is recoverable.
    const trashed = vfs.uniquePath(join(`${HOME}/.trash`, node.name));
    if (vfs.move(node.path, trashed)) {
      notify({ message: `Moved “${node.name}” to Trash.`, type: 'info' });
      setSelected(null);
    }
  }, [notify]);

  const onEntryContext = useCallback((event: React.MouseEvent, node: VNode) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(node.path);
    showContextMenu(event, [
      { label: 'Open', icon: ExternalLink, onClick: () => open(node) },
      {
        label: 'Rename',
        icon: Pencil,
        onClick: () => { setRenaming(node.path); setRenameDraft(node.name); },
      },
      {
        label: 'Duplicate',
        icon: Copy,
        onClick: () => vfs.copy(node.path, vfs.uniquePath(node.path)),
      },
      {
        label: 'Copy path',
        onClick: () => { addToClipboard(node.path); notify({ message: 'Path copied.', type: 'success' }); },
      },
      { label: 'Move to Trash', icon: Trash2, variant: 'danger', divider: true, onClick: () => remove(node) },
    ]);
  }, [showContextMenu, open, remove, addToClipboard, notify]);

  const crumbs = useMemo(() => {
    const parts = cwd === '/' ? [] : cwd.slice(1).split('/');
    return parts.map((part, index) => ({
      name: part,
      path: `/${parts.slice(0, index + 1).join('/')}`,
    }));
  }, [cwd]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <button onClick={goBack} disabled={historyIndex === 0} className="os-icon-button" aria-label="Back">
          <ArrowLeft size={15} />
        </button>
        <button
          onClick={() => navigate(dirname(cwd))}
          disabled={cwd === '/'}
          className="os-icon-button"
          aria-label="Parent folder"
        >
          <ArrowUp size={15} />
        </button>
        <button onClick={() => navigate(HOME)} className="os-icon-button" aria-label="Home">
          <Home size={15} />
        </button>

        <nav className="flex-1 flex items-center gap-0.5 min-w-0 px-2 overflow-hidden" aria-label="Breadcrumb">
          {crumbs.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center gap-0.5 min-w-0">
              {index > 0 && <ChevronRight size={12} className="text-[var(--os-text-dim)] shrink-0" />}
              <button
                onClick={() => navigate(crumb.path)}
                className="px-1.5 py-0.5 rounded text-[12px] font-medium hover:bg-[var(--os-hover)] truncate"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="relative w-44 shrink-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--os-text-dim)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter"
            aria-label="Filter files"
            className="os-input h-7 pl-7 text-[12px]"
          />
        </div>

        <button
          onClick={() => setState({ view: view === 'grid' ? 'list' : 'grid' })}
          className="os-icon-button"
          aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
        >
          {view === 'grid' ? <List size={15} /> : <LayoutGrid size={15} />}
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="app-sidebar">
          <p className="os-field-label px-2 pt-1 pb-2">Places</p>
          {PLACES.map((place) => (
            <button
              key={place.path}
              onClick={() => navigate(place.path)}
              data-active={cwd === place.path}
              className="os-row py-1.5 text-[12.5px]"
            >
              <Folder size={14} className="shrink-0" />
              <span className="truncate">{place.label}</span>
            </button>
          ))}

          <p className="os-field-label px-2 pt-4 pb-2">New</p>
          <button onClick={createFolder} className="os-row py-1.5 text-[12.5px]">
            <FolderPlus size={14} className="shrink-0" /> Folder
          </button>
          <button onClick={createFile} className="os-row py-1.5 text-[12.5px]">
            <FilePlus size={14} className="shrink-0" /> Document
          </button>

          <button
            onClick={() => navigate(`${HOME}/.trash`)}
            data-active={cwd === `${HOME}/.trash`}
            className="os-row py-1.5 text-[12.5px] mt-auto"
          >
            <Trash2 size={14} className="shrink-0" /> Trash
          </button>
        </aside>

        <div
          className="flex-1 overflow-y-auto p-3 min-w-0"
          onClick={() => setSelected(null)}
          onContextMenu={(event) => {
            event.preventDefault();
            showContextMenu(event, [
              { label: 'New folder', icon: FolderPlus, onClick: createFolder },
              { label: 'New document', icon: FilePlus, onClick: createFile },
            ]);
          }}
        >
          {visible.length === 0 ? (
            <div className="app-empty">
              <Folder size={36} className="opacity-30" />
              <p className="text-[13px]">{query ? `Nothing matches “${query}”` : 'This folder is empty'}</p>
              {!query && (
                <button onClick={createFile} className="os-button gap-2">
                  <Plus size={14} /> New document
                </button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(104px,1fr))]">
              {visible.map((node) => {
                const Icon = iconFor(node);
                return (
                  <div
                    key={node.path}
                    role="button"
                    tabIndex={0}
                    data-selected={selected === node.path}
                    onClick={(event) => { event.stopPropagation(); setSelected(node.path); }}
                    onDoubleClick={() => open(node)}
                    onKeyDown={(event) => { if (event.key === 'Enter') open(node); }}
                    onContextMenu={(event) => onEntryContext(event, node)}
                    className="flex flex-col items-center gap-2 p-2.5 rounded-xl border border-transparent hover:bg-[var(--os-hover)] data-[selected=true]:bg-[rgb(var(--os-accent-rgb)/0.15)] data-[selected=true]:border-[rgb(var(--os-accent-rgb)/0.4)] transition-colors cursor-default"
                    title={node.path}
                  >
                    <Icon size={34} strokeWidth={1.6} className={tintFor(node)} />
                    {renaming === node.path ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename();
                          if (event.key === 'Escape') setRenaming(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="os-input h-6 text-[11px] text-center px-1"
                      />
                    ) : (
                      <span className="text-[11px] text-center leading-tight line-clamp-2 break-words">
                        {node.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[var(--os-text-dim)]">
                  <th className="text-left font-semibold px-2 py-1.5">Name</th>
                  <th className="text-left font-semibold px-2 py-1.5 w-28">Size</th>
                  <th className="text-left font-semibold px-2 py-1.5 w-32">Modified</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((node) => {
                  const Icon = iconFor(node);
                  return (
                    <tr
                      key={node.path}
                      data-selected={selected === node.path}
                      onClick={(event) => { event.stopPropagation(); setSelected(node.path); }}
                      onDoubleClick={() => open(node)}
                      onContextMenu={(event) => onEntryContext(event, node)}
                      className="cursor-default hover:bg-[var(--os-hover)] data-[selected=true]:bg-[rgb(var(--os-accent-rgb)/0.15)]"
                    >
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon size={15} className={`shrink-0 ${tintFor(node)}`} />
                          {renaming === node.path ? (
                            <input
                              autoFocus
                              value={renameDraft}
                              onChange={(event) => setRenameDraft(event.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') commitRename();
                                if (event.key === 'Escape') setRenaming(null);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="os-input h-6 text-[12px]"
                            />
                          ) : (
                            <span className="truncate">{node.name}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[var(--os-text-dim)]">
                        {node.kind === 'dir' ? '—' : formatBytes(node.content.length)}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--os-text-dim)]">
                        {relativeTime(node.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="app-statusbar">
        <span>{entries.length} item{entries.length === 1 ? '' : 's'}</span>
        {selected && <span className="truncate mono">{selected}</span>}
      </div>
    </div>
  );
}
