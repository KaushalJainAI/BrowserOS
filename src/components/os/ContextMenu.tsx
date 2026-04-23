import { useEffect, useRef } from 'react';
import { useOS } from '../../contexts/OSContext';

export function ContextMenu() {
  const { contextMenu, closeContextMenu } = useOS();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen) return null;

  // Adjust position to stay within viewport
  const x = Math.min(contextMenu.x, window.innerWidth - 200);
  const y = Math.min(contextMenu.y, window.innerHeight - (contextMenu.options.length * 40));

  return (
    <div 
      ref={menuRef}
      className="context-menu fixed z-[100000] min-w-[180px] bg-[#2d2d2d]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {contextMenu.options.map((option, idx) => {
        const Icon = option.icon;
        return (
          <button
            key={idx}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-os-accent hover:text-white transition-colors
              ${option.variant === 'danger' ? 'text-red-400' : 'text-gray-200'}`}
            onClick={() => {
              option.onClick();
              closeContextMenu();
            }}
          >
            {Icon && <Icon size={14} />}
            <span className="flex-1">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
