import { Play } from 'lucide-react';

export function AnalystApp() {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center gap-4 p-3 bg-white/5 border-b border-white/10">
        <button className="flex items-center gap-2 px-3 py-1.5 bg-os-accent text-white rounded hover:bg-os-accent-hover text-sm">
          <Play size={14} /> Run All
        </button>
        <span className="text-secondary text-sm flex-1">notebook_analysis_01.ipynb</span>
      </div>
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {/* Notebook Cell 1 */}
        <div className="flex flex-col border border-white/10 rounded overflow-hidden">
          <div className="flex items-center gap-2 p-2 bg-white/5 text-xs text-secondary font-mono">
            <span className="text-os-accent">[1]:</span> import pandas as pd
          </div>
          <div className="p-3 bg-black/20 text-xs font-mono text-gray-300">
            Pandas loaded successfully. Version 2.1.0
          </div>
        </div>
        
        {/* Notebook Cell 2 */}
        <div className="flex flex-col border border-white/10 rounded overflow-hidden focus-within:border-os-accent transition-colors">
          <div className="flex items-center gap-2 p-2 bg-white/5 text-xs text-secondary font-mono border-b border-white/10">
            <span className="text-os-accent">[2]:</span> df = pd.read_csv('revenue_q3.csv')
            <br/>df.head()
          </div>
          <div className="p-3 bg-black/20 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-secondary">
                  <th className="py-1 px-2">Date</th>
                  <th className="py-1 px-2">Revenue</th>
                  <th className="py-1 px-2">Region</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/5">
                  <td className="py-1 px-2">2023-07-01</td>
                  <td className="py-1 px-2">$14,200</td>
                  <td className="py-1 px-2">NA</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-1 px-2">2023-07-02</td>
                  <td className="py-1 px-2">$11,800</td>
                  <td className="py-1 px-2">EU</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* New Cell Input */}
        <div className="flex items-start gap-2 pt-2">
          <span className="text-os-accent text-xs font-mono mt-2">[ ]:</span>
          <textarea 
            className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-sm font-mono text-white outline-none focus:border-os-accent resize-none min-h-[60px]"
            placeholder="Type Python code here..."
          />
        </div>
      </div>
    </div>
  );
}
