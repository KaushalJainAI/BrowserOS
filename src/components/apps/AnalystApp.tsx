/**
 * DataLab — loads a CSV from the workspace and charts it.
 *
 * Charts are hand-drawn SVG rather than a charting dependency: the dataset is
 * small, and it keeps the bundle free of a library for four mark types.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart2, LineChart as LineIcon, AreaChart, ScatterChart, FolderOpen, RefreshCw, Table2,
} from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { useFile, useVfsSnapshot } from '../../hooks/useVfs';
import { vfs, HOME, basename, extname } from '../../os/vfs';

type ChartKind = 'bar' | 'line' | 'area' | 'scatter';

interface Dataset {
  headers: string[];
  rows: string[][];
  /** Indices of columns whose values parse as numbers throughout. */
  numericColumns: number[];
}

function parseCsv(text: string): Dataset {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim() !== '');
  if (!lines.length) return { headers: [], rows: [], numericColumns: [] };

  const split = (line: string) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);

  const numericColumns = headers
    .map((_, index) => index)
    .filter((index) => {
      const values = rows.map((row) => row[index]).filter((value) => value !== undefined && value !== '');
      return values.length > 0 && values.every((value) => Number.isFinite(Number(value.replace(/[$,%\s]/g, ''))));
    });

  return { headers, rows, numericColumns };
}

function toNumber(value: string | undefined): number {
  const parsed = Number((value ?? '').replace(/[$,%\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7'];

export default function AnalystApp() {
  const { openApp, notify } = useOSActions();
  const { state, setState, setTitle } = useWindowState({
    path: `${HOME}/Documents/budget.csv` as string | null,
    chart: 'bar' as ChartKind,
  });
  const version = useVfsSnapshot();

  const path = typeof state.path === 'string' ? state.path : null;
  const chart: ChartKind = (['bar', 'line', 'area', 'scatter'] as const).includes(state.chart as ChartKind)
    ? (state.chart as ChartKind)
    : 'bar';

  const csv = useFile(path);
  const dataset = useMemo(() => (csv === null ? null : parseCsv(csv)), [csv]);

  /**
   * The series selection is derived from the dataset until the user picks
   * something, at which point their choice takes over.
   *
   * Seeding state from an effect instead would render one frame of empty chart
   * for every file opened, and would fight the user's selection each time the
   * file changed on disk.
   */
  // The override records which file it was made against, so opening a
  // different dataset falls back to its own defaults without an effect
  // reaching in to clear the selection.
  const [override, setOverride] = useState<
    { path: string | null; label: number; values: number[] } | null
  >(null);
  const defaults = useMemo(() => {
    if (!dataset) return { label: 0, values: [] as number[] };
    return {
      // Prefer a non-numeric column for the category axis; if the first column
      // is numeric it is probably data, not a label.
      label: dataset.numericColumns.includes(0) ? Math.max(0, dataset.headers.length - 1) : 0,
      values: dataset.numericColumns.slice(0, 3),
    };
  }, [dataset]);

  const active = override?.path === path ? override : null;
  const labelColumn = active?.label ?? defaults.label;
  const valueColumns = active?.values ?? defaults.values;

  const setLabelColumn = useCallback((column: number) => {
    setOverride({ path, label: column, values: valueColumns });
  }, [path, valueColumns]);

  useEffect(() => {
    setTitle(path ? `DataLab — ${basename(path)}` : 'DataLab');
  }, [path, setTitle]);

  // `version` is the filesystem's mutation counter: a new file appearing
  // anywhere under HOME has to re-run this scan.
  const csvFiles = useMemo(
    () => {
      void version;
      return vfs.walk(HOME).filter(
        (node) => node.kind === 'file' && ['csv', 'sheet'].includes(extname(node.path)),
      );
    },
    [version],
  );

  const series = useMemo(() => {
    if (!dataset || !valueColumns.length) return [];
    return valueColumns.map((column, index) => ({
      name: dataset.headers[column] ?? `Series ${index + 1}`,
      color: PALETTE[index % PALETTE.length],
      values: dataset.rows.map((row) => toNumber(row[column])),
    }));
  }, [dataset, valueColumns]);

  const labels = useMemo(
    () => dataset?.rows.map((row) => row[labelColumn] ?? '') ?? [],
    [dataset, labelColumn],
  );

  const stats = useMemo(() => {
    if (!series.length) return null;
    const all = series.flatMap((entry) => entry.values);
    if (!all.length) return null;
    const sum = all.reduce((total, value) => total + value, 0);
    return {
      min: Math.min(...all),
      max: Math.max(...all),
      sum,
      mean: sum / all.length,
      count: all.length,
    };
  }, [series]);

  const toggleValueColumn = useCallback((column: number) => {
    setOverride({
      path,
      label: labelColumn,
      values: valueColumns.includes(column)
        ? valueColumns.filter((entry) => entry !== column)
        : [...valueColumns, column],
    });
  }, [path, labelColumn, valueColumns]);

  return (
    <div className="app-shell" style={{ flexDirection: 'row' }}>
      <aside className="app-sidebar">
        <p className="os-field-label px-2 pt-1 pb-2">Datasets</p>
        {csvFiles.length === 0 ? (
          <p className="px-2 text-[11.5px] text-[var(--os-text-dim)]">
            No CSV files yet. Create one in GridCalc.
          </p>
        ) : (
          csvFiles.map((node) => (
            <button
              key={node.path}
              onClick={() => setState({ path: node.path })}
              data-active={path === node.path}
              className="os-row py-1.5 text-[12px]"
              title={node.path}
            >
              <Table2 size={13} className="shrink-0" />
              <span className="truncate">{node.name}</span>
            </button>
          ))
        )}

        {dataset && dataset.headers.length > 0 && (
          <>
            <p className="os-field-label px-2 pt-4 pb-2">Category axis</p>
            <select
              value={labelColumn}
              onChange={(event) => setLabelColumn(Number(event.target.value))}
              className="os-input h-7 text-[12px] mb-2"
              aria-label="Category column"
            >
              {dataset.headers.map((header, index) => (
                <option key={header + index} value={index}>{header}</option>
              ))}
            </select>

            <p className="os-field-label px-2 pt-2 pb-2">Series</p>
            {dataset.numericColumns.map((column, index) => (
              <button
                key={column}
                onClick={() => toggleValueColumn(column)}
                data-active={valueColumns.includes(column)}
                className="os-row py-1.5 text-[12px]"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    background: valueColumns.includes(column)
                      ? PALETTE[valueColumns.indexOf(column) % PALETTE.length]
                      : 'var(--os-border-strong)',
                  }}
                />
                <span className="truncate">{dataset.headers[column] ?? `Column ${index}`}</span>
              </button>
            ))}
          </>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="app-toolbar">
          {([['bar', BarChart2], ['line', LineIcon], ['area', AreaChart], ['scatter', ScatterChart]] as const)
            .map(([kind, Icon]) => (
              <button
                key={kind}
                onClick={() => setState({ chart: kind })}
                data-active={chart === kind}
                className="os-icon-button"
                aria-label={`${kind} chart`}
                title={`${kind} chart`}
              >
                <Icon size={15} />
              </button>
            ))}

          <span className="flex-1" />

          <button
            onClick={() => path && openApp('sheets-editor', { state: { path } })}
            disabled={!path}
            className="os-button os-button--ghost gap-2"
          >
            <FolderOpen size={14} /> Edit data
          </button>
          <button
            onClick={() => notify({ message: 'Reloaded from disk.', type: 'info' })}
            className="os-icon-button"
            aria-label="Reload"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 min-h-0">
          {!dataset || !series.length ? (
            <div className="app-empty">
              <BarChart2 size={36} className="opacity-30" />
              <p className="text-[13px]">
                {dataset ? 'Pick at least one numeric series' : 'Select a dataset to chart'}
              </p>
            </div>
          ) : (
            <>
              <Chart kind={chart} labels={labels} series={series} />

              {stats && (
                <div className="grid grid-cols-5 gap-2.5 mt-6">
                  {([
                    ['Points', String(stats.count)],
                    ['Min', stats.min.toLocaleString()],
                    ['Max', stats.max.toLocaleString()],
                    ['Mean', stats.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })],
                    ['Total', stats.sum.toLocaleString()],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="p-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-surface-sunken)]">
                      <p className="os-field-label">{label}</p>
                      <p className="text-[15px] font-semibold mt-1 tabular-nums truncate">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--os-border)]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[var(--os-surface-sunken)]">
                      {dataset.headers.map((header, index) => (
                        <th key={header + index} className="px-3 py-2 text-left font-semibold text-[var(--os-text-muted)]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.rows.slice(0, 25).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-[var(--os-border)]">
                        {dataset.headers.map((_, columnIndex) => (
                          <td key={columnIndex} className="px-3 py-1.5 text-[var(--os-text-muted)]">
                            {row[columnIndex] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface Series {
  name: string;
  color: string;
  values: number[];
}

function Chart({ kind, labels, series }: { kind: ChartKind; labels: string[]; series: Series[] }) {
  const width = 760;
  const height = 320;
  const pad = { top: 16, right: 16, bottom: 34, left: 52 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const all = series.flatMap((entry) => entry.values);
  const rawMax = Math.max(...all, 0);
  const rawMin = Math.min(...all, 0);
  // Pad the domain so the tallest mark does not touch the frame.
  const max = rawMax === rawMin ? rawMax + 1 : rawMax + (rawMax - rawMin) * 0.08;
  const min = rawMin < 0 ? rawMin - (rawMax - rawMin) * 0.08 : 0;

  const count = Math.max(1, labels.length);
  const scaleY = (value: number) => pad.top + plotHeight - ((value - min) / (max - min)) * plotHeight;
  const scaleX = (index: number) => pad.left + (plotWidth / count) * (index + 0.5);

  const ticks = Array.from({ length: 5 }, (_, index) => min + ((max - min) / 4) * index);
  // Only label every nth category when they would otherwise overlap.
  const labelStep = Math.ceil(count / 12);

  return (
    <div className="rounded-xl border border-[var(--os-border)] p-4 bg-[var(--os-surface-sunken)]">
      <div className="flex flex-wrap gap-3 mb-3">
        {series.map((entry) => (
          <span key={entry.name} className="flex items-center gap-1.5 text-[11.5px] text-[var(--os-text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: entry.color }} />
            {entry.name}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Chart">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left} x2={width - pad.right}
              y1={scaleY(tick)} y2={scaleY(tick)}
              stroke="var(--os-border)" strokeWidth="1"
            />
            <text
              x={pad.left - 8} y={scaleY(tick) + 4}
              textAnchor="end" fontSize="10" fill="var(--os-text-dim)"
            >
              {Math.round(tick).toLocaleString()}
            </text>
          </g>
        ))}

        {kind === 'bar' && series.map((entry, seriesIndex) => {
          const groupWidth = (plotWidth / count) * 0.72;
          const barWidth = groupWidth / series.length;
          return entry.values.map((value, index) => (
            <rect
              key={`${entry.name}-${index}`}
              x={scaleX(index) - groupWidth / 2 + barWidth * seriesIndex}
              y={Math.min(scaleY(value), scaleY(0))}
              width={Math.max(1, barWidth - 1.5)}
              height={Math.max(1, Math.abs(scaleY(value) - scaleY(0)))}
              fill={entry.color}
              rx="2"
            >
              <title>{`${labels[index]} · ${entry.name}: ${value.toLocaleString()}`}</title>
            </rect>
          ));
        })}

        {(kind === 'line' || kind === 'area') && series.map((entry) => {
          const points = entry.values.map((value, index) => `${scaleX(index)},${scaleY(value)}`).join(' ');
          return (
            <g key={entry.name}>
              {kind === 'area' && (
                <polygon
                  points={`${pad.left},${scaleY(min)} ${points} ${width - pad.right},${scaleY(min)}`}
                  fill={entry.color}
                  opacity="0.16"
                />
              )}
              <polyline
                points={points}
                fill="none"
                stroke={entry.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {entry.values.map((value, index) => (
                <circle key={index} cx={scaleX(index)} cy={scaleY(value)} r="3" fill={entry.color}>
                  <title>{`${labels[index]} · ${entry.name}: ${value.toLocaleString()}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {kind === 'scatter' && series.map((entry) => (
          <g key={entry.name}>
            {entry.values.map((value, index) => (
              <circle key={index} cx={scaleX(index)} cy={scaleY(value)} r="5" fill={entry.color} opacity="0.75">
                <title>{`${labels[index]} · ${entry.name}: ${value.toLocaleString()}`}</title>
              </circle>
            ))}
          </g>
        ))}

        {labels.map((label, index) => (
          index % labelStep === 0 ? (
            <text
              key={index}
              x={scaleX(index)} y={height - 12}
              textAnchor="middle" fontSize="10" fill="var(--os-text-dim)"
            >
              {label.length > 10 ? `${label.slice(0, 9)}…` : label}
            </text>
          ) : null
        ))}
      </svg>
    </div>
  );
}
