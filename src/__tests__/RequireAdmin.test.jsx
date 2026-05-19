import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAdmin from '@/components/RequireAdmin';
import { AuthProvider } from '@/lib/AuthContext';
import { apiClient } from '@/api/client';

const AdminPage = () => <div>ADMIN CONTENT</div>;
const LoginPage = () => <div>LOGIN PAGE</div>;

const renderWithAuth = (initialPath, mockUser) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/dashboard" element={<AdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('RequireAdmin', () => {
  test('unauthenticated user visiting /admin/dashboard is redirected to /admin/login', async () => {
    vi.spyOn(apiClient.auth, 'getToken').mockReturnValue(null);
    renderWithAuth('/admin/dashboard', null);
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
  });

  test('authenticated non-admin visiting /admin/dashboard sees the no-access page', async () => {
    vi.spyOn(apiClient.auth, 'getToken').mockReturnValue('non-admin-token');
    vi.spyOn(apiClient.auth, 'me').mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      role: 'user',
    });
    renderWithAuth('/admin/dashboard', null);
    expect(await screen.findByText(/no access/i)).toBeInTheDocument();
    expect(await screen.findByText(/studio only/i)).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
  });

  test('authenticated admin visiting /admin/dashboard sees admin content', async () => {
    vi.spyOn(apiClient.auth, 'getToken').mockReturnValue('admin-token');
    vi.spyOn(apiClient.auth, 'me').mockResolvedValue({
      id: '1',
      email: 'admin@example.com',
      role: 'admin',
    });
    renderWithAuth('/admin/dashboard', null);
    expect(await screen.findByText('ADMIN CONTENT')).toBeInTheDocument();
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument();
  });

  test('no-access page includes sign-out and customer-site links', async () => {
    vi.spyOn(apiClient.auth, 'getToken').mockReturnValue('non-admin-token');
    vi.spyOn(apiClient.auth, 'me').mockResolvedValue({
      id: '2',
      email: 'user@example.com',
      role: 'user',
    });
    renderWithAuth('/admin/dashboard', null);
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /customer site/i })).toBeInTheDocument();
  });
});
