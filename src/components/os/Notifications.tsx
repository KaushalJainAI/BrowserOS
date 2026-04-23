import { Bell, CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { useOS } from '../../contexts/OSContext';

export function Notifications() {
  const { isNotificationsOpen, toggleNotifications, notifications, dismissNotification, clearNotifications } = useOS();

  if (!isNotificationsOpen) return null;

  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertCircle,
    error: AlertCircle,
  };

  const colorMap = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div 
      className="absolute top-10 right-2 w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[10000] animate-in fade-in slide-in-from-top-2 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-80">Notifications</h2>
        </div>
        <button 
          onClick={() => {
            clearNotifications();
            toggleNotifications(false);
          }}
          className="text-[10px] text-white/40 hover:text-white transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="flex gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
          >
            <div className={`mt-0.5 ${colorMap[n.type]}`}>
              {(() => {
                const Icon = iconMap[n.type];
                return <Icon size={16} />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[13px] font-semibold truncate">{n.title}</span>
                <span className="text-[10px] opacity-40">{n.time || 'Just now'}</span>
              </div>
              <p className="text-[12px] text-white/60 leading-normal line-clamp-2">
                {n.message}
              </p>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => dismissNotification(n.id)}>
                <X size={14} className="text-white/20 hover:text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="p-8 text-center opacity-40 italic text-[13px]">
          No new notifications
        </div>
      )}

      <div className="p-3 bg-white/5 rounded-b-2xl text-center">
        <button className="text-[11px] font-medium text-blue-400 hover:text-blue-300">
          Open Notification Settings
        </button>
      </div>
    </div>
  );
}
