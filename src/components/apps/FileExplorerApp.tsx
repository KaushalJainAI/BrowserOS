import { useState, useEffect } from 'react';
import { Folder, FileText, Grid, Calculator, ChevronRight, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { filesService } from '../../api/chat';

export function FileExplorerApp() {
  const [currentPath, setCurrentPath] = useState('.');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const loadFiles = async (path: string) => {
    setIsLoading(true);
    try {
      const data = await filesService.listFiles(path);
      if (data && data.items) {
        setItems(data.items);
      }
    } catch (e) {
      console.error("Failed to load files", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const navigateTo = (name: string) => {
    setHistory(prev => [...prev, currentPath]);
    setCurrentPath(currentPath === '.' ? name : `${currentPath}/${name}`);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentPath(prev);
  };

  return (
    <div className="flex h-full bg-[#1e1e1e] text-gray-300">
      {/* Sidebar */}
      <div className="w-48 bg-black/20 border-r border-white/5 flex flex-col">
        <div className="p-4 text-xs font-bold uppercase tracking-widest text-gray-500">Places</div>
        <button onClick={() => { setHistory([]); setCurrentPath('.'); }} className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 ${currentPath === '.' ? 'bg-white/10 text-white' : ''}`}>
          <Folder size={16} className="text-blue-400" /> Root
        </button>
        <button className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5">
          <Grid size={16} className="text-purple-400" /> Workflows
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <button 
              onClick={goBack}
              disabled={history.length === 0}
              className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center text-xs font-mono bg-black/20 px-2 py-1 rounded border border-white/5">
              <span className="text-gray-500">AIAAS:</span>
              <span className="text-blue-400 ml-1">{currentPath}</span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors">
            <Upload size={14} /> Upload
          </button>
        </div>

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {items.map((item, i) => (
                <div 
                  key={i} 
                  onDoubleClick={() => item.type === 'directory' && navigateTo(item.name)}
                  className="group flex flex-col items-center p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
                >
                  <div className="relative mb-2">
                    {item.type === 'directory' ? (
                      <Folder size={48} className="text-blue-500/80 fill-blue-500/20 group-hover:scale-110 transition-transform" />
                    ) : (
                      <FileText size={48} className="text-gray-400 group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                  <span className="text-xs text-center break-all line-clamp-2 px-1 group-hover:text-white">{item.name}</span>
                </div>
              ))}
              {items.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-30">
                  <Folder size={64} strokeWidth={1} />
                  <p className="mt-2 text-sm font-medium italic">Directory is empty</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
