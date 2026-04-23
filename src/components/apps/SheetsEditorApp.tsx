import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Percent, DollarSign, Filter } from 'lucide-react';

export function SheetsEditorApp() {
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rows = Array.from({length: 20}, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* Toolbar */}
      <div className="h-24 bg-slate-100 border-b border-slate-300 flex flex-col">
        <div className="flex items-center px-4 h-12 border-b border-slate-200">
          <div className="font-medium text-slate-700">Financial_Model.xlsx</div>
        </div>
        <div className="flex items-center gap-4 px-4 h-12">
          <div className="flex items-center gap-1 border-r border-slate-300 pr-4">
            <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Bold size={16} /></button>
            <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Italic size={16} /></button>
          </div>
          <div className="flex items-center gap-1 border-r border-slate-300 pr-4">
            <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><AlignLeft size={16} /></button>
            <button className="p-1.5 bg-slate-200 rounded text-slate-800"><AlignCenter size={16} /></button>
            <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><AlignRight size={16} /></button>
          </div>
          <div className="flex items-center gap-1 border-r border-slate-300 pr-4">
            <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><DollarSign size={16} /></button>
            <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600"><Percent size={16} /></button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 flex items-center gap-1 text-sm"><Filter size={16} /> Filter</button>
          </div>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="h-8 border-b border-slate-300 bg-white flex items-center px-2 gap-2">
        <div className="w-10 text-center text-xs font-medium text-slate-500 border-r border-slate-200">C4</div>
        <div className="text-slate-400 font-mono text-xs italic">fx</div>
        <input type="text" className="flex-1 bg-transparent border-none outline-none text-sm font-mono" defaultValue="=SUM(C2:C3)" />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-slate-50 relative">
        <div className="inline-grid grid-cols-[50px_repeat(8,120px)] border-b border-slate-300 bg-slate-100 sticky top-0 z-10">
          <div className="border-r border-slate-300 h-8 flex items-center justify-center bg-slate-200"></div>
          {cols.map(c => (
            <div key={c} className="border-r border-slate-300 h-8 flex items-center justify-center text-xs font-semibold text-slate-600">
              {c}
            </div>
          ))}
        </div>
        
        {rows.map(r => (
          <div key={r} className="inline-grid grid-cols-[50px_repeat(8,120px)] border-b border-slate-200 group">
            <div className="border-r border-slate-300 h-8 flex items-center justify-center text-xs font-medium text-slate-500 bg-slate-100 group-hover:bg-slate-200 transition-colors">
              {r}
            </div>
            {cols.map(c => {
              // Populate some dummy data
              let val = '';
              let isSelected = false;
              let isHeader = false;
              
              if (r === 1) {
                isHeader = true;
                if (c === 'A') val = 'Month';
                if (c === 'B') val = 'Revenue';
                if (c === 'C') val = 'Expenses';
                if (c === 'D') val = 'Profit';
              } else if (r === 2) {
                if (c === 'A') val = 'January';
                if (c === 'B') val = '$45,000';
                if (c === 'C') val = '$32,000';
                if (c === 'D') val = '$13,000';
              } else if (r === 3) {
                if (c === 'A') val = 'February';
                if (c === 'B') val = '$52,000';
                if (c === 'C') val = '$34,500';
                if (c === 'D') val = '$17,500';
              } else if (r === 4) {
                if (c === 'A') val = 'March';
                if (c === 'B') val = '$48,000';
                if (c === 'C') val = '$33,000';
                if (c === 'D') val = '$15,000';
                if (c === 'C') isSelected = true;
              }

              return (
                <div 
                  key={c} 
                  className={`border-r border-slate-200 h-8 px-2 flex items-center text-sm
                    ${isHeader ? 'font-bold bg-slate-50' : 'bg-white'} 
                    ${isSelected ? 'border-2 border-os-accent border-r-2 z-10 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]' : ''}
                    ${(c === 'B' || c === 'C' || c === 'D') && !isHeader ? 'justify-end text-slate-700' : 'text-slate-800'}
                  `}
                >
                  {val}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
