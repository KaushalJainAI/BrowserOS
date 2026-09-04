import { apiClient, API_BASE_URL } from './client';
import { authHeaders } from './auth';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/** Server-sent event frame from the chat stream. Extra keys vary by `type`. */
export interface ChatStreamEvent {
  type: string;
  [key: string]: unknown;
}

/** Envelope every `/api/chat/execute-tool/` call returns. */
export interface ToolResult {
  status: 'success' | 'error';
  stdout?: string;
  stderr?: string;
  error?: string;
  result?: unknown;
}

export interface ChatSession {
  id: string;
  title: string;
  llm_provider: string;
  llm_model: string;
  intent: string;
  created_at: string;
}

export const chatService = {
  async getSessions(): Promise<ChatSession[]> {
    const response = await apiClient.get<ChatSession[]>('/api/chat/sessions/');
    return response.data;
  },

  async createSession(data: Partial<ChatSession> & Record<string, unknown>): Promise<ChatSession> {
    const response = await apiClient.post<ChatSession>('/api/chat/sessions/', data);
    return response.data;
  },

  async getSession(id: string): Promise<ChatSession & { messages: ChatMessage[] }> {
    const response = await apiClient.get<ChatSession & { messages: ChatMessage[] }>(`/api/chat/sessions/${id}/`);
    return response.data;
  },

  async sendMessageStream(
    sessionId: string,
    content: string,
    intent: string | undefined,
    onEvent: (event: ChatStreamEvent) => void,
    approveToolCall?: string
  ): Promise<void> {
    const body: Record<string, unknown> = { content };
    if (intent && intent !== 'normal') body.intent = intent;
    if (approveToolCall) body.approve_tool_call = approveToolCall;

    const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/message/stream/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Failed to start stream');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch (e) {
            console.error('Error parsing SSE:', e);
          }
        }
      }
    }
  }
};

export const terminalService = {
  /**
   * Runs a command in the backend sandbox.
   *
   * The command travels as *data*. The previous version pasted it into a Python
   * snippet (`os.popen("<command>")`), so any quote in the input broke the
   * snippet and anything else in it executed as Python.
   *
   * Note: `execute_shell` is the name the backend's own tool manifest uses but
   * is not currently registered in `chat/tools.py`, so `run` reports an error
   * until it is wired up. It failed before this change too — it called
   * `execute_python_code`, which is equally absent.
   */
  async executeCommand(command: string): Promise<ToolResult> {
    const response = await apiClient.post<ToolResult>('/api/chat/execute-tool/', {
      tool: 'execute_shell',
      args: { command },
    });
    return response.data;
  }
};
