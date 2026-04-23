import { useRef, type ReactNode, useState, memo } from 'react';
import { Minus, Maximize2, X } from 'lucide-react';
import { useOS } from '../../contexts/OSContext';
import Draggable from 'react-draggable';

interface WindowProps {
  id: string;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  isActive: boolean;
  defaultPosition?: { x: number; y: number };
  children: ReactNode;
}

export const Window = memo(function Window({
  id,
  title,
  isMinimized,
  isMaximized,
  zIndex,
  isActive,
  defaultPosition,
  children
}: WindowProps) {
  const { toggleMinimize, toggleMaximize, closeWindow, focusWindow } = useOS();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (isMinimized) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".window-header"
      bounds="parent"
      disabled={isMaximized}
      defaultPosition={defaultPosition || { x: 50, y: 50 }}
      onStart={() => {
        focusWindow(id);
        setIsDragging(true);
      }}
      onStop={() => setIsDragging(false)}
    >
      <div
        ref={nodeRef}
        className={`absolute flex flex-col backdrop-blur-2xl os-transition pointer-events-auto ${
          isMaximized 
            ? 'window-maximized' 
            : 'rounded-xl shadow-2xl border border-white/10'
        } ${
          isActive && !isMaximized ? 'shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-white/20' : ''
        } ${isDragging ? 'dragging' : ''}`}
        style={{
          zIndex,
          width: isMaximized ? '100%' : '800px',
          height: isMaximized ? '100%' : '600px',
          top: 0,
          left: 0,
          background: 'rgba(15, 23, 42, 0.85)',
        }}
        onMouseDown={() => focusWindow(id)}
      >
        <div className="window-header flex items-center h-11 bg-white/[0.03] border-b border-white/10 cursor-move">
          {/* App Icon (Small) and Title */}
          <div className="flex-1 flex items-center px-4 gap-2 h-full pointer-events-none select-none">
            <div className="w-4 h-4 rounded-sm bg-os-accent/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-os-accent" />
            </div>
            <span className="font-medium text-[13px] text-gray-300">
              {title}
            </span>
          </div>
          
          {/* Windows-style Controls */}
          <div className="flex items-center h-full">
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); toggleMinimize(id, e); }} 
              className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Minimize"
            >
              <Minus size={16} className="text-gray-400" />
            </button>
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); toggleMaximize(id, e); }} 
              className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <Maximize2 size={14} className="text-gray-400" />
            </button>
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { 
                e.stopPropagation(); 
                e.preventDefault();
                closeWindow(id); 
              }} 
              className="w-12 h-full flex items-center justify-center hover:bg-red-500 group transition-colors"
              title="Close"
            >
              <X size={18} className="text-gray-400 group-hover:text-white" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative bg-[#0f172a]">
          {children}
        </div>
      </div>
    </Draggable>
  );
});
