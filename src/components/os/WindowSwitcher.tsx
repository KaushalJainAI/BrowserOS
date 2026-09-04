/**
 * Alt+Tab switcher.
 *
 * Held-modifier semantics: the overlay stays up while Alt is down, Tab cycles,
 * and releasing Alt commits. The candidate list is frozen when the gesture
 * starts so focusing does not reshuffle the order mid-cycle.
 */

import { useEffect, useRef, useState } from 'react';
import { useOSActions, useOSWindows, APPS } from '../../contexts/osState';
import type { OSWindow } from '../../types/os';
import { useLatestRef } from '../../hooks/useLatestRef';

export function WindowSwitcher() {
  const { focusWindow } = useOSActions();
  const { windows } = useOSWindows();
  const [candidates, setCandidates] = useState<OSWindow[] | null>(null);
  const [cursor, setCursor] = useState(0);

  // The key listeners are registered once, so all live values they need are
  // read through refs rather than captured — and the gesture's own bookkeeping
  // lives in refs too, since it must be readable synchronously on keyup.
  const windowsRef = useLatestRef(windows);
  const focusRef = useLatestRef(focusWindow);
  const gesture = useRef<{ list: OSWindow[]; index: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !event.altKey) return;
      event.preventDefault();

      if (!gesture.current) {
        const ordered = [...windowsRef.current].sort((a, b) => b.zIndex - a.zIndex);
        if (ordered.length < 2) return;
        // Start on the second entry: a single Alt+Tab should reach the
        // previously focused window, which is what the gesture is for.
        gesture.current = { list: ordered, index: event.shiftKey ? ordered.length - 1 : 1 };
      } else {
        const { list, index } = gesture.current;
        gesture.current.index = event.shiftKey
          ? (index - 1 + list.length) % list.length
          : (index + 1) % list.length;
      }

      setCandidates(gesture.current.list);
      setCursor(gesture.current.index);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Alt' || !gesture.current) return;
      const { list, index } = gesture.current;
      gesture.current = null;
      setCandidates(null);
      const target = list[index];
      if (target) focusRef.current(target.id);
    };

    // Losing focus mid-gesture would otherwise strand the overlay on screen.
    const onBlur = () => {
      gesture.current = null;
      setCandidates(null);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [windowsRef, focusRef]);

  if (!candidates || candidates.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[40000] flex items-center justify-center pointer-events-none os-anim-fade">
      <div className="os-panel p-4 max-w-[80vw]">
        <div className="flex gap-2.5 flex-wrap justify-center max-w-[720px]">
          {candidates.map((entry, index) => {
            const meta = APPS[entry.appId];
            const Icon = meta.icon;
            const selected = index === cursor;
            return (
              <div
                key={entry.id}
                className="w-[104px] flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-colors"
                style={{
                  background: selected ? 'rgb(var(--os-accent-rgb) / 0.16)' : 'transparent',
                  borderColor: selected ? 'var(--os-accent)' : 'transparent',
                }}
              >
                <span className={`w-12 h-12 rounded-xl bg-linear-to-br ${meta.tint} flex items-center justify-center text-white`}>
                  <Icon size={24} strokeWidth={1.9} />
                </span>
                <span className="text-[10.5px] font-medium text-center leading-tight line-clamp-2 text-[var(--os-text)]">
                  {entry.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
