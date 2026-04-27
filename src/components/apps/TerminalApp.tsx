import { useState, useRef, useEffect } from 'react';
import { terminalService } from '../../api/chat';

interface TerminalLine {
  type: 'command' | 'output' | 'error';
  content: string;
}

export function TerminalApp() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'output', content: 'Welcome to AIAAS Terminal v1.0.0' },
    { type: 'output', content: 'Type "help" for a list of commands.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const cmd = input.trim();
    setHistory(prev => [...prev, { type: 'command', content: cmd }]);
    setInput('');
    setIsLoading(true);

    try {
      if (cmd === 'clear') {
        setHistory([]);
        setIsLoading(false);
        return;
      }
      
      const res = await terminalService.executeCommand(cmd);
      if (res.status === 'success') {
        if (res.stdout) setHistory(prev => [...prev, { type: 'output', content: res.stdout }]);
        if (res.stderr) setHistory(prev => [...prev, { type: 'error', content: res.stderr }]);
      } else {
        setHistory(prev => [...prev, { type: 'error', content: res.error || res.stderr || 'Execution failed' }]);
      }
    } catch (err: any) {
      setHistory(prev => [...prev, { type: 'error', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] text-[#cccccc] font-mono text-xs sm:text-sm p-2 overflow-hidden selection:bg-white/20">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pb-4">
        {history.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap break-all ${
            line.type === 'command' ? 'text-white' : 
            line.type === 'error' ? 'text-red-400' : 'text-[#00ff00]'
          }`}>
            {line.type === 'command' && <span className="text-blue-400 mr-2">ai@aiaas:~$</span>}
            {line.content}
          </div>
        ))}
        {isLoading && <div className="text-blue-400 animate-pulse">Executing...</div>}
      </div>

      <form onSubmit={handleExecute} className="flex items-center gap-2 pt-2 border-t border-white/5 bg-[#0c0c0c]">
        <span className="text-blue-400 shrink-0">ai@aiaas:~$</span>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none text-white"
        />
      </form>
    </div>
  );
}
