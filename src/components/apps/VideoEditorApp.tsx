import { Play, SkipBack, SkipForward, Scissors, Copy, SplitSquareVertical } from 'lucide-react';

export function VideoEditorApp() {
  const tracks = [
    { title: 'V1 (Camera)', color: 'bg-blue-500', clips: [{ start: '10%', w: '40%' }, { start: '55%', w: '30%' }] },
    { title: 'V2 (Overlay)', color: 'bg-purple-500', clips: [{ start: '25%', w: '15%' }] },
    { title: 'A1 (Dialogue)', color: 'bg-green-500', clips: [{ start: '10%', w: '40%' }, { start: '55%', w: '30%' }] },
    { title: 'A2 (Music)', color: 'bg-emerald-600', clips: [{ start: '0%', w: '100%' }] },
  ];

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-slate-200 select-none">
      {/* Top half: Preview & Bin */}
      <div className="flex-1 flex border-b border-black">
        {/* Project Bin */}
        <div className="w-64 border-r border-black bg-[#171717] p-2 flex flex-col gap-2 overflow-y-auto">
          <div className="text-xs uppercase font-bold text-gray-500 mb-2 px-2">Project Media</div>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded hover:bg-white/10 cursor-pointer border border-white/5">
            <div className="w-10 h-6 bg-blue-900 rounded flex-shrink-0" />
            <div className="text-xs truncate">MVI_0042.MP4</div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded hover:bg-white/10 cursor-pointer border border-white/5">
            <div className="w-10 h-6 bg-blue-900 rounded flex-shrink-0" />
            <div className="text-xs truncate">B-Roll_City.MP4</div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded hover:bg-white/10 cursor-pointer border border-white/5">
            <div className="w-10 h-6 bg-green-900 rounded flex-shrink-0 flex items-center justify-center text-[8px] text-green-300">WAV</div>
            <div className="text-xs truncate">Background_Beat.wav</div>
          </div>
        </div>

        {/* Preview Player */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl aspect-video bg-[#111] border border-white/10 rounded overflow-hidden relative shadow-2xl">
            {/* Fake video frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-white/20">PREVIEW RENDER</span>
            </div>
            {/* Playhead overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/60 px-3 py-1 rounded-full font-mono text-sm backdrop-blur-md">
              00:01:24:12
            </div>
          </div>
        </div>
      </div>

      {/* Bottom half: Timeline */}
      <div className="h-64 bg-[#1a1a1a] flex flex-col">
        {/* Timeline toolbar */}
        <div className="h-10 bg-[#222] border-b border-black flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-white"><SkipBack size={16} fill="currentColor" /></button>
            <button className="text-white bg-os-accent rounded-full p-1.5"><Play size={16} fill="currentColor" className="ml-0.5" /></button>
            <button className="text-gray-400 hover:text-white"><SkipForward size={16} fill="currentColor" /></button>
          </div>
          
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"><Scissors size={14} /></button>
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"><SplitSquareVertical size={14} /></button>
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"><Copy size={14} /></button>
          </div>
          
          <div className="flex-1" />
          
          <div className="w-32">
            <input type="range" className="w-full h-1 accent-gray-400" />
          </div>
        </div>

        {/* Tracks area */}
        <div className="flex-1 overflow-auto relative">
          {/* Playhead Line */}
          <div className="absolute top-0 bottom-0 left-[35%] w-px bg-red-500 z-10 shadow-[0_0_4px_rgba(239,68,68,1)]">
            <div className="absolute -top-0 -left-[5px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-red-500" />
          </div>

          <div className="flex flex-col">
            {tracks.map((track, idx) => (
              <div key={idx} className="flex h-12 border-b border-white/5 group">
                {/* Track Header */}
                <div className="w-24 bg-[#222] border-r border-black p-2 flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-gray-400">{track.title}</div>
                </div>
                {/* Track Content */}
                <div className="flex-1 relative bg-[#151515] group-hover:bg-[#181818]">
                  {track.clips.map((clip, cIdx) => (
                    <div 
                      key={cIdx} 
                      className={`absolute top-1 bottom-1 rounded border border-black/50 ${track.color} opacity-80 hover:opacity-100 cursor-pointer shadow-sm overflow-hidden`}
                      style={{ left: clip.start, width: clip.w }}
                    >
                      {/* Fake waveform/thumbnails */}
                      {idx > 1 && <div className="absolute inset-x-0 bottom-0 top-1/2 border-t border-black/20" style={{ backgroundImage: 'linear-gradient(90deg, transparent 49%, rgba(0,0,0,0.2) 50%, transparent 51%)', backgroundSize: '4px 100%' }} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
