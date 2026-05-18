import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';

const parseReturnTo = (search) => {
  const params = new URLSearchParams(search);
  const raw = params.get('from') || params.get('returnTo') || '/';
  // Only allow internal paths to prevent open-redirect.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (raw.startsWith('/login')) return '/';
  return raw;
};

export default function Login() {
  const { signIn, isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = parseReturnTo(location.search);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [authChecked, isAuthenticated, navigate, returnTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Sign in to LensFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your bookings, contracts, and galleries.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-6">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="pl-9"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-10"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Need to book a session?{' '}
          <Link to="/request" className="text-accent hover:underline">
            Request a session
          </Link>
        </p>
      </div>
    </div>
  );
}
