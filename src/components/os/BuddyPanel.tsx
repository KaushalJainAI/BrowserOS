import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  User, 
  Sparkles, 
  Loader2,
  Trash2,
  X,
  PlusCircle,
  Image as ImageIcon,
  History,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  Zap,
  Plus,
  Copy,
  Check,
  Monitor
} from 'lucide-react';
import { useOS } from '../../contexts/OSContext';
import { apiClient } from '../../api/client';
import { useBuddy } from '../../hooks/useBuddy';

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

const examplePrompts = [
  { icon: MessageSquare, text: "Explain how BrowserOS connects to n8n" },
  { icon: Zap, text: "Automate my daily research workflow" },
  { icon: ImageIcon, text: "Generate a new desktop background" },
];

export function BuddyPanel() {
  const { isBuddyOpen, toggleBuddy, applyBuddyAction } = useOS();
  const [screenContextEnabled, setScreenContextEnabled] = useState(true);
  const { isConnected: buddyConnected, buddyAction } = useBuddy(screenContextEnabled);
  
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

  const [llmProvider, setLlmProvider] = useState('google');
  const [llmModel, setLlmModel] = useState('gemini-2.0-flash');
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  const dynamicProviders = [
    {
      name: 'Google',
      slug: 'google',
      icon: '🌐',
      has_credentials: true,
      models: [
        { name: 'Gemini 1.5 Pro', value: 'gemini-1-5-pro', is_free: false },
        { name: 'Gemini 1.5 Flash', value: 'gemini-1-5-flash', is_free: true },
        { name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash', is_free: true },
      ]
    },
    {
      name: 'OpenAI',
      slug: 'openai',
      icon: '🧠',
      has_credentials: true,
      models: [
        { name: 'GPT-4o Mini', value: 'gpt-4o-mini', is_free: true },
        { name: 'GPT-4o', value: 'gpt-4o', is_free: false },
        { name: 'o1-mini', value: 'o1-mini', is_free: false },
      ]
    },
    {
      name: 'Anthropic',
      slug: 'anthropic',
      icon: '🤖',
      has_credentials: true,
      models: [
        { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet', is_free: false },
        { name: 'Claude 3 Haiku', value: 'claude-3-haiku', is_free: true },
      ]
    }
  ];
  
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
    <div className="buddy-panel h-full flex flex-col relative font-sans text-white bg-[#09090b]">

      {/* Header */}
      <div className="h-14 border-b border-white/10 bg-[#09090b] flex items-center justify-between px-4 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-md transition-colors ${showHistory ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}
            title="History"
          >
            <History className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold tracking-tight text-white/90">
              AI Assistant
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setScreenContextEnabled(!screenContextEnabled)}
            className={`p-2 rounded-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 relative ${
              screenContextEnabled 
                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" 
                : "bg-white/5 text-white/30 border border-transparent hover:border-white/10"
            }`}
            title={screenContextEnabled ? "Disable Screen Context" : "Enable Screen Context"}
          >
            <Monitor className="w-3.5 h-3.5" />
            {screenContextEnabled ? 'Context ON' : 'Context OFF'}
            {screenContextEnabled && (
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#09090b] ${
                buddyConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-yellow-500 animate-pulse"
              }`} />
            )}
          </button>
          <button 
            onClick={() => setMessages([messages[0]])}
            className="p-2 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={toggleBuddy} className="p-2 hover:bg-white/5 rounded-md text-white/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 z-10 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-blue-500" />
                </div>
              )}
              
              <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
                <div
                  className={`p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-[#27272a] text-white/90 rounded-tl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{message.content}</div>
                </div>
                
                {/* Actions */}
                <div className={`flex items-center gap-2 mt-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  <button
                    onClick={() => copyToClipboard(message.content, index)}
                    className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white/80 transition-colors"
                    title="Copy message"
                  >
                    {copiedId === index ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <span className="text-xs text-white/40">
                    {message.time}
                  </span>
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center shrink-0 border border-white/5 text-white/70">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-500" />
              </div>
              <div className="p-4 bg-[#27272a] rounded-2xl rounded-tl-sm">
                <Loader2 className="w-5 h-5 animate-spin text-white/50" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Empty State / Examples */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 z-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-white/50 mb-2 font-medium">Try these examples:</p>
            <div className="flex flex-col gap-2">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt.text)}
                  className="w-full p-3 bg-[#18181b] hover:bg-[#27272a] border border-white/5 hover:border-blue-500/20 rounded-xl text-sm transition-all text-left shadow-sm group relative overflow-hidden"
                >
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                   <span className="relative z-10 text-white/80 group-hover:text-white">
                     {prompt.text}
                   </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      {buddyAction && (
        <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20 text-blue-500 text-xs flex items-center justify-center gap-2 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Buddy: {buddyAction}
        </div>
      )}
      <div className="p-4 border-t border-white/10 bg-[#09090b] relative z-20 flex flex-col gap-3">
        {/* Chat Input */}
        <div className="max-w-3xl mx-auto flex flex-col w-full">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative bg-[#09090b] border border-white/20 rounded-3xl focus-within:ring-2 focus-within:ring-white/20 transition-all shadow-sm flex items-end gap-2 p-2">
              
              {/* Media Button */}
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl shrink-0">
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything..."
                className="w-full bg-transparent border-none focus:outline-none resize-none max-h-[160px] overflow-y-auto text-sm leading-relaxed py-2.5 scrollbar-none text-white placeholder-white/40"
                rows={1}
              />
              
              {/* Send Button */}
              <div className="shrink-0 pb-1 pr-1">
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`w-8 h-8 rounded-full shadow-lg transition-all flex items-center justify-center ${
                    input.trim() 
                      ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-blue-500/20' 
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Model Selection Bar - Now Naturally Flowing Below the Input */}
        <div className="w-full flex items-center justify-start z-[60]">
          <div className="relative inline-block">
            <button 
              onClick={() => setIsModelOpen(!isModelOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#18181b] border border-white/10 hover:bg-[#27272a] rounded-full shadow-sm transition-all active:scale-95 group"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 shrink-0">
                  <span className="text-xs font-bold leading-none">
                    {dynamicProviders.find(p => p.slug === llmProvider)?.icon || '🌐'}
                  </span>
                </div>
                <div className="flex flex-col items-start leading-[1.1] min-w-[80px]">
                  <span className="text-[8px] font-bold uppercase text-white/50 tracking-wider">Model</span>
                  <span className="text-xs font-bold text-white truncate max-w-[100px]">
                    {dynamicProviders.find(p => p.slug === llmProvider)?.models.find(m => m.value === llmModel)?.name || llmModel}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-300 shrink-0 ${isModelOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isModelOpen && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setIsModelOpen(false)} />
                <div className="absolute bottom-[110%] left-0 w-[240px] bg-[#09090b] border border-white/10 rounded-xl shadow-2xl z-[60] p-3 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-white/50 mb-2 block px-1">AI Provider</label>
                      <div className="grid grid-cols-3 gap-2">
                        {dynamicProviders.map(p => (
                          <button
                            key={p.slug}
                            onClick={() => {
                              setLlmProvider(p.slug);
                            }}
                            className={`p-2 rounded-xl border text-sm transition-all flex flex-col items-center gap-1.5 ${
                              llmProvider === p.slug 
                                ? "bg-blue-500/10 border-blue-500 text-blue-500 shadow-sm ring-1 ring-blue-500/20" 
                                : "border-white/10 hover:border-white/30 hover:bg-white/5 text-white/70"
                            }`}
                          >
                            <span className="text-xl leading-none">{p.icon}</span>
                            <span className="text-[9px] font-bold truncate w-full text-center">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-white/50 mb-2 block px-1">Select Model</label>
                      <div className="px-1 mb-2">
                        <input
                          type="text"
                          placeholder="Search models..."
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[11px] text-white focus:ring-1 focus:ring-blue-500/20 outline-none placeholder:text-white/30"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                        {dynamicProviders.find(p => p.slug === llmProvider)?.models
                          .filter(m => {
                            const q = modelSearchQuery.toLowerCase().trim();
                            if (!q) return true;
                            const matchesName = m.name.toLowerCase().includes(q) || m.value.toLowerCase().includes(q);
                            if (matchesName) return true;
                            if (q === 'free' && m.is_free === true) return true;
                            if (q === 'paid' && m.is_free === false) return true;
                            return false;
                          })
                          .map(m => (
                          <button
                            key={m.value}
                            onClick={() => {
                              setLlmModel(m.value);
                              setIsModelOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                              llmModel === m.value 
                                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                                : "hover:bg-white/5 text-white/70 hover:text-white"
                            }`}
                          >
                            {m.name}
                          </button>
                        ))}
                        {(() => {
                          const filtered = (dynamicProviders.find(p => p.slug === llmProvider)?.models || [])
                            .filter(m => {
                              const q = modelSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              const matchesName = m.name.toLowerCase().includes(q) || m.value.toLowerCase().includes(q);
                              if (matchesName) return true;
                              if (q === 'free' && m.is_free === true) return true;
                              if (q === 'paid' && m.is_free === false) return true;
                              return false;
                            });
                          return filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-[10px] text-white/40 italic">
                              No models found matching "{modelSearchQuery}"
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}
