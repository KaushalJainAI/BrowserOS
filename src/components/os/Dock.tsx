import { useOS, APPS } from '../../contexts/OSContext';
import { Grid } from 'lucide-react';
import { memo } from 'react';

export const Dock = memo(function Dock() {
  const { windows, activeWindowId, toggleMinimize, focusWindow, toggleApps, pinnedApps, openApp } = useOS();

  return (
    <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl">
      {(() => {
        const runningUnpinned = windows
          .map(w => w.appId)
          .filter(appId => !pinnedApps.includes(appId));
        
        const uniqueRunningUnpinned = Array.from(new Set(runningUnpinned));
        const dockAppIds = [...pinnedApps, ...uniqueRunningUnpinned];

        return dockAppIds.map((appId) => {
          const isOpen = windows.some((w) => w.appId === appId);
          const Icon = APPS[appId].icon;
          const isActive = windows.some((w) => w.appId === appId && w.id === activeWindowId && !w.isMinimized);
          const isPinned = pinnedApps.includes(appId);
          
          return (
            <div 
              key={appId} 
              className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 cursor-pointer group hover:bg-white/10 hover:scale-110 active:scale-95 ${isActive ? 'bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' : ''} ${isOpen && !isActive ? 'bg-white/5' : ''}`}
              title={APPS[appId].title}
              onClick={() => {
                const win = windows.find((w) => w.appId === appId);
                if (win) {
                  if (isActive) toggleMinimize(win.id);
                  else focusWindow(win.id);
                } else {
                  openApp(appId);
                }
              }}
            >
              <div className="text-white drop-shadow-md transition-transform group-hover:-translate-y-1">
                <Icon size={26} />
              </div>
              
              {/* Indicators */}
              {isOpen && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white]" />}
              {!isPinned && isOpen && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full border border-black" title="Unpinned Running App" />
              )}
            </div>
          );
        });
      })()}
      
      <div className="w-px h-8 bg-white/20 mx-1" />
      
      <div 
        className="relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 cursor-pointer group hover:bg-white/10 hover:scale-110 active:scale-95" 
        title="Show Applications" 
        onClick={toggleApps}
      >
        <div className="text-white drop-shadow-md transition-transform group-hover:-translate-y-1 group-hover:rotate-180 duration-500">
          <Grid size={26} />
        </div>
      </div>
    </div>
  );
});
