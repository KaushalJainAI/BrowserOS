/**
 * Settings — every control here changes real state.
 *
 * The Agent section doubles as the capability disclosure: it lists exactly
 * which actions Buddy can perform on this desktop, generated from the action
 * registry, so the list cannot drift from what is actually implemented.
 */

import { useMemo, useState } from 'react';
import {
  Palette, Bot, Monitor, Info, Trash2, HardDrive, Keyboard, Pin,
  Moon, Sun, Eye, ShieldCheck, Database, Zap, Check,
} from 'lucide-react';
import { useOSActions, useOSAgent, useOSShell, useWindowState, APPS } from '../../contexts/osState';
import { useAuth } from '../../contexts/authState';
import { ACCENTS, WALLPAPERS } from '../../os/theme';
import { ACTION_SPECS } from '../../os/actions';
import { vfs } from '../../os/vfs';
import { formatBytes } from '../../os/time';
import { APP_IDS } from '../../os/apps';
import type { AppId } from '../../types/os';

type Section = 'appearance' | 'agent' | 'desktop' | 'storage' | 'shortcuts' | 'about';

const SECTIONS: Array<{ id: Section; label: string; icon: typeof Palette }> = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'desktop', label: 'Desktop & dock', icon: Monitor },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
];

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl / ⌘ + K', 'Open search'],
  ['Alt + Tab', 'Switch windows'],
  ['Ctrl / ⌘ + W', 'Close focused window'],
  ['Ctrl / ⌘ + D', 'Show desktop'],
  ['Ctrl / ⌘ + Shift + B', 'Toggle Buddy'],
  ['Ctrl / ⌘ + Shift + V', 'Clipboard history'],
  ['Ctrl / ⌘ + Shift + S', 'Screen capture'],
  ['⌘ + ← / →', 'Tile window left / right'],
  ['⌘ + ↑ / ↓', 'Maximize / restore'],
  ['F11', 'Toggle maximize'],
  ['Escape', 'Close the frontmost overlay'],
];

export default function SettingsApp() {
  const { setTheme, pinApp, unpinApp, addToDesktop, removeFromDesktop, resetWorkspace, setScreenContextEnabled, setAutoApproveActions, toggleEngine, toggleAutoExecute, toggleSandbox, notify } = useOSActions();
  const { theme, pinnedApps, desktopApps, isEngineConnected, isAutoExecuteActive, isSandboxActive } = useOSShell();
  const { agentLog, isAgentConnected, screenContextEnabled, autoApproveActions } = useOSAgent();
  const { user } = useAuth();
  const { state, setState } = useWindowState({ section: 'appearance' as Section });

  const section: Section = SECTIONS.some((entry) => entry.id === state.section)
    ? (state.section as Section)
    : 'appearance';

  const [confirmingReset, setConfirmingReset] = useState(false);

  const storage = useMemo(() => {
    const nodes = vfs.walk();
    const files = nodes.filter((node) => node.kind === 'file');
    return {
      files: files.length,
      folders: nodes.length - files.length,
      bytes: files.reduce((total, node) => total + node.content.length, 0),
    };
  }, []);

  const availableWallpapers = WALLPAPERS.filter(
    (wallpaper) => wallpaper.mode === theme.mode || wallpaper.mode === 'both',
  );

  return (
    // `app-shell` is column by default and is defined after Tailwind's
    // utilities, so the direction override has to be inline to win.
    <div className="app-shell" style={{ flexDirection: 'row' }}>
      <aside className="app-sidebar">
        {SECTIONS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setState({ section: entry.id })}
            data-active={section === entry.id}
            className="os-row py-2 text-[12.5px]"
          >
            <entry.icon size={15} className="shrink-0" />
            <span className="truncate">{entry.label}</span>
          </button>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto p-6 min-w-0">
        <div className="max-w-2xl space-y-7">
          {section === 'appearance' && (
            <>
              <Group title="Theme" hint="Applies instantly across every window.">
                <div className="flex gap-2">
                  {(['dark', 'light'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTheme({ mode })}
                      className="flex-1 flex items-center gap-2.5 p-3 rounded-xl border transition-all"
                      style={{
                        borderColor: theme.mode === mode ? 'var(--os-accent)' : 'var(--os-border)',
                        background: theme.mode === mode ? 'rgb(var(--os-accent-rgb) / 0.1)' : 'transparent',
                      }}
                      aria-pressed={theme.mode === mode}
                    >
                      {mode === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
                      <span className="text-[13px] font-medium capitalize">{mode}</span>
                      {theme.mode === mode && <Check size={14} className="ml-auto text-[var(--os-accent)]" />}
                    </button>
                  ))}
                </div>
              </Group>

              <Group title="Accent colour">
                <div className="flex flex-wrap gap-2.5">
                  {ACCENTS.map((accent) => (
                    <button
                      key={accent.id}
                      onClick={() => setTheme({ accent: accent.value })}
                      aria-label={accent.name}
                      title={accent.name}
                      className="w-9 h-9 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: accent.value,
                        boxShadow: theme.accent === accent.value
                          ? `0 0 0 3px var(--os-surface-solid), 0 0 0 5px ${accent.value}`
                          : 'none',
                      }}
                    />
                  ))}
                </div>
              </Group>

              <Group title="Wallpaper">
                <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(126px,1fr))]">
                  {availableWallpapers.map((wallpaper) => (
                    <button
                      key={wallpaper.id}
                      onClick={() => setTheme({ wallpaper: wallpaper.value })}
                      className="aspect-video rounded-xl border transition-transform hover:scale-[1.03] relative overflow-hidden"
                      style={{
                        background: wallpaper.value,
                        borderColor: theme.wallpaper === wallpaper.value ? 'var(--os-accent)' : 'var(--os-border)',
                        borderWidth: theme.wallpaper === wallpaper.value ? 2 : 1,
                      }}
                      aria-label={`${wallpaper.name} wallpaper`}
                    >
                      <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-white drop-shadow">
                        {wallpaper.name}
                      </span>
                    </button>
                  ))}
                </div>
              </Group>

              <Group title="Performance" hint="Turn effects off on low-powered machines.">
                <Toggle
                  icon={Eye}
                  label="Reduce transparency and motion"
                  detail="Disables background blur and animation across the desktop."
                  value={theme.reducedEffects}
                  onChange={(value) => setTheme({ reducedEffects: value })}
                />
              </Group>
            </>
          )}

          {section === 'agent' && (
            <>
              <Group title="Connection">
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ borderColor: 'var(--os-border)', background: 'var(--os-surface-sunken)' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: isAgentConnected ? 'var(--os-success)' : 'var(--os-text-dim)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">
                      {isAgentConnected ? 'Connected to the agent channel' : 'Agent channel offline'}
                    </p>
                    <p className="text-[11.5px] text-[var(--os-text-dim)]">
                      {isAgentConnected
                        ? 'Buddy can act on this desktop in real time.'
                        : 'Sign in to the backend to let Buddy drive the desktop live.'}
                    </p>
                  </div>
                  <span className="os-chip">{agentLog.length} actions</span>
                </div>
              </Group>

              <Group title="Privacy" hint="Controls what leaves this machine.">
                <Toggle
                  icon={Monitor}
                  label="Share screen context"
                  detail="Sends a summary of open windows, focus and your file tree with each message. Nothing is sent when this is off."
                  value={screenContextEnabled}
                  onChange={setScreenContextEnabled}
                />
                <Toggle
                  icon={ShieldCheck}
                  label="Auto-run agent actions"
                  detail="When off, actions are logged for review instead of being applied immediately."
                  value={autoApproveActions}
                  onChange={setAutoApproveActions}
                />
              </Group>

              <Group title="Execution">
                <Toggle
                  icon={Database}
                  label="n8n workflow engine"
                  detail="Sync workflow state with the orchestrator backend."
                  value={isEngineConnected}
                  onChange={(value) => toggleEngine(value)}
                />
                <Toggle
                  icon={Zap}
                  label="Autonomous execution"
                  detail="Let queued workflows run without a confirmation step."
                  value={isAutoExecuteActive}
                  onChange={(value) => toggleAutoExecute(value)}
                />
                <Toggle
                  icon={ShieldCheck}
                  label="Sandbox code execution"
                  detail="Run generated code in the restricted WebAssembly sandbox."
                  value={isSandboxActive}
                  onChange={(value) => toggleSandbox(value)}
                />
              </Group>

              <Group
                title="Capabilities"
                hint="Everything Buddy is able to do on this desktop, generated from the action registry."
              >
                <div className="rounded-xl border border-[var(--os-border)] divide-y divide-[var(--os-border)] overflow-hidden">
                  {ACTION_SPECS.map((spec) => (
                    <div key={spec.name} className="p-2.5">
                      <p className="mono text-[11.5px] font-semibold text-[var(--os-accent)]">{spec.name}</p>
                      <p className="text-[11.5px] text-[var(--os-text-muted)] mt-0.5">{spec.summary}</p>
                      {spec.params.length > 0 && (
                        <p className="mono text-[10.5px] text-[var(--os-text-dim)] mt-1">
                          {spec.params.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Group>
            </>
          )}

          {section === 'desktop' && (
            <>
              <Group title="Dock" hint="Pinned apps stay in the dock even when closed.">
                <AppToggleList
                  selected={pinnedApps}
                  onAdd={pinApp}
                  onRemove={unpinApp}
                  icon={Pin}
                />
              </Group>
              <Group title="Desktop icons">
                <AppToggleList
                  selected={desktopApps}
                  onAdd={addToDesktop}
                  onRemove={removeFromDesktop}
                  icon={Monitor}
                />
              </Group>
            </>
          )}

          {section === 'storage' && (
            <>
              <Group title="Workspace filesystem">
                <div className="grid grid-cols-3 gap-2.5">
                  <Stat label="Files" value={String(storage.files)} />
                  <Stat label="Folders" value={String(storage.folders)} />
                  <Stat label="Used" value={formatBytes(storage.bytes)} />
                </div>
                <p className="text-[11.5px] text-[var(--os-text-dim)] mt-2.5">
                  Files live in your browser’s local storage. They persist across reloads
                  on this device and are never uploaded unless you ask Buddy to act on them.
                </p>
              </Group>

              <Group title="Reset" hint="This cannot be undone.">
                {confirmingReset ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        notify({ message: 'Resetting workspace…', type: 'warning' });
                        resetWorkspace();
                      }}
                      className="os-button os-button--danger gap-2"
                    >
                      <Trash2 size={14} /> Yes, erase everything
                    </button>
                    <button onClick={() => setConfirmingReset(false)} className="os-button">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmingReset(true)} className="os-button os-button--danger gap-2">
                    <Trash2 size={14} /> Reset workspace, files and preferences
                  </button>
                )}
              </Group>
            </>
          )}

          {section === 'shortcuts' && (
            <Group title="Keyboard shortcuts">
              <div className="rounded-xl border border-[var(--os-border)] divide-y divide-[var(--os-border)] overflow-hidden">
                {SHORTCUTS.map(([keys, description]) => (
                  <div key={keys} className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[12.5px] text-[var(--os-text-muted)]">{description}</span>
                    <kbd className="os-kbd h-6 px-2 text-[11px]">{keys}</kbd>
                  </div>
                ))}
              </div>
            </Group>
          )}

          {section === 'about' && (
            <>
              <div className="flex items-center gap-4">
                <span className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white">
                  <Monitor size={30} />
                </span>
                <div>
                  <h2 className="text-[18px] font-semibold">BrowserOS</h2>
                  <p className="text-[12.5px] text-[var(--os-text-dim)]">
                    An agent-operable desktop for AIAAS
                  </p>
                </div>
              </div>

              <Group title="Session">
                <Row label="Signed in as" value={user?.name ?? 'Not signed in'} />
                <Row label="Email" value={user?.email ?? '—'} />
                <Row label="Agent channel" value={isAgentConnected ? 'Connected' : 'Offline'} />
                <Row label="Applications" value={String(APP_IDS.length)} />
                <Row label="Agent actions this session" value={String(agentLog.length)} />
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[13.5px] font-semibold mb-1">{title}</h3>
      {hint && <p className="text-[11.5px] text-[var(--os-text-dim)] mb-3">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>
        <div className="space-y-2">{children}</div>
      </div>
    </section>
  );
}

function Toggle({
  icon: Icon, label, detail, value, onChange,
}: {
  icon: typeof Palette;
  label: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      className="w-full flex items-start gap-3 p-3 rounded-xl border border-[var(--os-border)] hover:bg-[var(--os-hover)] transition-colors text-left"
    >
      <Icon size={16} className="shrink-0 mt-0.5 text-[var(--os-text-muted)]" />
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-medium text-[var(--os-text)]">{label}</span>
        <span className="block text-[11.5px] text-[var(--os-text-dim)] mt-0.5 leading-snug">{detail}</span>
      </span>
      <span className="os-switch mt-0.5" data-on={value}>
        <span className="os-switch__knob" />
      </span>
    </button>
  );
}

function AppToggleList({
  selected, onAdd, onRemove,
}: {
  selected: AppId[];
  onAdd: (appId: AppId) => void;
  onRemove: (appId: AppId) => void;
  icon: typeof Pin;
}) {
  return (
    <div className="grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      {APP_IDS.map((appId) => {
        const meta = APPS[appId];
        const isOn = selected.includes(appId);
        const Icon = meta.icon;
        return (
          <button
            key={appId}
            onClick={() => (isOn ? onRemove(appId) : onAdd(appId))}
            aria-pressed={isOn}
            className="flex items-center gap-2.5 p-2 rounded-xl border transition-colors"
            style={{
              borderColor: isOn ? 'rgb(var(--os-accent-rgb) / 0.4)' : 'var(--os-border)',
              background: isOn ? 'rgb(var(--os-accent-rgb) / 0.1)' : 'transparent',
            }}
          >
            <span className={`w-7 h-7 rounded-lg bg-linear-to-br ${meta.tint} flex items-center justify-center text-white shrink-0`}>
              <Icon size={14} />
            </span>
            <span className="text-[12px] font-medium truncate flex-1 text-left">{meta.title}</span>
            {isOn && <Check size={13} className="shrink-0 text-[var(--os-accent)]" />}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-[var(--os-border)] bg-[var(--os-surface-sunken)]">
      <p className="os-field-label">{label}</p>
      <p className="text-[17px] font-semibold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--os-border)] last:border-0">
      <span className="text-[12.5px] text-[var(--os-text-muted)]">{label}</span>
      <span className="text-[12.5px] font-medium">{value}</span>
    </div>
  );
}
