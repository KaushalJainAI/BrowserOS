import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Type, FileText } from 'lucide-react';

export function WordEditorApp() {
  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200">
        <div className="p-2 bg-blue-500 rounded text-white"><FileText size={20} /></div>
        <div className="flex flex-col">
          <input type="text" className="font-medium text-lg outline-none bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 transition-colors" defaultValue="Q4 Strategy Proposal" />
          <div className="flex gap-4 text-xs text-slate-500 mt-1">
            <span className="hover:text-slate-800 cursor-pointer">File</span>
            <span className="hover:text-slate-800 cursor-pointer">Edit</span>
            <span className="hover:text-slate-800 cursor-pointer">View</span>
            <span className="hover:text-slate-800 cursor-pointer">Insert</span>
          </div>
        </div>
        
        <div className="flex-1" />
        
        <button className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-colors shadow-sm">
          Share
        </button>
      </div>

      {/* Toolbar */}
      <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-4 overflow-x-auto">
        <div className="flex items-center gap-1 border-slate-300 pr-4">
          <select className="bg-transparent text-sm outline-none px-2 cursor-pointer font-medium border border-transparent hover:bg-slate-200 rounded">
            <option>Heading 1</option>
            <option>Heading 2</option>
            <option selected>Normal Text</option>
          </select>
        </div>
        
        <div className="flex items-center gap-1 border-r border-slate-300 pr-4">
          <select className="bg-transparent text-sm outline-none px-2 cursor-pointer font-medium border border-transparent hover:bg-slate-200 rounded">
            <option>Inter</option>
            <option>Arial</option>
            <option>Times New Roman</option>
          </select>
          <div className="w-px h-4 bg-slate-300 mx-2" />
          <input type="number" className="w-12 bg-transparent text-sm outline-none text-center border border-slate-200 rounded px-1" defaultValue={11} />
        </div>

        <div className="flex items-center gap-1 border-r border-slate-300 pr-4">
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 bg-slate-200"><Bold size={16} /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Italic size={16} /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Underline size={16} /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 ml-2"><Type size={16} /></button>
        </div>

        <div className="flex items-center gap-1 border-r border-slate-300 pr-4">
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 bg-slate-200"><AlignLeft size={16} /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><AlignCenter size={16} /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><AlignRight size={16} /></button>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><List size={16} /></button>
        </div>
      </div>

      {/* Page Container */}
      <div className="flex-1 overflow-auto bg-slate-100 flex justify-center py-8 px-4">
        {/* Paper */}
        <div className="w-full max-w-[816px] min-h-[1056px] bg-white shadow-md border border-slate-200 p-16 cursor-text pb-32">
          <h1 className="text-4xl font-bold mb-6 font-['Inter']">Q4 Strategy Proposal</h1>
          
          <p className="text-sm leading-relaxed mb-4 font-[Arial]">
            The objective of this proposal is to outline the key initiatives and architectural changes required for the successful deployment of BrowserOS to production environments. 
          </p>
          
          <h2 className="text-xl font-bold mb-4 mt-8">1. Project Architecture</h2>
          <p className="text-sm leading-relaxed mb-2 font-[Arial]">
            BrowserOS will separate concerns by:
          </p>
          <ul className="list-disc pl-8 text-sm leading-relaxed mb-4 font-[Arial] space-y-2">
            <li>Establishing an optimized Vite React frontend as the <strong>presentation layer</strong>.</li>
            <li>Routing executing workloads via Celery/Redis background tasks.</li>
            <li>Maintaining AI Assistant (AskBuddy) context globally via deeply nested React Context providers.</li>
          </ul>

          <h2 className="text-xl font-bold mb-4 mt-8">2. Resource Requirements</h2>
          <p className="text-sm leading-relaxed mb-4 font-[Arial]">
            Current modeling suggests a 20% increase in baseline computational footprint due to the WebSocket streaming payload overhead.
          </p>
        </div>
      </div>
    </div>
  );
}
