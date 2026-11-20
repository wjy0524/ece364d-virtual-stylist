import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    session: null,
    isLoading: Boolean(supabase),
    error: null,
  });

  useEffect(() => {
    if (!supabase) {
      setAuthState({ session: null, isLoading: false, error: null });
      return undefined;
    }

    let isMounted = true;
    let hasReceivedAuthEvent = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      hasReceivedAuthEvent = true;
      if (isMounted) {
        setAuthState({ session, isLoading: false, error: null });
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted || hasReceivedAuthEvent) return;
        setAuthState((current) => ({
          session: error ? current.session : data.session,
          isLoading: false,
          error: error?.message ?? null,
        }));
      })
      .catch((error) => {
        if (!isMounted) return;
        setAuthState({
          session: null,
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...authState, isConfigured: Boolean(supabase), supabase }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
