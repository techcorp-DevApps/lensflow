import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

const NoAccess = ({ logout }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 font-body">
    <div className="w-full max-w-sm text-center space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-heading font-bold text-foreground">No access</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This area is for the studio only.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={logout}
          className="w-full h-10 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Sign out
        </button>
        <a
          href="/"
          className="w-full h-10 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-accent/5 transition-colors inline-flex items-center justify-center"
        >
          Go to customer site
        </a>
      </div>
    </div>
  </div>
);

export default function RequireAdmin() {
  const { isAuthenticated, authChecked, user, logout } = useAuth();
  const location = useLocation();

  if (!authChecked) return <Spinner />;

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={`/admin/login?from=${encodeURIComponent(from)}`} replace />;
  }

  if (user?.role !== 'admin') {
    return <NoAccess logout={logout} />;
  }

  return <Outlet />;
}
