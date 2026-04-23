
import { Folder, FileText, Grid, Calculator } from 'lucide-react';

export function FileExplorerApp() {
  const folders = [
    { name: 'Home', icon: Folder },
    { name: 'Documents', icon: FileText },
    { name: 'Downloads', icon: Folder },
    { name: 'Workflows', icon: Grid },
    { name: 'Artifacts', icon: Calculator }
  ];

  return (
    <div className="flex-row h-full">
      <div className="sidebar p-y-4">
        <ul className="m-0 p-0 list-none">
          {folders.map((f, i) => (
            <li key={f.name} className={`sidebar-item px-6 py-2 gap-3 flex items-center cursor-pointer ${i === 1 ? 'active' : ''}`}>
              <f.icon size={18} /> {f.name}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="main-area p-6 flex-1 bg-window-dark">
        <h3 className="font-medium mt-0 mb-6">Documents</h3>
        
        <div className="grid gap-6 mt-6 p-4">
          <div className="file p-3 gap-3 flex-col items-center justify-center text-sm text-center">
            <FileText size={40} className="text-orange" />
            <span>report.pdf</span>
          </div>
          <div className="file p-3 gap-3 flex-col items-center justify-center text-sm text-center">
            <FileText size={40} className="text-orange" />
            <span>data.csv</span>
          </div>
          <div className="file p-3 gap-3 flex-col items-center justify-center text-sm text-center">
            <FileText size={40} className="text-orange" />
            <span>dashboard.json</span>
          </div>
        </div>
      </div>
    </div>
  );
}
