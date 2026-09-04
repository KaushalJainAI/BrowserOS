/** Clipboard history — searchable, with working copy, save-to-file and delete. */

import { useMemo, useState } from 'react';
import { Copy, Trash2, Search, ClipboardList, Check, FileDown, Eraser } from 'lucide-react';
import { useOSActions, useOSNotifications } from '../../contexts/osState';
import { vfs, HOME, join } from '../../os/vfs';
import { relativeTime } from '../../os/time';

export default function ClipboardApp() {
  const { addToClipboard, removeClipboardEntry, clearClipboard, notify, openApp } = useOSActions();
  const { clipboard } = useOSNotifications();
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? clipboard.filter((entry) => entry.text.toLowerCase().includes(needle)) : clipboard;
  }, [clipboard, query]);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Re-adding bumps the entry to the top, matching how the system
        // clipboard behaves after a fresh copy.
        addToClipboard(text);
        setCopiedId(id);
        window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
      })
      .catch(() => notify({ message: 'Clipboard access was denied by the browser.', type: 'error' }));
  };

  const saveToFile = (text: string) => {
    const path = vfs.uniquePath(join(`${HOME}/Documents`, 'clipping.md'));
    vfs.write(path, text);
    notify({ message: `Saved to ${path}.`, type: 'success' });
    openApp('word-editor', { state: { path } });
  };

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--os-text-dim)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search clipboard history"
            aria-label="Search clipboard history"
            className="os-input h-7 pl-7 text-[12px]"
          />
        </div>
        <span className="flex-1" />
        <button
          onClick={clearClipboard}
          disabled={clipboard.length === 0}
          className="os-button os-button--ghost gap-2"
        >
          <Eraser size={14} /> Clear all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div className="app-empty">
            <ClipboardList size={36} className="opacity-30" />
            <p className="text-[13px]">
              {query ? `Nothing matches “${query}”` : 'Nothing copied yet'}
            </p>
            {!query && (
              <p className="text-[11.5px] max-w-xs">
                Anything you copy anywhere on the desktop lands here automatically.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group p-3 rounded-xl border border-[var(--os-border)] hover:border-[var(--os-border-strong)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <p className="flex-1 min-w-0 mono text-[12px] leading-relaxed whitespace-pre-wrap line-clamp-6 os-selectable text-[var(--os-text-muted)]">
                    {entry.text}
                  </p>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => copy(entry.id, entry.text)}
                      className="os-icon-button"
                      aria-label="Copy again"
                      title="Copy again"
                    >
                      {copiedId === entry.id
                        ? <Check size={14} style={{ color: 'var(--os-success)' }} />
                        : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => saveToFile(entry.text)}
                      className="os-icon-button"
                      aria-label="Save to a file"
                      title="Save to Documents"
                    >
                      <FileDown size={14} />
                    </button>
                    <button
                      onClick={() => removeClipboardEntry(entry.id)}
                      className="os-icon-button"
                      aria-label="Delete entry"
                      title="Delete"
                    >
                      <Trash2 size={14} style={{ color: 'var(--os-danger)' }} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--os-text-dim)]">
                  {relativeTime(entry.copiedAt)} · {entry.text.length} chars ·{' '}
                  {entry.text.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="app-statusbar">
        <span>{clipboard.length} item{clipboard.length === 1 ? '' : 's'} · newest 100 kept</span>
      </div>
    </div>
  );
}
