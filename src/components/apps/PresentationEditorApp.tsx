import { Play, Plus, Image as ImageIcon, Type, LayoutTemplate } from 'lucide-react';

export function PresentationEditorApp() {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Top Bar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="font-medium">Q4 Roadmap Pitch</div>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded">
            <button className="p-1.5 hover:bg-white/10 rounded text-gray-300"><Type size={16} /></button>
            <button className="p-1.5 hover:bg-white/10 rounded text-gray-300"><ImageIcon size={16} /></button>
            <button className="p-1.5 hover:bg-white/10 rounded text-gray-300"><LayoutTemplate size={16} /></button>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-os-accent hover:bg-os-accent-hover text-white rounded-md text-sm transition-colors shadow-lg">
          <Play size={16} fill="currentColor" /> Present
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        <div className="w-56 border-r border-white/10 bg-[#171717] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex justify-between items-center">
            Slides
            <button className="text-gray-300 hover:text-white"><Plus size={16} /></button>
          </div>
          
          <div className="relative group cursor-pointer">
            <div className="absolute -left-3 top-2 text-xs text-gray-500 font-medium">1</div>
            <div className="aspect-video bg-[#222] rounded-lg border-2 border-transparent group-hover:border-white/20 overflow-hidden p-2 flex flex-col justify-center items-center">
               <div className="text-[10px] font-bold text-center">BrowserOS Vision</div>
               <div className="text-[6px] text-gray-400 mt-1">Transforming the UI</div>
            </div>
          </div>
          
          <div className="relative group cursor-pointer">
            <div className="absolute -left-3 top-2 text-xs text-os-accent font-medium">2</div>
            <div className="aspect-video bg-white rounded-lg border-2 border-os-accent shadow-[0_0_0_2px_rgba(59,130,246,0.2)] overflow-hidden p-2">
               <div className="text-[8px] font-bold text-black border-b border-gray-200 pb-1 mb-1">Q4 Roadmap</div>
               <div className="flex gap-1">
                 <div className="w-1/2 h-10 bg-blue-100 rounded" />
                 <div className="w-1/2 flex flex-col gap-1">
                   <div className="h-1 bg-gray-200 rounded w-full" />
                   <div className="h-1 bg-gray-200 rounded w-4/5" />
                   <div className="h-1 bg-gray-200 rounded w-3/4" />
                 </div>
               </div>
            </div>
          </div>

          <div className="relative group cursor-pointer">
            <div className="absolute -left-3 top-2 text-xs text-gray-500 font-medium">3</div>
            <div className="aspect-video bg-[#222] rounded-lg border-2 border-transparent group-hover:border-white/20 overflow-hidden p-2 flex flex-col items-center justify-center">
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-orange-500" />
            </div>
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 bg-[#252525] p-8 flex items-center justify-center overflow-auto">
          {/* Active Slide */}
          <div className="w-[800px] aspect-video bg-white shadow-2xl relative flex flex-col p-12">
            <h1 className="text-5xl font-bold text-slate-800 mb-8 border-b-4 border-os-accent pb-4 inline-block tracking-tight">Q4 Architecture Roadmap</h1>
            
            <div className="grid grid-cols-2 gap-12 flex-1 mt-4">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center">
                <ul className="list-disc pl-6 text-slate-600 text-xl space-y-4">
                  <li>Decoupled backend services</li>
                  <li>Real-time websocket streaming</li>
                  <li>Agentic task management</li>
                  <li>Premium frontend aesthetics</li>
                </ul>
              </div>
              
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-48 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center text-white font-bold text-2xl transform rotate-2 hover:rotate-0 transition-all cursor-pointer">
                  Backend
                </div>
                <div className="w-2 h-12 bg-slate-300" />
                <div className="w-48 h-32 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl shadow-lg flex items-center justify-center text-white font-bold text-2xl transform -rotate-2 hover:rotate-0 transition-all cursor-pointer">
                  Frontend
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
