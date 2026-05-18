import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { base44, ApiError } from '@/components/api/base44Client';

describe('base44Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const mockFetch = (body, init = {}) => {
    const status = init.status ?? 200;
    const headers = new Map(Object.entries(init.headers || { 'content-type': 'application/json' }));
    globalThis.fetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k) => headers.get(k.toLowerCase()) },
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      json: async () => body,
    });
  };

  test('login stores token and returns user', async () => {
    mockFetch({ token: 'tok-abc', user: { email: 'a@b.com' } });
    const data = await base44.auth.login('a@b.com', 'pw');
    expect(data.user.email).toBe('a@b.com');
    expect(localStorage.getItem('auth_token')).toBe('tok-abc');
  });

  test('authed request includes Bearer header', async () => {
    localStorage.setItem('auth_token', 'tok-xyz');
    mockFetch({ email: 'a@b.com' });
    await base44.auth.me();
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok-xyz');
  });

  test('non-ok response throws ApiError with normalized message', async () => {
    mockFetch({ error: 'Nope' }, { status: 400 });
    await expect(base44.auth.me()).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Nope',
    });
  });

  test('401 response clears stored token', async () => {
    localStorage.setItem('auth_token', 'tok-bad');
    mockFetch({ error: 'Unauthorized' }, { status: 401 });
    await expect(base44.auth.me()).rejects.toBeInstanceOf(ApiError);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  test('network failure throws ApiError with status 0', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('boom'));
    await expect(base44.auth.me()).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });
  });

  test('entities.Booking.list calls correct path with sort', async () => {
    mockFetch([]);
    await base44.entities.Booking.list('-session_date');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/bookings');
    expect(url).toContain('sort_by=-session_date');
  });

  test('entities.Booking.filter serializes query', async () => {
    mockFetch([]);
    await base44.entities.Booking.filter({ access_token: 'tk' });
    const [url] = globalThis.fetch.mock.calls[0];
    expect(decodeURIComponent(url)).toContain('q={"access_token":"tk"}');
  });
});
