/**
 * GridCalc — a spreadsheet with live formulas over the workspace filesystem.
 *
 * Opens and saves `.csv`, so the same file is editable here, readable in
 * DocWriter, chartable in DataLab, and writable by Buddy via `fs_write_file`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save, FolderOpen, Plus, Trash2, Sigma, FunctionSquare, Download } from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { useFile } from '../../hooks/useVfs';
import { vfs, HOME, join, basename } from '../../os/vfs';
import {
  cellKey, columnName, csvToGrid, evaluateCell, formatCellValue, gridToCsv, type Grid,
} from '../../os/formula';

const MIN_ROWS = 24;
const MIN_COLUMNS = 8;

export default function SheetsEditorApp() {
  const { notify, openApp } = useOSActions();
  const { state, setState, setTitle } = useWindowState({ path: null as string | null });
  const path = typeof state.path === 'string' ? state.path : null;
  const csv = useFile(path);

  const [grid, setGrid] = useState<Grid>({});
  const [rows, setRows] = useState(MIN_ROWS);
  const [columns, setColumns] = useState(MIN_COLUMNS);
  const [selection, setSelection] = useState('A1');
  const [editing, setEditing] = useState<string | null>(null);
  const [formulaDraft, setFormulaDraft] = useState('');
  const [dirty, setDirty] = useState(false);

  const formulaInputRef = useRef<HTMLInputElement>(null);
  const loadedFrom = useRef<string | null>(null);

  // Load whenever the bound path changes, or the file changes on disk while
  // this sheet has no unsaved edits.
  useEffect(() => {
    if (!path || csv === null) return;
    if (loadedFrom.current === path && dirty) return;

    const parsed = csvToGrid(csv);
    setGrid(parsed.grid);
    setRows(Math.max(MIN_ROWS, parsed.rows + 4));
    setColumns(Math.max(MIN_COLUMNS, parsed.columns + 2));
    setDirty(false);
    loadedFrom.current = path;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dirty` guards the reload rather than triggering it
  }, [path, csv]);

  useEffect(() => {
    setTitle(`${path ? basename(path) : 'Untitled sheet'}${dirty ? ' •' : ''}`);
  }, [path, dirty, setTitle]);

  // Evaluate the whole grid once per change rather than per cell render, so a
  // wide sheet does not re-parse the same formulas on every scroll.
  const evaluated = useMemo(() => {
    const output: Record<string, { text: string; isError: boolean; isNumber: boolean }> = {};
    for (const key of Object.keys(grid)) {
      const result = evaluateCell(key, grid);
      output[key] = {
        text: formatCellValue(result.value),
        isError: Boolean(result.error),
        isNumber: typeof result.value === 'number',
      };
    }
    return output;
  }, [grid]);

  const setCell = useCallback((key: string, value: string) => {
    setGrid((prev) => {
      const next = { ...prev };
      if (value === '') delete next[key];
      else next[key] = value;
      return next;
    });
    setDirty(true);
  }, []);

  const save = useCallback(() => {
    const target = path ?? vfs.uniquePath(join(`${HOME}/Documents`, 'sheet.csv'));
    vfs.write(target, gridToCsv(grid, rows, columns));
    if (!path) setState({ path: target });
    loadedFrom.current = target;
    setDirty(false);
    notify({ message: `Saved ${basename(target)}.`, type: 'success' });
  }, [path, grid, rows, columns, setState, notify]);

  const selectionStats = useMemo(() => {
    const values = Object.values(evaluated)
      .filter((cell) => cell.isNumber && !cell.isError)
      .map((cell) => Number(cell.text))
      .filter(Number.isFinite);
    if (!values.length) return null;
    const sum = values.reduce((total, value) => total + value, 0);
    return { count: values.length, sum, average: sum / values.length };
  }, [evaluated]);

  const commitEdit = useCallback((key: string, value: string, advance: 'down' | 'right' | null) => {
    setCell(key, value);
    setEditing(null);
    if (!advance) return;
    const match = /^([A-Z]+)(\d+)$/.exec(key);
    if (!match) return;
    const column = columnName(0) === match[1] ? 0 : match[1].split('').reduce(
      (total, char) => total * 26 + (char.charCodeAt(0) - 64), 0,
    ) - 1;
    const row = Number(match[2]) - 1;
    setSelection(advance === 'down' ? cellKey(column, row + 1) : cellKey(column + 1, row));
  }, [setCell]);

  const onGridKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (editing) return;
    const match = /^([A-Z]+)(\d+)$/.exec(selection);
    if (!match) return;
    const column = match[1].split('').reduce(
      (total, char) => total * 26 + (char.charCodeAt(0) - 64), 0,
    ) - 1;
    const row = Number(match[2]) - 1;

    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      Enter: [0, 1], Tab: [1, 0],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setSelection(cellKey(
        Math.max(0, Math.min(columns - 1, column + move[0])),
        Math.max(0, Math.min(rows - 1, row + move[1])),
      ));
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      setCell(selection, '');
      return;
    }

    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
      return;
    }

    // Typing a printable character starts editing with that character, which
    // is what people expect from a spreadsheet.
    if (!mod && event.key.length === 1) {
      setEditing(selection);
      setFormulaDraft(event.key);
    }
  }, [editing, selection, columns, rows, setCell, save]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <button onClick={save} data-active={dirty} className="os-icon-button" aria-label="Save" title="Save (Ctrl+S)">
          <Save size={15} />
        </button>
        <button
          onClick={() => openApp('explorer', { state: { cwd: `${HOME}/Documents` } })}
          className="os-icon-button"
          aria-label="Browse files"
          title="Open a CSV"
        >
          <FolderOpen size={15} />
        </button>

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        <button
          onClick={() => {
            const match = /^([A-Z]+)(\d+)$/.exec(selection);
            if (!match) return;
            const row = Number(match[2]) - 1;
            // Offer a SUM over everything above the selected cell in its column.
            setCell(selection, `=SUM(${match[1]}1:${match[1]}${Math.max(1, row)})`);
          }}
          className="os-icon-button"
          aria-label="Insert SUM"
          title="Sum the column above"
        >
          <Sigma size={15} />
        </button>
        <button onClick={() => setRows((current) => current + 10)} className="os-icon-button" aria-label="Add rows" title="Add 10 rows">
          <Plus size={15} />
        </button>
        <button
          onClick={() => { setGrid({}); setDirty(true); }}
          className="os-icon-button"
          aria-label="Clear sheet"
          title="Clear all cells"
        >
          <Trash2 size={15} />
        </button>

        <span className="flex-1" />

        <button
          onClick={() => {
            const csv = gridToCsv(grid, rows, columns);
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            const anchor = window.document.createElement('a');
            anchor.href = url;
            anchor.download = path ? basename(path) : 'sheet.csv';
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="os-icon-button"
          aria-label="Download CSV"
          title="Download CSV"
        >
          <Download size={15} />
        </button>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-[var(--os-border)] shrink-0">
        <span className="mono text-[12px] font-bold w-14 shrink-0 text-[var(--os-accent)]">{selection}</span>
        <FunctionSquare size={13} className="text-[var(--os-text-dim)] shrink-0" />
        <input
          ref={formulaInputRef}
          value={editing === selection ? formulaDraft : (grid[selection] ?? '')}
          onChange={(event) => { setEditing(selection); setFormulaDraft(event.target.value); }}
          onFocus={() => { setEditing(selection); setFormulaDraft(grid[selection] ?? ''); }}
          onBlur={() => { if (editing === selection) commitEdit(selection, formulaDraft, null); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); commitEdit(selection, formulaDraft, 'down'); }
            if (event.key === 'Escape') setEditing(null);
          }}
          placeholder="Value or =FORMULA()"
          aria-label="Formula bar"
          className="flex-1 bg-transparent border-none outline-none mono text-[12.5px] text-[var(--os-text)] placeholder:text-[var(--os-text-dim)]"
        />
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-auto outline-none"
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        role="grid"
        aria-label="Spreadsheet"
      >
        <table className="border-collapse mono text-[12px]" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-11 h-6 sticky left-0 z-20 bg-[var(--os-surface-sunken)] border border-[var(--os-border)]" />
              {Array.from({ length: columns }, (_, index) => (
                <th
                  key={index}
                  className="w-24 h-6 bg-[var(--os-surface-sunken)] border border-[var(--os-border)] font-semibold text-[10.5px] text-[var(--os-text-muted)]"
                >
                  {columnName(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                <th className="w-11 h-6 sticky left-0 z-10 bg-[var(--os-surface-sunken)] border border-[var(--os-border)] font-semibold text-[10.5px] text-[var(--os-text-muted)]">
                  {rowIndex + 1}
                </th>
                {Array.from({ length: columns }, (_, columnIndex) => {
                  const key = cellKey(columnIndex, rowIndex);
                  const isSelected = key === selection;
                  const isEditing = key === editing;
                  const cell = evaluated[key];

                  return (
                    <td
                      key={key}
                      onClick={() => { setSelection(key); setEditing(null); }}
                      onDoubleClick={() => { setEditing(key); setFormulaDraft(grid[key] ?? ''); }}
                      className="w-24 h-6 border p-0 cursor-cell"
                      style={{
                        borderColor: isSelected ? 'var(--os-accent)' : 'var(--os-border)',
                        outline: isSelected ? '1px solid var(--os-accent)' : 'none',
                        background: isSelected ? 'rgb(var(--os-accent-rgb) / 0.07)' : 'transparent',
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={formulaDraft}
                          onChange={(event) => setFormulaDraft(event.target.value)}
                          onBlur={() => commitEdit(key, formulaDraft, null)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') { event.preventDefault(); commitEdit(key, formulaDraft, 'down'); }
                            else if (event.key === 'Tab') { event.preventDefault(); commitEdit(key, formulaDraft, 'right'); }
                            else if (event.key === 'Escape') setEditing(null);
                          }}
                          className="w-full h-full px-1.5 bg-[var(--os-surface-solid)] border-none outline-none mono text-[12px] text-[var(--os-text)]"
                          aria-label={`Cell ${key}`}
                        />
                      ) : (
                        <span
                          className={`block w-full h-full px-1.5 leading-6 truncate ${cell?.isNumber ? 'text-right' : ''}`}
                          style={{ color: cell?.isError ? 'var(--os-danger)' : 'var(--os-text)' }}
                          title={grid[key]}
                        >
                          {cell?.text ?? ''}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="app-statusbar">
        <span className="mono truncate">{path ?? 'Unsaved sheet'}</span>
        {dirty && <span style={{ color: 'var(--os-warning)' }}>Unsaved</span>}
        {selectionStats && (
          <span className="ml-auto flex gap-3">
            <span>Count {selectionStats.count}</span>
            <span>Sum {formatCellValue(selectionStats.sum)}</span>
            <span>Avg {formatCellValue(Number(selectionStats.average.toFixed(2)))}</span>
          </span>
        )}
      </div>
    </div>
  );
}
