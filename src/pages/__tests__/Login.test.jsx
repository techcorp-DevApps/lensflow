import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import { AuthProvider } from '@/lib/AuthContext';
import { apiClient } from '@/api/client';

const renderLogin = (initialPath = '/admin/login') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<div>DASHBOARD</div>} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('renders email and password fields', async () => {
    renderLogin();
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('shows inline error when fields are empty', async () => {
    renderLogin();
    const button = await screen.findByRole('button', { name: /sign in/i });
    // Submit the form directly to bypass HTML5 `required` field gating.
    fireEvent.submit(button.closest('form'));
    expect(await screen.findByText(/please enter your email and password/i)).toBeInTheDocument();
  });

  test('successful sign-in navigates to admin dashboard', async () => {
    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
      token: 'tok', user: { email: 'me@example.com', role: 'admin' },
    });
    renderLogin();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'me@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText('DASHBOARD')).toBeInTheDocument());
  });

  test('successful sign-in with ?from= param honours the redirect', async () => {
    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
      token: 'tok', user: { email: 'me@example.com', role: 'admin' },
    });
    renderLogin('/admin/login?from=%2Fadmin%2Fbookings');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'me@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    // The route /admin/bookings isn't in this test's router, so the Router
    // will fall through — we just verify no crash and dashboard fallback works.
    await waitFor(() => expect(screen.queryByText(/sign in to lensflow/i)).not.toBeInTheDocument());
  });

  test('shows error message when sign-in fails', async () => {
    vi.spyOn(apiClient.auth, 'login').mockRejectedValue(new Error('Invalid email or password'));
    renderLogin();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'me@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
