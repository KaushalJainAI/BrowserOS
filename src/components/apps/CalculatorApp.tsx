import { Divide, X, Minus, Plus, Equal, History, Trash2, ChevronRight, Image as ImageIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface HistoryItem {
  expression: string;
  result: string;
  time: string;
}

export function CalculatorApp({ isMaximized }: { isMaximized?: boolean }) {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [lastOperator, setLastOperator] = useState<string | null>(null);

  // Auto-show history when maximized
  useEffect(() => {
    if (isMaximized) setShowHistory(true);
  }, [isMaximized]);

  const calculate = useCallback((exp: string) => {
    try {
      if (!/^[0-9+\-*/.()ePI\s]+$/.test(exp)) return 'Error';
      const sanitized = exp.replace(/PI/g, Math.PI.toString()).replace(/e/g, Math.E.toString());
      const result = eval(sanitized);
      return Number.isFinite(result) ? String(parseFloat(result.toFixed(10))) : 'Error';
    } catch {
      return 'Error';
    }
  }, []);

  const handleAction = useCallback((action: string) => {
    if (display === 'Error') setDisplay('0');

    if (/[0-9]/.test(action)) {
      if (waitingForOperand || display === '0' || display === 'Error') {
        setDisplay(action);
        setWaitingForOperand(false);
      } else {
        setDisplay(display + action);
      }
    } else if (action === '.') {
      if (waitingForOperand) {
        setDisplay('0.');
        setWaitingForOperand(false);
      } else if (!display.includes('.')) {
        setDisplay(display + '.');
      }
    } else if (['+', '-', '*', '/'].includes(action)) {
      setExpression(display + ' ' + action + ' ');
      setWaitingForOperand(true);
      setLastOperator(action);
    } else if (action === '=' || action === 'Enter') {
      const fullExp = expression + display;
      const result = calculate(fullExp.replace(/×/g, '*').replace(/÷/g, '/'));
      
      if (result !== 'Error') {
        setHistory(prev => [{
          expression: fullExp,
          result: result,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 50));
      }
      
      setDisplay(result);
      setExpression('');
      setWaitingForOperand(true);
      setLastOperator(null);
    } else if (action === 'Escape' || action === 'c') {
      setDisplay('0');
      setExpression('');
      setWaitingForOperand(false);
      setLastOperator(null);
    } else if (action === 'Backspace') {
      if (display.length > 1) {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay('0');
      }
    }
  }, [display, expression, calculate, waitingForOperand]);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (/[0-9.]/.test(key)) handleAction(key);
      else if (['+', '-', '*', '/'].includes(key)) handleAction(key);
      else if (key === 'Enter' || key === '=') handleAction('=');
      else if (key === 'Escape') handleAction('c');
      else if (key === 'Backspace') handleAction('Backspace');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleAction]);

  // Scientific operations removed in favor of external evaluator input.

  return (
    <div className="h-full w-full flex bg-[#050507] text-[#e0e0e0] font-sans select-none overflow-hidden relative">
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      {/* Main Container */}
      <div className="flex-1 flex flex-col relative z-10">


        {/* High-Fidelity Display Area */}
        <div className="flex-initial flex flex-col justify-end px-8 pb-2 mb-2 min-h-0 shrink-0 relative transition-all">
          
          {/* Always-on Expression Input Field */}
          <div className="h-12 w-full mb-5 mt-6 focus-within:ring-2 focus-within:ring-indigo-500/30 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center px-5 transition-all shrink-0">
            <span className="text-indigo-400 font-mono text-sm mr-4 opacity-60">ƒ(x)</span>
            <input 
              type="text" 
              placeholder="Enter complex expression or attach image..." 
              className="flex-1 w-full bg-transparent border-none text-white outline-none text-lg font-light placeholder:text-white/10 mr-2"
            />
            <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/[0.02] hover:bg-white/[0.06] text-white/30 hover:text-white transition-all mr-2">
              <ImageIcon size={16} />
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 hover:text-indigo-300 transition-all">
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="text-right text-indigo-400/60 font-mono text-base sm:text-xl tracking-widest truncate h-8 mb-0 mt-auto">
            {expression || '\u00A0'}
          </div>
          <div className="text-right font-display font-light tracking-tighter text-white tabular-nums truncate leading-none text-4xl sm:text-6xl mb-0">
            {display}
          </div>
        </div>

        {/* Balanced Interactive Grid */}
        <div className="flex-1 px-8 pb-8 flex flex-col items-center min-h-0 relative">
          <div className="w-full max-w-2xl h-full flex flex-col gap-2 sm:gap-3">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 flex-1 h-full min-h-0" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {/* Row 0: Modular Controls */}
               <CalcButton 
                onClick={() => setShowHistory(!showHistory)} 
                active={showHistory}
                className={showHistory ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'btn-util'} 
                icon={History} 
              />
              <CalcButton onClick={() => handleAction('Backspace')} className="btn-util" icon={ArrowLeft} />
              <CalcButton label="%" onClick={() => handleAction('%')} className="btn-util" />
              <CalcButton onClick={() => handleAction('/')} active={lastOperator === '/'} className="btn-op" icon={Divide} />

              {/* Row 1 */}
              <CalcButton label="7" onClick={() => handleAction('7')} className="btn-num" />
              <CalcButton label="8" onClick={() => handleAction('8')} className="btn-num" />
              <CalcButton label="9" onClick={() => handleAction('9')} className="btn-num" />
              <CalcButton onClick={() => handleAction('*')} active={lastOperator === '*'} className="btn-op" icon={X} />

              {/* Row 2 */}
              <CalcButton label="4" onClick={() => handleAction('4')} className="btn-num" />
              <CalcButton label="5" onClick={() => handleAction('5')} className="btn-num" />
              <CalcButton label="6" onClick={() => handleAction('6')} className="btn-num" />
              <CalcButton onClick={() => handleAction('-')} active={lastOperator === '-'} className="btn-op" icon={Minus} />

              {/* Row 3 */}
              <CalcButton label="1" onClick={() => handleAction('1')} className="btn-num" />
              <CalcButton label="2" onClick={() => handleAction('2')} className="btn-num" />
              <CalcButton label="3" onClick={() => handleAction('3')} className="btn-num" />
              <CalcButton onClick={() => handleAction('+')} active={lastOperator === '+'} className="btn-op" icon={Plus} />

              {/* Row 4 */}
              <CalcButton label="0" onClick={() => handleAction('0')} className="btn-num col-span-2 text-left pl-8 sm:pl-10" />
              <CalcButton label="." onClick={() => handleAction('.')} className="btn-num" />
              <CalcButton onClick={() => handleAction('=')} className="btn-equal" icon={Equal} />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Overlay (Now overlaps calc space) */}
      <div className={`absolute top-0 right-0 h-full z-50 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] border-l border-white/[0.05] bg-[#050507]/95 backdrop-blur-3xl flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] ${showHistory ? 'w-full sm:w-[400px] translate-x-0' : 'w-0 translate-x-full overflow-hidden'}`}>
        <div className="h-20 shrink-0 flex items-center justify-between px-10 border-b border-white/[0.03]">
          <div className="flex items-center gap-3">
            <History size={18} className="text-indigo-400" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/70 font-display">Execution Log</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setHistory([])} className="h-9 w-9 flex items-center justify-center rounded-2xl text-white/20 hover:text-red-400 hover:bg-white/5 transition-all">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setShowHistory(false)} className="h-9 w-9 flex items-center justify-center rounded-2xl text-white/20 hover:text-white hover:bg-white/5 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/[0.05] gap-6">
              <History size={48} strokeWidth={1} />
              <span className="text-[10px] uppercase font-black tracking-[0.4em]">Standby</span>
            </div>
          ) : (
            history.map((item, i) => (
              <div 
                key={i} 
                className="flex flex-col items-end p-6 rounded-3xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group cursor-pointer animate-in fade-in slide-in-from-bottom-2" 
                onClick={() => { setDisplay(item.result); setExpression(''); }}
              >
                <div className="w-full flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    <span className="text-[10px] text-white/30 font-bold tracking-widest">{item.time}</span>
                  </div>
                  <ChevronRight size={14} className="text-white/10 group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-xs text-indigo-400/40 mb-1 group-hover:text-indigo-400 transition-colors font-mono">{item.expression} =</span>
                <span className="text-3xl font-black text-white tabular-nums font-display">{item.result}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .btn-num {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.03);
          color: white;
          font-size: 1.5rem;
          font-weight: 300;
          font-family: var(--font-display);
        }
        .btn-num:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        .btn-util {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.4);
          font-size: 1.25rem;
        }
        .btn-util:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
        .btn-op {
          background: rgba(99, 102, 241, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.1);
          color: #818cf8;
        }
        .btn-op:hover {
           background: rgba(99, 102, 241, 0.15);
           transform: translateY(-2px);
        }
        .btn-op.active {
          background: #6366f1;
          color: white;
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.4);
          border-color: #818cf8;
        }
        .btn-equal {
          background: #1e1e2e;
          border: 1px solid #313244;
          color: #cdd6f4;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .btn-equal:hover {
          background: #6366f1;
          color: white;
          border-color: #818cf8;
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

function CalcButton({ 
  label, 
  onClick, 
  className = '', 
  icon: Icon, 
  active 
}: { 
  label?: string, 
  onClick: () => void, 
  className?: string, 
  icon?: any,
  active?: boolean
}) {
  return (
    <button 
      onClick={onClick}
      className={`
        relative flex items-center justify-center rounded-3xl transition-all duration-300
        hover:shadow-xl active:scale-95 group overflow-hidden border
        ${active ? 'active' : ''}
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {Icon ? <Icon size={22} className="relative z-10" /> : <span className="relative z-10">{label}</span>}
      <div className="absolute inset-0 bg-white/[0.05] opacity-0 active:opacity-100 transition-opacity" />
    </button>
  );
}
