/** Clock — world clocks, a stopwatch with laps, and a countdown timer. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, Timer, Hourglass, Play, Pause, RotateCcw, Flag, Plus, X } from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { formatDuration } from '../../os/time';

type Tab = 'world' | 'stopwatch' | 'timer';

const ZONES = [
  'UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London',
  'Europe/Berlin', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

export default function ClockApp() {
  const { notify } = useOSActions();
  const { state, setState } = useWindowState({
    tab: 'world' as Tab,
    zones: ['UTC', 'America/New_York', 'Asia/Kolkata'] as string[],
  });

  const tab: Tab = state.tab === 'stopwatch' || state.tab === 'timer' ? state.tab : 'world';
  const zones = Array.isArray(state.zones) ? (state.zones as string[]) : ZONES.slice(0, 3);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const handle = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(handle);
  }, []);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        {([['world', Globe, 'World'], ['stopwatch', Timer, 'Stopwatch'], ['timer', Hourglass, 'Timer']] as const)
          .map(([value, Icon, label]) => (
            <button
              key={value}
              onClick={() => setState({ tab: value })}
              data-active={tab === value}
              className="os-row w-auto flex-none px-3 py-1.5 text-[12.5px] font-medium"
            >
              <Icon size={14} /> {label}
            </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'world' && (
          <WorldClocks
            now={now}
            zones={zones}
            onChange={(next) => setState({ zones: next })}
          />
        )}
        {tab === 'stopwatch' && <Stopwatch />}
        {tab === 'timer' && <CountdownTimer onDone={() => notify({ title: 'Timer', message: 'Time is up.', type: 'success' })} />}
      </div>
    </div>
  );
}

function WorldClocks({
  now, zones, onChange,
}: {
  now: Date;
  zones: string[];
  onChange: (zones: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const format = (zone: string, options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(undefined, { ...options, timeZone: zone }).format(now);
    } catch {
      // An unsupported zone would otherwise throw during render.
      return '—';
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <p className="text-[52px] font-light tabular-nums leading-none tracking-tight">
          {format(local, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </p>
        <p className="text-[13px] text-[var(--os-text-muted)] mt-2">
          {format(local, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="text-[11px] text-[var(--os-text-dim)] mt-0.5">{local}</p>
      </div>

      <div className="space-y-1.5">
        {zones.map((zone) => (
          <div
            key={zone}
            className="group flex items-center gap-3 p-3 rounded-xl border border-[var(--os-border)]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{zone.split('/').pop()?.replace(/_/g, ' ')}</p>
              <p className="text-[11px] text-[var(--os-text-dim)] truncate">{zone}</p>
            </div>
            <p className="text-[19px] font-light tabular-nums shrink-0">
              {format(zone, { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <button
              onClick={() => onChange(zones.filter((entry) => entry !== zone))}
              className="os-icon-button w-7 h-7 opacity-0 group-hover:opacity-100 shrink-0"
              aria-label={`Remove ${zone}`}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 grid gap-1.5 grid-cols-2">
          {ZONES.filter((zone) => !zones.includes(zone)).map((zone) => (
            <button
              key={zone}
              onClick={() => { onChange([...zones, zone]); setAdding(false); }}
              className="os-row text-[12px] py-2"
            >
              <Globe size={13} className="shrink-0" />
              <span className="truncate">{zone}</span>
            </button>
          ))}
          <button onClick={() => setAdding(false)} className="os-row text-[12px] py-2 col-span-2 justify-center">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="os-button w-full mt-3 gap-2">
          <Plus size={14} /> Add city
        </button>
      )}
    </div>
  );
}

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  // Anchor to wall-clock time rather than accumulating interval ticks, so the
  // readout stays accurate even when the tab is throttled in the background.
  const anchor = useRef({ startedAt: 0, offset: 0 });

  useEffect(() => {
    if (!running) return;
    anchor.current.startedAt = Date.now();
    let frame = 0;
    const tick = () => {
      setElapsed(anchor.current.offset + (Date.now() - anchor.current.startedAt));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const toggle = useCallback(() => {
    setRunning((current) => {
      if (current) anchor.current.offset = elapsed;
      return !current;
    });
  }, [elapsed]);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    anchor.current = { startedAt: 0, offset: 0 };
  }, []);

  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-[56px] font-light tabular-nums leading-none tracking-tight mb-8 mono">
        {formatDuration(elapsed)}
      </p>

      <div className="flex justify-center gap-2 mb-6">
        <button onClick={toggle} className="os-button os-button--accent gap-2 px-6">
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
        </button>
        <button
          onClick={() => setLaps((current) => [elapsed, ...current])}
          disabled={!running}
          className="os-button gap-2"
        >
          <Flag size={14} /> Lap
        </button>
        <button onClick={reset} disabled={elapsed === 0} className="os-button gap-2">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {laps.length > 0 && (
        <div className="rounded-xl border border-[var(--os-border)] divide-y divide-[var(--os-border)] overflow-hidden text-left">
          {laps.map((lap, index) => (
            <div key={lap} className="flex justify-between px-3 py-2 text-[12.5px]">
              <span className="text-[var(--os-text-muted)]">Lap {laps.length - index}</span>
              <span className="mono tabular-nums">{formatDuration(lap)}</span>
              <span className="mono tabular-nums text-[var(--os-text-dim)]">
                +{formatDuration(lap - (laps[index + 1] ?? 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CountdownTimer({ onDone }: { onDone: () => void }) {
  const [duration, setDuration] = useState(5 * 60 * 1000);
  const [remaining, setRemaining] = useState(5 * 60 * 1000);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);

  useEffect(() => {
    if (!running) return;
    deadline.current = Date.now() + remaining;
    const handle = setInterval(() => {
      const left = deadline.current - Date.now();
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        onDone();
        return;
      }
      setRemaining(left);
    }, 100);
    return () => clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `remaining` seeds the deadline once per run
  }, [running, onDone]);

  const progress = duration > 0 ? 1 - remaining / duration : 0;
  const circumference = 2 * Math.PI * 88;

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="relative w-56 h-56 mx-auto mb-6">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r="88" fill="none" stroke="var(--os-border)" strokeWidth="9" />
          <circle
            cx="100" cy="100" r="88" fill="none"
            stroke="var(--os-accent)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * progress}
            style={{ transition: 'stroke-dashoffset 120ms linear' }}
          />
        </svg>
        <p className="absolute inset-0 flex items-center justify-center text-[34px] font-light tabular-nums mono">
          {formatDuration(remaining)}
        </p>
      </div>

      <div className="flex justify-center gap-1.5 mb-4">
        {[1, 5, 10, 25].map((minutes) => (
          <button
            key={minutes}
            onClick={() => {
              const ms = minutes * 60 * 1000;
              setDuration(ms);
              setRemaining(ms);
              setRunning(false);
            }}
            data-active={duration === minutes * 60 * 1000}
            className="os-row w-auto flex-none px-3 py-1.5 text-[12px] font-medium justify-center"
          >
            {minutes}m
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <button
          onClick={() => setRunning((current) => !current)}
          disabled={remaining === 0}
          className="os-button os-button--accent gap-2 px-6"
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => { setRunning(false); setRemaining(duration); }}
          className="os-button gap-2"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}
