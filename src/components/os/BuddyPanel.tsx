import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  User, 
  X,
  PlusCircle,
  History,
  ArrowRight,
  ChevronDown,
  Plus,
  Copy,
  Check,
  Monitor,
  FileCode,
  Mic,
  Command,
  Sparkles
} from 'lucide-react';
import { useOS } from '../../contexts/OSContext';
import { apiClient } from '../../api/client';
import { useBuddy } from '../../hooks/useBuddy';
import { useAIModels } from '../../hooks/useAIModels';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

interface BuddyCommandResponse {
  status: 'success' | 'error';
  message: string;
  action_details?: {
    type: string;
    params: Record<string, unknown>;
    resolved_from_text: boolean;
    command_text?: string | null;
    details: Record<string, unknown>;
  };
  supported_examples?: string[];
}



export function BuddyPanel() {
  const { isBuddyOpen, toggleBuddy, applyBuddyAction } = useOS();
  const [screenContextEnabled, setScreenContextEnabled] = useState(true);
  const { buddyAction } = useBuddy(screenContextEnabled);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm AskBuddy, your OS agent. I can help you orchestrate workflows, manage files, or just explain how things work here. How can I assist you?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [thinkingStatus, setThinkingStatus] = useState('Buddy is thinking...');

  const [llmProvider, setLlmProvider] = useState('');
  const [llmModel, setLlmModel] = useState('');

  const { providers: dynamicProviders } = useAIModels();

  // Pick the first provider with credentials as default once providers load.
  useEffect(() => {
    if (!dynamicProviders.length || llmProvider) return;
    const first = dynamicProviders.find(p => p.has_credentials) ?? dynamicProviders[0];
    setLlmProvider(first.slug);
    setLlmModel(first.models[0]?.value ?? '');
  }, [dynamicProviders, llmProvider]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Textarea Auto-Grow
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  // Thinking Timer & Status cycling
  useEffect(() => {
    let timer: any;
    let statusInterval: any;
    
    if (isLoading) {
      setThinkingTime(0);
      setThinkingStatus('Buddy is thinking...');
      
      timer = setInterval(() => {
        setThinkingTime(prev => prev + 0.1);
      }, 100);

      const statuses = [
        'Analyzing your request...',
        'Scanning screen context...',
        'Orchestrating workflow...',
        'Searching for tools...',
        'Formulating response...'
      ];
      let statusIdx = 0;
      statusInterval = setInterval(() => {
        statusIdx++;
        setThinkingStatus(statuses[statusIdx % statuses.length]);
      }, 2500);
    } else {
      setThinkingTime(0);
    }

    return () => {
      clearInterval(timer);
      clearInterval(statusInterval);
    };
  }, [isLoading]);

  if (!isBuddyOpen) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      role: 'user',
      content: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.post<BuddyCommandResponse>('/api/buddy/commands/', {
        command: trimmed,
        provider: llmProvider,
        model: llmModel,
      });

      if (response.data.action_details) {
        applyBuddyAction(response.data.action_details.type, response.data.action_details.details || {});
      }

      const aiMsg: Message = {
        role: 'assistant',
        content: response.data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Buddy could not process that command.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="buddy-panel h-full flex flex-col relative font-sans text-white bg-[#0a0a0c]">

      {/* Header - Claude Style */}
      <div className="h-14 glass-morphism flex items-center justify-between px-6 shrink-0 relative z-30 border-b border-white/5">
        <div className="flex items-center gap-3">
           <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
             <Bot className="w-4 h-4" />
           </div>
           <span className="text-sm font-bold text-white/90 truncate max-w-[200px]">
             {messages.length > 1 ? "Optimizing Buddy Environment" : "New Session"}
           </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setScreenContextEnabled(!screenContextEnabled)}
            className={`p-2 rounded-lg transition-all ${
              screenContextEnabled 
                ? 'text-indigo-400 bg-indigo-500/10' 
                : 'text-white/30 hover:text-white hover:bg-white/5'
            }`}
            title={screenContextEnabled ? 'Screen Context: On' : 'Screen Context: Off'}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setMessages([messages[0]])}
            className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-2" />
          <button onClick={toggleBuddy} className="p-2 hover:bg-white/5 rounded-lg text-white/30 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 z-10 custom-scrollbar bg-[#0a0a0c]">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5 ${
                message.role === 'assistant' 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : 'bg-white/5 text-white/40'
              }`}>
                {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/30">
                    {message.role === 'assistant' ? 'Buddy' : 'You'}
                  </span>
                  <span className="text-[10px] text-white/10 font-medium tracking-tight">
                    {message.time}
                  </span>
                </div>
                
                <div className="text-[14px] leading-relaxed text-white/80 font-normal prose-buddy">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => copyToClipboard(message.content, index)}
                    className="p-1.5 hover:bg-white/5 rounded text-white/20 hover:text-white/60 transition-colors"
                  >
                    {copiedId === index ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-5 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              </div>
              <div className="flex flex-col gap-2 pt-1.5 flex-1 min-w-0">
                 <div className="flex items-center justify-between gap-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate">
                     {buddyAction || thinkingStatus}
                   </span>
                   <span className="text-[10px] font-mono text-white/20 shrink-0">
                     ({thinkingTime.toFixed(1)}s)
                   </span>
                 </div>
                 <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500/40 rounded-full animate-indeterminate-slide" />
                 </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Claude Style Action Bar */}
      <div className="p-6 bg-[#0a0a0c] border-t border-white/5 relative z-20">
        <div className="max-w-3xl mx-auto w-full">
          <div className="relative flex flex-col bg-white/[0.03] border border-white/10 rounded-2xl focus-within:border-indigo-500/40 focus-within:bg-white/[0.05] transition-all duration-300 backdrop-blur-xl group shadow-2xl">
            
            {/* Textarea */}
            <div className="px-4 pt-4 pb-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything..."
                className="w-full bg-transparent border-none focus:outline-none resize-none max-h-[200px] overflow-y-auto text-sm leading-relaxed text-white placeholder-white/20"
                rows={1}
              />
              <div className="text-[10px] text-white/10 font-medium flex items-center gap-1.5 mt-1 pointer-events-none select-none">
                <Command className="w-2.5 h-2.5" />
                <span>esc to focus or unfocus Buddy</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="h-12 px-2 flex items-center justify-between border-t border-white/5 mt-2 bg-white/[0.02] rounded-b-2xl">
              <div className="flex items-center gap-1">
                <button className="action-bar-icon" title="Add Content">
                  <PlusCircle className="w-4.5 h-4.5" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                   <FileCode className="w-3.5 h-3.5 text-white/40" />
                   <span className="text-[10px] font-bold text-white/60 tracking-tight">BuddyPanel.tsx</span>
                </div>
                <button className="action-bar-icon" title="Voice Input">
                  <Mic className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsModelOpen(!isModelOpen)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-2 transition-all"
                >
                   <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">
                     {llmModel.split('-')[0]}
                   </span>
                   <ChevronDown className="w-3 h-3 text-white/20" />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center shrink-0 ${
                    input.trim() 
                      ? 'premium-gradient text-white shadow-lg active:scale-95' 
                      : 'bg-white/5 text-white/10 cursor-not-allowed'
                  }`}
                >
                  <ArrowRight className="w-4.5 h-4.5 -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection Dropdown Overlay */}
      {isModelOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pb-24 px-6 pointer-events-none">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setIsModelOpen(false)} />
          <div className="w-[320px] glass-morphism rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto border border-white/10">
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Engine Provider</label>
                <div className="flex gap-2">
                   {dynamicProviders.map(p => (
                     <button
                        key={p.slug}
                        onClick={() => setLlmProvider(p.slug)}
                        className={`flex-1 p-2 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                          llmProvider === p.slug ? 'bg-indigo-500/10 border-indigo-400 text-indigo-400' : 'border-white/5 text-white/30'
                        }`}
                     >
                       <span className="text-lg">{p.icon}</span>
                       <span className="text-[8px] font-bold uppercase tracking-tighter">{p.name}</span>
                     </button>
                   ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Active Model</label>
                <div className="max-h-[160px] overflow-y-auto custom-scrollbar space-y-1">
                  {dynamicProviders.find(p => p.slug === llmProvider)?.models.map(m => (
                    <button
                      key={m.value}
                      onClick={() => { setLlmModel(m.value); setIsModelOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        llmModel === m.value ? 'bg-indigo-500 text-white' : 'hover:bg-white/5 text-white/40'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internal History Sidebar Overlay */}
      <div className={`absolute inset-y-0 right-0 w-full bg-[#0a0a0c] border-l border-white/5 z-40 transition-all duration-500 ease-in-out transform ${
        showHistory ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/[0.03]">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Past Sessions</span>
          <button 
            onClick={() => setShowHistory(false)}
            className="p-2 hover:bg-white/5 rounded-xl text-white/20 transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          <button className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2">
            <Plus size={16} />
            New Thread
          </button>
          <div className="mt-8 flex flex-col items-center justify-center text-white/5 gap-4">
             <History size={48} strokeWidth={1} />
             <span className="text-[9px] font-black uppercase tracking-[0.3em]">No Local History</span>
          </div>
        </div>
      </div>

      <style>{`
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
        @keyframes indeterminate-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-indeterminate-slide {
          width: 50%;
          animation: indeterminate-slide 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
}
