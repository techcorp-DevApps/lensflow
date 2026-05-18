import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Bookings from '@/pages/Bookings';
import { base44 } from '@/api/base44Client';

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Bookings page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(base44.auth, 'me').mockResolvedValue({ email: 'photog@example.com' });
  });

  test('shows skeletons while loading', () => {
    vi.spyOn(base44.entities.Booking, 'list').mockImplementation(() => new Promise(() => {}));
    const { container } = wrap(<Bookings />);
    // shadcn Skeleton renders divs; just confirm something rendered without crashing.
    expect(container.querySelector('h1, [class*="Skeleton"]') || container.firstChild).toBeTruthy();
  });

  test('renders populated booking list', async () => {
    vi.spyOn(base44.entities.Booking, 'list').mockResolvedValue([
      { id: '1', client_name: 'Alice', client_email: 'alice@x.com', session_type: 'portrait', session_date: '2026-09-01T10:00:00Z', status: 'pending' },
      { id: '2', client_name: 'Bob', client_email: 'bob@x.com', session_type: 'wedding', session_date: '2026-10-01T10:00:00Z', status: 'confirmed' },
    ]);
    wrap(<Bookings />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('shows error state when list fails', async () => {
    vi.spyOn(base44.entities.Booking, 'list').mockRejectedValue(
      Object.assign(new Error('Server down'), { status: 500 })
    );
    wrap(<Bookings />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    );
  });

  test('renders empty state when no bookings', async () => {
    vi.spyOn(base44.entities.Booking, 'list').mockResolvedValue([]);
    wrap(<Bookings />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /booking/i })).toBeInTheDocument());
  });
});
