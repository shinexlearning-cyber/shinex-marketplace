export type User = {
  id: string; username: string; full_name: string; email: string; phone?: string | null;
  is_admin?: boolean; is_suspended?: boolean; created_at?: string; stats?: { products: number; advertisements: number; reports: number };
};
export type Category = { id: string; name: string; slug: string; description?: string | null; icon?: string | null; is_active?: boolean };
export type AdminProduct = {
  id: string; name: string; description?: string | null; price: number; approval_status?: string;
  is_active?: boolean; is_sold?: boolean; created_at?: string; rejection_reason?: string | null;
  user?: { id: string; username: string; full_name?: string; email?: string; phone?: string };
  seller?: { id: string; username: string; full_name?: string; email?: string };
  category?: { id: string; name: string; slug?: string }; images?: Array<{ id: string; image_url: string; is_primary?: boolean }>;
  location?: string | null; primary_image?: string | null;
};
export type Duration = { id: string; duration_days: number; price: number; is_active?: boolean };
export type Advertisement = {
  id: string; title: string; description?: string; image_url?: string; amount: number; duration_days: number;
  payment_status: string; approval_status: string; expires_at?: string | null; created_at?: string;
  rejection_reason?: string | null; user?: { id: string; username: string; full_name?: string; email?: string };
  duration?: { id?: string; duration_days: number; price: number };
  payment?: { id?: string; amount?: number; status?: string; paystack_reference?: string };
};
export type Payment = { id: string; paystack_reference?: string; amount: number; status: string; paid_at?: string | null; created_at?: string; user?: User; advertisement?: { id: string; title: string; duration_days?: number; amount?: number } };
export type Report = { id: string; reason: string; description?: string; status: string; created_at?: string; admin_notes?: string; reporter?: User; target_user?: User; target_product?: { id: string; name: string; price?: number }; target_advertisement?: { id: string; title: string } };
export type ContactMessage = { id: string; name: string; email: string; phone?: string; subject: string; message: string; status: 'new' | 'read' | 'replied'; created_at?: string; replied_at?: string | null };
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type ApiError = Error & { status?: number };

const baseUrl = (import.meta.env.VITE_SHINEX_API_URL || '/api').replace(/\/$/, '');
const tokenKey = 'shinex_auth_token';
export const getToken = () => { try { return localStorage.getItem(tokenKey); } catch { return null; } };
export const setToken = (token: string | null) => { try { token ? localStorage.setItem(tokenKey, token) : localStorage.removeItem(tokenKey); } catch { /* session still works */ } };

type Envelope<T> = { success?: boolean; message?: string; data?: T; pagination?: Pagination };
async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; pagination?: Pagination }> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: 'include' });
  const json = await response.json().catch(() => null) as Envelope<T> | null;
  if (!response.ok || json?.success === false) {
    const error = new Error(json?.message || `Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    throw error;
  }
  return { data: (json && 'data' in json ? json.data : json) as T, pagination: json?.pagination };
}
const body = (data: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(data) });
const query = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
  return qs.toString() ? `?${qs.toString()}` : '';
};
const list = <T>(path: string, params: Record<string, string | number | undefined> = {}) => request<T[]>(`${path}${query(params)}`);

export const adminApi = {
  auth: {
    login: async (data: { email: string; password: string }) => (await request<{ user: User; token: string }>('/auth/login', body(data))).data,
    me: async () => (await request<{ user: User }>('/auth/me')).data.user,
    logout: () => request<unknown>('/auth/logout', body({})),
  },
  users: {
    list: (params: Record<string, string | number | undefined> = {}) => list<User>('/admin/users', params),
    get: async (id: string) => (await request<User>(`/admin/users/${encodeURIComponent(id)}`)).data,
    suspend: (id: string, reason: string) => request<User>(`/admin/users/${encodeURIComponent(id)}/suspend`, body({ reason }, 'PATCH')),
    unsuspend: (id: string) => request<User>(`/admin/users/${encodeURIComponent(id)}/unsuspend`, body({}, 'PATCH')),
    setAdmin: (id: string, is_admin: boolean) => request<User>(`/admin/users/${encodeURIComponent(id)}/set-admin`, body({ is_admin }, 'PATCH')),
    remove: (id: string) => request<unknown>(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  products: {
    list: (params: Record<string, string | number | undefined> = {}) => list<AdminProduct>('/admin/products', params),
    get: async (id: string) => (await request<AdminProduct>(`/admin/products/${encodeURIComponent(id)}`)).data,
    approve: (id: string) => request<AdminProduct>(`/admin/products/${encodeURIComponent(id)}/approve`, body({}, 'PATCH')),
    reject: (id: string, reason: string) => request<AdminProduct>(`/admin/products/${encodeURIComponent(id)}/reject`, body({ reason }, 'PATCH')),
    remove: (id: string) => request<unknown>(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  categories: {
    list: async () => (await request<Category[]>('/admin/categories')).data,
    create: (data: { name: string; description: string; icon?: string }) => request<Category>('/admin/categories', body(data)),
    update: (id: string, data: Partial<Category>) => request<Category>(`/admin/categories/${encodeURIComponent(id)}`, body(data, 'PUT')),
    remove: (id: string) => request<unknown>(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  advertisements: {
    list: (params: Record<string, string | number | undefined> = {}) => list<Advertisement>('/admin/advertisements', params),
    get: async (id: string) => (await request<Advertisement>(`/admin/advertisements/${encodeURIComponent(id)}`)).data,
    approve: (id: string) => request<Advertisement>(`/admin/advertisements/${encodeURIComponent(id)}/approve`, body({}, 'PATCH')),
    reject: (id: string, reason: string) => request<Advertisement>(`/admin/advertisements/${encodeURIComponent(id)}/reject`, body({ reason }, 'PATCH')),
    pause: (id: string) => request<Advertisement>(`/admin/advertisements/${encodeURIComponent(id)}/pause`, body({}, 'PATCH')),
    remove: (id: string) => request<unknown>(`/admin/advertisements/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  durations: {
    list: async () => (await request<Duration[]>('/admin/durations')).data,
    create: (data: { duration_days: number; price: number; is_active: boolean }) => request<Duration>('/admin/durations', body(data)),
    update: (id: string, data: Partial<Duration>) => request<Duration>(`/admin/durations/${encodeURIComponent(id)}`, body(data, 'PUT')),
    remove: (id: string) => request<unknown>(`/admin/durations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  payments: {
    list: (params: Record<string, string | number | undefined> = {}) => list<Payment>('/admin/payments', params),
    get: async (id: string) => (await request<Payment>(`/admin/payments/${encodeURIComponent(id)}`)).data,
    stats: async () => (await request<{ total_revenue: number; total_transactions: number; status_breakdown: Array<{ status: string; count: number }> }>('/admin/payments/stats')).data,
  },
  reports: {
    list: (params: Record<string, string | number | undefined> = {}) => list<Report>('/admin/reports', params),
    get: async (id: string) => (await request<Report>(`/admin/reports/${encodeURIComponent(id)}`)).data,
    resolve: (id: string, admin_notes: string) => request<Report>(`/admin/reports/${encodeURIComponent(id)}/resolve`, body({ admin_notes }, 'PATCH')),
    dismiss: (id: string, admin_notes: string) => request<Report>(`/admin/reports/${encodeURIComponent(id)}/dismiss`, body({ admin_notes }, 'PATCH')),
  },
  contact: {
    list: (params: Record<string, string | number | undefined> = {}) => list<ContactMessage>('/admin/contact', params),
    get: async (id: string) => (await request<ContactMessage>(`/admin/contact/${encodeURIComponent(id)}`)).data,
    status: (id: string, status: ContactMessage['status']) => request<ContactMessage>(`/admin/contact/${encodeURIComponent(id)}/status`, body({ status }, 'PATCH')),
    remove: (id: string) => request<unknown>(`/admin/contact/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
};