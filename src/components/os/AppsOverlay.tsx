import { X, Search } from 'lucide-react';
import { useOS, APPS } from '../../contexts/OSContext';
import type { AppId } from '../../types/os';
import { useState } from 'react';

export function AppsOverlay() {
  const { isAppsOpen, toggleApps, openApp, showContextMenu, addToDesktop } = useOS();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isAppsOpen) return null;

  const handleContext = (e: React.MouseEvent, appId: AppId) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e, [
      { label: 'Open', onClick: () => { openApp(appId); toggleApps(); } },
      { label: 'Add to Desktop', onClick: () => addToDesktop(appId) }
    ]);
  };

  return (
    <div className="apps-overlay fixed inset-0 z-[30000] flex flex-col bg-[#0f172a]/95 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300">
      {/* Search Header */}
      <div className="pt-20 pb-12 flex flex-col items-center px-6">
        <div className="w-full max-w-2xl relative group">
          <div className="absolute inset-0 bg-os-accent/10 blur-xl rounded-2xl group-hover:bg-os-accent/20 transition-colors" />
          <div className="relative bg-white/5 border border-white/10 p-2 rounded-2xl flex items-center backdrop-blur-md">
            <Search className="ml-4 text-white/20" size={24} />
            <input 
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications..."
              className="w-full bg-transparent border-none outline-none p-4 text-white text-2xl font-light placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button onClick={toggleApps} className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90">
        <X size={32} className="text-white/60" />
      </button>

      {/* Apps Container */}
      <div className="flex-1 overflow-y-auto px-12 pb-32">
        <div className="max-w-7xl mx-auto">
          {(() => {
            const filteredAppIds = (Object.keys(APPS) as AppId[]).filter(appId => 
              APPS[appId].title.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredAppIds.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center pt-20 text-white/40">
                  <span className="text-2xl font-light">No apps found for "{searchQuery}"</span>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-y-12 gap-x-8 justify-items-center">
                {filteredAppIds.map((appId) => {
                  const Icon = APPS[appId].icon;
                  return (
                    <div 
                      key={appId}
                      className="flex flex-col items-center gap-4 w-32 group cursor-pointer"
                      onClick={() => {
                        openApp(appId);
                        toggleApps();
                      }}
                      onContextMenu={(e) => handleContext(e, appId)}
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:shadow-os-accent/40 group-hover:from-os-accent/30 transition-all duration-300 border border-white/10 group-hover:border-white/20 group-hover:-translate-y-2">
                        <Icon size={52} className="text-os-accent group-hover:scale-110 transition-transform drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      </div>
                      <span className="text-white text-[13px] font-medium text-center drop-shadow-md group-hover:text-os-accent transition-colors">
                        {APPS[appId].title}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Page Indicators */}
      <div className="p-8 flex justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-white opacity-100" />
        <div className="w-2 h-2 rounded-full bg-white opacity-20 hover:opacity-40 cursor-pointer" />
      </div>
    </div>
  );
}
