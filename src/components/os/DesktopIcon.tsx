import { useOS, APPS } from '../../contexts/OSContext';
import type { AppId } from '../../types/os';
import React, { useRef, useState, memo } from 'react';
import Draggable from 'react-draggable';

interface DesktopIconProps {
  appId: AppId;
}

export const DesktopIcon = memo(function DesktopIcon({ appId }: DesktopIconProps) {
  const { openApp, showContextMenu, pinnedApps, pinApp, unpinApp, removeFromDesktop } = useOS();
  const Icon = APPS[appId].icon;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleStop = () => {
    setIsDragging(false);
    
    // Check for collision with Trash Bin
    const trashBin = document.getElementById('desktop-trash');
    const iconRect = nodeRef.current?.getBoundingClientRect();
    const trashRect = trashBin?.getBoundingClientRect();

    if (iconRect && trashRect) {
      const overlap = !(
        iconRect.right < trashRect.left || 
        iconRect.left > trashRect.right || 
        iconRect.bottom < trashRect.top || 
        iconRect.top > trashRect.bottom
      );

      if (overlap) {
        removeFromDesktop(appId);
      }
    }
  };

  const handleContext = (e: React.MouseEvent) => {
    if (e.button !== 2 && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    e.stopPropagation();

    const isPinned = pinnedApps.includes(appId);
    showContextMenu(e, [
      { label: 'Open', onClick: () => openApp(appId) },
      { 
        label: isPinned ? 'Unpin from Dock' : 'Pin to Dock', 
        onClick: () => isPinned ? unpinApp(appId) : pinApp(appId) 
      },
      { label: 'App Details', onClick: () => console.log('Details', appId) }
    ]);
  };

  return (
    <Draggable 
      nodeRef={nodeRef} 
      bounds="parent"
      onStart={() => setIsDragging(true)}
      onStop={handleStop}
    >
      <div 
        ref={nodeRef}
        className={`desktop-icon flex items-center justify-center flex-col gap-2 p-3 rounded-xl hover:bg-white/10 cursor-pointer text-center os-transition select-none z-10 hover:z-20 w-24 h-24 ${isDragging ? 'dragging' : ''}`}
        onClick={() => openApp(appId)}
        onMouseDown={handleContext}
      >
        <div className="w-16 h-16 flex items-center justify-center bg-white/5 group-hover:bg-white/10 rounded-2xl shadow-sm border border-white/5 group-hover:border-white/10 transition-all group-active:scale-90">
          <Icon size={40} className="drop-shadow-lg text-os-accent pointer-events-none group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-white text-[11px] font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-snug pb-[2px] px-1 break-words line-clamp-2 pointer-events-none">
          {APPS[appId].title}
        </span>
      </div>
    </Draggable>
  );
});
