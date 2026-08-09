/**
 * DocWriter — a markdown editor backed by the workspace filesystem.
 *
 * The open path lives in window state, so `fs_open` and `os_open_app` can point
 * this editor at a document, and Buddy can rewrite the file underneath it with
 * `fs_write_file` — the buffer picks the change up as long as it is clean.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Save, FilePlus, FolderOpen, Eye, Pencil, Columns2, Bold, Italic,
  List, ListOrdered, Heading2, Code2, Link2, Quote, Download,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { useDocument } from '../../hooks/useVfs';
import { vfs, HOME, join, basename } from '../../os/vfs';

type Mode = 'edit' | 'split' | 'preview';

interface Snippet {
  icon: typeof Bold;
  label: string;
  before: string;
  after: string;
  /** Prefix applies at the start of the line rather than wrapping a selection. */
  linePrefix?: boolean;
}

const SNIPPETS: Snippet[] = [
  { icon: Bold, label: 'Bold', before: '**', after: '**' },
  { icon: Italic, label: 'Italic', before: '_', after: '_' },
  { icon: Heading2, label: 'Heading', before: '## ', after: '', linePrefix: true },
  { icon: List, label: 'Bullet list', before: '- ', after: '', linePrefix: true },
  { icon: ListOrdered, label: 'Numbered list', before: '1. ', after: '', linePrefix: true },
  { icon: Quote, label: 'Quote', before: '> ', after: '', linePrefix: true },
  { icon: Code2, label: 'Code', before: '`', after: '`' },
  { icon: Link2, label: 'Link', before: '[', after: '](https://)' },
];

export default function WordEditorApp() {
  const { notify, openApp } = useOSActions();
  const { state, setState, setTitle } = useWindowState({ path: null as string | null, mode: 'split' as Mode });

  const path = typeof state.path === 'string' ? state.path : null;
  const mode: Mode = state.mode === 'edit' || state.mode === 'preview' ? state.mode : 'split';

  const setPath = useCallback((next: string | null) => setState({ path: next }), [setState]);
  const document_ = useDocument(path, setPath, '# Untitled\n\n');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  useEffect(() => {
    setTitle(`${path ? basename(path) : 'Untitled'}${document_.isDirty ? ' •' : ''}`);
  }, [path, document_.isDirty, setTitle]);

  const stats = useMemo(() => {
    const text = document_.content;
    const words = text.split(/\s+/).filter(Boolean).length;
    return {
      words,
      characters: text.length,
      lines: text ? text.split('\n').length : 0,
      // 200 wpm is the usual reading-speed convention.
      readingMinutes: Math.max(1, Math.round(words / 200)),
    };
  }, [document_.content]);

  const save = useCallback(() => {
    if (path) {
      document_.save();
      notify({ message: `Saved ${basename(path)}.`, type: 'success' });
      return;
    }
    setSaveAsName('Untitled.md');
    setShowSaveAs(true);
  }, [path, document_, notify]);

  const confirmSaveAs = useCallback(() => {
    const name = saveAsName.trim();
    if (!name) return;
    const target = vfs.uniquePath(join(`${HOME}/Documents`, name.endsWith('.md') ? name : `${name}.md`));
    document_.saveAs(target);
    setShowSaveAs(false);
    notify({ message: `Saved to ${target}.`, type: 'success' });
  }, [saveAsName, document_, notify]);

  /**
   * Wrap the selection (or prefix its lines) and restore the caret so the user
   * can keep typing — a toolbar that loses the cursor is worse than no toolbar.
   */
  const applySnippet = useCallback((snippet: Snippet) => {
    const element = textareaRef.current;
    if (!element) return;
    const { selectionStart, selectionEnd, value } = element;

    if (snippet.linePrefix) {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const next = value.slice(0, lineStart) + snippet.before + value.slice(lineStart);
      document_.setContent(next);
      requestAnimationFrame(() => {
        element.focus();
        const offset = snippet.before.length;
        element.setSelectionRange(selectionStart + offset, selectionEnd + offset);
      });
      return;
    }

    const selected = value.slice(selectionStart, selectionEnd);
    const next =
      value.slice(0, selectionStart)
      + snippet.before + selected + snippet.after
      + value.slice(selectionEnd);
    document_.setContent(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(
        selectionStart + snippet.before.length,
        selectionStart + snippet.before.length + selected.length,
      );
    });
  }, [document_]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
      return;
    }
    if (mod && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      applySnippet(SNIPPETS[0]);
      return;
    }
    if (mod && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      applySnippet(SNIPPETS[1]);
      return;
    }
    // Tab inserts an indent instead of leaving the editor.
    if (event.key === 'Tab') {
      event.preventDefault();
      const element = textareaRef.current;
      if (!element) return;
      const { selectionStart, selectionEnd, value } = element;
      document_.setContent(`${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`);
      requestAnimationFrame(() => element.setSelectionRange(selectionStart + 2, selectionStart + 2));
    }
  }, [save, applySnippet, document_]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <button onClick={() => document_.reset('# Untitled\n\n')} className="os-icon-button" aria-label="New document" title="New">
          <FilePlus size={15} />
        </button>
        <button
          onClick={() => openApp('explorer', { state: { cwd: `${HOME}/Documents` } })}
          className="os-icon-button"
          aria-label="Browse files"
          title="Browse files"
        >
          <FolderOpen size={15} />
        </button>
        <button
          onClick={save}
          data-active={document_.isDirty}
          className="os-icon-button"
          aria-label="Save document"
          title="Save (Ctrl+S)"
        >
          <Save size={15} />
        </button>

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        {SNIPPETS.map((snippet) => (
          <button
            key={snippet.label}
            onClick={() => applySnippet(snippet)}
            className="os-icon-button"
            aria-label={snippet.label}
            title={snippet.label}
          >
            <snippet.icon size={14} />
          </button>
        ))}

        <span className="flex-1" />

        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--os-surface-sunken)]">
          {([['edit', Pencil], ['split', Columns2], ['preview', Eye]] as const).map(([value, Icon]) => (
            <button
              key={value}
              onClick={() => setState({ mode: value })}
              data-active={mode === value}
              className="os-icon-button w-7 h-7"
              aria-label={`${value} view`}
              title={`${value} view`}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const blob = new Blob([document_.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const anchor = window.document.createElement('a');
            anchor.href = url;
            anchor.download = path ? basename(path) : 'untitled.md';
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="os-icon-button"
          aria-label="Download"
          title="Download"
        >
          <Download size={15} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {mode !== 'preview' && (
          <textarea
            ref={textareaRef}
            value={document_.content}
            onChange={(event) => document_.setContent(event.target.value)}
            onKeyDown={onKeyDown}
            spellCheck
            aria-label="Document content"
            placeholder="Start writing…"
            className={`${mode === 'split' ? 'w-1/2 border-r border-[var(--os-border)]' : 'w-full'} h-full p-6 bg-transparent border-none outline-none resize-none mono text-[13px] leading-[1.75] text-[var(--os-text)] placeholder:text-[var(--os-text-dim)]`}
          />
        )}

        {mode !== 'edit' && (
          <div className={`${mode === 'split' ? 'w-1/2' : 'w-full'} h-full overflow-y-auto p-6`}>
            <div className="prose-buddy max-w-2xl mx-auto os-selectable">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{document_.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="app-statusbar">
        <span className="mono truncate">{path ?? 'Unsaved document'}</span>
        {document_.isDirty && <span style={{ color: 'var(--os-warning)' }}>Unsaved changes</span>}
        <span className="ml-auto">{stats.words} words</span>
        <span>{stats.characters} chars</span>
        <span>{stats.lines} lines</span>
        <span>~{stats.readingMinutes} min read</span>
      </div>

      {showSaveAs && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveAs(false)} />
          <div className="os-panel relative w-full max-w-sm p-4 os-anim-rise">
            <p className="os-field-label mb-2">Save to Documents as</p>
            <input
              autoFocus
              value={saveAsName}
              onChange={(event) => setSaveAsName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') confirmSaveAs();
                if (event.key === 'Escape') setShowSaveAs(false);
              }}
              className="os-input mb-3"
              aria-label="File name"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSaveAs(false)} className="os-button">Cancel</button>
              <button onClick={confirmSaveAs} className="os-button os-button--accent">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
