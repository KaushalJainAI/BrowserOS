import { useAuth } from '../../contexts/AuthContext';
import { useOS } from '../../contexts/OSContext';
import { User, Monitor, LogOut } from 'lucide-react';

const WALLPAPERS = [
  { name: 'Aubergine Gradient', value: 'linear-gradient(to bottom right, #4c1d95, #1e1b4b)' },
  { name: 'Midnight Aurora', value: 'linear-gradient(to bottom right, #0f172a, #334155, #1e293b)' },
  { name: 'Deep Sea', value: 'linear-gradient(to bottom right, #1e3a8a, #1e40af, #1e3a8a)' },
  { name: 'Cosmic AI Nebula', value: 'linear-gradient(to bottom right, #581c87, #701a75, #4a044e)' },
  { name: 'Forest Night', value: 'linear-gradient(to bottom right, #064e3b, #065f46, #022c22)' },
  { name: 'Abstract Blue', value: 'url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2070")' },
  { name: 'Mountain Peak', value: 'url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2070")' },
  { name: 'Cyber City', value: 'url("https://images.unsplash.com/photo-1515879218367-8469d910aaa4?auto=format&fit=crop&q=80&w=2070")' }
];

export function SettingsApp() {
  const { user, logout } = useAuth();
  const { wallpaper, setWallpaper } = useOS();

  return (
    <div className="app-container p-0 flex h-full">
      {/* Sidebar categories */}
      <div className="w-48 bg-black/20 border-r border-white/5 flex flex-col p-2 gap-1">
        <div className="flex items-center gap-2 px-3 py-2 bg-os-accent/20 text-os-accent rounded-md cursor-pointer">
          <Monitor size={16} />
          <span className="text-sm font-medium">Appearance</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-md cursor-pointer text-secondary">
          <User size={16} />
          <span className="text-sm font-medium">User Profile</span>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        <h2 className="font-medium mb-6 mt-0 text-white">Appearance & System</h2>
        
        <div className="setting-group mb-6 flex flex-col gap-2">
          <label className="text-sm text-secondary">OS Theme</label>
          <select className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-os-accent/50 transition-colors">
            <option>Yaru Dark (Default)</option>
            <option>Yaru Light</option>
            <option>Glassmorphic High Contrast</option>
          </select>
        </div>

        <div className="setting-group mb-4 flex flex-col gap-2">
          <label className="text-sm text-secondary">Desktop Wallpaper</label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {WALLPAPERS.map((wp) => (
              <button
                key={wp.name}
                onClick={() => setWallpaper(wp.value)}
                className={`p-3 rounded-xl border text-left transition-all group relative overflow-hidden ${
                  wallpaper === wp.value 
                    ? 'border-os-accent bg-os-accent/10' 
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" 
                  style={{ background: wp.value, backgroundSize: 'cover' }} 
                />
                <span className="relative text-xs font-medium text-white">{wp.name}</span>
              </button>
            ))}
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-secondary/60 uppercase tracking-widest mt-2">Custom URL</label>
            <input 
              type="text"
              placeholder="Paste image URL here..."
              className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-os-accent/50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setWallpaper(`url("${(e.target as HTMLInputElement).value}")`);
                }
              }}
            />
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <User size={14} className="text-secondary" />
            Active User Account
          </h3>
          <div className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{user?.name}</p>
              <p className="text-xs text-secondary">{user?.email}</p>
              <p className="text-[10px] text-secondary/40 mt-1 uppercase tracking-wider">UID: {user?.id}</p>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs rounded transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>

        <p className="mt-auto text-[10px] text-secondary/40 uppercase tracking-widest text-center">
          BrowserOS Core v1.0.4 - LTS Interaction Layer
        </p>
      </div>
    </div>
  );
}
