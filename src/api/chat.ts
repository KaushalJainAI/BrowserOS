import { apiClient } from './client';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: any;
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

  async createSession(data: any): Promise<ChatSession> {
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
    onEvent: (event: { type: string; [key: string]: any }) => void,
    approveToolCall?: string
  ): Promise<void> {
    const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const token = window.localStorage.getItem('authToken');
    
    const body: Record<string, any> = { content };
    if (intent && intent !== 'normal') body.intent = intent;
    if (approveToolCall) body.approve_tool_call = approveToolCall;

    const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(body)
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

export const filesService = {
  async listFiles(path: string = '.'): Promise<any> {
    const response = await apiClient.post<any>('/api/chat/execute-tool/', {
      tool: 'list_files',
      args: { path }
    });
    return response.data;
  },
  async readFile(path: string): Promise<any> {
    const response = await apiClient.post<any>('/api/chat/execute-tool/', {
      tool: 'read_file',
      args: { path }
    });
    return response.data;
  }
};

export const terminalService = {
  async executeCommand(command: string): Promise<any> {
    const response = await apiClient.post<any>('/api/chat/execute-tool/', {
      tool: 'execute_python_code', // Reusing python executor or we could add a shell one
      args: { code: `import os; print(os.popen("${command}").read())` }
    });
    return response.data;
  }
};
