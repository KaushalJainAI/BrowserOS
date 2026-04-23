import { Zap, Cpu, Shield, Activity, LogOut, Terminal, Database, Cloud } from 'lucide-react';
import { useOS } from '../../contexts/OSContext';
import { useAuth } from '../../contexts/AuthContext';

export function QuickSettings() {
  const { 
    isQuickSettingsOpen, 
    isEngineConnected, toggleEngine,
    isAutoExecuteActive, toggleAutoExecute,
    isSandboxActive, toggleSandbox,
    tokenUsage
  } = useOS();
  const { logout, user } = useAuth();

  if (!isQuickSettingsOpen) return null;

  return (
    <div 
      className="absolute top-10 right-2 w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-[10000] animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* User Info / Context */}
      <div className="flex items-center gap-3 p-2 mb-4 bg-white/5 rounded-xl border border-white/5">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
          {user?.name?.[0].toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{user?.name || 'User'}</div>
          <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Agent Executive</div>
        </div>
        <button 
          onClick={logout}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-red-400"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Agentic Grid Controls */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <ControlTile 
          icon={Database} 
          label="n8n Engine" 
          active={isEngineConnected} 
          onClick={() => toggleEngine()}
          subLabel={isEngineConnected ? 'Syncing Life' : 'Disconnected'} 
        />
        <ControlTile 
          icon={Zap} 
          label="Auto-Exec" 
          active={isAutoExecuteActive} 
          onClick={() => toggleAutoExecute()}
          subLabel={isAutoExecuteActive ? 'Autonomous' : 'Manual'} 
        />
        <ControlTile 
          icon={Shield} 
          label="Sandbox" 
          active={isSandboxActive} 
          onClick={() => toggleSandbox()}
          subLabel={isSandboxActive ? 'Isolated' : 'Deep Access'} 
        />
        <ControlTile 
          icon={Terminal} 
          label="Agent Status" 
          subLabel="Listening..." 
        />
      </div>

      {/* Resource Metrics (Essential for AI work) */}
      <div className="space-y-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 opacity-60">
              <Activity size={14} />
              <span className="text-[10px] font-bold uppercase">Token Quota</span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono">1.2k / 5k</span>
          </div>
          <div className="relative h-2 flex items-center group">
            <div className="absolute inset-0 bg-white/5 rounded-full" />
            <div 
              className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full transition-all duration-1000" 
              style={{ width: `${tokenUsage}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 opacity-60">
              <Cpu size={14} />
              <span className="text-[10px] font-bold uppercase">Inference Load</span>
            </div>
            <span className="text-[10px] text-purple-400 font-mono">Low</span>
          </div>
          <div className="relative h-2 flex items-center group">
            <div className="absolute inset-0 bg-white/5 rounded-full" />
            <div 
              className="absolute left-0 top-0 bottom-0 bg-purple-500 rounded-full w-1/4" 
            />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[10px] px-1">
        <div className="flex items-center gap-2 font-medium text-white/30">
          <Cloud size={14} />
          <span>Syncing with Better n8n</span>
        </div>
        <div className="text-white/20">
          v0.8.2-alpha
        </div>
      </div>
    </div>
  );
}

function ControlTile({ 
  icon: Icon, 
  label, 
  active, 
  subLabel, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  subLabel?: string,
  onClick?: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left ${
        active 
          ? 'bg-blue-500/20 border-blue-500/30 text-blue-100 ring-1 ring-blue-500/20' 
          : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
      }`}
    >
      <div className={`p-2 rounded-lg ${active ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold truncate">{label}</div>
        {subLabel && <div className="text-[9px] opacity-40 truncate">{subLabel}</div>}
      </div>
    </button>
  );
}
