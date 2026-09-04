/** SpaceQuest — a small playable arcade shooter. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { loadPersisted, savePersisted } from '../../os/persistence';

interface Entity { x: number; y: number; vx: number; vy: number; radius: number; }

type Phase = 'idle' | 'playing' | 'over';

const SHIP_SPEED = 320;
const BULLET_SPEED = 480;
const SPAWN_INTERVAL = 900;

export default function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(() => loadPersisted<number>('spacequest.best', 0));

  // All mutable game state lives in refs: the loop runs at frame rate and must
  // never trigger a React render per tick.
  const world = useRef({
    ship: { x: 0, y: 0, vx: 0, vy: 0, radius: 12 } as Entity,
    bullets: [] as Entity[],
    rocks: [] as Entity[],
    keys: new Set<string>(),
    lastSpawn: 0,
    lastShot: 0,
    score: 0,
    lives: 3,
  });

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    world.current = {
      ship: { x: canvas.clientWidth / 2, y: canvas.clientHeight - 60, vx: 0, vy: 0, radius: 12 },
      bullets: [],
      rocks: [],
      keys: new Set(),
      lastSpawn: 0,
      lastShot: 0,
      score: 0,
      lives: 3,
    };
    setScore(0);
    setLives(3);
    setPhase('playing');
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
      }
      world.current.keys.add(event.key);
    };
    const onKeyUp = (event: KeyboardEvent) => world.current.keys.delete(event.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, canvas.clientWidth * ratio);
      canvas.height = Math.max(1, canvas.clientHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let previous = performance.now();

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      // Clamp the delta so a backgrounded tab does not teleport everything on
      // the first frame after it resumes.
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const state = world.current;

      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, width, height);

      // Starfield, derived from position so it needs no state of its own.
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (let index = 0; index < 60; index += 1) {
        const x = (index * 137.5) % width;
        const y = ((index * 219.7) + now * 0.03) % height;
        ctx.fillRect(x, y, 1.4, 1.4);
      }

      // ── Ship ──
      const { keys, ship } = state;
      let dx = 0;
      let dy = 0;
      if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
      if (keys.has('ArrowRight') || keys.has('d')) dx += 1;
      if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
      if (keys.has('ArrowDown') || keys.has('s')) dy += 1;
      const magnitude = Math.hypot(dx, dy) || 1;
      ship.x = Math.max(ship.radius, Math.min(width - ship.radius, ship.x + (dx / magnitude) * SHIP_SPEED * delta));
      ship.y = Math.max(ship.radius, Math.min(height - ship.radius, ship.y + (dy / magnitude) * SHIP_SPEED * delta));

      if ((keys.has(' ') || keys.has('Enter')) && now - state.lastShot > 180) {
        state.bullets.push({ x: ship.x, y: ship.y - 14, vx: 0, vy: -BULLET_SPEED, radius: 3 });
        state.lastShot = now;
      }

      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y - 14);
      ctx.lineTo(ship.x - 11, ship.y + 11);
      ctx.lineTo(ship.x + 11, ship.y + 11);
      ctx.closePath();
      ctx.fill();

      // ── Bullets ──
      state.bullets = state.bullets.filter((bullet) => {
        bullet.y += bullet.vy * delta;
        if (bullet.y < -10) return false;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(bullet.x - 1.5, bullet.y - 7, 3, 10);
        return true;
      });

      // ── Rocks ──
      if (now - state.lastSpawn > SPAWN_INTERVAL) {
        const radius = 14 + Math.random() * 20;
        state.rocks.push({
          x: radius + Math.random() * (width - radius * 2),
          y: -radius,
          vx: (Math.random() - 0.5) * 60,
          vy: 60 + Math.random() * 90 + state.score * 0.6,
          radius,
        });
        state.lastSpawn = now;
      }

      let scoreChanged = false;
      let livesChanged = false;

      state.rocks = state.rocks.filter((rock) => {
        rock.x += rock.vx * delta;
        rock.y += rock.vy * delta;
        if (rock.x < rock.radius || rock.x > width - rock.radius) rock.vx *= -1;
        if (rock.y > height + rock.radius) return false;

        // Bullet hits
        const hitIndex = state.bullets.findIndex(
          (bullet) => Math.hypot(bullet.x - rock.x, bullet.y - rock.y) < rock.radius + bullet.radius,
        );
        if (hitIndex !== -1) {
          state.bullets.splice(hitIndex, 1);
          state.score += Math.round(rock.radius);
          scoreChanged = true;
          return false;
        }

        // Ship collision
        if (Math.hypot(ship.x - rock.x, ship.y - rock.y) < rock.radius + ship.radius) {
          state.lives -= 1;
          livesChanged = true;
          return false;
        }

        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // Sync to React only when a displayed value actually changed.
      if (scoreChanged) setScore(state.score);
      if (livesChanged) {
        setLives(state.lives);
        if (state.lives <= 0) {
          setPhase('over');
          setBest((current) => {
            const next = Math.max(current, state.score);
            savePersisted('spacequest.best', next);
            return next;
          });
        }
      }
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [phase]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <span className="text-[12.5px] font-semibold">SpaceQuest</span>
        <span className="flex-1" />
        <span className="os-chip tabular-nums">Score {score}</span>
        <span className="os-chip tabular-nums">Lives {'●'.repeat(Math.max(0, lives)) || '—'}</span>
        <span className="os-chip tabular-nums"><Trophy size={11} /> {best}</span>
      </div>

      <div className="flex-1 relative min-h-0" style={{ background: '#05050a' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-label="Game canvas" />

        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/65 text-center px-6">
            <h2 className="text-[24px] font-semibold text-white">
              {phase === 'over' ? 'Game over' : 'SpaceQuest'}
            </h2>
            {phase === 'over' && (
              <p className="text-[14px] text-white/70">
                You scored {score}{score >= best && score > 0 ? ' — a new best!' : ''}
              </p>
            )}
            <p className="text-[12px] text-white/50 max-w-xs">
              Arrow keys or WASD to fly, Space to shoot. Click the field first so it takes your keys.
            </p>
            <button onClick={start} className="os-button os-button--accent gap-2 px-6">
              {phase === 'over' ? <RotateCcw size={15} /> : <Play size={15} />}
              {phase === 'over' ? 'Play again' : 'Start'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
