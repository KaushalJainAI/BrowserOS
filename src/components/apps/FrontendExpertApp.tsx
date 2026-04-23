import { Code, Terminal, Play, Settings } from 'lucide-react';

export function FrontendExpertApp() {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 h-12 bg-black/20 border-b border-white/10">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-300 hover:text-white cursor-pointer"><Code size={14} /> index.tsx</div>
          <div className="flex items-center gap-2 text-os-accent border-b-2 border-os-accent h-12 px-1 cursor-pointer"><Settings size={14} /> tailwind.css</div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-sm transition-colors border border-green-500/30">
          <Play size={14} /> Start Server
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 border-r border-white/10 bg-[#121212] p-4 text-sm font-mono leading-relaxed overflow-y-auto w-1/2">
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">1</div>
            <div className="text-purple-400">@tailwind <span className="text-yellow-300">base</span>;</div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">2</div>
            <div className="text-purple-400">@tailwind <span className="text-yellow-300">components</span>;</div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">3</div>
            <div className="text-purple-400">@tailwind <span className="text-yellow-300">utilities</span>;</div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">4</div>
            <div></div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">5</div>
            <div className="text-blue-400">@import <span className="text-green-300">url('https://fonts.googleapis.com/css?...)</span>;</div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">6</div>
            <div></div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">7</div>
            <div className="text-blue-400">body {'{'}</div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">8</div>
            <div className="pl-4 text-gray-300"><span className="text-blue-300">background</span>: <span className="text-green-300">#0f172a</span>;</div>
          </div>
          <div className="flex">
            <div className="w-8 text-secondary/50 select-none text-right pr-4 border-r border-white/10 mr-4">9</div>
            <div className="text-blue-400">{'}'}</div>
          </div>
        </div>

        {/* Preview / Terminal */}
        <div className="w-1/2 flex flex-col bg-[#0d0d0d] relative overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
             <div className="text-white/20 flex flex-col items-center gap-2">
               <Terminal size={32} />
               <p className="text-sm">Server not running</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
