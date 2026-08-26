/**
 * AskBuddy — the full-window conversation surface.
 *
 * Same agent and same action registry as the side panel: anything Buddy returns
 * here is executed against the desktop and shown in the transcript, so work
 * started in one surface is continuous with what the other did.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, User, ArrowUp, Lightbulb, Plus, AlertTriangle, Monitor, PanelRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useOSActions, useOSAgent, useOSNotifications, useOSShell, useOSWindows, useWindowState } from '../../contexts/osState';
import { apiClient } from '../../api/client';
import { buildSnapshot } from '../../os/snapshot';
import { relativeTime } from '../../os/time';
import type { AgentActionRecord } from '../../types/os';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: number;
  actions?: AgentActionRecord[];
  isError?: boolean;
}

interface CommandResponse {
  status: 'success' | 'error';
  message: string;
  action_details?: {
    type: string;
    params?: Record<string, unknown>;
    details?: Record<string, unknown>;
  };
}

/** Stable empty default so the fallback branch keeps a constant identity. */
const NO_MESSAGES: Message[] = [];

const PROMPTS = [
  'Tile every open window',
  'Create a project plan in Documents',
  'Summarise what is on my desktop right now',
  'Set the wallpaper to aurora and switch to dark mode',
];

export default function ChatbotApp() {
  const { runAgentAction, setScreenContextEnabled, toggleBuddy } = useOSActions();
  const { windows, activeWindowId } = useOSWindows();
  const { theme, pinnedApps, desktopApps } = useOSShell();
  const { clipboard } = useOSNotifications();
  const { screenContextEnabled } = useOSAgent();
  const { state, setState } = useWindowState({ messages: [] as Message[] });

  const messages = Array.isArray(state.messages) ? (state.messages as Message[]) : NO_MESSAGES;
  const [input, setInput] = useState('');
  const [isLoading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [input]);

  const send = useCallback(async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isLoading) return;

    const outgoing: Message = { id: `u_${Date.now()}`, role: 'user', content: text, at: Date.now() };
    setState({ messages: [...messages, outgoing] });
    setInput('');
    setLoading(true);

    try {
      const payload: Record<string, unknown> = { command: text };
      if (screenContextEnabled) {
        payload.context = buildSnapshot({
          windows, activeWindowId, theme, pinnedApps, desktopApps, clipboard,
        });
      }

      const { data } = await apiClient.post<CommandResponse>('/api/buddy/commands/', payload);
      const performed: AgentActionRecord[] = [];
      if (data.action_details?.type) {
        performed.push(runAgentAction(
          data.action_details.type,
          { ...(data.action_details.params ?? {}), ...(data.action_details.details ?? {}) },
          'http',
        ));
      }

      setState({
        messages: [...messages, outgoing, {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: data.message || 'Done.',
          at: Date.now(),
          actions: performed,
          isError: data.status === 'error',
        }],
      });
    } catch (error) {
      setState({
        messages: [...messages, outgoing, {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Buddy is unreachable.',
          at: Date.now(),
          isError: true,
        }],
      });
    } finally {
      setLoading(false);
    }
  }, [
    input, isLoading, messages, setState, screenContextEnabled, runAgentAction,
    windows, activeWindowId, theme, pinnedApps, desktopApps, clipboard,
  ]);

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <span className="flex items-center gap-2 text-[12.5px] font-semibold">
          <Bot size={15} style={{ color: 'var(--os-accent)' }} /> AskBuddy
        </span>
        <span className="flex-1" />
        <button
          onClick={() => setScreenContextEnabled(!screenContextEnabled)}
          data-active={screenContextEnabled}
          className="os-icon-button"
          aria-label="Toggle screen context"
          title={screenContextEnabled ? 'Screen context on' : 'Screen context off'}
        >
          <Monitor size={15} />
        </button>
        <button onClick={() => setState({ messages: [] })} className="os-icon-button" aria-label="New conversation">
          <Plus size={15} />
        </button>
        <button
          onClick={() => toggleBuddy(true)}
          className="os-icon-button"
          aria-label="Open the Buddy side panel"
          title="Open the side panel"
        >
          <PanelRight size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-7">
          {messages.length === 0 && (
            <div className="pt-10 text-center">
              <span className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white mx-auto mb-4">
                <Bot size={26} />
              </span>
              <h2 className="text-[18px] font-semibold mb-1.5">What should I do?</h2>
              <p className="text-[13px] text-[var(--os-text-dim)] mb-6 max-w-md mx-auto">
                I can open and arrange apps, read and write your files, and change how the
                desktop looks — not just talk about it.
              </p>
              <div className="grid gap-1.5 max-w-md mx-auto">
                {PROMPTS.map((prompt) => (
                  <button key={prompt} onClick={() => void send(prompt)} className="os-row text-[12.5px]">
                    <Lightbulb size={13} className="shrink-0" style={{ color: 'var(--os-accent)' }} />
                    <span className="truncate">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <article key={message.id} className="flex gap-4 os-anim-rise">
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  message.role === 'assistant'
                    ? 'bg-[rgb(var(--os-accent-rgb)/0.14)] text-[var(--os-accent)]'
                    : 'bg-[var(--os-hover)] text-[var(--os-text-dim)]'
                }`}
              >
                {message.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
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

                {message.isError ? (
                  <p className="flex items-center gap-1.5 text-[13.5px]" style={{ color: 'var(--os-danger)' }}>
                    <AlertTriangle size={14} /> {message.content}
                  </p>
                ) : (
                  <div className="prose-buddy os-selectable">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                )}

                {!!message.actions?.length && (
                  <ul className="mt-2.5 space-y-1">
                    {message.actions.map((action) => (
                      <li
                        key={action.id}
                        className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] bg-[var(--os-surface-sunken)] border border-[var(--os-border)]"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: action.status === 'ok' ? 'var(--os-success)' : 'var(--os-danger)' }}
                        />
                        <span className="min-w-0">
                          <span className="mono font-semibold text-[var(--os-text-muted)]">{action.action}</span>
                          <span className="text-[var(--os-text-dim)]"> — {action.message}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <span className="w-8 h-8 rounded-lg bg-[rgb(var(--os-accent-rgb)/0.14)] flex items-center justify-center shrink-0">
                <Bot size={15} className="animate-pulse" style={{ color: 'var(--os-accent)' }} />
              </span>
              <div className="flex-1 pt-2">
                <div className="h-0.5 w-40 rounded-full bg-[var(--os-hover)] overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-[var(--os-accent)] os-indeterminate" />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="p-4 border-t border-[var(--os-border)] shrink-0">
        <div className="max-w-3xl mx-auto rounded-2xl border border-[var(--os-border)] bg-[var(--os-surface-sunken)] focus-within:border-[var(--os-accent)] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Ask Buddy to do something…"
            aria-label="Message Buddy"
            className="w-full bg-transparent border-none outline-none resize-none px-4 pt-3.5 pb-2 text-[13.5px] leading-relaxed text-[var(--os-text)] placeholder:text-[var(--os-text-dim)]"
          />
          <div className="h-11 px-3 flex items-center justify-between border-t border-[var(--os-border)]">
            <span className="text-[10.5px] text-[var(--os-text-dim)]">
              {screenContextEnabled ? 'Desktop context is shared with each message' : 'Screen context off'}
            </span>
            <button
              onClick={() => void send()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
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
  );
}
