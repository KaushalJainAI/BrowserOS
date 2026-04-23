import { useOS } from '../contexts/OSContext';
import { TopBar } from '../components/os/TopBar';
import type { AppId } from '../types/os';
import { Dock } from '../components/os/Dock';
import { BuddyPanel } from '../components/os/BuddyPanel';
import { SearchOverlay } from '../components/os/SearchOverlay';
import { AppsOverlay } from '../components/os/AppsOverlay';
import { ContextMenu } from '../components/os/ContextMenu';
import { Bot, RefreshCw, Layout, Settings as SettingsIcon, Monitor } from 'lucide-react';
import { useEffect } from 'react';
import { DesktopIcon } from '../components/os/DesktopIcon';
import { WindowRenderer } from '../components/os/WindowRenderer';

export function DesktopPage() {
  const { 
    openApp, toggleBuddy, isSearchOpen, toggleSearch, 
    showContextMenu, pinnedApps, pinApp, unpinApp,
    nextWindow, addToClipboard, isBuddyOpen, wallpaper,
    desktopApps, sortDesktop, removeFromDesktop,
    toggleQuickSettings, toggleNotifications,
    windows
  } = useOS();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'f') || (e.metaKey && e.key === ' ')) {
        e.preventDefault();
        toggleSearch();
      }

      if ((e.altKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault();
        nextWindow();
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        openApp('screenshot');
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        openApp('clipboard');
      }
    };

    const handleCopy = () => {
      const selection = window.getSelection()?.toString();
      if (selection) {
        addToClipboard(selection);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleCopy);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
    };
  }, [toggleSearch, nextWindow, openApp, addToClipboard]);

  const handleContext = (e: React.MouseEvent, type: 'desktop' | 'app', appId?: AppId) => {
    if (e.button !== 2 && !(e.ctrlKey || e.metaKey)) return;
    
    e.preventDefault();
    e.stopPropagation();

    const options = [];

    if (type === 'app' && appId) {
      const isPinned = pinnedApps.includes(appId);
      options.push(
        { label: 'Open', onClick: () => openApp(appId) },
        { 
          label: isPinned ? 'Unpin from Dock' : 'Pin to Dock', 
          onClick: () => isPinned ? unpinApp(appId) : pinApp(appId) 
        },
        { label: 'Remove from Desktop', icon: RefreshCw, onClick: () => removeFromDesktop(appId), variant: 'danger' as const },
        { label: 'App Details', onClick: () => console.log('Details', appId) }
      );
    } else {
      options.push(
        { label: 'Sort by Name', icon: Layout, onClick: () => sortDesktop('name') },
        { label: 'Change Background', icon: Layout, onClick: () => openApp('settings') },
        { label: 'Display Settings', icon: Monitor, onClick: () => openApp('settings') },
        { label: 'System Settings', icon: SettingsIcon, onClick: () => openApp('settings') },
        { label: 'Refresh Desktop', icon: RefreshCw, onClick: () => window.location.reload() }
      );
    }

    showContextMenu(e, options);
  };

  return (
    <div 
      className="os-container" 
      onMouseDown={(e) => {
        handleContext(e, 'desktop');
        // Close popovers on click
        toggleQuickSettings(false);
        toggleNotifications(false);
      }} 
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="os-background" style={{ background: wallpaper, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      {/* Top Bar (GNOME/Ubuntu) */}
      <TopBar />

      <div className="workspace-area">
        {/* Desktop Area */}
        <div className="desktop relative w-full h-full overflow-hidden">
          <div className="desktop-items grid grid-cols-[repeat(auto-fill,110px)] gap-6 content-start p-4 h-full">
            {desktopApps.map((appId) => (
              <DesktopIcon key={appId} appId={appId} />
            ))}
          </div>

          {/* Trash Bin Area */}
          <div 
            id="desktop-trash"
            className="absolute bottom-20 right-8 w-24 h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 text-white/20 hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/5 transition-all z-0"
          >
            <RefreshCw size={32} className="rotate-45" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Trash Bin</span>
          </div>

          {/* Absolute Buddy Panel */}
          <div className={`absolute top-0 bottom-0 right-0 z-[8000] w-[320px] bg-[#09090b] border-l border-white/10 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] ${
            isBuddyOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'
          }`}>
            <BuddyPanel />
          </div>
        </div>
      </div>

      {/* Global Windows Layer - Spans the screen below TopBar, adapts to BuddyPanel */}
      <div 
        className="absolute top-8 left-0 bottom-0 pointer-events-none z-[5000] transition-all duration-300 ease-in-out"
        style={{ right: isBuddyOpen ? '320px' : '0' }}
      >
        <WindowRenderer />
      </div>

      {/* Overlays */}
      <SearchOverlay isOpen={isSearchOpen} onClose={toggleSearch} />
      <AppsOverlay />
      <ContextMenu />

      {/* Invisible Trigger Area for Dock Auto-Hide */}
      {windows.length > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-4 z-[8999] peer" />
      )}

      {/* Floating Bottom Dock */}
      <div 
        className={`absolute bottom-4 -translate-x-1/2 z-[9000] transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${
          windows.length === 0 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-20 opacity-0 peer-hover:translate-y-0 peer-hover:opacity-100 hover:translate-y-0 hover:opacity-100'
        }`}
        style={{ left: isBuddyOpen ? 'calc(50% - 160px)' : '50%' }}
      >
        <Dock />
      </div>

      {/* Floating AskBuddy Button */}
      <button 
        onClick={toggleBuddy}
        className="buddy-toggle-btn absolute right-4 z-[9000]"
        style={{ bottom: '8px' }}
        title="Ask Buddy"
      >
        <Bot size={24} />
      </button>
    </div>
  );
}
