/**
 * Quick settings popover: the toggles and appearance controls people reach for
 * most, all wired to real state rather than decoration.
 */

import {
  Zap, Shield, LogOut, Database, Moon, Sun, Eye, Settings as SettingsIcon,
  Bot, Grid2x2, Minimize2,
} from 'lucide-react';
import { useOSActions, useOSAgent, useOSShell, useOSWindows } from '../../contexts/osState';
import { useAuth } from '../../contexts/authState';
import { ACCENTS, WALLPAPERS } from '../../os/theme';

export function QuickSettings() {
  const { setOverlay, setTheme, toggleEngine, toggleAutoExecute, toggleSandbox, openApp, tileWindows, minimizeAll } = useOSActions();
  const { windows } = useOSWindows();
  const { overlay, theme, isEngineConnected, isAutoExecuteActive, isSandboxActive } = useOSShell();
  const { isAgentConnected, agentLog } = useOSAgent();
  const { user, logout } = useAuth();

  if (overlay !== 'quickSettings') return null;

  const availableWallpapers = WALLPAPERS.filter(
    (wallpaper) => wallpaper.mode === theme.mode || wallpaper.mode === 'both',
  );

  return (
    <div
      className="os-panel absolute top-9 right-2 w-[326px] p-3.5 z-[10000] os-anim-drop"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-label="Quick settings"
    >
      {/* Identity */}
      <div className="flex items-center gap-3 p-2.5 mb-3 rounded-xl bg-[var(--os-surface-sunken)] border border-[var(--os-border)]">
        <span className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-400 via-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-[14px] shrink-0">
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate text-[var(--os-text)]">{user?.name ?? 'User'}</p>
          <p className="text-[10.5px] truncate text-[var(--os-text-dim)]">{user?.email ?? 'Signed out'}</p>
        </div>
        <button onClick={logout} className="os-icon-button" aria-label="Sign out" title="Sign out">
          <LogOut size={15} />
        </button>
      </div>

      {/* Agent + engine toggles */}
      <div className="grid grid-cols-2 gap-2 mb-3.5">
        <Tile
          icon={Bot}
          label="Agent link"
          detail={isAgentConnected ? 'Connected' : 'Offline'}
          active={isAgentConnected}
          onClick={() => openApp('settings', { state: { section: 'agent' } })}
        />
        <Tile
          icon={Database}
          label="n8n engine"
          detail={isEngineConnected ? 'Syncing' : 'Disconnected'}
          active={isEngineConnected}
          onClick={() => toggleEngine()}
        />
        <Tile
          icon={Zap}
          label="Auto-exec"
          detail={isAutoExecuteActive ? 'Autonomous' : 'Ask first'}
          active={isAutoExecuteActive}
          onClick={() => toggleAutoExecute()}
        />
        <Tile
          icon={Shield}
          label="Sandbox"
          detail={isSandboxActive ? 'Isolated' : 'Full access'}
          active={isSandboxActive}
          onClick={() => toggleSandbox()}
        />
      </div>

      {/* Appearance */}
      <p className="os-field-label mb-2">Appearance</p>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setTheme({ mode: theme.mode === 'dark' ? 'light' : 'dark' })}
          className="os-button flex-1 gap-2"
          aria-label={`Switch to ${theme.mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme.mode === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          {theme.mode === 'dark' ? 'Dark' : 'Light'}
        </button>
        <button
          onClick={() => setTheme({ reducedEffects: !theme.reducedEffects })}
          data-active={theme.reducedEffects}
          className="os-button gap-2"
          title="Disable blur and animation for better performance"
        >
          <Eye size={14} />
          {theme.reducedEffects ? 'Plain' : 'Effects'}
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {ACCENTS.map((accent) => (
          <button
            key={accent.id}
            onClick={() => setTheme({ accent: accent.value })}
            aria-label={`${accent.name} accent`}
            title={accent.name}
            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
            style={{
              background: accent.value,
              boxShadow: theme.accent === accent.value
                ? `0 0 0 2px var(--os-surface-solid), 0 0 0 4px ${accent.value}`
                : 'none',
            }}
          />
        ))}
      </div>

      <div className="flex gap-1.5 mb-3.5 overflow-x-auto pb-1">
        {availableWallpapers.map((wallpaper) => (
          <button
            key={wallpaper.id}
            onClick={() => setTheme({ wallpaper: wallpaper.value })}
            aria-label={`${wallpaper.name} wallpaper`}
            title={wallpaper.name}
            className="w-14 h-9 rounded-lg shrink-0 border transition-transform hover:scale-105"
            style={{
              background: wallpaper.value,
              borderColor: theme.wallpaper === wallpaper.value ? 'var(--os-accent)' : 'var(--os-border)',
              borderWidth: theme.wallpaper === wallpaper.value ? 2 : 1,
            }}
          />
        ))}
      </div>

      {/* Window actions */}
      {windows.length > 0 && (
        <div className="flex gap-2 mb-3.5">
          <button onClick={tileWindows} className="os-button flex-1 gap-2" disabled={windows.length < 2}>
            <Grid2x2 size={14} /> Tile
          </button>
          <button onClick={minimizeAll} className="os-button flex-1 gap-2">
            <Minimize2 size={14} /> Show desktop
          </button>
        </div>
      )}

      <hr className="os-divider mb-2.5" />

      <div className="flex items-center justify-between">
        <button
          onClick={() => { openApp('settings'); setOverlay(null); }}
          className="os-button os-button--ghost gap-2 px-2"
        >
          <SettingsIcon size={14} /> All settings
        </button>
        <span className="text-[10px] text-[var(--os-text-dim)]">
          {agentLog.length} agent action{agentLog.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon, label, detail, active, onClick,
}: {
  icon: typeof Zap;
  label: string;
  detail: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left"
      style={{
        background: active ? 'rgb(var(--os-accent-rgb) / 0.13)' : 'var(--os-surface-sunken)',
        borderColor: active ? 'rgb(var(--os-accent-rgb) / 0.3)' : 'var(--os-border)',
      }}
      aria-pressed={active}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: active ? 'var(--os-accent)' : 'var(--os-hover)',
          color: active ? '#fff' : 'var(--os-text-muted)',
        }}
      >
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-semibold truncate text-[var(--os-text)]">{label}</span>
        <span className="block text-[9.5px] truncate text-[var(--os-text-dim)]">{detail}</span>
      </span>
    </button>
  );
}
