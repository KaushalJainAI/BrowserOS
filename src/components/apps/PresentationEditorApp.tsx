/** SlideMaster — build a deck, present it, and save it to the filesystem. */

import { useCallback, useEffect, useState } from 'react';
import {
  Play, Plus, Trash2, Save, ChevronLeft, ChevronRight, X, Copy, Presentation,
} from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { vfs, HOME, join, basename } from '../../os/vfs';

interface Slide {
  id: string;
  title: string;
  body: string;
  /** Index into THEMES. */
  theme: number;
}

const THEMES = [
  { name: 'Indigo', background: 'linear-gradient(135deg,#312e81,#1e1b4b)', text: '#f8fafc' },
  { name: 'Slate', background: 'linear-gradient(135deg,#334155,#0f172a)', text: '#f8fafc' },
  { name: 'Ember', background: 'linear-gradient(135deg,#9a3412,#7f1d1d)', text: '#fff7ed' },
  { name: 'Mint', background: 'linear-gradient(135deg,#0f766e,#134e4a)', text: '#ecfdf5' },
  { name: 'Paper', background: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', text: '#0f172a' },
];

function newSlide(index: number): Slide {
  return {
    id: `slide_${Date.now()}_${index}`,
    title: `Slide ${index + 1}`,
    body: 'Add your content here.',
    theme: index % THEMES.length,
  };
}

/**
 * Stable fallback for a deck that somehow has no slides — building it inline
 * would hand every render a new array and invalidate the callbacks below.
 */
const FALLBACK_SLIDES: Slide[] = [newSlide(0)];

export default function PresentationEditorApp() {
  const { notify } = useOSActions();
  const { state, setState, setTitle } = useWindowState({
    slides: [
      { id: 'slide_1', title: 'BrowserOS', body: 'An agent-operable desktop.', theme: 0 },
      { id: 'slide_2', title: 'Everything is addressable', body: 'Apps, files and windows can all be driven by Buddy.', theme: 3 },
    ] as Slide[],
    current: 0,
    path: null as string | null,
  });

  const slides = Array.isArray(state.slides) && state.slides.length
    ? (state.slides as Slide[])
    : FALLBACK_SLIDES;
  const current = Math.min(Math.max(0, Number(state.current) || 0), slides.length - 1);
  const path = typeof state.path === 'string' ? state.path : null;

  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    setTitle(path ? basename(path) : 'Untitled deck');
  }, [path, setTitle]);

  const update = useCallback((index: number, patch: Partial<Slide>) => {
    setState({ slides: slides.map((slide, position) => (position === index ? { ...slide, ...patch } : slide)) });
  }, [slides, setState]);

  const addSlide = useCallback(() => {
    const next = [...slides, newSlide(slides.length)];
    setState({ slides: next, current: next.length - 1 });
  }, [slides, setState]);

  const removeSlide = useCallback((index: number) => {
    if (slides.length === 1) return;
    const next = slides.filter((_, position) => position !== index);
    setState({ slides: next, current: Math.min(current, next.length - 1) });
  }, [slides, current, setState]);

  const save = useCallback(() => {
    const markdown = slides
      .map((slide) => `# ${slide.title}\n\n${slide.body}`)
      .join('\n\n---\n\n');
    const target = path ?? vfs.uniquePath(join(`${HOME}/Documents`, 'deck.md'));
    vfs.write(target, `${markdown}\n`);
    if (!path) setState({ path: target });
    notify({ message: `Saved deck to ${target}.`, type: 'success' });
  }, [slides, path, setState, notify]);

  // Presenting takes over the whole window, so arrow keys drive the deck.
  useEffect(() => {
    if (!presenting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresenting(false);
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        setState({ current: Math.min(current + 1, slides.length - 1) });
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setState({ current: Math.max(current - 1, 0) });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [presenting, current, slides.length, setState]);

  const slide = slides[current];
  const theme = THEMES[slide.theme % THEMES.length];

  if (presenting) {
    return (
      <div className="h-full w-full relative flex items-center justify-center" style={{ background: theme.background }}>
        <div className="max-w-3xl px-12 text-center" style={{ color: theme.text }}>
          <h1 className="text-[44px] font-semibold leading-tight mb-5">{slide.title}</h1>
          <p className="text-[19px] leading-relaxed opacity-85 whitespace-pre-wrap">{slide.body}</p>
        </div>

        <button onClick={() => setPresenting(false)} className="absolute top-4 right-4 os-icon-button" aria-label="Exit presentation">
          <X size={18} />
        </button>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button
            onClick={() => setState({ current: Math.max(0, current - 1) })}
            disabled={current === 0}
            className="os-icon-button"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[12px] tabular-nums" style={{ color: theme.text, opacity: 0.7 }}>
            {current + 1} / {slides.length}
          </span>
          <button
            onClick={() => setState({ current: Math.min(slides.length - 1, current + 1) })}
            disabled={current === slides.length - 1}
            className="os-icon-button"
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <button onClick={addSlide} className="os-button gap-2">
          <Plus size={14} /> Slide
        </button>
        <button
          onClick={() => {
            const copy = { ...slide, id: `slide_${Date.now()}` };
            setState({ slides: [...slides.slice(0, current + 1), copy, ...slides.slice(current + 1)] });
          }}
          className="os-icon-button"
          aria-label="Duplicate slide"
        >
          <Copy size={15} />
        </button>
        <button
          onClick={() => removeSlide(current)}
          disabled={slides.length === 1}
          className="os-icon-button"
          aria-label="Delete slide"
        >
          <Trash2 size={15} />
        </button>

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        {THEMES.map((entry, index) => (
          <button
            key={entry.name}
            onClick={() => update(current, { theme: index })}
            aria-label={`${entry.name} theme`}
            title={entry.name}
            className="w-6 h-6 rounded-md border transition-transform hover:scale-110"
            style={{
              background: entry.background,
              borderColor: slide.theme === index ? 'var(--os-accent)' : 'var(--os-border)',
              borderWidth: slide.theme === index ? 2 : 1,
            }}
          />
        ))}

        <span className="flex-1" />

        <button onClick={save} className="os-icon-button" aria-label="Save deck" title="Save as markdown">
          <Save size={15} />
        </button>
        <button onClick={() => setPresenting(true)} className="os-button os-button--accent gap-2">
          <Play size={14} /> Present
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="w-44 shrink-0 border-r border-[var(--os-border)] overflow-y-auto p-2 space-y-1.5 bg-[var(--os-surface-sunken)]">
          {slides.map((entry, index) => (
            <button
              key={entry.id}
              onClick={() => setState({ current: index })}
              className="w-full aspect-video rounded-lg border p-2 text-left overflow-hidden transition-transform hover:scale-[1.02]"
              style={{
                background: THEMES[entry.theme % THEMES.length].background,
                borderColor: index === current ? 'var(--os-accent)' : 'var(--os-border)',
                borderWidth: index === current ? 2 : 1,
              }}
              aria-label={`Slide ${index + 1}: ${entry.title}`}
            >
              <span
                className="block text-[9px] font-semibold leading-tight line-clamp-3"
                style={{ color: THEMES[entry.theme % THEMES.length].text }}
              >
                {entry.title}
              </span>
            </button>
          ))}
        </aside>

        <div className="flex-1 flex flex-col items-center justify-center p-8 min-w-0 gap-4">
          <div
            className="w-full max-w-2xl aspect-video rounded-2xl shadow-2xl flex items-center justify-center p-10"
            style={{ background: theme.background }}
          >
            <div className="w-full text-center" style={{ color: theme.text }}>
              <input
                value={slide.title}
                onChange={(event) => update(current, { title: event.target.value })}
                className="w-full bg-transparent border-none outline-none text-center text-[26px] font-semibold mb-3"
                style={{ color: theme.text }}
                aria-label="Slide title"
              />
              <textarea
                value={slide.body}
                onChange={(event) => update(current, { body: event.target.value })}
                rows={4}
                className="w-full bg-transparent border-none outline-none text-center text-[14px] leading-relaxed resize-none opacity-85"
                style={{ color: theme.text }}
                aria-label="Slide body"
              />
            </div>
          </div>
          <p className="text-[11.5px] text-[var(--os-text-dim)] flex items-center gap-1.5">
            <Presentation size={12} /> Slide {current + 1} of {slides.length} · click the text to edit
          </p>
        </div>
      </div>
    </div>
  );
}
