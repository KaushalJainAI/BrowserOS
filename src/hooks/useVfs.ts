/**
 * React bindings for the virtual filesystem.
 *
 * These subscribe a component to filesystem changes, so a file written by the
 * Terminal, by DocWriter, or by Buddy through `fs_write_file` refreshes every
 * open window showing it.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { vfs, type VNode } from '../os/vfs';

/**
 * Mutation counter for the whole filesystem. Read it in a `useMemo` dependency
 * list when a component derives something from `vfs` that has no dedicated
 * hook below.
 */
export function useVfsSnapshot(): number {
  return useSyncExternalStore(vfs.subscribe, vfs.getSnapshot, vfs.getSnapshot);
}

/** Live directory listing. The array identity only changes when it must. */
export function useDirectory(path: string): VNode[] {
  const read = useCallback(() => vfs.listStable(path), [path]);
  return useSyncExternalStore(vfs.subscribe, read, read);
}

/** Live contents of a single file, or null when it does not exist. */
export function useFile(path: string | null): string | null {
  const read = useCallback(() => (path ? vfs.read(path) : null), [path]);
  return useSyncExternalStore(vfs.subscribe, read, read);
}

export interface DocumentBinding {
  /** Current editor buffer. */
  content: string;
  setContent: (next: string) => void;
  /** Path being edited, or null for an unsaved scratch buffer. */
  path: string | null;
  isDirty: boolean;
  save: () => void;
  saveAs: (path: string) => void;
  /** Load another file into the buffer, discarding unsaved changes. */
  load: (path: string) => void;
  /** Start a fresh empty buffer. */
  reset: (content?: string) => void;
}

/**
 * A text document bound to a VFS path.
 *
 * Edits stay in a local buffer until saved, so an editor behaves like an
 * editor — but `path` lives in window state, which means Buddy can point an
 * open editor at a different file with `app_set_state`, and a reopened window
 * comes back to the same document after a reload.
 */
export function useDocument(
  path: string | null,
  onPathChange: (path: string | null) => void,
  fallback = '',
): DocumentBinding {
  const stored = useFile(path);

  // `baseline` is what is on disk; comparing against it is what makes "dirty"
  // meaningful and lets an external write be adopted safely.
  const [draft, setDraft] = useState<{ buffer: string; baseline: string }>(
    () => ({ buffer: stored ?? fallback, baseline: stored ?? fallback }),
  );

  // Adopt an external change only when the buffer is clean; otherwise an agent
  // write (or a Terminal redirect) would silently discard what the user typed.
  const content = useMemo(() => {
    if (stored === null || stored === draft.baseline) return draft.buffer;
    return draft.buffer === draft.baseline ? stored : draft.buffer;
  }, [stored, draft]);

  const baseline = stored ?? draft.baseline;

  const setContent = useCallback((next: string) => {
    setDraft((current) => ({ ...current, buffer: next }));
  }, []);

  const save = useCallback(() => {
    if (!path) return;
    vfs.write(path, content);
    setDraft({ buffer: content, baseline: content });
  }, [path, content]);

  const saveAs = useCallback((nextPath: string) => {
    vfs.write(nextPath, content);
    setDraft({ buffer: content, baseline: content });
    onPathChange(nextPath);
  }, [content, onPathChange]);

  const load = useCallback((nextPath: string) => {
    const next = vfs.read(nextPath) ?? '';
    setDraft({ buffer: next, baseline: next });
    onPathChange(nextPath);
  }, [onPathChange]);

  const reset = useCallback((next = '') => {
    setDraft({ buffer: next, baseline: next });
    onPathChange(null);
  }, [onPathChange]);

  return {
    content,
    setContent,
    path,
    isDirty: content !== baseline,
    save,
    saveAs,
    load,
    reset,
  };
}
