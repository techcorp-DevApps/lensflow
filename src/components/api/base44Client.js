import { appParams } from '@/lib/app-params';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const getToken = () => localStorage.getItem('auth_token') || appParams.token || localStorage.getItem('token');

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
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
        if (!res.ok) throw new Error('File upload failed');
        return res.json();
      }
    }
  },
  auth: {
    me: () => request('/auth/me'),
    logout: (redirectUrl) => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      if (redirectUrl) window.location.href = redirectUrl;
    },
    redirectToLogin: (fromUrl) => {
      window.location.href = `/login?from=${encodeURIComponent(fromUrl || window.location.href)}`;
    }
  },
  agents: {
    createConversation: (payload) => request('/agents/conversations', { method: 'POST', body: JSON.stringify(payload) }),
    subscribeToConversation: (_id, _cb) => () => {},
    addMessage: (conversation, payload) => request(`/agents/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify(payload) })
  }
};
