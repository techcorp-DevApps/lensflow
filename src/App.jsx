import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import AppLayout from '@/components/layout/AppLayout';
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
    {/* Auth */}
    <Route path="/login" element={<Login />} />
    <Route path="/logout" element={<Logout />} />

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

    {/* Authenticated app */}
    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/galleries" element={<Galleries />} />
        <Route path="/checklists" element={<Checklists />} />
        <Route path="/reminders" element={<Reminders />} />
      </Route>
    </Route>

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
