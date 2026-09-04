/**
 * PixelCanvas — a working raster editor.
 *
 * Saves PNG data URLs into the workspace filesystem, so an exported image is a
 * real file that Files lists and Buddy can move, copy or open elsewhere.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Brush, Eraser, Square, Circle as CircleIcon, Minus, PaintBucket,
  Undo2, Redo2, Save, Trash2, Download, Pipette,
} from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { vfs, HOME, join, basename } from '../../os/vfs';

type Tool = 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill' | 'picker';

const TOOLS: Array<{ id: Tool; icon: typeof Brush; label: string }> = [
  { id: 'brush', icon: Brush, label: 'Brush' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: CircleIcon, label: 'Ellipse' },
  { id: 'fill', icon: PaintBucket, label: 'Fill' },
  { id: 'picker', icon: Pipette, label: 'Pick colour' },
];

const SWATCHES = [
  '#000000', '#ffffff', '#ef4444', '#f59e0b', '#facc15',
  '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899',
];

const WIDTH = 900;
const HEIGHT = 600;
const MAX_HISTORY = 30;

export default function ImageEditorApp() {
  const { notify } = useOSActions();
  const { state, setState, setTitle } = useWindowState({ path: null as string | null });
  const path = typeof state.path === 'string' ? state.path : null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#6366f1');
  const [size, setSize] = useState(6);
  const [dirty, setDirty] = useState(false);

  // Undo stack of ImageData snapshots. Bounded, because a full-canvas snapshot
  // at this size is ~2 MB and an unbounded stack would exhaust memory quickly.
  const history = useRef<ImageData[]>([]);
  const future = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const context = useCallback(() => canvasRef.current?.getContext('2d', { willReadFrequently: true }) ?? null, []);

  const snapshot = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    history.current.push(ctx.getImageData(0, 0, WIDTH, HEIGHT));
    if (history.current.length > MAX_HISTORY) history.current.shift();
    future.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [context]);

  // Initialise the surface (and load a bound file) once the canvas exists.
  useEffect(() => {
    const ctx = context();
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (path) {
      const data = vfs.read(path);
      if (data?.startsWith('data:image')) {
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
          setDirty(false);
        };
        image.src = data;
      }
      setTitle(basename(path));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per bound path
  }, [path]);

  const undo = useCallback(() => {
    const ctx = context();
    const previous = history.current.pop();
    if (!ctx || !previous) return;
    future.current.push(ctx.getImageData(0, 0, WIDTH, HEIGHT));
    ctx.putImageData(previous, 0, 0);
    setCanUndo(history.current.length > 0);
    setCanRedo(true);
    setDirty(true);
  }, [context]);

  const redo = useCallback(() => {
    const ctx = context();
    const next = future.current.pop();
    if (!ctx || !next) return;
    history.current.push(ctx.getImageData(0, 0, WIDTH, HEIGHT));
    ctx.putImageData(next, 0, 0);
    setCanRedo(future.current.length > 0);
    setCanUndo(true);
    setDirty(true);
  }, [context]);

  /** Map a pointer event to canvas coordinates, accounting for CSS scaling. */
  const toCanvasPoint = useCallback((event: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * WIDTH,
      y: ((event.clientY - box.top) / box.height) * HEIGHT,
    };
  }, []);

  /** Scanline flood fill — iterative, so a large region cannot blow the stack. */
  const floodFill = useCallback((startX: number, startY: number, hex: string) => {
    const ctx = context();
    if (!ctx) return;
    const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const data = image.data;
    const x0 = Math.floor(startX);
    const y0 = Math.floor(startY);
    if (x0 < 0 || y0 < 0 || x0 >= WIDTH || y0 >= HEIGHT) return;

    const at = (x: number, y: number) => (y * WIDTH + x) * 4;
    const start = at(x0, y0);
    const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
    const fill = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
      255,
    ];
    if (target.every((channel, index) => channel === fill[index])) return;

    const matches = (index: number) => (
      Math.abs(data[index] - target[0]) < 12
      && Math.abs(data[index + 1] - target[1]) < 12
      && Math.abs(data[index + 2] - target[2]) < 12
      && Math.abs(data[index + 3] - target[3]) < 12
    );

    const stack: Array<[number, number]> = [[x0, y0]];
    while (stack.length) {
      const [px, py] = stack.pop()!;
      let left = px;
      while (left >= 0 && matches(at(left, py))) left -= 1;
      left += 1;

      let spanAbove = false;
      let spanBelow = false;
      for (let x = left; x < WIDTH && matches(at(x, py)); x += 1) {
        const index = at(x, py);
        data[index] = fill[0];
        data[index + 1] = fill[1];
        data[index + 2] = fill[2];
        data[index + 3] = fill[3];

        if (py > 0) {
          const above = matches(at(x, py - 1));
          if (above && !spanAbove) { stack.push([x, py - 1]); spanAbove = true; }
          else if (!above) spanAbove = false;
        }
        if (py < HEIGHT - 1) {
          const below = matches(at(x, py + 1));
          if (below && !spanBelow) { stack.push([x, py + 1]); spanBelow = true; }
          else if (!below) spanBelow = false;
        }
      }
    }

    ctx.putImageData(image, 0, 0);
  }, [context]);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    const ctx = context();
    const overlay = overlayRef.current?.getContext('2d');
    if (!ctx) return;

    const origin = toCanvasPoint(event);

    if (tool === 'picker') {
      const pixel = ctx.getImageData(Math.floor(origin.x), Math.floor(origin.y), 1, 1).data;
      const hex = `#${[pixel[0], pixel[1], pixel[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      setColor(hex);
      setTool('brush');
      return;
    }

    snapshot();
    setDirty(true);

    if (tool === 'fill') {
      floodFill(origin.x, origin.y, color);
      return;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;

    const freehand = tool === 'brush' || tool === 'eraser';
    if (freehand) {
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
    }

    const onMove = (moveEvent: PointerEvent) => {
      const point = toCanvasPoint(moveEvent);
      if (freehand) {
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        return;
      }
      // Shapes preview on the overlay so the committed layer stays untouched
      // until the gesture ends.
      if (!overlay) return;
      overlay.clearRect(0, 0, WIDTH, HEIGHT);
      overlay.lineWidth = size;
      overlay.strokeStyle = color;
      overlay.beginPath();
      if (tool === 'line') {
        overlay.moveTo(origin.x, origin.y);
        overlay.lineTo(point.x, point.y);
      } else if (tool === 'rect') {
        overlay.rect(origin.x, origin.y, point.x - origin.x, point.y - origin.y);
      } else {
        overlay.ellipse(
          (origin.x + point.x) / 2, (origin.y + point.y) / 2,
          Math.abs(point.x - origin.x) / 2, Math.abs(point.y - origin.y) / 2,
          0, 0, Math.PI * 2,
        );
      }
      overlay.stroke();
    };

    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (freehand) {
        ctx.closePath();
        return;
      }
      const point = toCanvasPoint(upEvent);
      overlay?.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.beginPath();
      if (tool === 'line') {
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(point.x, point.y);
      } else if (tool === 'rect') {
        ctx.rect(origin.x, origin.y, point.x - origin.x, point.y - origin.y);
      } else {
        ctx.ellipse(
          (origin.x + point.x) / 2, (origin.y + point.y) / 2,
          Math.abs(point.x - origin.x) / 2, Math.abs(point.y - origin.y) / 2,
          0, 0, Math.PI * 2,
        );
      }
      ctx.stroke();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [tool, color, size, context, toCanvasPoint, snapshot, floodFill]);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = path ?? vfs.uniquePath(join(`${HOME}/Pictures`, 'drawing.png'));
    vfs.write(target, canvas.toDataURL('image/png'), 'image/png');
    if (!path) setState({ path: target });
    setDirty(false);
    notify({ message: `Saved ${basename(target)} to Pictures.`, type: 'success' });
  }, [path, setState, notify]);

  const clear = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    snapshot();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    setDirty(true);
  }, [context, snapshot]);

  return (
    <div className="app-shell">
      <div className="app-toolbar flex-wrap">
        {TOOLS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setTool(entry.id)}
            data-active={tool === entry.id}
            className="os-icon-button"
            aria-label={entry.label}
            title={entry.label}
          >
            <entry.icon size={15} />
          </button>
        ))}

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label="Brush colour"
          className="w-7 h-7 rounded-lg border border-[var(--os-border)] bg-transparent cursor-pointer p-0.5"
        />
        <div className="flex gap-1">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              onClick={() => setColor(swatch)}
              aria-label={`Colour ${swatch}`}
              className="w-5 h-5 rounded-md border transition-transform hover:scale-110"
              style={{
                background: swatch,
                borderColor: color === swatch ? 'var(--os-accent)' : 'var(--os-border)',
                borderWidth: color === swatch ? 2 : 1,
              }}
            />
          ))}
        </div>

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        <label className="flex items-center gap-2 text-[11px] text-[var(--os-text-dim)]">
          Size
          <input
            type="range"
            min={1}
            max={60}
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="w-24"
            aria-label="Brush size"
          />
          <span className="tabular-nums w-5">{size}</span>
        </label>

        <span className="flex-1" />

        <button onClick={undo} disabled={!canUndo} className="os-icon-button" aria-label="Undo" title="Undo">
          <Undo2 size={15} />
        </button>
        <button onClick={redo} disabled={!canRedo} className="os-icon-button" aria-label="Redo" title="Redo">
          <Redo2 size={15} />
        </button>
        <button onClick={clear} className="os-icon-button" aria-label="Clear canvas" title="Clear">
          <Trash2 size={15} />
        </button>
        <button onClick={save} data-active={dirty} className="os-icon-button" aria-label="Save to Pictures" title="Save">
          <Save size={15} />
        </button>
        <button
          onClick={() => {
            const anchor = window.document.createElement('a');
            anchor.href = canvasRef.current?.toDataURL('image/png') ?? '';
            anchor.download = path ? basename(path) : 'drawing.png';
            anchor.click();
          }}
          className="os-icon-button"
          aria-label="Download PNG"
          title="Download"
        >
          <Download size={15} />
        </button>
      </div>

      <div
        className="flex-1 overflow-auto flex items-center justify-center p-6"
        style={{
          backgroundImage:
            'repeating-conic-gradient(var(--os-surface-sunken) 0% 25%, transparent 0% 50%)',
          backgroundSize: '18px 18px',
        }}
      >
        <div className="relative shadow-2xl" style={{ width: '100%', maxWidth: WIDTH, aspectRatio: `${WIDTH}/${HEIGHT}` }}>
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            onPointerDown={onPointerDown}
            className="absolute inset-0 w-full h-full touch-none"
            style={{ cursor: tool === 'picker' ? 'crosshair' : 'crosshair' }}
            aria-label="Drawing canvas"
          />
          <canvas
            ref={overlayRef}
            width={WIDTH}
            height={HEIGHT}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>
      </div>

      <div className="app-statusbar">
        <span className="mono truncate">{path ?? 'Unsaved image'}</span>
        {dirty && <span style={{ color: 'var(--os-warning)' }}>Unsaved</span>}
        <span className="ml-auto">{WIDTH} × {HEIGHT}</span>
      </div>
    </div>
  );
}
