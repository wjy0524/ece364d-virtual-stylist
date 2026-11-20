import { supabase } from './supabase';
export type Category = 'top' | 'bottom' | 'dress' | 'layer' | 'shoes' | 'accessory';
export type ClosetItem = {
  id: string; category: Category; subcategory?: string | null;
  color?: string | null; brand?: string | null;
  size?: string | null; tag_size?: string | null;
  image_url?: string | null; signed_image_url?: string | null;
  image_signed_url?: string | null; image_path?: string | null;
  created_at?: string;
  [key: string]: unknown;
};
const base = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export const apiBase = base;

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!base) throw new Error('Missing EXPO_PUBLIC_API_URL in frontend/.env.local');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please log in to continue.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...options, headers });
  } catch (e) {
    throw new Error(`Cannot reach backend at ${base}. Check your Mac IP, Wi-Fi, and that Uvicorn uses --host 0.0.0.0. ${String(e)}`);
  }
  const raw = await response.text();
  let body: any;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  if (!response.ok) {
    const detail = body && typeof body === 'object' ? (body.detail ?? body.message ?? body) : body;
    throw new Error(`API ${response.status} ${path}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return body as T;
}
export const getItems = async () => {
  const result = await apiRequest<ClosetItem[] | { items: ClosetItem[] } | { data: ClosetItem[] }>('/api/items');
  if (Array.isArray(result)) return result;
  if (result && 'items' in result && Array.isArray(result.items)) return result.items;
  if (result && 'data' in result && Array.isArray(result.data)) return result.data;
  return [];
};
export function getItem(id: string) { return apiRequest<ClosetItem>(`/api/items/${encodeURIComponent(id)}`); }
export function createItem({ tag_size, ...input }: { category: Category; subcategory?: string; color?: string; brand?: string; tag_size?: string }) {
  // The backend field is `size_label`; unknown fields like `tag_size` are silently dropped.
  return apiRequest<ClosetItem>('/api/items', { method: 'POST', body: JSON.stringify({ ...input, size_label: tag_size }) });
}
export type Classification = { top_prediction: { category: Category; subcategory?: string | null } };
export function classifyImage(photo: { uri: string; name?: string | null; mimeType?: string | null }) {
  const form = new FormData();
  form.append('file', { uri: photo.uri, name: photo.name || 'clothing.jpg', type: photo.mimeType || 'image/jpeg' } as any);
  return apiRequest<Classification>('/api/items/classify', { method: 'POST', body: form });
}
export async function uploadItemImage(id: string, photo: { uri: string; name?: string | null; mimeType?: string | null }) {
  const name = photo.name || `garment-${Date.now()}.jpg`;
  const mimeType = photo.mimeType || 'image/jpeg';
  const form = new FormData();
  // React Native's fetch supports a {uri, name, type} file part.
  form.append('file', { uri: photo.uri, name, type: mimeType } as any);
  return apiRequest<unknown>(`/api/items/${encodeURIComponent(id)}/image`, { method: 'POST', body: form });
}
export type Outfit = {
  id: string; occasion: string; items: ClosetItem[]; explanation: string; ranking_score: number;
  score_breakdown?: { occasion: number; style: number; color: number; diversity: number };
  feedback?: boolean | null;
};
export type RecommendationResult = {
  recommendations: Outfit[]; message: string | null;
  missing_categories: string[]; metadata_missing: string[]; occasion: string;
};
export function getRecommendations(occasion?: string) {
  return apiRequest<RecommendationResult>(`/api/recommendations${occasion ? `?occasion=${encodeURIComponent(occasion)}` : ''}`);
}
export const getSavedOutfits = () => apiRequest<Outfit[]>('/api/recommendations/saved');
export function saveOutfit(o: Outfit) {
  return apiRequest<unknown>('/api/recommendations/saved', { method: 'POST', body: JSON.stringify({
    item_ids: o.items.map(i => i.id), occasion: o.occasion, explanation: o.explanation, ranking_score: o.ranking_score,
  }) });
}
export const unsaveOutfit = (id: string) => apiRequest<null>(`/api/recommendations/saved/${encodeURIComponent(id)}`, { method: 'DELETE' });
export function rateOutfit(o: Outfit, helpful: boolean) {
  return apiRequest<unknown>('/api/recommendations/feedback', { method: 'POST', body: JSON.stringify({
    item_ids: o.items.map(i => i.id), occasion: o.occasion, helpful,
  }) });
}
export function savePreferences(input: { aesthetics: string[]; preferred_fits: string[]; occasions: string[]; disliked_items: string[] }) {
  return apiRequest<unknown>('/api/me/preferences', { method: 'PUT', body: JSON.stringify(input) });
}
