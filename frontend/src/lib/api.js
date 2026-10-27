const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, options);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  if (response.status === 204) return null;
  return response.json();
}

export { API_URL };
