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

export const base44 = {
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
    addMessage: (conversation, payload) => request(`/agents/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify(payload) })
  }
};

export { ApiError };
