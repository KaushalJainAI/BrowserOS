import { Folder, File, FileText, FileSpreadsheet, HardDrive, Share2, Star, Clock } from 'lucide-react';

export function DriveApp() {
  const sidebarItems = [
    { icon: HardDrive, label: 'My Vault' },
    { icon: Share2, label: 'Shared with me' },
    { icon: Clock, label: 'Recent', active: true },
    { icon: Star, label: 'Starred' },
  ];

  const files = [
    { name: 'Projects', type: 'folder', date: 'Oct 12' },
    { name: 'Agents', type: 'folder', date: 'Oct 10' },
    { name: 'Q4_Report.pdf', type: 'doc', date: 'Yesterday' },
    { name: 'Financial_Model.xlsx', type: 'sheet', date: '2 days ago' },
  ];

  return (
    <div className="flex h-full bg-[#1e1e1e] text-sm">
      <div className="w-48 border-r border-white/10 bg-black/20 p-2 flex flex-col gap-1">
        {sidebarItems.map((val, idx) => (
          <button 
            key={idx} 
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${val.active ? 'bg-os-accent/20 text-os-accent' : 'text-gray-300 hover:bg-white/5'}`}
          >
            <val.icon size={16} />
            <span className="font-medium">{val.label}</span>
          </button>
        ))}
        
        <div className="mt-auto px-4 py-4 border-t border-white/10">
          <div className="text-xs text-secondary mb-2">Storage (34% used)</div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-os-accent" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-white/10 p-4 font-medium text-white">Recent Files</div>
        <div className="flex-1 p-4 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 content-start overflow-y-auto">
          {files.map((file, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-all group">
              <div className="h-20 bg-black/20 rounded-lg flex items-center justify-center relative overflow-hidden">
                {file.type === 'folder' && <Folder size={32} className="text-blue-400" />}
                {file.type === 'doc' && <FileText size={32} className="text-red-400" />}
                {file.type === 'sheet' && <FileSpreadsheet size={32} className="text-green-400" />}
                {file.type === 'file' && <File size={32} className="text-gray-400" />}
              </div>
              <div>
                <div className="font-medium text-gray-200 truncate" title={file.name}>{file.name}</div>
                <div className="text-xs text-secondary">{file.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
