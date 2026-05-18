import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import { AuthProvider } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
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

  test('successful sign-in navigates home', async () => {
    vi.spyOn(base44.auth, 'login').mockResolvedValue({
      token: 'tok', user: { email: 'me@example.com' },
    });
    renderLogin();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'me@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
  });

  test('shows error message when sign-in fails', async () => {
    vi.spyOn(base44.auth, 'login').mockRejectedValue(new Error('Invalid email or password'));
    renderLogin();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), 'me@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
