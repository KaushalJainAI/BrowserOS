/**
 * WebWeaver — edit HTML/CSS/JS and see it render live.
 *
 * The preview runs in a sandboxed iframe with `allow-scripts` but no
 * `allow-same-origin`, so page code cannot reach the desktop's DOM, storage or
 * the agent channel. That matters here specifically because the code in this
 * editor may have been written by Buddy.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Save, FolderOpen, RotateCcw, FileCode, Braces, Palette } from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { vfs, HOME, join } from '../../os/vfs';

type Pane = 'html' | 'css' | 'js';

const STARTER = {
  html: `<div class="card">
  <h1>Hello from BrowserOS</h1>
  <p>Edit the panes on the left — the preview updates as you type.</p>
  <button id="go">Count: <span id="n">0</span></button>
</div>
`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: linear-gradient(140deg, #1e1b4b, #0f172a);
  color: #e2e8f0;
}
.card {
  padding: 2.5rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  max-width: 30rem;
}
button {
  margin-top: 1rem;
  padding: 0.6rem 1.4rem;
  border-radius: 10px;
  border: none;
  background: #6366f1;
  color: white;
  font: inherit;
  cursor: pointer;
}
`,
  js: `let count = 0;
document.getElementById('go').addEventListener('click', () => {
  count += 1;
  document.getElementById('n').textContent = count;
});
`,
};

const PANES: Array<{ id: Pane; label: string; icon: typeof FileCode }> = [
  { id: 'html', label: 'index.html', icon: FileCode },
  { id: 'css', label: 'style.css', icon: Palette },
  { id: 'js', label: 'script.js', icon: Braces },
];

export default function FrontendExpertApp() {
  const { notify, openApp } = useOSActions();
  const { state, setState } = useWindowState({
    html: STARTER.html,
    css: STARTER.css,
    js: STARTER.js,
    pane: 'html' as Pane,
    autoRun: true,
  });

  const html = typeof state.html === 'string' ? state.html : STARTER.html;
  const css = typeof state.css === 'string' ? state.css : STARTER.css;
  const js = typeof state.js === 'string' ? state.js : STARTER.js;
  const pane: Pane = PANES.some((entry) => entry.id === state.pane) ? (state.pane as Pane) : 'html';
  const autoRun = state.autoRun !== false;

  const [committed, setCommitted] = useState({ html, css, js });

  const document_ = useMemo(() => `<!doctype html>
<html>
<head><meta charset="utf-8"><style>${committed.css}</style></head>
<body>
${committed.html}
<script>
try {
${committed.js}
} catch (error) {
  document.body.insertAdjacentHTML('beforeend',
    '<pre style="position:fixed;bottom:0;left:0;right:0;margin:0;padding:8px;background:#7f1d1d;color:#fff;font:12px monospace">'
    + String(error) + '</pre>');
}
${/* Split so the literal never contains a closing script tag, which would
     terminate the host page's own script block when this bundle is inlined. */ ''}${'<'}/script>
</body>
</html>`, [committed]);

  // Debounced auto-run: rebuilding the iframe on every keystroke makes typing
  // stutter and restarts any script state the user was interacting with.
  useEffect(() => {
    if (!autoRun) return;
    const handle = setTimeout(() => setCommitted({ html, css, js }), 600);
    return () => clearTimeout(handle);
  }, [html, css, js, autoRun]);

  const value = pane === 'html' ? html : pane === 'css' ? css : js;

  const save = useCallback(() => {
    const folder = join(`${HOME}/Projects`, 'web');
    vfs.mkdirp(folder);
    vfs.write(join(folder, 'index.html'), html);
    vfs.write(join(folder, 'style.css'), css);
    vfs.write(join(folder, 'script.js'), js);
    notify({ message: `Saved 3 files to ${folder}.`, type: 'success' });
  }, [html, css, js, notify]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        {PANES.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setState({ pane: entry.id })}
            data-active={pane === entry.id}
            className="os-row w-auto flex-none px-2.5 py-1.5 text-[12px] font-medium mono"
          >
            <entry.icon size={13} className="shrink-0" /> {entry.label}
          </button>
        ))}

        <span className="flex-1" />

        <button
          onClick={() => setState({ autoRun: !autoRun })}
          data-active={autoRun}
          className="os-button os-button--ghost gap-2"
          title="Re-render as you type"
        >
          Auto
        </button>
        <button onClick={() => setCommitted({ html, css, js })} className="os-button gap-2">
          <Play size={14} /> Run
        </button>
        <button onClick={save} className="os-icon-button" aria-label="Save project" title="Save to Projects/web">
          <Save size={15} />
        </button>
        <button
          onClick={() => openApp('explorer', { state: { cwd: `${HOME}/Projects` } })}
          className="os-icon-button"
          aria-label="Browse project files"
        >
          <FolderOpen size={15} />
        </button>
        <button
          onClick={() => { setState(STARTER); setCommitted(STARTER); }}
          className="os-icon-button"
          aria-label="Reset to starter"
          title="Reset"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-[var(--os-border)] flex flex-col min-w-0">
          <textarea
            value={value}
            onChange={(event) => setState({ [pane]: event.target.value })}
            spellCheck={false}
            aria-label={`${pane} source`}
            className="flex-1 w-full p-4 bg-transparent border-none outline-none resize-none mono text-[12.5px] leading-[1.65] text-[var(--os-text)]"
          />
          <div className="app-statusbar">
            <span className="mono">{PANES.find((entry) => entry.id === pane)?.label}</span>
            <span className="ml-auto">{value.split('\n').length} lines</span>
          </div>
        </div>

        <div className="w-1/2 min-w-0 bg-white">
          <iframe
            title="Live preview"
            srcDoc={document_}
            // No allow-same-origin: preview code stays walled off from the
            // desktop's origin, storage and the agent socket.
            sandbox="allow-scripts allow-forms allow-modals"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
}
