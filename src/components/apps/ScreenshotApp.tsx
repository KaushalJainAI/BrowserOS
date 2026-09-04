/**
 * Screen Capture — real capture via the Screen Capture API.
 *
 * A web page cannot silently screenshot itself, so this asks the browser for a
 * display-media stream: the user picks the surface and the browser mediates
 * consent. Captures are saved into Pictures as real files.
 */

import { useCallback, useRef, useState } from 'react';
import { Camera, Download, Save, Trash2, Monitor, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { useOSActions } from '../../contexts/osState';
import { vfs, HOME, join } from '../../os/vfs';
import { relativeTime } from '../../os/time';

interface Capture {
  id: string;
  dataUrl: string;
  at: number;
  width: number;
  height: number;
}

export default function ScreenshotApp() {
  const { notify, openApp } = useOSActions();
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const capture = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('This browser does not support screen capture.');
      return;
    }

    setBusy(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) throw new Error('Capture surface unavailable.');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      // The first frame is often blank; wait two rAFs so the compositor has
      // actually painted the shared surface before grabbing it.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const width = video.videoWidth;
      const height = video.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);

      const entry: Capture = {
        id: `cap_${Date.now()}`,
        dataUrl: canvas.toDataURL('image/png'),
        at: Date.now(),
        width,
        height,
      };
      setCaptures((current) => [entry, ...current].slice(0, 12));
      setSelected(entry.id);
      notify({ message: 'Screen captured.', type: 'success' });
    } catch (caught) {
      // Cancelling the picker is a normal outcome, not an error worth shouting about.
      const message = caught instanceof Error ? caught.message : 'Capture failed.';
      setError(/denied|abort|cancel|permission/i.test(message) ? 'Capture cancelled.' : message);
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      setBusy(false);
    }
  }, [notify]);

  const active = captures.find((entry) => entry.id === selected) ?? captures[0] ?? null;

  const save = useCallback((entry: Capture) => {
    const stamp = new Date(entry.at).toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const path = vfs.uniquePath(join(`${HOME}/Pictures`, `capture-${stamp}.png`));
    vfs.write(path, entry.dataUrl, 'image/png');
    notify({ message: `Saved to ${path}.`, type: 'success' });
  }, [notify]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <button onClick={capture} disabled={busy} className="os-button os-button--accent gap-2">
          <Camera size={14} /> {busy ? 'Waiting for picker…' : 'Capture screen'}
        </button>
        <span className="flex-1" />
        {active && (
          <>
            <button onClick={() => save(active)} className="os-button gap-2">
              <Save size={14} /> Save to Pictures
            </button>
            <button
              onClick={() => {
                const anchor = document.createElement('a');
                anchor.href = active.dataUrl;
                anchor.download = `capture-${active.at}.png`;
                anchor.click();
              }}
              className="os-icon-button"
              aria-label="Download capture"
            >
              <Download size={15} />
            </button>
            <button
              onClick={() => {
                setCaptures((current) => current.filter((entry) => entry.id !== active.id));
                setSelected(null);
              }}
              className="os-icon-button"
              aria-label="Discard capture"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>

      {/* Off-screen sink for the capture stream; never shown to the user. */}
      <video ref={videoRef} className="hidden" playsInline muted />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex items-center justify-center p-6 min-w-0 bg-[var(--os-surface-sunken)]">
          {active ? (
            <img
              src={active.dataUrl}
              alt={`Screen capture from ${relativeTime(active.at)}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <div className="app-empty">
              <Monitor size={38} className="opacity-30" />
              <p className="text-[13px] font-medium">No captures yet</p>
              <p className="text-[11.5px] max-w-sm leading-relaxed">
                Capture goes through the browser’s own picker — you choose which tab,
                window or screen to share, and nothing is recorded until you do.
              </p>
              {error && (
                <p className="text-[11.5px] flex items-center gap-1.5 mt-1" style={{ color: 'var(--os-warning)' }}>
                  <ShieldAlert size={12} /> {error}
                </p>
              )}
            </div>
          )}
        </div>

        {captures.length > 0 && (
          <aside className="w-40 shrink-0 border-l border-[var(--os-border)] overflow-y-auto p-2 space-y-1.5 bg-[var(--os-surface-sunken)]">
            {captures.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry.id)}
                className="w-full rounded-lg overflow-hidden border transition-transform hover:scale-[1.03]"
                style={{ borderColor: active?.id === entry.id ? 'var(--os-accent)' : 'var(--os-border)' }}
                aria-label={`Capture from ${relativeTime(entry.at)}`}
              >
                <img src={entry.dataUrl} alt="" className="w-full aspect-video object-cover" />
                <span className="block text-[9.5px] py-1 text-[var(--os-text-dim)]">
                  {relativeTime(entry.at)}
                </span>
              </button>
            ))}
          </aside>
        )}
      </div>

      <div className="app-statusbar">
        <span>{captures.length} capture{captures.length === 1 ? '' : 's'} this session</span>
        {active && <span>{active.width} × {active.height}</span>}
        <button
          onClick={() => openApp('explorer', { state: { cwd: `${HOME}/Pictures` } })}
          className="ml-auto flex items-center gap-1.5 hover:text-[var(--os-text)]"
        >
          <ImageIcon size={11} /> Open Pictures
        </button>
      </div>
    </div>
  );
}
