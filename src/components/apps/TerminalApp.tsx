/**
 * Terminal — a real shell over the BrowserOS filesystem.
 *
 * Commands operate on the same VFS the rest of the desktop uses, so
 * `echo hi > notes.md` here is immediately visible in Files and DocWriter.
 * `run` still forwards to the backend sandbox for host commands, but the shell
 * itself no longer needs the network to be useful.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { vfs, HOME, normalize, join, dirname, basename, appForFile } from '../../os/vfs';
import { terminalService } from '../../api/chat';
import { APPS, resolveAppId } from '../../os/apps';
import type { AppId } from '../../types/os';

interface Line {
  id: number;
  kind: 'input' | 'output' | 'error' | 'hint';
  text: string;
}

interface ShellContext {
  cwd: string;
  setCwd: (path: string) => void;
  launch: (appId: AppId, state?: Record<string, unknown>) => void;
  clear: () => void;
}

type CommandResult = string | void | Promise<string | void>;

interface Command {
  summary: string;
  usage: string;
  run: (args: string[], ctx: ShellContext) => CommandResult;
}

/** Resolve a user-supplied path against the shell's working directory. */
function resolve(cwd: string, input: string | undefined, fallback = cwd): string {
  if (!input) return fallback;
  if (input === '~') return HOME;
  if (input.startsWith('~/')) return normalize(`${HOME}/${input.slice(2)}`);
  if (input.startsWith('/')) return normalize(input);
  return join(cwd, input);
}

const COMMANDS: Record<string, Command> = {
  help: {
    summary: 'List available commands',
    usage: 'help [command]',
    run: ([name]) => {
      if (name && COMMANDS[name]) {
        return `${name} — ${COMMANDS[name].summary}\nusage: ${COMMANDS[name].usage}`;
      }
      const width = Math.max(...Object.keys(COMMANDS).map((key) => key.length));
      return Object.entries(COMMANDS)
        .map(([key, command]) => `  ${key.padEnd(width)}  ${command.summary}`)
        .join('\n');
    },
  },
  pwd: {
    summary: 'Print the working directory',
    usage: 'pwd',
    run: (_args, ctx) => ctx.cwd,
  },
  ls: {
    summary: 'List directory contents',
    usage: 'ls [-l] [path]',
    run: (args, ctx) => {
      const long = args.includes('-l');
      const target = resolve(ctx.cwd, args.find((arg) => !arg.startsWith('-')));
      const node = vfs.stat(target);
      if (!node) return `ls: ${target}: No such file or directory`;
      if (node.kind === 'file') return node.name;
      const entries = vfs.list(target);
      if (!entries.length) return '';
      if (!long) return entries.map((entry) => (entry.kind === 'dir' ? `${entry.name}/` : entry.name)).join('  ');
      return entries
        .map((entry) => {
          const size = entry.kind === 'dir' ? '-' : String(entry.content.length);
          const date = new Date(entry.updatedAt).toLocaleString();
          return `${entry.kind === 'dir' ? 'd' : '-'}  ${size.padStart(7)}  ${date}  ${entry.name}`;
        })
        .join('\n');
    },
  },
  cd: {
    summary: 'Change the working directory',
    usage: 'cd [path]',
    run: ([path], ctx) => {
      const target = resolve(ctx.cwd, path, HOME);
      const node = vfs.stat(target);
      if (!node) return `cd: ${target}: No such file or directory`;
      if (node.kind !== 'dir') return `cd: ${target}: Not a directory`;
      ctx.setCwd(target);
    },
  },
  cat: {
    summary: 'Print file contents',
    usage: 'cat <file>',
    run: (paths, ctx) => {
      if (!paths.length) return 'cat: missing operand';
      return paths
        .map((path) => {
          const target = resolve(ctx.cwd, path);
          const content = vfs.read(target);
          return content === null ? `cat: ${target}: No such file` : content;
        })
        .join('\n');
    },
  },
  mkdir: {
    summary: 'Create a directory',
    usage: 'mkdir <path>',
    run: (paths, ctx) => {
      if (!paths.length) return 'mkdir: missing operand';
      paths.forEach((path) => vfs.mkdirp(resolve(ctx.cwd, path)));
    },
  },
  touch: {
    summary: 'Create an empty file if it does not exist',
    usage: 'touch <file>',
    run: (paths, ctx) => {
      if (!paths.length) return 'touch: missing operand';
      for (const path of paths) {
        const target = resolve(ctx.cwd, path);
        if (!vfs.exists(target)) vfs.write(target, '');
      }
    },
  },
  rm: {
    summary: 'Remove a file or directory',
    usage: 'rm [-r] <path>',
    run: (args, ctx) => {
      const paths = args.filter((arg) => !arg.startsWith('-'));
      const recursive = args.some((arg) => /^-[a-z]*r/.test(arg));
      if (!paths.length) return 'rm: missing operand';
      const failures: string[] = [];
      for (const path of paths) {
        const target = resolve(ctx.cwd, path);
        const node = vfs.stat(target);
        if (!node) { failures.push(`rm: ${target}: No such file`); continue; }
        // Refuse to nuke a populated directory without -r, like a real shell.
        if (node.kind === 'dir' && !recursive && vfs.list(target).length > 0) {
          failures.push(`rm: ${target}: Is a directory (use -r)`);
          continue;
        }
        if (!vfs.remove(target)) failures.push(`rm: ${target}: Operation not permitted`);
      }
      return failures.join('\n');
    },
  },
  mv: {
    summary: 'Move or rename',
    usage: 'mv <source> <dest>',
    run: ([from, to], ctx) => {
      if (!from || !to) return 'mv: usage: mv <source> <dest>';
      const source = resolve(ctx.cwd, from);
      let destination = resolve(ctx.cwd, to);
      // `mv file dir` means "into that directory", not "rename to it".
      if (vfs.stat(destination)?.kind === 'dir') destination = join(destination, basename(source));
      if (!vfs.move(source, destination)) return `mv: cannot move ${source}`;
    },
  },
  cp: {
    summary: 'Copy a file or directory',
    usage: 'cp <source> <dest>',
    run: ([from, to], ctx) => {
      if (!from || !to) return 'cp: usage: cp <source> <dest>';
      const source = resolve(ctx.cwd, from);
      let destination = resolve(ctx.cwd, to);
      if (vfs.stat(destination)?.kind === 'dir') destination = join(destination, basename(source));
      if (!vfs.copy(source, destination)) return `cp: cannot copy ${source}`;
    },
  },
  echo: {
    summary: 'Print text, optionally redirecting to a file',
    usage: 'echo <text> [> file | >> file]',
    run: (args, ctx) => {
      const redirect = args.findIndex((arg) => arg === '>' || arg === '>>');
      if (redirect === -1) return args.join(' ');
      const text = args.slice(0, redirect).join(' ');
      const path = args[redirect + 1];
      if (!path) return 'echo: missing redirection target';
      const target = resolve(ctx.cwd, path);
      const existing = args[redirect] === '>>' ? (vfs.read(target) ?? '') : '';
      vfs.write(target, `${existing}${text}\n`);
    },
  },
  wc: {
    summary: 'Count lines, words and characters in a file',
    usage: 'wc <file>',
    run: ([path], ctx) => {
      if (!path) return 'wc: missing operand';
      const target = resolve(ctx.cwd, path);
      const content = vfs.read(target);
      if (content === null) return `wc: ${target}: No such file`;
      const lines = content ? content.split('\n').length : 0;
      const words = content.split(/\s+/).filter(Boolean).length;
      return `${lines}  ${words}  ${content.length}  ${basename(target)}`;
    },
  },
  find: {
    summary: 'Search the filesystem by name',
    usage: 'find <term>',
    run: ([term]) => {
      if (!term) return 'find: missing search term';
      const results = vfs.search(term, 40);
      return results.length ? results.map((node) => node.path).join('\n') : 'No matches.';
    },
  },
  tree: {
    summary: 'Print the directory tree',
    usage: 'tree [path]',
    run: ([path], ctx) => {
      const root = resolve(ctx.cwd, path);
      const nodes = vfs.walk(root);
      if (!nodes.length) return `tree: ${root}: Not found`;
      return nodes
        .map((node) => {
          const depth = node.path.slice(root.length).split('/').filter(Boolean).length;
          return `${'  '.repeat(depth)}${node.name}${node.kind === 'dir' ? '/' : ''}`;
        })
        .join('\n');
    },
  },
  open: {
    summary: 'Open a file or app on the desktop',
    usage: 'open <file|app>',
    run: ([argument], ctx) => {
      if (!argument) return 'open: missing operand';
      const target = resolve(ctx.cwd, argument);
      const node = vfs.stat(target);
      if (node) {
        if (node.kind === 'dir') ctx.launch('explorer', { cwd: target });
        else ctx.launch(appForFile(target) as AppId, { path: target });
        return `Opening ${target}`;
      }
      const appId = resolveAppId(argument);
      if (appId) {
        ctx.launch(appId);
        return `Opening ${APPS[appId].title}`;
      }
      return `open: ${argument}: Not found`;
    },
  },
  apps: {
    summary: 'List installed applications',
    usage: 'apps',
    run: () => Object.values(APPS).map((app) => `  ${app.id.padEnd(20)} ${app.title}`).join('\n'),
  },
  date: {
    summary: 'Print the current date and time',
    usage: 'date',
    run: () => new Date().toString(),
  },
  whoami: {
    summary: 'Print the current user',
    usage: 'whoami',
    run: () => 'browseros',
  },
  clear: {
    summary: 'Clear the screen',
    usage: 'clear',
    run: (_args, ctx) => { ctx.clear(); },
  },
  run: {
    summary: 'Execute a command on the backend sandbox',
    usage: 'run <command>',
    run: async (args) => {
      if (!args.length) return 'run: missing command';
      try {
        const result = await terminalService.executeCommand(args.join(' '));
        if (result.status === 'success') {
          return [result.stdout, result.stderr].filter(Boolean).join('\n') || '(no output)';
        }
        return `run: ${result.error || result.stderr || 'execution failed'}`;
      } catch (error) {
        return `run: ${error instanceof Error ? error.message : 'backend unreachable'}`;
      }
    },
  },
};

const BANNER = [
  'BrowserOS shell — type `help` for commands.',
  'This shell operates on the real workspace filesystem.',
];

export default function TerminalApp() {
  const { openApp, notify } = useOSActions();
  const { state, setState, setTitle } = useWindowState({ cwd: HOME });
  const cwd = typeof state.cwd === 'string' ? state.cwd : HOME;

  const [lines, setLines] = useState<Line[]>(
    () => BANNER.map((text, index) => ({ id: index, kind: 'hint' as const, text })),
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [, setHistoryIndex] = useState(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineId = useRef(BANNER.length);

  const append = useCallback((kind: Line['kind'], text: string) => {
    if (!text) return;
    setLines((prev) => [
      ...prev,
      ...text.split('\n').map((row) => ({ id: (lineId.current += 1), kind, text: row })),
    ]);
  }, []);

  useEffect(() => {
    setTitle(`Terminal — ${basename(cwd) || '/'}`);
  }, [cwd, setTitle]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines, busy]);

  const context = useMemo<ShellContext>(() => ({
    cwd,
    setCwd: (path) => setState({ cwd: path }),
    launch: (appId, appState) => openApp(appId, appState ? { state: appState } : undefined),
    clear: () => setLines([]),
  }), [cwd, setState, openApp]);

  const submit = useCallback(async () => {
    const raw = input.trim();
    append('input', `${cwd} $ ${raw}`);
    setInput('');
    if (!raw) return;

    setHistory((prev) => [raw, ...prev.filter((entry) => entry !== raw)].slice(0, 100));
    setHistoryIndex(-1);

    // Simple tokenizer that honours quoted arguments, so paths with spaces work.
    const tokens = raw.match(/"[^"]*"|'[^']*'|\S+/g)?.map(
      (token) => token.replace(/^["']|["']$/g, ''),
    ) ?? [];
    const [name, ...args] = tokens;
    const command = COMMANDS[name];

    if (!command) {
      append('error', `${name}: command not found. Try \`help\`.`);
      return;
    }

    setBusy(true);
    try {
      const output = await command.run(args, context);
      if (typeof output === 'string' && output) {
        // Commands report failures as text beginning with their own name.
        append(output.startsWith(`${name}:`) ? 'error' : 'output', output);
      }
    } catch (error) {
      append('error', error instanceof Error ? error.message : String(error));
      notify({ message: `Terminal: ${name} failed.`, type: 'error' });
    } finally {
      setBusy(false);
    }
  }, [input, cwd, context, append, notify]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submit();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHistoryIndex((index) => {
        const next = Math.min(index + 1, history.length - 1);
        if (next >= 0) setInput(history[next]);
        return next;
      });
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHistoryIndex((index) => {
        const next = index - 1;
        setInput(next >= 0 ? history[next] : '');
        return next;
      });
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const tokens = input.split(' ');
      const partial = tokens[tokens.length - 1] ?? '';

      // The first token completes command names; later tokens complete paths.
      const candidates = tokens.length === 1
        ? Object.keys(COMMANDS).filter((name) => name.startsWith(partial))
        : vfs.list(partial.includes('/') ? resolve(cwd, dirname(partial)) : cwd)
            .map((node) => (node.kind === 'dir' ? `${node.name}/` : node.name))
            .filter((name) => name.startsWith(partial.includes('/') ? basename(partial) : partial));

      if (candidates.length === 1) {
        tokens[tokens.length - 1] = partial.includes('/')
          ? `${partial.slice(0, partial.lastIndexOf('/') + 1)}${candidates[0]}`
          : candidates[0];
        setInput(tokens.join(' '));
      } else if (candidates.length > 1) {
        append('hint', candidates.join('  '));
      }
      return;
    }

    if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      setLines([]);
    }
  }, [submit, history, input, cwd, append]);

  return (
    <div
      className="app-shell mono text-[12.5px] leading-relaxed"
      style={{ background: '#0b0b0f', color: '#d4d4d8' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 os-selectable">
        {lines.map((line) => (
          <div
            key={line.id}
            className="whitespace-pre-wrap break-words"
            style={{
              color:
                line.kind === 'input' ? '#e4e4e7'
                : line.kind === 'error' ? '#f87171'
                : line.kind === 'hint' ? '#71717a'
                : '#86efac',
            }}
          >
            {line.text}
          </div>
        ))}
        {busy && <div style={{ color: '#60a5fa' }}>…working</div>}
      </div>

      <form
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
        className="flex items-center gap-2 px-3 py-2 border-t border-white/5 shrink-0"
      >
        <span className="shrink-0" style={{ color: '#60a5fa' }}>{cwd} $</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          aria-label="Terminal input"
          className="flex-1 bg-transparent border-none outline-none text-white disabled:opacity-50"
        />
      </form>
    </div>
  );
}
