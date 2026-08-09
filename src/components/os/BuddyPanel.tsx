/**
 * The Buddy side panel — the agent's seat at the desktop.
 *
 * Context is attached to the outgoing command (semantic OS state, built at send
 * time) rather than streamed on the socket, and every action the backend
 * returns is executed through the shared registry and shown in an audit trail
 * beneath the reply, so the user can always see what the agent touched.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot, User, X, ChevronDown, Plus, Copy, Check, Monitor, ArrowUp,
  Sparkles, Terminal as TerminalIcon, AlertTriangle, ChevronRight, Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useOSActions, useOSAgent, useOSShell } from '../../contexts/osState';
import { apiClient } from '../../api/client';
import { useBuddy } from '../../hooks/useBuddy';
import { useAIModels } from '../../hooks/useAIModels';
import { summarizeSnapshot } from '../../os/snapshot';
import type { AgentActionRecord } from '../../types/os';
import { relativeTime } from '../../os/time';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: number;
  /** Actions performed while handling this message, shown inline beneath it. */
  actions?: AgentActionRecord[];
  isError?: boolean;
}

interface BuddyCommandResponse {
  status: 'success' | 'error';
  message: string;
  action_details?: {
    type: string;
    params?: Record<string, unknown>;
    details?: Record<string, unknown>;
    command_text?: string | null;
  };
  supported_examples?: string[];
}

const SUGGESTIONS = [
  'Open the terminal and list my documents',
  'Snap Files to the left and DocWriter to the right',
  'Write a project brief to /home/Documents/brief.md',
  'Switch to light mode with an emerald accent',
];

const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  at: Date.now(),
  content:
    "I'm Buddy, your OS agent. I can open and arrange apps, read and write files, "
    + 'change how the desktop looks, and work inside your documents. Tell me what you need.',
};

export function BuddyPanel() {
  const { toggleBuddy, runAgentAction, setScreenContextEnabled, setBuddyWidth, notify } = useOSActions();
  const { isBuddyOpen, buddyWidth } = useOSShell();
  const { agentLog, screenContextEnabled } = useOSAgent();

  const { isConnected, activeAction, captureContext } = useBuddy(isBuddyOpen);
  const { providers } = useAIModels();

  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModelOpen, setModelOpen] = useState(false);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Default to the first provider that actually has credentials configured.
  useEffect(() => {
    if (!providers.length || provider) return;
    const first = providers.find((entry) => entry.has_credentials) ?? providers[0];
    setProvider(first.slug);
    setModel(first.models[0]?.value ?? '');
  }, [providers, provider]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  // Auto-grow the composer up to a ceiling, then let it scroll.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
  }, [input]);

  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const handle = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => clearInterval(handle);
  }, [isLoading]);

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1800);
    }).catch(() => notify({ message: 'Could not access the clipboard.', type: 'error' }));
  }, [notify]);

  const send = useCallback(async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = { id: `u_${Date.now()}`, role: 'user', content: text, at: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // The snapshot is built here, at send time — this is the only moment the
      // desktop's state leaves the machine, and only when the user opted in.
      const payload: Record<string, unknown> = { command: text, provider, model };
      if (screenContextEnabled) payload.context = captureContext();

      const response = await apiClient.post<BuddyCommandResponse>('/api/buddy/commands/', payload);
      const data = response.data;

      const performed: AgentActionRecord[] = [];
      if (data.action_details?.type) {
        // The backend nests resolved arguments under `details` and echoes the
        // raw ones under `params`; merge so either shape dispatches.
        const parameters = {
          ...(data.action_details.params ?? {}),
          ...(data.action_details.details ?? {}),
        };
        performed.push(runAgentAction(data.action_details.type, parameters, 'http'));
      }

      setMessages((prev) => [...prev, {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: data.message || 'Done.',
        at: Date.now(),
        actions: performed,
        isError: data.status === 'error',
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Buddy could not process that command.',
        at: Date.now(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, provider, model, screenContextEnabled, captureContext, runAgentAction]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }, [send]);

  // Panel resize by dragging its left edge.
  const onResizePointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = buddyWidth;
    const onMove = (moveEvent: PointerEvent) => setBuddyWidth(startWidth - (moveEvent.clientX - startX));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [buddyWidth, setBuddyWidth]);

  const contextPreview = useMemo(
    () => (showContextPreview ? summarizeSnapshot(captureContext()) : ''),
    [showContextPreview, captureContext],
  );

  const recentActions = agentLog.slice(0, 6);
  const activeModel = providers.find((entry) => entry.slug === provider);

  return (
    <div className="buddy-panel relative">
      <div className="buddy-resizer" onPointerDown={onResizePointerDown} />

      {/* ── Header ── */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-[var(--os-border)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white shrink-0">
            <Bot size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight truncate">Buddy</p>
            <p className="text-[10px] leading-tight text-[var(--os-text-dim)] flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isConnected ? 'var(--os-success)' : 'var(--os-text-dim)' }}
              />
              {isConnected ? 'Connected to OS channel' : 'Offline — commands still work'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setScreenContextEnabled(!screenContextEnabled)}
            data-active={screenContextEnabled}
            className="os-icon-button"
            aria-label={screenContextEnabled ? 'Disable screen context' : 'Enable screen context'}
            title={screenContextEnabled
              ? 'Screen context on — desktop state is sent with each message'
              : 'Screen context off — Buddy cannot see your desktop'}
          >
            <Monitor size={15} />
          </button>
          <button
            onClick={() => setMessages([GREETING])}
            className="os-icon-button"
            aria-label="New conversation"
            title="New conversation"
          >
            <Plus size={15} />
          </button>
          <button onClick={() => toggleBuddy(false)} className="os-icon-button" aria-label="Close Buddy">
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ── Transcript ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {messages.map((message) => (
          <article key={message.id} className="flex gap-3 os-anim-rise">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                message.role === 'assistant'
                  ? 'bg-[rgb(var(--os-accent-rgb)/0.14)] text-[var(--os-accent)]'
                  : 'bg-[var(--os-hover)] text-[var(--os-text-dim)]'
              }`}
            >
              {message.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--os-text-dim)]">
                  {message.role === 'assistant' ? 'Buddy' : 'You'}
                </span>
                <span className="text-[10px] text-[var(--os-text-dim)] opacity-60">
                  {relativeTime(message.at)}
                </span>
              </div>

              <div className={`prose-buddy os-selectable ${message.isError ? 'text-[#f87171]' : ''}`}>
                {message.isError && (
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle size={13} /> {message.content}
                  </p>
                )}
                {!message.isError && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                )}
              </div>

              {!!message.actions?.length && (
                <ul className="mt-2.5 space-y-1">
                  {message.actions.map((action) => (
                    <li key={action.id}>
                      <ActionRow record={action} />
                    </li>
                  ))}
                </ul>
              )}

              {message.role === 'assistant' && !message.isError && message.id !== 'greeting' && (
                <button
                  onClick={() => copy(message.content, message.id)}
                  className="os-icon-button mt-1.5 -ml-1.5"
                  aria-label="Copy reply"
                >
                  {copiedId === message.id
                    ? <Check size={13} className="text-[var(--os-success)]" />
                    : <Copy size={13} />}
                </button>
              )}
            </div>
          </article>
        ))}

        {isLoading && (
          <div className="flex gap-3 os-anim-fade">
            <span className="w-7 h-7 rounded-lg bg-[rgb(var(--os-accent-rgb)/0.14)] flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-[var(--os-accent)] animate-pulse" />
            </span>
            <div className="flex-1 pt-1.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--os-text-muted)] truncate">
                  {activeAction ? `Running ${activeAction}` : 'Thinking'}
                </span>
                <span className="text-[10px] mono text-[var(--os-text-dim)] shrink-0">
                  {elapsed.toFixed(1)}s
                </span>
              </div>
              <div className="h-0.5 rounded-full bg-[var(--os-hover)] overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-[var(--os-accent)] os-indeterminate" />
              </div>
            </div>
          </div>
        )}

        {messages.length === 1 && !isLoading && (
          <div className="space-y-1.5 pt-2">
            <p className="os-field-label px-1 pb-1">Try</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => void send(suggestion)}
                className="os-row text-[12.5px] group"
              >
                <Zap size={13} className="shrink-0 text-[var(--os-accent)]" />
                <span className="flex-1 truncate">{suggestion}</span>
                <ChevronRight size={13} className="shrink-0 opacity-0 group-hover:opacity-60" />
              </button>
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Recent agent activity ── */}
      {recentActions.length > 0 && (
        <details className="shrink-0 border-t border-[var(--os-border)] group">
          <summary className="h-9 px-4 flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-[var(--os-text-muted)] hover:bg-[var(--os-hover)] list-none">
            <TerminalIcon size={12} />
            Activity
            <span className="os-chip ml-auto h-[18px]">{agentLog.length}</span>
            <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
          </summary>
          <ul className="max-h-40 overflow-y-auto px-3 pb-3 space-y-1">
            {recentActions.map((record) => (
              <li key={record.id}><ActionRow record={record} showTime /></li>
            ))}
          </ul>
        </details>
      )}

      {/* ── Context preview ── */}
      {showContextPreview && (
        <div className="shrink-0 border-t border-[var(--os-border)] max-h-48 overflow-y-auto p-3">
          <p className="os-field-label mb-2">What Buddy will see</p>
          <pre className="mono text-[10.5px] leading-relaxed text-[var(--os-text-muted)] whitespace-pre-wrap os-selectable">
            {contextPreview}
          </pre>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="shrink-0 p-3 border-t border-[var(--os-border)]">
        <div className="rounded-xl border border-[var(--os-border)] bg-[var(--os-surface-sunken)] focus-within:border-[var(--os-accent)] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask Buddy to do something…"
            aria-label="Message Buddy"
            className="w-full bg-transparent border-none outline-none resize-none px-3 pt-3 pb-2 text-[13px] leading-relaxed text-[var(--os-text)] placeholder:text-[var(--os-text-dim)]"
          />

          <div className="h-10 px-2 flex items-center justify-between border-t border-[var(--os-border)]">
            <div className="flex items-center gap-1 min-w-0">
              <button
                onClick={() => setShowContextPreview(!showContextPreview)}
                data-active={showContextPreview}
                className="os-icon-button"
                aria-label="Preview the context sent to Buddy"
                title="Preview the context sent to Buddy"
              >
                <Monitor size={14} />
              </button>
              {screenContextEnabled && (
                <span className="os-chip truncate">context on</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setModelOpen(!isModelOpen)}
                className="os-chip hover:bg-[var(--os-active)] max-w-[130px]"
                aria-label="Choose model"
              >
                <span className="truncate">{model || 'Select model'}</span>
                <ChevronDown size={11} className="shrink-0" />
              </button>
              <button
                onClick={() => void send()}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-[var(--os-accent)] text-white active:scale-95'
                    : 'bg-[var(--os-hover)] text-[var(--os-text-dim)] cursor-not-allowed'
                }`}
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Model picker ── */}
      {isModelOpen && (
        <div className="absolute inset-0 z-50 flex items-end p-3">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModelOpen(false)} />
          <div className="os-panel relative w-full p-3 os-anim-rise max-h-[70%] flex flex-col">
            <p className="os-field-label mb-2">Provider</p>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {providers.map((entry) => (
                <button
                  key={entry.slug}
                  onClick={() => {
                    setProvider(entry.slug);
                    setModel(entry.models[0]?.value ?? '');
                  }}
                  data-active={provider === entry.slug}
                  className="os-row w-auto flex-none px-2.5 py-1.5 text-[11px] font-semibold gap-1.5"
                >
                  <span>{entry.icon}</span>
                  {entry.name}
                  {!entry.has_credentials && (
                    <span className="text-[9px] opacity-50">no key</span>
                  )}
                </button>
              ))}
              {providers.length === 0 && (
                <p className="text-[11px] text-[var(--os-text-dim)] px-1">
                  No providers available. Add credentials in the backend.
                </p>
              )}
            </div>

            <p className="os-field-label mb-2">Model</p>
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {activeModel?.models.map((entry) => (
                <button
                  key={entry.value}
                  onClick={() => { setModel(entry.value); setModelOpen(false); }}
                  data-active={model === entry.value}
                  className="os-row text-[12px]"
                >
                  <span className="flex-1 truncate">{entry.name}</span>
                  {entry.is_free && <span className="os-chip h-[18px]">free</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** One line of the agent audit trail. */
function ActionRow({ record, showTime }: { record: AgentActionRecord; showTime?: boolean }) {
  const ok = record.status === 'ok';
  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-lg text-[11px] bg-[var(--os-surface-sunken)] border border-[var(--os-border)]"
      title={record.message}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
        style={{ background: ok ? 'var(--os-success)' : 'var(--os-danger)' }}
      />
      <div className="min-w-0 flex-1">
        <p className="mono font-semibold text-[var(--os-text-muted)] truncate">{record.action}</p>
        <p className="text-[var(--os-text-dim)] truncate">{record.message}</p>
      </div>
      {showTime && (
        <span className="text-[9.5px] text-[var(--os-text-dim)] shrink-0 mt-0.5">
          {relativeTime(record.at)}
        </span>
      )}
    </div>
  );
}
