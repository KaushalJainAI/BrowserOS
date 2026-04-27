import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Shield, 
  Check, 
  X, 
  Trash2, 
  RotateCcw,
  Zap,
  Code,
  Globe,
  Folder,
  Boxes
} from 'lucide-react';
import { chatService, type ChatMessage } from '../../api/chat';

interface PendingToolCall {
  tool: string;
  args: any;
  call_id: string;
}

export function ChatbotApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingToolCall, setPendingToolCall] = useState<PendingToolCall | null>(null);
  const [liveContent, setLiveContent] = useState('');
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [activeIntent, setActiveIntent] = useState<'normal' | 'search' | 'research' | 'coding' | 'file_manipulation' | 'workflow'>('normal');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveContent, liveActivity]);

  const handleStreamEvent = (event: any) => {
    switch (event.type) {
      case 'content_chunk':
        setLiveContent(prev => prev + event.content);
        break;
      case 'agent_trace':
        if (event.sub_type === 'tool') {
          setLiveActivity(prev => [...prev, { tool: event.tool, args: event.args }]);
        }
        break;
      case 'ask_permission':
        setPendingToolCall({
          tool: event.tool,
          args: event.args,
          call_id: event.call_id
        });
        setIsLoading(false);
        break;
      case 'done':
        setMessages(prev => [...prev, event.ai_response]);
        setLiveContent('');
        setLiveActivity([]);
        setIsLoading(false);
        break;
      case 'error':
        alert(event.message);
        setIsLoading(false);
        break;
    }
  };

  const handleSend = async (overrideContent?: string) => {
    const text = overrideContent ?? input;
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setInput('');
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let currentId = sessionId;
      if (!currentId) {
        const session = await chatService.createSession({
          title: text.slice(0, 20),
          llm_provider: 'openrouter',
          llm_model: 'google/gemini-2.0-flash-exp:free'
        });
        currentId = session.id;
        setSessionId(session.id);
      }

      await chatService.sendMessageStream(currentId, text, activeIntent, handleStreamEvent);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingToolCall || !sessionId) return;
    const callId = pendingToolCall.call_id;
    setPendingToolCall(null);
    setIsLoading(true);
    try {
      await chatService.sendMessageStream(sessionId, "Approve", activeIntent, handleStreamEvent, callId);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-600/20' : 'bg-white/5 border border-white/10'}`}>
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        
        {/* Live Stream */}
        {isLoading && (liveContent || liveActivity.length > 0) && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="max-w-[80%] p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
              {liveActivity.map((act, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-500 font-mono bg-amber-500/10 p-1.5 rounded">
                  <Zap size={12} /> Running {act.tool}...
                </div>
              ))}
              <div className="text-sm">{liveContent}</div>
              <Loader2 size={14} className="animate-spin text-purple-400" />
            </div>
          </div>
        )}

        {/* HITL UI */}
        {pendingToolCall && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center shrink-0">
              <Shield size={16} />
            </div>
            <div className="max-w-[80%] p-4 rounded-lg bg-amber-600/10 border border-amber-600/30 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Permission Required</div>
              <div className="text-sm font-mono bg-black/40 p-2 rounded text-gray-300">
                {pendingToolCall.tool === 'execute_shell' && typeof pendingToolCall.args?.command === 'string' && /[;&|>]/.test(pendingToolCall.args.command) ? (
                  <>
                    <div className="text-[10px] text-red-400 font-bold mb-1">
                      ⚠️ Warning: Command contains chaining/redirection (;, &, |, >)
                    </div>
                    <span className="text-red-300">{pendingToolCall.tool}({JSON.stringify(pendingToolCall.args)})</span>
                  </>
                ) : (
                  <span>{pendingToolCall.tool}({JSON.stringify(pendingToolCall.args)})</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handleApprove} className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-xs font-bold flex items-center justify-center gap-1">
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => setPendingToolCall(null)} className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-bold flex items-center justify-center gap-1">
                  <X size={14} /> Deny
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/5 border-t border-white/10 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'normal', icon: <Bot size={12} />, label: 'Chat' },
            { id: 'search', icon: <Globe size={12} />, label: 'Search' },
            { id: 'coding', icon: <Code size={12} />, label: 'Coding' },
            { id: 'file_manipulation', icon: <Folder size={12} />, label: 'Files' },
            { id: 'workflow', icon: <Boxes size={12} />, label: 'Workflow' },
          ].map(intent => (
            <button
              key={intent.id}
              onClick={() => setActiveIntent(intent.id as any)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                activeIntent === intent.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {intent.icon} {intent.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-12 py-3 text-sm focus:border-blue-500 outline-none resize-none min-h-[44px] max-h-[120px]"
          />
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-2 bg-blue-600 hover:bg-blue-500 rounded-md disabled:opacity-50 transition-opacity"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
