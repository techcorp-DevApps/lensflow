import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import RequireAdmin from '@/components/RequireAdmin';
import AppLayout from '@/components/layout/AppLayout';
import PublicLanding from '@/pages/PublicLanding';
import Dashboard from '@/pages/Dashboard';
import Bookings from '@/pages/Bookings';
import Contracts from '@/pages/Contracts';
import Galleries from '@/pages/Galleries';
import Checklists from '@/pages/Checklists';
import Reminders from '@/pages/Reminders';
import ClientGallery from '@/pages/ClientGallery';
import SignContract from '@/pages/SignContract';
import BookingChat from '@/pages/BookingChat';
import ClientBooking from '@/pages/ClientBooking';
import BookingRequest from '@/pages/BookingRequest';
import Login from '@/pages/Login';
import Logout from '@/pages/Logout';

const AppRoutes = () => (
  <Routes>
    {/* Public landing */}
    <Route path="/" element={<PublicLanding />} />

    {/* Admin auth */}
    <Route path="/admin/login" element={<Login />} />
    <Route path="/admin/logout" element={<Logout />} />

    {/* Legacy redirects — keep old bookmarked URLs working */}
    <Route path="/login" element={<Navigate to="/admin/login" replace />} />
    <Route path="/logout" element={<Navigate to="/admin/logout" replace />} />

    {/* Public routes — accessible without an authenticated session.
        Both the canonical task-spec paths and the legacy paths used by
        existing share links are exposed so neither set 404s. */}
    <Route path="/booking-request" element={<BookingRequest />} />
    <Route path="/request" element={<BookingRequest />} />

    <Route path="/client-gallery/:id" element={<ClientGallery />} />
    <Route path="/gallery/:id" element={<ClientGallery />} />

    <Route path="/sign-contract/:id" element={<SignContract />} />
    <Route path="/sign/:id" element={<SignContract />} />

    <Route path="/client-booking/:id" element={<ClientBooking />} />
    <Route path="/client-booking" element={<ClientBooking />} />
    <Route path="/booking-status" element={<ClientBooking />} />

    <Route path="/book" element={<BookingChat />} />

    {/* Admin cockpit — requires authenticated admin */}
    <Route element={<RequireAdmin />}>
      <Route element={<AppLayout />}>
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/bookings" element={<Bookings />} />
        <Route path="/admin/contracts" element={<Contracts />} />
        <Route path="/admin/galleries" element={<Galleries />} />
        <Route path="/admin/checklists" element={<Checklists />} />
        <Route path="/admin/reminders" element={<Reminders />} />
      </Route>
    </Route>

    {/* Legacy admin routes — redirect to /admin/* namespace */}
    <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="/bookings" element={<Navigate to="/admin/bookings" replace />} />
    <Route path="/contracts" element={<Navigate to="/admin/contracts" replace />} />
    <Route path="/galleries" element={<Navigate to="/admin/galleries" replace />} />
    <Route path="/checklists" element={<Navigate to="/admin/checklists" replace />} />
    <Route path="/reminders" element={<Navigate to="/admin/reminders" replace />} />

    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
