import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useOS, APPS } from '../../contexts/OSContext';
import type { AppId } from '../../types/os';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const { openApp } = useOS();

  useEffect(() => {
    if (isOpen) {
      document.getElementById('os-search-input')?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredApps = (Object.keys(APPS) as AppId[]).filter(id => 
    APPS[id].title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="search-overlay fixed inset-0 z-[20000] flex items-start justify-center pt-24 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#242424] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-center p-4 gap-4 border-b border-white/5">
          <Search className="text-secondary" size={20} />
          <input 
            id="os-search-input"
            type="text" 
            placeholder="Search apps, files, or workflows..." 
            className="flex-1 bg-transparent border-none outline-none text-lg text-white font-light"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <X size={20} className="text-secondary" />
          </button>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {filteredApps.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-secondary/60 font-bold">Applications</div>
              {filteredApps.map(appId => {
                const Icon = APPS[appId].icon;
                return (
                  <div 
                    key={appId}
                    className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group"
                    onClick={() => {
                      openApp(appId);
                      onClose();
                    }}
                  >
                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-os-accent/10 transition-colors">
                      <Icon size={20} className="text-os-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{APPS[appId].title}</p>
                      <p className="text-xs text-secondary leading-tight">System Application</p>
                    </div>
                    <div className="text-[10px] text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Press <kbd className="bg-white/10 px-1 rounded border border-white/10">Enter</kbd> to launch
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Search size={32} className="text-secondary/20" />
              </div>
              <div>
                <p className="text-secondary">No results found for "{query}"</p>
                <p className="text-xs text-secondary/40">Try searching for "Files", "Terminal", or "Buddy"</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-black/20 border-t border-white/5 flex items-center justify-between text-[10px] text-secondary/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded border border-white/10">ESC</kbd> to close</span>
            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded border border-white/10">↑↓</kbd> to navigate</span>
          </div>
          <div className="flex items-center gap-1">
            BrowserOS Spotlight Search
          </div>
        </div>
      </div>
    </div>
  );
}
