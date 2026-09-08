export type User = {
  id: string; username: string; email: string; full_name: string; phone?: string | null;
  avatar_url?: string | null; bio?: string | null; location?: string | null; whatsapp?: string | null;
  shop_name?: string | null; shop_description?: string | null; is_admin?: boolean;
  is_seller?: boolean; is_suspended?: boolean; created_at?: string; plan?: string; plan_expires_at?: string | null;
};
export type Category = { id: string; name: string; slug: string; description?: string | null; icon?: string | null; is_active?: boolean };
export type Seller = { id: string; username: string; full_name: string; avatar_url?: string | null; shop_name?: string | null; whatsapp?: string | null; location?: string | null; email?: string; phone?: string; bio?: string | null; shop_description?: string | null };
export type Image = { id: string; image_url: string; is_primary?: boolean; display_order?: number };
export type Product = {
  id: string; user_id?: string; name: string; description?: string | null; price: number; category_id?: string;
  condition?: string; location?: string | null; is_sold?: boolean; is_active?: boolean; approval_status?: string;
  views_count?: number; created_at?: string; primary_image?: string | null; images?: Image[]; seller?: Seller | null; category?: Category | null;
};
export type FavoriteProduct = { id: string; product: Product | null; created_at?: string };
export type AdvertisementDuration = { id: string; duration_days: number; price: number; is_active?: boolean };
export type Advertisement = { id: string; title: string; description?: string; image_url?: string; payment_status: string; approval_status: string; amount: number; duration_days: number; expires_at?: string | null; created_at?: string };
export type SubscriptionPlan = { amount: number; label: string; listing_limit: number | null };
export type Activity = { id: string; type?: string; action?: string; message?: string; description?: string; created_at?: string; metadata?: Record<string, unknown> };
export type Report = { id: string; reason: string; description?: string; status: string; created_at?: string; target_product?: { id: string; name: string } | null };
export type ContactInfo = { email: string; phone: string; whatsapp: string; address: string | null };
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type ProductPage = { items: Product[]; pagination?: Pagination };
export type ApiFailure = Error & { status?: number };

const baseUrl = (import.meta.env.VITE_SHINEX_API_URL || (import.meta.env.DEV ? '/__shinex_api' : 'https://shinex-marketplace.onrender.com/api')).replace(/\/$/, '');
const tokenKey = 'shinex_auth_token';

export const getStoredToken = () => {
  try { return window.localStorage.getItem(tokenKey); } catch { return null; }
};
export const storeToken = (token: string | null) => {
  try {
    if (token) window.localStorage.setItem(tokenKey, token);
    else window.localStorage.removeItem(tokenKey);
  } catch { /* storage may be unavailable; the live session still works */ }
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: 'include' });
  const json = await response.json().catch(() => null) as { success?: boolean; message?: string; data?: T } | null;
  if (!response.ok || json?.success === false) {
    const failure = new Error(json?.message || `Request failed (${response.status})`) as ApiFailure;
    failure.status = response.status;
    throw failure;
  }
  return (json && 'data' in json ? json.data : json) as T;
}
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  auth: {
    login: (body: { email: string; password: string }) => request<{ user: User; token: string }>('/auth/login', json(body)),
    register: (body: Record<string, unknown>) => request<{ user: User; token: string }>('/auth/register', json(body)),
    me: () => request<{ user: User }>('/auth/me'),
    logout: () => request<unknown>('/auth/logout', json({})),
    forgot: (email: string) => request<unknown>('/auth/forgot-password', json({ email })),
    reset: (body: { token: string; new_password: string }) => request<unknown>('/auth/reset-password', json(body)),
  },
  users: {
    me: () => request<{ user: User }>('/users/me'),
    byUsername: (username: string) => request<{ user: User; shop: User & { product_count: number } }>(`/users/${encodeURIComponent(username)}`),
    shop: (username: string, page = 1) => request<{ shop: User & { product_count: number }; products: Product[]; pagination: Pagination }>(`/users/${encodeURIComponent(username)}/shop?page=${page}&limit=20`),
    update: (body: Partial<User>) => request<{ user: User }>('/users/me', { method: 'PUT', body: JSON.stringify(body) }),
    avatar: (file: File) => { const form = new FormData(); form.append('image', file); return request<{ user: User }>('/users/me/avatar', { method: 'POST', body: form }); },
  },
  products: {
    list: (params: Record<string, string | number | undefined> = {}) => {
      const query = new URLSearchParams();
      Object.entries({ limit: 20, ...params }).forEach(([key, value]) => { if (value !== undefined && value !== null && String(value) !== '') query.set(key, String(value)); });
      return request<Product[]>(`/products?${query.toString()}`).then((items): ProductPage => ({ items, pagination: undefined }));
    },
    mine: (status?: string) => request<Product[]>(`/products/mine/all?limit=50${status ? `&status=${status}` : ''}`).then((items): ProductPage & { plan?: { name: string; active_listing_limit: number | null } } => ({ items })),
    categories: () => request<Category[]>('/products/categories/all'),
    get: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
    create: (body: { name: string; price: string; category_id: string; description: string; condition: string; location: string; images: File[] }) => {
      const form = new FormData(); Object.entries(body).forEach(([key, value]) => Array.isArray(value) ? value.forEach((file) => form.append('images', file)) : form.append(key, value));
      return request<{ product: Product }>('/products', { method: 'POST', body: form });
    },
    update: (id: string, body: Partial<{ name: string; price: string; category_id: string; description: string; condition: string; location: string }> & { images?: File[] }) => {
      const form = new FormData(); Object.entries(body).forEach(([key, value]) => Array.isArray(value) ? value.forEach((file) => form.append('images', file)) : form.append(key, value as string));
      return request<{ product: Product }>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: form });
    },
    remove: (id: string) => request<unknown>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    sold: (id: string, is_sold: boolean) => request<Product>(`/products/${encodeURIComponent(id)}/sold`, { method: 'PATCH', body: JSON.stringify({ is_sold }) }),
  },
  favorites: {
    products: () => request<FavoriteProduct[]>('/favorites/products?limit=50'),
    sellers: () => request<Array<{ id: string; seller: Seller; created_at?: string }>>('/favorites/sellers?limit=50'),
    product: (id: string, active: boolean) => request<unknown>(`/favorites/product/${encodeURIComponent(id)}`, active ? json({}) : { method: 'DELETE' }),
    seller: (id: string, active: boolean) => request<unknown>(`/favorites/seller/${encodeURIComponent(id)}`, active ? json({}) : { method: 'DELETE' }),
    checkProduct: (id: string) => request<{ is_favorited: boolean }>(`/favorites/product/${encodeURIComponent(id)}/check`),
    checkSeller: (id: string) => request<{ is_favorited: boolean }>(`/favorites/seller/${encodeURIComponent(id)}/check`),
  },
  advertisements: {
    pricing: () => request<AdvertisementDuration[]>('/advertisements/pricing'),
    mine: () => request<Advertisement[]>('/advertisements/my?limit=50'),
    create: (body: { title: string; description: string; duration_id: string; image: File }) => { const form = new FormData(); form.append('title', body.title); form.append('description', body.description); form.append('duration_id', body.duration_id); form.append('image', body.image); return request<{ advertisement: Advertisement; payment_url: string | null }>('/advertisements', { method: 'POST', body: form }); },
    pay: (id: string) => request<{ authorization_url: string; reference: string }>(`/advertisements/${encodeURIComponent(id)}/pay`, json({})),
  },
  subscriptions: {
    plans: () => request<Record<string, SubscriptionPlan>>('/subscriptions/plans'),
    me: () => request<{ plan: string; plan_expires_at: string | null }>('/subscriptions/me'),
    start: (plan: string) => request<{ subscription: Record<string, unknown>; authorization_url: string; reference: string }>('/subscriptions', json({ plan })),
    verify: (reference: string) => request<Record<string, unknown>>(`/subscriptions/verify/${encodeURIComponent(reference)}`),
  },
  reports: {
    mine: () => request<Report[]>('/reports/my?limit=50'),
    create: (body: { target_product_id?: string; target_user_id?: string; target_advertisement_id?: string; reason: string; description: string }) => request<Report>('/reports', json(body)),
  },
  contact: {
    info: () => request<ContactInfo>('/contact/info'),
    send: (body: { name: string; email: string; phone: string; subject: string; message: string }) => request<unknown>('/contact', json(body)),
  },
  activity: { list: () => request<Activity[]>('/activity?limit=50') },
};