import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '@/api/client';

const AuthContext = createContext(/** @type {any} */ (null));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ auth_required: true });

  const navigate = useNavigate();
  const location = useLocation();

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      // Skip /auth/me when there is no token at all — it would 401 and noisily
      // log out the user on every load of a public route.
      if (!apiClient.auth.getToken()) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return;
      }
      const currentUser = await apiClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      if (err?.status && err.status !== 401) {
        setAuthError({ type: 'auth_error', message: err.message || 'Authentication error' });
      } else {
        setAuthError(null);
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const signIn = useCallback(async (email, password) => {
    const data = await apiClient.auth.login(email, password);
    setUser(data.user || null);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await apiClient.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  const navigateToLogin = useCallback(() => {
    const from = location.pathname + location.search;
    navigate(`/login?from=${encodeURIComponent(from)}`, { replace: true });
  }, [navigate, location.pathname, location.search]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        signIn,
        navigateToLogin,
        checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
