import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Shirt } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import './login.css';

export default function Login() {
  const { session, isLoading, isConfigured, error: sessionError, supabase } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    return <Navigate to={location.state?.from?.pathname || '/onboarding'} replace />;
  }
  if (isConfigured && isLoading) {
    return (
      <main className="auth-status" role="status">
        Checking your sign-in…
      </main>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!supabase) {
      setError('Supabase is not configured. Add the project URL and publishable key to frontend/.env.local.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });

      if (result.error) {
        setError(result.error.message);
      } else if (result.data.session) {
        const destination = location.state?.from?.pathname || '/onboarding';
        navigate(destination, { replace: true });
      } else {
        setNotice('Account created. Check your email to confirm your address, then sign in.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Virtual Stylist">
        <Link className="auth-brand" to="/">
          <span className="auth-brand-mark">V<span>.</span></span>
          <span>VIRTUAL<br />STYLIST</span>
        </Link>
        <div className="auth-story-copy">
          <span className="eyebrow">YOUR STYLE, YOUR SPACE</span>
          <h1>A wardrobe that feels <em>like you.</em></h1>
          <p>Sign in to save your closet and make room for more personal recommendations.</p>
        </div>
        <div className="auth-story-note"><Shirt size={19} /> Your wardrobe, reimagined.</div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
          <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Enter your email and password to continue.'
              : 'Create an account to start building your personal style space.'}
          </p>

          {!isConfigured && (
            <div className="auth-message" role="status">
              Supabase isn’t configured yet. Add <code>VITE_SUPABASE_URL</code> and
              <code> VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env.local</code> to enable accounts.
              Demo mode remains available without these settings.
            </div>
          )}
          {sessionError && (
            <div className="auth-message auth-message-error" role="alert">
              We couldn’t check your existing sign-in: {sessionError}
            </div>
          )}
          {error && <div className="auth-message auth-message-error" role="alert">{error}</div>}
          {notice && <div className="auth-message" role="status">{notice}</div>}

          <form onSubmit={submit}>
            <label className="auth-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={!isConfigured || isSubmitting}
            />
            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              disabled={!isConfigured || isSubmitting}
            />
            <button className="primary auth-submit" type="submit" disabled={!isConfigured || isSubmitting}>
              {isSubmitting
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? 'New to Virtual Stylist?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setNotice('');
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
