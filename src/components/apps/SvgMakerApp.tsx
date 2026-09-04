/** VectorStudio — compose shapes and export real SVG to the filesystem. */

import { useCallback, useRef, useState } from 'react';
import {
  Square, Circle as CircleIcon, Triangle, Type as TypeIcon, Trash2, Save,
  Download, Copy, MoveUp, MoveDown,
} from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { vfs, HOME, join } from '../../os/vfs';

type ShapeKind = 'rect' | 'circle' | 'triangle' | 'text';

interface Shape {
  id: string;
  kind: ShapeKind;
  x: number; y: number;
  width: number; height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
}

const CANVAS = { width: 800, height: 520 };

const TOOLS: Array<{ kind: ShapeKind; icon: typeof Square; label: string }> = [
  { kind: 'rect', icon: Square, label: 'Rectangle' },
  { kind: 'circle', icon: CircleIcon, label: 'Ellipse' },
  { kind: 'triangle', icon: Triangle, label: 'Triangle' },
  { kind: 'text', icon: TypeIcon, label: 'Text' },
];

/** Stable empty default so the fallback branch keeps a constant identity. */
const NO_SHAPES: Shape[] = [];

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#0ea5e9', '#ffffff', '#0f172a'];

function renderShape(shape: Shape, key?: string) {
  const common = {
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
  };
  switch (shape.kind) {
    case 'circle':
      return (
        <ellipse
          key={key}
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          rx={shape.width / 2}
          ry={shape.height / 2}
          {...common}
        />
      );
    case 'triangle':
      return (
        <polygon
          key={key}
          points={`${shape.x + shape.width / 2},${shape.y} ${shape.x},${shape.y + shape.height} ${shape.x + shape.width},${shape.y + shape.height}`}
          {...common}
        />
      );
    case 'text':
      return (
        <text
          key={key}
          x={shape.x}
          y={shape.y + shape.height * 0.7}
          fontSize={shape.height * 0.8}
          fontFamily="Inter, sans-serif"
          fontWeight={600}
          fill={shape.fill}
        >
          {shape.text ?? 'Text'}
        </text>
      );
    default:
      return <rect key={key} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx="6" {...common} />;
  }
}

export default function SvgMakerApp() {
  const { notify } = useOSActions();
  const { state, setState } = useWindowState({
    shapes: [
      { id: 's1', kind: 'rect', x: 90, y: 110, width: 190, height: 130, fill: '#6366f1', stroke: 'none', strokeWidth: 0 },
      { id: 's2', kind: 'circle', x: 330, y: 90, width: 160, height: 160, fill: '#10b981', stroke: '#ffffff', strokeWidth: 3 },
    ] as Shape[],
  });

  const shapes = Array.isArray(state.shapes) ? (state.shapes as Shape[]) : NO_SHAPES;
  const [selected, setSelected] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedShape = shapes.find((shape) => shape.id === selected) ?? null;

  const addShape = useCallback((kind: ShapeKind) => {
    const id = `s_${Date.now()}`;
    const shape: Shape = {
      id,
      kind,
      x: 120 + (shapes.length % 5) * 40,
      y: 110 + (shapes.length % 4) * 40,
      width: kind === 'text' ? 200 : 140,
      height: kind === 'text' ? 42 : 110,
      fill: PALETTE[shapes.length % PALETTE.length],
      stroke: 'none',
      strokeWidth: 0,
      ...(kind === 'text' ? { text: 'Text' } : {}),
    };
    setState({ shapes: [...shapes, shape] });
    setSelected(id);
  }, [shapes, setState]);

  const update = useCallback((id: string, patch: Partial<Shape>) => {
    setState({ shapes: shapes.map((shape) => (shape.id === id ? { ...shape, ...patch } : shape)) });
  }, [shapes, setState]);

  /** Convert a pointer event into SVG user units, honouring the viewBox scale. */
  const toSvgPoint = useCallback((event: PointerEvent | React.PointerEvent) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - box.left) / box.width) * CANVAS.width,
      y: ((event.clientY - box.top) / box.height) * CANVAS.height,
    };
  }, []);

  const startDrag = useCallback((event: React.PointerEvent, shape: Shape) => {
    event.stopPropagation();
    setSelected(shape.id);
    const origin = toSvgPoint(event);
    const offsetX = origin.x - shape.x;
    const offsetY = origin.y - shape.y;
    let latest = { x: shape.x, y: shape.y };

    const onMove = (moveEvent: PointerEvent) => {
      const point = toSvgPoint(moveEvent);
      latest = { x: Math.round(point.x - offsetX), y: Math.round(point.y - offsetY) };
      update(shape.id, latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [toSvgPoint, update]);

  const serialize = useCallback(() => (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.width}" height="${CANVAS.height}" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}">\n`
    + shapes.map((shape) => `  ${shapeToMarkup(shape)}`).join('\n')
    + '\n</svg>\n'
  ), [shapes]);

  const save = useCallback(() => {
    const path = vfs.uniquePath(join(`${HOME}/Pictures`, 'vector.svg'));
    vfs.write(path, serialize(), 'image/svg+xml');
    notify({ message: `Saved ${path}.`, type: 'success' });
  }, [serialize, notify]);

  const reorder = useCallback((id: string, direction: -1 | 1) => {
    const index = shapes.findIndex((shape) => shape.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= shapes.length) return;
    const next = [...shapes];
    [next[index], next[target]] = [next[target], next[index]];
    setState({ shapes: next });
  }, [shapes, setState]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        {TOOLS.map((tool) => (
          <button
            key={tool.kind}
            onClick={() => addShape(tool.kind)}
            className="os-icon-button"
            aria-label={`Add ${tool.label}`}
            title={`Add ${tool.label}`}
          >
            <tool.icon size={15} />
          </button>
        ))}

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        <button
          onClick={() => selected && reorder(selected, 1)}
          disabled={!selected}
          className="os-icon-button"
          aria-label="Bring forward"
        >
          <MoveUp size={15} />
        </button>
        <button
          onClick={() => selected && reorder(selected, -1)}
          disabled={!selected}
          className="os-icon-button"
          aria-label="Send backward"
        >
          <MoveDown size={15} />
        </button>
        <button
          onClick={() => {
            if (!selectedShape) return;
            const copy = { ...selectedShape, id: `s_${Date.now()}`, x: selectedShape.x + 20, y: selectedShape.y + 20 };
            setState({ shapes: [...shapes, copy] });
            setSelected(copy.id);
          }}
          disabled={!selected}
          className="os-icon-button"
          aria-label="Duplicate shape"
        >
          <Copy size={15} />
        </button>
        <button
          onClick={() => {
            if (!selected) return;
            setState({ shapes: shapes.filter((shape) => shape.id !== selected) });
            setSelected(null);
          }}
          disabled={!selected}
          className="os-icon-button"
          aria-label="Delete shape"
        >
          <Trash2 size={15} />
        </button>

        <span className="flex-1" />

        <button onClick={save} className="os-icon-button" aria-label="Save SVG" title="Save to Pictures">
          <Save size={15} />
        </button>
        <button
          onClick={() => {
            const url = URL.createObjectURL(new Blob([serialize()], { type: 'image/svg+xml' }));
            const anchor = window.document.createElement('a');
            anchor.href = url;
            anchor.download = 'vector.svg';
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="os-icon-button"
          aria-label="Download SVG"
        >
          <Download size={15} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-auto flex items-center justify-center p-6 min-w-0">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
            className="w-full max-w-3xl shadow-2xl rounded-lg touch-none"
            style={{ background: '#0f172a', aspectRatio: `${CANVAS.width}/${CANVAS.height}` }}
            onPointerDown={() => setSelected(null)}
            aria-label="Vector canvas"
          >
            {shapes.map((shape) => (
              <g key={shape.id} onPointerDown={(event) => startDrag(event, shape)} style={{ cursor: 'move' }}>
                {renderShape(shape)}
                {selected === shape.id && (
                  <rect
                    x={shape.x - 4}
                    y={shape.y - 4}
                    width={shape.width + 8}
                    height={shape.height + 8}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                )}
              </g>
            ))}
          </svg>
        </div>

        <aside className="w-56 shrink-0 border-l border-[var(--os-border)] overflow-y-auto p-3 bg-[var(--os-surface-sunken)]">
          {selectedShape ? (
            <div className="space-y-3">
              <p className="os-field-label">Shape</p>

              {selectedShape.kind === 'text' && (
                <input
                  value={selectedShape.text ?? ''}
                  onChange={(event) => update(selectedShape.id, { text: event.target.value })}
                  className="os-input text-[12px]"
                  aria-label="Text content"
                  placeholder="Text"
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'width', 'height'] as const).map((field) => (
                  <label key={field} className="block">
                    <span className="os-field-label">{field}</span>
                    <input
                      type="number"
                      value={Math.round(selectedShape[field])}
                      onChange={(event) => update(selectedShape.id, { [field]: Number(event.target.value) })}
                      className="os-input h-7 text-[12px] mt-1"
                      aria-label={field}
                    />
                  </label>
                ))}
              </div>

              <div>
                <p className="os-field-label mb-1.5">Fill</p>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => update(selectedShape.id, { fill: color })}
                      className="w-6 h-6 rounded-md border transition-transform hover:scale-110"
                      style={{
                        background: color,
                        borderColor: selectedShape.fill === color ? 'var(--os-accent)' : 'var(--os-border)',
                        borderWidth: selectedShape.fill === color ? 2 : 1,
                      }}
                      aria-label={`Fill ${color}`}
                    />
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="os-field-label">Stroke width</span>
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={selectedShape.strokeWidth}
                  onChange={(event) => update(selectedShape.id, {
                    strokeWidth: Number(event.target.value),
                    // A zero-width stroke should not leave a stale colour behind.
                    stroke: Number(event.target.value) > 0 ? (selectedShape.stroke === 'none' ? '#ffffff' : selectedShape.stroke) : 'none',
                  })}
                  className="w-full mt-1"
                  aria-label="Stroke width"
                />
              </label>
            </div>
          ) : (
            <p className="text-[11.5px] text-[var(--os-text-dim)] text-center pt-8">
              Select a shape to edit it, or add one from the toolbar.
            </p>
          )}
        </aside>
      </div>

      <div className="app-statusbar">
        <span>{shapes.length} shape{shapes.length === 1 ? '' : 's'}</span>
        <span className="ml-auto">{CANVAS.width} × {CANVAS.height}</span>
      </div>
    </div>
  );
}

/** Serialise one shape to SVG markup for export. */
function shapeToMarkup(shape: Shape): string {
  const stroke = shape.stroke !== 'none' && shape.strokeWidth > 0
    ? ` stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"`
    : '';
  switch (shape.kind) {
    case 'circle':
      return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="${shape.fill}"${stroke} />`;
    case 'triangle':
      return `<polygon points="${shape.x + shape.width / 2},${shape.y} ${shape.x},${shape.y + shape.height} ${shape.x + shape.width},${shape.y + shape.height}" fill="${shape.fill}"${stroke} />`;
    case 'text': {
      const escaped = (shape.text ?? 'Text').replace(/[<>&]/g, (char) => (
        char === '<' ? '&lt;' : char === '>' ? '&gt;' : '&amp;'
      ));
      return `<text x="${shape.x}" y="${shape.y + shape.height * 0.7}" font-size="${shape.height * 0.8}" font-family="Inter, sans-serif" font-weight="600" fill="${shape.fill}">${escaped}</text>`;
    }
    default:
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="6" fill="${shape.fill}"${stroke} />`;
  }
}
