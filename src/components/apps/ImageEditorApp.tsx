import { PenTool, Type, Eraser, Square, Image as ImageIcon, Download, Share2, Layers } from 'lucide-react';

export function ImageEditorApp() {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/40">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button className="p-2 rounded bg-os-accent text-white"><PenTool size={18} /></button>
          <button className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/10"><Eraser size={18} /></button>
          <button className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/10"><Type size={18} /></button>
          <button className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/10"><Square size={18} /></button>
          <button className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/10"><ImageIcon size={18} /></button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full border border-gray-500 bg-red-500 cursor-pointer" />
          <div className="h-8 w-8 rounded-full border-2 border-white bg-blue-500 cursor-pointer shadow-[0_0_0_2px_rgba(59,130,246,0.5)]" />
          <div className="h-8 w-8 rounded-full border border-gray-500 bg-green-500 cursor-pointer" />
          <div className="h-8 w-8 rounded-full border border-gray-500 bg-yellow-400 cursor-pointer" />
          <div className="h-8 w-8 rounded-full border border-gray-500 bg-white cursor-pointer" />
          <div className="h-8 w-8 rounded-full border border-gray-500 bg-black cursor-pointer" />
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded"><Share2 size={18} /></button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 bg-[#121212] flex items-center justify-center p-8 overflow-auto" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%, #222), repeating-linear-gradient(45deg, #222 25%, #1a1a1a 25%, #1a1a1a 75%, #222 75%, #222)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}>
          <div className="w-[500px] h-[400px] bg-white shadow-2xl relative">
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-48 h-48 bg-blue-500 rounded-full opacity-50 blur-xl" />
               <div className="w-32 h-32 bg-red-500 rounded-full opacity-50 mix-blend-multiply absolute right-20 top-20" />
               <div className="absolute bottom-20 left-20 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">PixelCanvas AI</div>
             </div>
          </div>
        </div>

        {/* Right Sidebar - Layers */}
        <div className="w-64 border-l border-white/10 bg-[#1e1e1e] flex flex-col">
          <div className="p-3 border-b border-white/10 font-medium text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><Layers size={16} /> Layers</div>
            <button className="text-xl leading-none text-gray-400 hover:text-white">+</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            <div className="p-2 bg-os-accent/20 border border-os-accent/50 rounded flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center text-xs">T</div>
              <span className="text-sm font-medium">Text Layer</span>
            </div>
            <div className="p-2 hover:bg-white/5 rounded flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center"><ImageIcon size={14} /></div>
              <span className="text-sm text-gray-300">Background Shapes</span>
            </div>
            <div className="p-2 hover:bg-white/5 rounded flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-white/10 rounded overflow-hidden">
                <div className="w-full h-full bg-white" />
              </div>
              <span className="text-sm text-gray-300">Background</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
