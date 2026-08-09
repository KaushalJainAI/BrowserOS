import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOSActions, useOSShell, type ContextMenuState } from '../../contexts/osState';

/**
 * Rendered only while open, so per-invocation state (the keyboard cursor, the
 * measured position) is created fresh with each menu rather than reset
 * afterwards.
 */
export function ContextMenu() {
  const { contextMenu } = useOSShell();
  return contextMenu.isOpen ? <Menu state={contextMenu} /> : null;
}

function Menu({ state }: { state: ContextMenuState }) {
  const { closeContextMenu } = useOSActions();
  const menuRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(-1);
  const { options, x, y } = state;

  // Keep the handler's view of the cursor current without re-registering the
  // listeners on every arrow press.
  const cursorRef = useRef(cursor);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeContextMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
        return;
      }
      const count = options.length;
      if (!count) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCursor((current) => (current + 1) % count);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCursor((current) => (current - 1 + count) % count);
      } else if (event.key === 'Enter' && cursorRef.current >= 0) {
        event.preventDefault();
        options[cursorRef.current]?.onClick();
        closeContextMenu();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', closeContextMenu);
    // Any scroll invalidates the anchor point, so close rather than float away.
    window.addEventListener('wheel', closeContextMenu, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', closeContextMenu);
      window.removeEventListener('wheel', closeContextMenu);
    };
  }, [options, closeContextMenu]);

  /**
   * Flip the menu against whichever viewport edge it would overflow.
   *
   * Measured after layout rather than estimated from the item count, so menus
   * with icons, shortcuts or dividers land correctly too. The corrected offset
   * is written straight to the node instead of through state: it is a layout
   * detail with no other reader, and going through a render would show the
   * menu at the un-flipped position for a frame first.
   */
  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    const margin = 8;
    const left = x + box.width > window.innerWidth - margin
      ? Math.max(margin, x - box.width)
      : x;
    const top = y + box.height > window.innerHeight - margin
      ? Math.max(margin, window.innerHeight - box.height - margin)
      : y;
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
  }, [x, y, options]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="os-panel fixed z-[100000] min-w-[196px] py-1.5 rounded-xl os-anim-drop"
      style={{ left: x, top: y }}
    >
      {options.map((option, index) => {
        const Icon = option.icon;
        return (
          <div key={`${option.label}-${index}`}>
            {option.divider && <hr className="os-divider my-1.5" />}
            <button
              role="menuitem"
              data-selected={cursor === index}
              onMouseEnter={() => setCursor(index)}
              onClick={() => { option.onClick(); closeContextMenu(); }}
              className="os-row mx-1.5 py-1.5 text-[12.5px] w-[calc(100%-12px)]"
              style={option.variant === 'danger' ? { color: 'var(--os-danger)' } : undefined}
            >
              {Icon
                ? <Icon size={14} className="shrink-0" />
                : <span className="w-3.5 shrink-0" />}
              <span className="flex-1 truncate">{option.label}</span>
              {option.shortcut && (
                <span className="text-[10px] text-[var(--os-text-dim)] shrink-0">{option.shortcut}</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
