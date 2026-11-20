import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function RequireAuth({ children }) {
  const { session, isLoading, isConfigured, error } = useAuth();
  const location = useLocation();

  if (!isConfigured) return children;

  if (isLoading) {
    return (
      <main className="auth-status" role="status">
        Checking your sign-in…
      </main>
    );
  }

  if (error) {
    return <Navigate to="/login" replace state={{ from: location, authError: error }} />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
