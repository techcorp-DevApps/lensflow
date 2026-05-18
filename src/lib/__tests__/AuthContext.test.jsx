import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const Probe = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoadingAuth)}</span>
      <span data-testid="authed">{String(auth.isAuthenticated)}</span>
      <span data-testid="email">{auth.user?.email || ''}</span>
      <button onClick={() => auth.signIn('a@b.com', 'pw')}>sign-in</button>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <MemoryRouter>
      <AuthProvider><Probe /></AuthProvider>
    </MemoryRouter>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('starts unauthenticated when no token present', async () => {
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(screen.getByTestId('email').textContent).toBe('');
  });

  test('loads user from /auth/me when token exists', async () => {
    localStorage.setItem('auth_token', 'tok-1');
    vi.spyOn(base44.auth, 'me').mockResolvedValue({ email: 'me@example.com' });
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('authed').textContent).toBe('true'));
    expect(screen.getByTestId('email').textContent).toBe('me@example.com');
  });

  test('signIn updates user and authenticated state', async () => {
    vi.spyOn(base44.auth, 'login').mockResolvedValue({
      token: 'tok-2', user: { email: 'new@example.com' },
    });
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    await act(async () => { screen.getByText('sign-in').click(); });
    await waitFor(() => expect(screen.getByTestId('authed').textContent).toBe('true'));
    expect(screen.getByTestId('email').textContent).toBe('new@example.com');
  });

  test('useAuth throws when used outside AuthProvider', () => {
    const Bare = () => { useAuth(); return null; };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
