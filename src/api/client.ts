const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T }> {
  const token = window.localStorage.getItem('authToken');
  const headers = new Headers(init.headers || {});

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Token ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = typeof data?.message === 'string' ? data.message : `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return { data: data as T };
}

export const apiClient = {
  get: async <T>(path: string) => request<T>(path),
  post: async <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
