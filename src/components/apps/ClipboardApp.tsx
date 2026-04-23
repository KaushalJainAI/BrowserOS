import { useOS } from '../../contexts/OSContext';
import { Copy, Trash2, Clock } from 'lucide-react';

export function ClipboardApp() {
  const { clipboardHistory, addToClipboard } = useOS();

  const copyToSystem = (text: string) => {
    navigator.clipboard.writeText(text);
    // Re-adding it will bump it to top
    addToClipboard(text);
  };

  return (
    <div className="app-container p-6 flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-medium m-0 flex items-center gap-2">
            <Clock size={20} className="text-os-accent" />
            Clipboard History
          </h2>
          <p className="text-xs text-secondary mt-1">Recent 50 items copied across BrowserOS</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {clipboardHistory.length > 0 ? (
          clipboardHistory.map((item, idx) => (
            <div 
              key={idx}
              className="group bg-white/5 border border-white/5 hover:border-os-accent/30 p-4 rounded-xl transition-all hover:bg-white/[0.08]"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-gray-200 line-clamp-3 whitespace-pre-wrap flex-1 font-mono">
                  {item}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => copyToSystem(item)}
                    className="p-2 hover:bg-os-accent/20 text-os-accent rounded-lg transition-colors"
                    title="Copy again"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Clear"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-secondary/60 uppercase tracking-wider">
                  {item.length} characters • {item.split(/\s+/).length} words
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
            <div className="p-6 bg-white/5 rounded-full mb-4">
              <Copy size={48} />
            </div>
            <p className="text-sm font-medium">Clipboard is empty</p>
            <p className="text-xs mt-1">Copy some text to see it appear here.</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-secondary/40 text-center uppercase tracking-[0.2em]">
        OS Registry Layer v1.0 • Privacy Guard Active
      </div>
    </div>
  );
}
