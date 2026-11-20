import { supabase } from './supabase';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function apiRequest(path, options = {}, { allowAnonymous = false } = {}) {
  const headers = new Headers(options.headers || {});
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Could not read your Supabase session: ${error.message}`);
    if (data.session) {
      headers.set('Authorization', `Bearer ${data.session.access_token}`);
    } else if (!allowAnonymous) {
      throw new Error('Sign in to your Supabase account to save items online.');
    }
  } else if (!allowAnonymous) {
    throw new Error('Supabase is not configured. Add the frontend environment variables to use the API.');
  }

  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = typeof body.detail === 'string' ? body.detail : '';
    } catch {
      detail = '';
    }
    throw new Error(detail || `API request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export { API_URL };
