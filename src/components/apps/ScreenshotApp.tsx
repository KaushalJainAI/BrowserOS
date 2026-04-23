import { useState } from 'react';
import { Camera, Scissors, Monitor, AppWindow, Download, Share2 } from 'lucide-react';

export function ScreenshotApp() {
  const [mode, setMode] = useState<'screen' | 'window' | 'area'>('screen');
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleCapture = () => {
    setIsCapturing(true);
    // Mock capture delay
    setTimeout(() => {
      setIsCapturing(false);
      setPreview('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800'); // Placeholder
    }, 800);
  };

  return (
    <div className="app-container p-6 flex flex-col items-center justify-center h-full bg-[#1e1e1e]">
      {!preview ? (
        <div className="max-w-md w-full text-center slide-in-bottom">
          <div className="w-20 h-20 bg-os-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Camera size={40} className="text-os-accent" />
          </div>
          <h2 className="text-xl font-light mb-2">Screen Capture</h2>
          <p className="text-sm text-secondary mb-8">Select a capture mode to begin</p>

          <div className="grid grid-cols-3 gap-3 mb-12">
            <button 
              onClick={() => setMode('screen')}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2
                ${mode === 'screen' ? 'bg-os-accent border-os-accent text-white shadow-lg' : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10'}`}
            >
              <Monitor size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Screen</span>
            </button>
            <button 
              onClick={() => setMode('window')}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2
                ${mode === 'window' ? 'bg-os-accent border-os-accent text-white shadow-lg' : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10'}`}
            >
              <AppWindow size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Window</span>
            </button>
            <button 
              onClick={() => setMode('area')}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2
                ${mode === 'area' ? 'bg-os-accent border-os-accent text-white shadow-lg' : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10'}`}
            >
              <Scissors size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Area</span>
            </button>
          </div>

          <button 
            onClick={handleCapture}
            disabled={isCapturing}
            className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3
              ${isCapturing ? 'bg-white/10 text-secondary' : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
          >
            {isCapturing ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={20} />
            )}
            {isCapturing ? 'Capturing...' : 'Take Screenshot'}
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col animate-in zoom-in-95 duration-300">
          <div className="flex-1 bg-black rounded-lg overflow-hidden border border-white/10 relative group">
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4 translate-y-full group-hover:translate-y-0 transition-transform">
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90">
                <Download size={16} /> Save
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 backdrop-blur-md">
                <Share2 size={16} /> Copy
              </button>
            </div>
          </div>
          <div className="mt-6 flex justify-between items-center text-secondary">
            <span className="text-xs uppercase tracking-widest font-bold">Preview: screenshot_2026-02-20.png</span>
            <button 
              onClick={() => setPreview(null)}
              className="text-xs hover:text-white transition-colors flex items-center gap-1"
            >
              <RefreshCw size={12} /> Discard & New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RefreshCw({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
    </svg>
  );
}
