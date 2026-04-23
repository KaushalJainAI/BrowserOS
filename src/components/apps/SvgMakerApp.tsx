import { MousePointer, Hand, Square, Circle, Triangle, PenTool, Download } from 'lucide-react';

export function SvgMakerApp() {
  return (
    <div className="flex h-full bg-[#1e1e1e]">
      {/* Tools */}
      <div className="w-14 border-r border-white/10 bg-black/20 flex flex-col items-center py-4 gap-2">
        <button className="p-2 bg-os-accent text-white rounded cursor-pointer"><MousePointer size={18} /></button>
        <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5"><Hand size={18} /></button>
        
        <div className="w-8 h-px bg-white/10 my-1" />
        
        <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5"><Square size={18} /></button>
        <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5"><Circle size={18} /></button>
        <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5"><Triangle size={18} /></button>
        <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5"><PenTool size={18} /></button>
        
        <div className="w-8 h-px bg-white/10 my-1 flex-1" />
        
        <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5" title="Export SVG"><Download size={18} /></button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Properties Bar */}
        <div className="h-12 border-b border-white/10 bg-black/10 flex items-center px-4 gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-secondary">X</span>
            <input type="text" className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white" defaultValue="140" />
            <span className="text-secondary ml-2">Y</span>
            <input type="text" className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white" defaultValue="250" />
          </div>
          
          <div className="w-px h-6 bg-white/10" />
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-400 border border-white/20" />
            <input type="text" className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white" defaultValue="#4ade80" />
            <span className="text-secondary">100%</span>
          </div>

          <div className="w-px h-6 bg-white/10" />
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-white/50 bg-transparent" />
            <input type="text" className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white" defaultValue="#ffffff" />
            <span className="text-secondary">2px</span>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-[#121212] overflow-auto relative p-8 flex items-center justify-center">
          <div className="w-[600px] h-[400px] bg-[#1a1a1a] shadow-xl relative overflow-hidden" style={{ backgroundImage: 'repeating-linear-gradient(#222 0 1px, transparent 1px 100%), repeating-linear-gradient(90deg, #222 0 1px, transparent 1px 100%)', backgroundSize: '20px 20px' }}>
            
            {/* SVG Elements */}
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              {/* Selected Element with bounding box */}
              <g transform="translate(140, 250)">
                <circle cx="50" cy="50" r="50" fill="#4ade80" stroke="#ffffff" strokeWidth="2" />
                <rect x="-2" y="-2" width="104" height="104" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
                <rect x="-4" y="-4" width="6" height="6" fill="#white" stroke="#3b82f6" />
                <rect x="98" y="-4" width="6" height="6" fill="#white" stroke="#3b82f6" />
                <rect x="-4" y="98" width="6" height="6" fill="#white" stroke="#3b82f6" />
                <rect x="98" y="98" width="6" height="6" fill="#white" stroke="#3b82f6" />
              </g>

              {/* Other Elements */}
              <rect x="350" y="80" width="120" height="80" rx="8" fill="#f43f5e" />
              <path d="M 200 100 Q 250 50 300 100 T 400 100" fill="none" stroke="#a855f7" strokeWidth="4" />
            </svg>
            
          </div>
        </div>
      </div>
    </div>
  );
}
