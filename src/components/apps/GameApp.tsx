import { Rocket, Star, Heart } from 'lucide-react';

export function GameApp() {
  return (
    <div className="flex flex-col h-full bg-[#050510] relative overflow-hidden">
      {/* Game Header */}
      <div className="absolute top-0 w-full p-4 flex justify-between text-white z-10">
        <div className="flex items-center gap-1 text-red-500">
          <Heart size={20} fill="currentColor" />
          <Heart size={20} fill="currentColor" />
          <Heart size={20} />
        </div>
        <div className="font-mono text-xl text-yellow-400">SCORE: 014200</div>
        <div className="flex gap-2">
          <Star size={20} className="text-yellow-400" fill="currentColor" /> x 3
        </div>
      </div>

      {/* Game Canvas Placeholder (CSS visual) */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Stars */}
        <div className="absolute top-[20%] left-[10%] w-1 h-1 bg-white rounded-full animate-pulse" />
        <div className="absolute top-[80%] left-[85%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse" />
        <div className="absolute top-[40%] left-[60%] w-0.5 h-0.5 bg-yellow-200 rounded-full" />
        <div className="absolute top-[10%] left-[70%] w-2 h-2 bg-red-400 rounded-full" />
        <div className="absolute top-[70%] left-[20%] w-1 h-1 bg-white rounded-full animate-pulse" />

        {/* Player Ship */}
        <div className="absolute bottom-20 flex flex-col items-center">
          <Rocket size={48} className="text-blue-400" />
          {/* Exhaust */}
          <div className="w-4 h-12 bg-gradient-to-b from-orange-400 to-transparent mt-1 animate-pulse" />
        </div>

        {/* Enemies */}
        <div className="absolute top-32 left-1/3 flex flex-col items-center group cursor-crosshair">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all">
            <div className="w-8 h-8 bg-black rounded-full" />
          </div>
        </div>

        <div className="absolute top-20 right-1/4 flex flex-col items-center">
          <div className="w-8 h-8 bg-purple-500 rounded-sm rotate-45" />
        </div>

        {/* Start Game Overlay */}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <button className="px-8 py-3 bg-os-accent hover:bg-os-accent-hover text-white rounded-full font-bold text-lg tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-105">
            READY PLAYER 1
          </button>
        </div>
      </div>
    </div>
  );
}
