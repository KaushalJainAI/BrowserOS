/** Transient toasts stacked above the dock. */

import { X, Bot } from 'lucide-react';
import { useOSActions, useOSNotifications } from '../../contexts/osState';
import { NOTIFICATION_COLORS, NOTIFICATION_ICONS } from '../../os/notifications';

export function Toasts() {
  const { dismissToast, setOverlay } = useOSActions();
  const { toasts } = useOSNotifications();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-11 right-3 z-[15000] flex flex-col gap-2 w-[320px] pointer-events-none">
      {toasts.map((item) => {
        const Icon = NOTIFICATION_ICONS[item.type];
        return (
          <button
            key={item.id}
            onClick={() => { dismissToast(item.id); setOverlay('notifications'); }}
            className="os-panel pointer-events-auto flex gap-2.5 p-3 text-left os-anim-slide-left hover:bg-[var(--os-surface-raised)] transition-colors"
          >
            <Icon size={15} className="shrink-0 mt-0.5" style={{ color: NOTIFICATION_COLORS[item.type] }} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-semibold truncate text-[var(--os-text)]">
                  {item.title}
                </span>
                {item.source === 'buddy' && <Bot size={11} className="text-[var(--os-accent)] shrink-0" />}
              </span>
              <span className="block text-[11.5px] leading-snug text-[var(--os-text-muted)] line-clamp-2 mt-0.5">
                {item.message}
              </span>
            </span>
            <X
              size={13}
              className="shrink-0 text-[var(--os-text-dim)] mt-0.5"
              onClick={(event) => { event.stopPropagation(); dismissToast(item.id); }}
            />
          </button>
        );
      })}
    </div>
  );
}
