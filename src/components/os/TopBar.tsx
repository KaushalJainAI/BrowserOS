import { useState, useEffect } from 'react';
import { Search, Bell, User as UserIcon, LayoutGrid, Database, Zap, Shield } from 'lucide-react';
import { useOS } from '../../contexts/OSContext';
import { useAuth } from '../../contexts/AuthContext';
import { QuickSettings } from './QuickSettings';
import { Notifications } from './Notifications';

export function TopBar() {
  const { 
    windows, activeWindowId, toggleSearch, toggleApps,
    isQuickSettingsOpen, toggleQuickSettings,
    isNotificationsOpen, toggleNotifications,
    isEngineConnected, isAutoExecuteActive, isSandboxActive
  } = useOS();
  const { user } = useAuth();
  const [time, setTime] = useState<Date>(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between px-2 h-8 bg-black/40 backdrop-blur-md border-b border-white/10 text-[13px] text-white z-[1000] select-none">
      <div className="flex items-center gap-1 h-full">
        <div 
          className="px-2 h-full flex items-center hover:bg-white/10 cursor-pointer transition-colors rounded group"
          onClick={toggleApps}
          title="Applications"
        >
          <LayoutGrid size={15} className="opacity-80 group-hover:opacity-100" />
        </div>
        
        <div 
          className="px-2 h-full flex items-center cursor-pointer hover:bg-white/10 transition-colors rounded group" 
          onClick={toggleSearch}
          title="Search"
        >
          <Search size={14} className="opacity-70 group-hover:opacity-100" />
        </div>

        {activeWindowId && (
          <div className="px-3 h-full flex items-center font-bold opacity-90 animate-in fade-in slide-in-from-left-2 duration-300">
            {windows.find(w => w.id === activeWindowId)?.title}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-0.5 h-full">
        {user && (
          <div 
            className={`px-3 h-full flex items-center hover:bg-white/10 rounded transition-colors group cursor-pointer ${showUserMenu ? 'bg-white/10' : ''}`}
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={user.name}
          >
            <div className="relative">
              <UserIcon size={14} className="opacity-80 group-hover:opacity-100" />
              <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-black" />
            </div>
          </div>
        )}

        <div 
          className={`px-3 h-full flex items-center gap-3 hover:bg-white/10 cursor-pointer transition-colors rounded group ${isQuickSettingsOpen || isNotificationsOpen ? 'bg-white/10' : ''}`}
          onClick={() => toggleQuickSettings()}
        >
          <div className="flex items-center gap-2.5">
            <Bell 
              size={14} 
              className={`opacity-70 group-hover:opacity-100 transition-opacity ${isNotificationsOpen ? 'text-indigo-400 opacity-100' : ''}`} 
              onClick={(e) => {
                e.stopPropagation();
                toggleNotifications();
              }}
            />
            <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
              <Database size={13} className={isEngineConnected ? 'text-green-400' : 'text-red-400'} />
              <Zap size={13} className={isAutoExecuteActive ? 'text-yellow-400' : 'opacity-40'} />
              <Shield size={13} className={isSandboxActive ? 'text-blue-400' : 'text-orange-400'} />
            </div>
          </div>
        </div>

        <div className="px-3 h-full flex items-center hover:bg-white/10 cursor-pointer transition-colors rounded font-medium tabular-nums opacity-90">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Popovers */}
      <QuickSettings />
      <Notifications />
    </div>
  );
}
