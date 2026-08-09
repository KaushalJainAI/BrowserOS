/**
 * SceneCraft — a working timeline editor for locally-loaded clips.
 *
 * Real playback and scrubbing against files you open; arranging, trimming and
 * ordering all work. It does not re-encode or export a rendered video — that
 * needs a transcoder this desktop does not ship — so export writes an edit
 * decision list instead of pretending to produce a movie.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Trash2, Plus, Save,
  Film, Volume2, VolumeX,
} from 'lucide-react';
import { useOSActions, useWindowState } from '../../contexts/osState';
import { vfs, HOME, join } from '../../os/vfs';
import { formatDuration } from '../../os/time';

interface Clip {
  id: string;
  name: string;
  /** Object URL — valid only for this session, hence the reload notice. */
  url: string;
  duration: number;
  start: number;
  end: number;
}

export default function VideoEditorApp() {
  const { notify } = useOSActions();
  const { state, setState } = useWindowState({ muted: false });
  const muted = state.muted === true;

  const [clips, setClips] = useState<Clip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = clips.find((clip) => clip.id === activeId) ?? null;

  // Object URLs leak until revoked; release them when the app closes.
  useEffect(() => () => clips.forEach((clip) => URL.revokeObjectURL(clip.url)), [clips]);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) continue;
      const url = URL.createObjectURL(file);
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => {
        const clip: Clip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url,
          duration: probe.duration,
          start: 0,
          end: probe.duration,
        };
        setClips((current) => [...current, clip]);
        setActiveId((current) => current ?? clip.id);
      };
      probe.src = url;
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    if (video.paused) void video.play();
    else video.pause();
  }, [active]);

  const exportEdl = useCallback(() => {
    if (!clips.length) return;
    const lines = clips.map((clip, index) => (
      `${index + 1}. ${clip.name}  in=${clip.start.toFixed(2)}s  out=${clip.end.toFixed(2)}s  duration=${(clip.end - clip.start).toFixed(2)}s`
    ));
    const total = clips.reduce((sum, clip) => sum + (clip.end - clip.start), 0);
    const path = vfs.uniquePath(join(`${HOME}/Documents`, 'timeline.md'));
    vfs.write(path, `# Timeline\n\nTotal runtime: ${total.toFixed(2)}s\n\n${lines.join('\n')}\n`);
    notify({ message: `Wrote the edit list to ${path}.`, type: 'success' });
  }, [clips, notify]);

  const totalDuration = clips.reduce((sum, clip) => sum + (clip.end - clip.start), 0);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <button onClick={() => inputRef.current?.click()} className="os-button gap-2">
          <Plus size={14} /> Add clips
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}
        />

        <span className="w-px h-5 bg-[var(--os-border)] mx-1" />

        <button
          onClick={() => {
            if (!active || !videoRef.current) return;
            // Split at the playhead into two clips sharing the same source.
            const at = videoRef.current.currentTime;
            if (at <= active.start + 0.1 || at >= active.end - 0.1) return;
            setClips((current) => current.flatMap((clip) => (
              clip.id === active.id
                ? [
                    { ...clip, end: at },
                    { ...clip, id: `clip_${Date.now()}`, start: at },
                  ]
                : [clip]
            )));
          }}
          disabled={!active}
          className="os-icon-button"
          aria-label="Split at playhead"
          title="Split at playhead"
        >
          <Scissors size={15} />
        </button>
        <button
          onClick={() => {
            if (!active) return;
            setClips((current) => current.filter((clip) => clip.id !== active.id));
            setActiveId(null);
          }}
          disabled={!active}
          className="os-icon-button"
          aria-label="Remove clip"
        >
          <Trash2 size={15} />
        </button>
        <button
          onClick={() => setState({ muted: !muted })}
          data-active={muted}
          className="os-icon-button"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <span className="flex-1" />

        <button onClick={exportEdl} disabled={!clips.length} className="os-button gap-2">
          <Save size={14} /> Export edit list
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 p-4" style={{ background: '#08080c' }}>
        {active ? (
          <video
            ref={videoRef}
            key={active.id}
            src={active.url}
            muted={muted}
            controls={false}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              setPosition(video.currentTime);
              // Enforce the trim: stop at the out-point rather than the file end.
              if (video.currentTime >= active.end) video.pause();
            }}
            onLoadedMetadata={(event) => { event.currentTarget.currentTime = active.start; }}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
        ) : (
          <div className="app-empty">
            <Film size={38} className="opacity-30" />
            <p className="text-[13px] font-medium">No clips loaded</p>
            <p className="text-[11.5px] max-w-sm leading-relaxed">
              Add video files from your machine to arrange and trim them. Clips are held
              in memory for this session only — the edit list can be saved to your files.
            </p>
            <button onClick={() => inputRef.current?.click()} className="os-button gap-2">
              <Plus size={14} /> Add clips
            </button>
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-3 px-4 h-11 border-t border-[var(--os-border)] shrink-0">
        <button
          onClick={() => { if (videoRef.current && active) videoRef.current.currentTime = active.start; }}
          disabled={!active}
          className="os-icon-button"
          aria-label="Jump to start"
        >
          <SkipBack size={15} />
        </button>
        <button onClick={togglePlay} disabled={!active} className="os-icon-button" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => { if (videoRef.current && active) videoRef.current.currentTime = active.end - 0.05; }}
          disabled={!active}
          className="os-icon-button"
          aria-label="Jump to end"
        >
          <SkipForward size={15} />
        </button>

        <input
          type="range"
          min={active?.start ?? 0}
          max={active?.end ?? 1}
          step={0.01}
          value={position}
          disabled={!active}
          onChange={(event) => {
            if (videoRef.current) videoRef.current.currentTime = Number(event.target.value);
          }}
          className="flex-1"
          aria-label="Playhead"
        />

        <span className="mono text-[11px] tabular-nums text-[var(--os-text-dim)] shrink-0">
          {formatDuration(position * 1000)} / {formatDuration((active?.end ?? 0) * 1000)}
        </span>
      </div>

      {/* Timeline */}
      <div className="h-[92px] shrink-0 border-t border-[var(--os-border)] bg-[var(--os-surface-sunken)] p-2 overflow-x-auto">
        {clips.length === 0 ? (
          <p className="h-full flex items-center justify-center text-[11.5px] text-[var(--os-text-dim)]">
            Timeline is empty
          </p>
        ) : (
          <div className="flex gap-1.5 h-full items-stretch">
            {clips.map((clip, index) => {
              const span = clip.end - clip.start;
              return (
                <button
                  key={clip.id}
                  onClick={() => setActiveId(clip.id)}
                  className="rounded-lg border px-2.5 py-1.5 text-left shrink-0 transition-colors"
                  style={{
                    // Width tracks duration so the timeline reads proportionally.
                    width: Math.max(96, Math.min(320, span * 14)),
                    borderColor: activeId === clip.id ? 'var(--os-accent)' : 'var(--os-border)',
                    background: activeId === clip.id
                      ? 'rgb(var(--os-accent-rgb) / 0.12)'
                      : 'var(--os-surface-solid)',
                  }}
                  aria-label={`Clip ${index + 1}: ${clip.name}`}
                >
                  <span className="block text-[11px] font-medium truncate">{clip.name}</span>
                  <span className="block mono text-[10px] text-[var(--os-text-dim)] mt-1">
                    {span.toFixed(1)}s
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="app-statusbar">
        <span>{clips.length} clip{clips.length === 1 ? '' : 's'}</span>
        <span>Runtime {totalDuration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
