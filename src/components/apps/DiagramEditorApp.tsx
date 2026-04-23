import { Square, Circle, Triangle, Type, ArrowRight, MousePointer2 } from 'lucide-react';

export function DiagramEditorApp() {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black/20">
        <div className="flex gap-2">
          <button className="p-1.5 hover:bg-white/10 rounded text-os-accent"><MousePointer2 size={16} /></button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button className="p-1.5 hover:bg-white/10 rounded text-gray-400"><Square size={16} /></button>
          <button className="p-1.5 hover:bg-white/10 rounded text-gray-400"><Circle size={16} /></button>
          <button className="p-1.5 hover:bg-white/10 rounded text-gray-400"><Triangle size={16} /></button>
          <button className="p-1.5 hover:bg-white/10 rounded text-gray-400"><ArrowRight size={16} /></button>
          <button className="p-1.5 hover:bg-white/10 rounded text-gray-400"><Type size={16} /></button>
        </div>
        <div className="text-secondary text-xs">Unsaved diagram</div>
      </div>
      
      <div className="flex-1 relative overflow-hidden bg-[#121212]" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        {/* Placeholder nodes */}
        <div className="absolute top-20 left-20 bg-[#2d2d2d] border-2 border-os-accent rounded-lg p-3 shadow-lg flex items-center gap-2 cursor-pointer">
          <Circle size={14} className="text-blue-400" />
          <span className="text-sm font-medium text-white">Trigger</span>
        </div>
        
        <svg className="absolute top-[100px] left-[150px] w-32 h-20 overflow-visible">
          <path d="M 0 0 C 40 0, 40 80, 80 80" fill="transparent" stroke="#555" strokeWidth="2" strokeDasharray="4" />
          <polygon points="80,80 75,75 75,85" fill="#555" />
        </svg>

        <div className="absolute top-36 left-40 bg-[#2d2d2d] border border-white/20 rounded-lg p-3 shadow-lg flex items-center gap-2 cursor-pointer hover:border-white/50 transition-colors">
          <Square size={14} className="text-green-400" />
          <span className="text-sm font-medium text-white">Process Data</span>
        </div>
      </div>
    </div>
  );
}
