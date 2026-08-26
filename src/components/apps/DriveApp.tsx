/**
 * CloudVault — an activity-oriented view of the same workspace filesystem.
 *
 * Files, but organised by recency and type rather than hierarchy, which is the
 * view you want when looking for "the thing I was just working on".
 */

import { useMemo, useState } from 'react';
import {
  HardDrive, Clock, Bookmark, FileText, Image as ImageIcon, Table as TableIcon,
  Braces, FileCode, Trash2, ExternalLink, Search,
} from 'lucide-react';
import { useOSActions } from '../../contexts/osState';
import { useVfsSnapshot } from '../../hooks/useVfs';
import { vfs, HOME, appForFile, extname, dirname, type VNode } from '../../os/vfs';
import { relativeTime, formatBytes } from '../../os/time';
import { loadPersisted, savePersisted } from '../../os/persistence';
import type { AppId } from '../../types/os';

type View = 'recent' | 'starred' | 'all' | 'trash';

const VIEWS: Array<{ id: View; label: string; icon: typeof Clock }> = [
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'starred', label: 'Starred', icon: Bookmark },
  { id: 'all', label: 'All files', icon: HardDrive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

function iconFor(path: string) {
  const ext = extname(path);
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return ImageIcon;
  if (['csv', 'sheet'].includes(ext)) return TableIcon;
  if (ext === 'json') return Braces;
  if (['js', 'ts', 'tsx', 'py', 'html', 'css', 'sh'].includes(ext)) return FileCode;
  return FileText;
}

export default function DriveApp() {
  const { openApp, notify } = useOSActions();
  const version = useVfsSnapshot();
  const [view, setView] = useState<View>('recent');
  const [query, setQuery] = useState('');
  const [starred, setStarred] = useState<string[]>(() => loadPersisted<string[]>('drive.starred', []));

  const toggleStar = (path: string) => {
    setStarred((current) => {
      const next = current.includes(path) ? current.filter((entry) => entry !== path) : [...current, path];
      savePersisted('drive.starred', next);
      return next;
    });
  };

  const { files, totals } = useMemo(() => {
    // `version` is the filesystem's mutation counter — the scan below reads
    // `vfs` directly, so it is what makes this recompute after a write.
    void version;
    const all = vfs.walk(HOME).filter((node): node is VNode => node.kind === 'file');
    const trashPrefix = `${HOME}/.trash/`;
    const live = all.filter((node) => !node.path.startsWith(trashPrefix));

    let selection: VNode[];
    if (view === 'trash') selection = all.filter((node) => node.path.startsWith(trashPrefix));
    else if (view === 'starred') selection = live.filter((node) => starred.includes(node.path));
    else if (view === 'recent') selection = [...live].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40);
    else selection = [...live].sort((a, b) => a.path.localeCompare(b.path));

    const needle = query.trim().toLowerCase();
    if (needle) selection = selection.filter((node) => node.name.toLowerCase().includes(needle));

    return {
      files: selection,
      totals: {
        count: live.length,
        bytes: live.reduce((sum, node) => sum + node.content.length, 0),
      },
    };
  }, [view, query, starred, version]);

  // localStorage is the backing store; 5 MB is the conservative browser floor.
  const quota = 5 * 1024 * 1024;
  const usedRatio = Math.min(1, totals.bytes / quota);

  return (
    <div className="app-shell" style={{ flexDirection: 'row' }}>
      <aside className="app-sidebar">
        {VIEWS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setView(entry.id)}
            data-active={view === entry.id}
            className="os-row py-2 text-[12.5px]"
          >
            <entry.icon size={14} className="shrink-0" />
            <span className="truncate">{entry.label}</span>
          </button>
        ))}

        <div className="mt-auto pt-4 px-2">
          <p className="os-field-label mb-2">Storage</p>
          <div className="h-1.5 rounded-full bg-[var(--os-hover)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, usedRatio * 100)}%`,
                background: usedRatio > 0.85 ? 'var(--os-danger)' : 'var(--os-accent)',
              }}
            />
          </div>
          <p className="text-[10.5px] text-[var(--os-text-dim)] mt-1.5">
            {formatBytes(totals.bytes)} of {formatBytes(quota)}
          </p>
          <p className="text-[10.5px] text-[var(--os-text-dim)]">{totals.count} files</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="app-toolbar">
          <div className="relative w-full max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--os-text-dim)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files"
              aria-label="Search files"
              className="os-input h-7 pl-7 text-[12px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {files.length === 0 ? (
            <div className="app-empty">
              <HardDrive size={34} className="opacity-30" />
              <p className="text-[13px]">
                {query
                  ? `Nothing matches “${query}”`
                  : `Nothing in ${VIEWS.find((entry) => entry.id === view)?.label}`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((node) => {
                const Icon = iconFor(node.path);
                const isStarred = starred.includes(node.path);
                return (
                  <div
                    key={node.path}
                    className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--os-hover)] transition-colors"
                  >
                    <Icon size={17} className="shrink-0 text-[var(--os-text-muted)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium truncate">{node.name}</p>
                      <p className="text-[10.5px] text-[var(--os-text-dim)] truncate">
                        {dirname(node.path)} · {formatBytes(node.content.length)} · {relativeTime(node.updatedAt)}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleStar(node.path)}
                      className="os-icon-button w-7 h-7 shrink-0"
                      aria-label={isStarred ? 'Remove bookmark' : 'Add bookmark'}
                    >
                      <Bookmark
                        size={13}
                        fill={isStarred ? 'currentColor' : 'none'}
                        style={{ color: isStarred ? 'var(--os-warning)' : undefined }}
                      />
                    </button>
                    <button
                      onClick={() => openApp(appForFile(node.path) as AppId, { state: { path: node.path } })}
                      className="os-icon-button w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100"
                      aria-label={`Open ${node.name}`}
                    >
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={() => {
                        vfs.remove(node.path);
                        notify({ message: `Deleted ${node.name}.`, type: 'info' });
                      }}
                      className="os-icon-button w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${node.name}`}
                    >
                      <Trash2 size={13} style={{ color: 'var(--os-danger)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
