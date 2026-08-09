/** SimWorld — a real-time particle simulation you can steer. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Wind, Sparkles, MousePointer2 } from 'lucide-react';
import { useLatestRef } from '../../hooks/useLatestRef';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  hue: number;
}

export default function SimulatorApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const [running, setRunning] = useState(true);
  const [fps, setFps] = useState(0);

  const [gravity, setGravity] = useState(0.05);
  const [drag, setDrag] = useState(0.004);
  const [count, setCount] = useState(700);
  const [bounce, setBounce] = useState(0.72);
  const [attract, setAttract] = useState(true);

  // Settings are read inside the animation loop, which starts once — a ref
  // keeps the loop reading current values without restarting on every slider
  // move, since restarting would visibly reset the field.
  const settings = useLatestRef({ gravity, drag, bounce, attract });

  const seed = useCallback((width: number, height: number, total: number) => {
    particles.current = Array.from({ length: total }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.5,
      vx: (Math.random() - 0.5) * 2.2,
      vy: (Math.random() - 0.5) * 2.2,
      hue: 200 + Math.random() * 120,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      // Cap DPR at 2: beyond that the fill cost outweighs the visible gain.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, box.width * ratio);
      canvas.height = Math.max(1, box.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    seed(canvas.clientWidth, canvas.clientHeight, count);

    let frame = 0;
    let lastSample = performance.now();
    let frames = 0;

    const step = () => {
      frame = requestAnimationFrame(step);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const config = settings.current;

      // Fade rather than clear, which leaves motion trails for free.
      ctx.fillStyle = 'rgba(8, 8, 12, 0.22)';
      ctx.fillRect(0, 0, width, height);

      for (const particle of particles.current) {
        particle.vy += config.gravity;
        particle.vx *= 1 - config.drag;
        particle.vy *= 1 - config.drag;

        if (config.attract && pointer.current.active) {
          const dx = pointer.current.x - particle.x;
          const dy = pointer.current.y - particle.y;
          const distanceSq = dx * dx + dy * dy;
          // Skip the singularity at the cursor itself, which would fling
          // particles off-screen at unbounded velocity.
          if (distanceSq > 25) {
            const force = 140 / distanceSq;
            particle.vx += dx * force;
            particle.vy += dy * force;
          }
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) { particle.x = 0; particle.vx = -particle.vx * config.bounce; }
        if (particle.x > width) { particle.x = width; particle.vx = -particle.vx * config.bounce; }
        if (particle.y < 0) { particle.y = 0; particle.vy = -particle.vy * config.bounce; }
        if (particle.y > height) { particle.y = height; particle.vy = -particle.vy * config.bounce; }

        const speed = Math.hypot(particle.vx, particle.vy);
        ctx.fillStyle = `hsl(${particle.hue + speed * 12} 90% ${52 + Math.min(28, speed * 6)}%)`;
        ctx.fillRect(particle.x, particle.y, 2, 2);
      }

      frames += 1;
      const now = performance.now();
      if (now - lastSample >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastSample)));
        frames = 0;
        lastSample = now;
      }
    };

    if (running) frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [running, count, seed, settings]);

  const reset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    seed(canvas.clientWidth, canvas.clientHeight, count);
  }, [count, seed]);

  return (
    <div className="app-shell" style={{ flexDirection: 'row' }}>
      <aside className="app-sidebar">
        <p className="os-field-label px-2 pt-1 pb-3">Environment</p>

        <Slider label="Gravity" value={gravity} min={-0.2} max={0.4} step={0.005} onChange={setGravity} format={(v) => v.toFixed(3)} />
        <Slider label="Drag" value={drag} min={0} max={0.06} step={0.001} onChange={setDrag} format={(v) => v.toFixed(3)} />
        <Slider label="Bounce" value={bounce} min={0} max={1} step={0.02} onChange={setBounce} format={(v) => v.toFixed(2)} />
        <Slider
          label="Particles"
          value={count}
          min={100}
          max={4000}
          step={100}
          onChange={setCount}
          format={(v) => v.toLocaleString()}
        />

        <button
          onClick={() => setAttract(!attract)}
          data-active={attract}
          className="os-row py-2 text-[12px] mt-3"
        >
          <MousePointer2 size={14} className="shrink-0" />
          Cursor attraction
        </button>

        <div className="mt-auto pt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--os-text-dim)] px-2">
            <span>FPS</span>
            <span
              className="mono tabular-nums"
              style={{ color: fps > 45 ? 'var(--os-success)' : 'var(--os-warning)' }}
            >
              {fps}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--os-text-dim)] px-2">
            <span>Bodies</span>
            <span className="mono tabular-nums">{count.toLocaleString()}</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="app-toolbar">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold">
            <Sparkles size={14} style={{ color: 'var(--os-accent)' }} />
            Particle dynamics
          </span>
          <span className="flex-1" />
          <button onClick={reset} className="os-button gap-2">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={() => setRunning(!running)} className="os-button os-button--accent gap-2">
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? 'Pause' : 'Run'}
          </button>
        </div>

        <div className="flex-1 relative min-h-0" style={{ background: '#08080c' }}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none"
            aria-label="Particle simulation"
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              pointer.current = {
                x: event.clientX - box.left,
                y: event.clientY - box.top,
                active: true,
              };
            }}
            onPointerLeave={() => { pointer.current.active = false; }}
          />
          {!running && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="os-chip">Paused</span>
            </div>
          )}
          <p className="absolute bottom-3 left-3 text-[10.5px] text-white/35 pointer-events-none flex items-center gap-1.5">
            <Wind size={11} /> Move the cursor over the field to pull particles
          </p>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  return (
    <label className="block px-2 py-1.5">
      <span className="flex items-center justify-between text-[11.5px] mb-1.5">
        <span className="text-[var(--os-text-muted)]">{label}</span>
        <span className="mono tabular-nums text-[var(--os-text-dim)]">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
        aria-label={label}
      />
    </label>
  );
}
