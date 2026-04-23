import { Cpu, Play, Settings, RefreshCw, BarChart } from 'lucide-react';

export function SimulatorApp() {
  return (
    <div className="flex flex-col h-full bg-[#111115]">
      <div className="h-12 border-b border-white/5 bg-black/40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-white">
          <Cpu className="text-purple-500" size={18} />
          <span className="font-semibold text-sm">Particle Dynamics Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-white/10 rounded-full text-gray-300"><RefreshCw size={16} /></button>
          <div className="h-4 w-px bg-white/10" />
          <button className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-full text-xs font-bold transition-colors">
            <Play size={12} fill="currentColor" /> RUN SIMULATION
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Environment Settings */}
        <div className="w-64 border-r border-white/5 bg-[#17171d] p-4 flex flex-col overflow-y-auto">
          <div className="text-xs font-bold text-gray-500 mb-4 tracking-wider uppercase flex items-center gap-2">
            <Settings size={14} /> Environment
          </div>
          
          <div className="space-y-6 text-sm">
            <div>
              <div className="flex justify-between text-gray-400 mb-1"><span>Gravity</span> <span className="text-white">9.81 m/s²</span></div>
              <input type="range" className="w-full accent-purple-500" defaultValue="50" />
            </div>
            <div>
              <div className="flex justify-between text-gray-400 mb-1"><span>Wind Resistance</span> <span className="text-white">0.05</span></div>
              <input type="range" className="w-full accent-purple-500" defaultValue="20" />
            </div>
            <div>
              <div className="flex justify-between text-gray-400 mb-1"><span>Particle Count</span> <span className="text-white">100,000</span></div>
              <input type="range" className="w-full accent-purple-500" defaultValue="80" />
            </div>
            <div>
              <div className="flex justify-between text-gray-400 mb-1"><span>Collision Damping</span> <span className="text-white">0.8</span></div>
              <input type="range" className="w-full accent-purple-500" defaultValue="60" />
            </div>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, #222 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          {/* Simulated Particles */}
          <div className="absolute inset-0 flex items-center justify-center opacity-70 blur-[1px]">
            <div className="w-[400px] h-[400px] bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full mix-blend-screen opacity-40 blur-[50px] animate-pulse" />
            <div className="w-[300px] h-[300px] bg-gradient-to-bl from-pink-500 to-orange-500 rounded-full mix-blend-screen opacity-30 blur-[40px] animate-pulse absolute top-1/4 right-1/4" />
          </div>

          <div className="absolute bottom-4 left-4 bg-black/60 rounded-lg border border-white/10 p-3 backdrop-blur-md">
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1"><BarChart size={12} /> Performance</div>
            <div className="flex gap-4">
              <div>
                <div className="text-[10px] text-gray-500">FPS</div>
                <div className="text-green-400 font-mono">59.9</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Compute</div>
                <div className="text-yellow-400 font-mono">14ms</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Memory</div>
                <div className="text-blue-400 font-mono">2.4GB</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
