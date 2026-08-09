import { Bell, X, Bot, CheckCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useOSActions, useOSNotifications, useOSShell } from '../../contexts/osState';
import { relativeTime } from '../../os/time';
import { NOTIFICATION_COLORS, NOTIFICATION_ICONS } from '../../os/notifications';


export function NotificationCenter() {
  const { dismissNotification, clearNotifications, markAllRead } = useOSActions();
  const { overlay } = useOSShell();
  const { notifications } = useOSNotifications();
  const isOpen = overlay === 'notifications';

  // Opening the centre is the acknowledgement, so the badge clears on view.
  useEffect(() => {
    if (isOpen) markAllRead();
  }, [isOpen, markAllRead]);

  if (!isOpen) return null;

  return (
    <div
      className="os-panel absolute top-9 right-2 w-[336px] z-[10000] os-anim-drop overflow-hidden"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--os-border)]">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--os-text-muted)]">
          <Bell size={13} />
          Notifications
        </span>
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="text-[11px] font-medium text-[var(--os-text-dim)] hover:text-[var(--os-text)] transition-colors flex items-center gap-1"
          >
            <CheckCheck size={12} /> Clear all
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
        {notifications.length === 0 ? (
          <p className="py-12 text-center text-[12.5px] text-[var(--os-text-dim)]">
            You’re all caught up
          </p>
        ) : (
          notifications.map((item) => {
            const Icon = NOTIFICATION_ICONS[item.type];
            return (
              <div key={item.id} className="group flex gap-2.5 p-2.5 rounded-xl hover:bg-[var(--os-hover)] transition-colors">
                <Icon size={15} className="shrink-0 mt-0.5" style={{ color: NOTIFICATION_COLORS[item.type] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[12.5px] font-semibold truncate text-[var(--os-text)]">
                      {item.title}
                    </span>
                    {item.source === 'buddy' && (
                      <Bot size={11} className="shrink-0 text-[var(--os-accent)]" aria-label="From Buddy" />
                    )}
                    <span className="ml-auto text-[10px] text-[var(--os-text-dim)] shrink-0">
                      {relativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11.5px] leading-snug text-[var(--os-text-muted)] line-clamp-3 os-selectable">
                    {item.message}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(item.id)}
                  className="os-icon-button w-6 h-6 opacity-0 group-hover:opacity-100 shrink-0"
                  aria-label={`Dismiss ${item.title}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
