import { appParams } from '@/lib/app-params';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const AUTH_STORAGE_KEY = 'auth_token';

const getToken = () =>
  (typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_STORAGE_KEY)) ||
  appParams.token ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('token')) ||
  null;

const setToken = (token) => {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(AUTH_STORAGE_KEY, token);
  else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('token');
  }
};

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const parseBody = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
};

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new ApiError(
      'Unable to reach the server. Check your connection and try again.',
      0,
      networkErr?.message
    );
  }

  if (!res.ok) {
    const body = await parseBody(res);
    const message =
      (body && typeof body === 'object' && (body.message || body.error)) ||
      (typeof body === 'string' && body) ||
      `Request failed (${res.status})`;
    if (res.status === 401) {
      // Token is invalid/expired — clear it so the UI can prompt re-login.
      setToken(null);
    }
    throw new ApiError(message, res.status, body);
  }
  if (res.status === 204) return null;
  return parseBody(res);
};

const toQuery = (obj = {}) => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : '';
};

const entity = (name) => ({
  list: (sort) => request(`/${name}${sort ? toQuery({ sort_by: sort }) : ''}`),
  filter: (query = {}, sort) => request(`/${name}${toQuery({ q: query, sort_by: sort })}`),
  get: (id) => request(`/${name}/${id}`),
  create: (data) => request(`/${name}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/${name}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/${name}/${id}`, { method: 'DELETE' }),
  deleteMany: (query = {}) => request(`/${name}`, { method: 'DELETE', body: JSON.stringify(query) }),
  bulkCreate: (records) => request(`/${name}/bulk`, { method: 'POST', body: JSON.stringify(records) }),
  restore: (id) => request(`/${name}/${id}/restore`, { method: 'PUT' })
});

export const apiClient = {
  ApiError,
  entities: {
    Booking: entity('bookings'),
    Contract: entity('contracts'),
    Gallery: entity('galleries'),
    GalleryImage: entity('gallery-images'),
    ChecklistTemplate: entity('checklist-templates'),
    ShootChecklist: entity('shoot-checklists'),
    User: entity('users')
  },
  integrations: {
    Core: {
      SendEmail: (payload) => request('/integrations/email/send', { method: 'POST', body: JSON.stringify(payload) }),
      UploadFile: async ({ file }) => {
        const token = getToken();
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${API_BASE_URL}/integrations/files/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form
        });
        if (!res.ok) {
          const body = await parseBody(res);
          throw new ApiError(
            (body && body.message) || 'File upload failed',
            res.status,
            body
          );
        }
        return res.json();
      }
    }
  },
  auth: {
    me: () => request('/auth/me'),
    login: async (email, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data?.token) setToken(data.token);
      return data;
    },
    logout: async () => {
      try { await request('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      setToken(null);
    },
    getToken,
    setToken
  },
  agents: {
    createConversation: (payload) => request('/agents/conversations', { method: 'POST', body: JSON.stringify(payload) }),
    getConversation: (id) => request(`/agents/conversations/${id}`),
    subscribeToConversation: (_id, _cb) => () => {},
    addMessage: (conversation, payload) => request(`/agents/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify(payload) }),
    // Returns { accepted, completed, assistantMessage, error }.
    // - accepted=false means the server rejected the request before any
    //   message was persisted; the caller may safely retry via addMessage.
    // - accepted=true means the server has already persisted the user message
    //   and started processing; the caller must NOT retry, even on error.
    streamMessage: async (conversation, payload, handlers = {}) => {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/agents/conversations/${conversation.id}/messages?stream=1`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        // No bytes ever left/arrived — server never received the request.
        return { accepted: false, completed: false, error: new ApiError(
          'Unable to reach the server. Check your connection and try again.',
          0,
          networkErr?.message,
        ) };
      }
      const contentType = (res.headers?.get?.('content-type') || '').toLowerCase();
      const isSse = contentType.includes('text/event-stream');
      if (!res.ok || !res.body || !isSse) {
        // Server didn't establish an SSE stream. Per contract, the user
        // message was NOT persisted in this case, so the caller may safely
        // retry via the JSON endpoint without duplicating turns.
        const body = await parseBody(res);
        return { accepted: false, completed: false, error: new ApiError(
          (body && (body.error || body.message)) || `Stream failed (${res.status})`,
          res.status,
          body,
        ) };
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = null;
      let streamError = null;
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const lines = raw.split('\n');
            let event = 'message';
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (!data) continue;
            let parsed = null;
            try { parsed = JSON.parse(data); } catch { parsed = data; }
            if (event === 'assistant_message') assistantMessage = parsed;
            if (event === 'error') streamError = new ApiError(parsed?.error || 'Agent error', 500, parsed);
            handlers.onEvent?.(event, parsed);
          }
        }
      } catch (readErr) {
        streamError = readErr instanceof ApiError ? readErr : new ApiError(readErr?.message || 'Stream read failed', 0);
      } finally {
        try { reader.releaseLock?.(); } catch { /* noop */ }
      }
      return {
        accepted: true,
        completed: Boolean(assistantMessage),
        assistantMessage,
        error: assistantMessage ? null : (streamError || new ApiError('Stream ended without an assistant reply', 500)),
      };
    },
  }
};

export { ApiError };
