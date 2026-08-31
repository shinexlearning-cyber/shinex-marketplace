// ========================================
// SHINEX MARKETPLACE — API CLIENT
// ========================================

// Determine API base URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://shinex-marketplace.onrender.com/api';

class ApiClient {
    constructor(baseURL = API_BASE) {
        this.baseURL = baseURL;
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = localStorage.getItem('token');

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // If FormData, remove Content-Type header (browser will set with boundary)
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle 401 Unauthorized
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                        window.location.hash = '#login';
                    }
                }

                throw {
                    status: response.status,
                    message: data.message || 'An error occurred',
                    data: data
                };
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw {
                    status: 0,
                    message: 'Network error. Please check your internet connection.'
                };
            }
            throw error;
        }
    }

    // ---------- AUTH ----------
    register(data) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    login(data) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    getMe() {
        return this.request('/auth/me');
    }

    forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    resetPassword(data) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // ---------- USERS ----------
    getProfile(username) {
        return this.request(`/users/${username}`);
    }

    getShop(username, page = 1, limit = 20) {
        return this.request(`/users/${username}/shop?page=${page}&limit=${limit}`);
    }

    updateProfile(data) {
        return this.request('/users/me', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    uploadAvatar(formData) {
        return this.request('/users/me/avatar', {
            method: 'POST',
            body: formData
        });
    }

    // ---------- PRODUCTS ----------
    getProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/products?${query}`);
    }

    getProduct(id) {
        return this.request(`/products/${id}`);
    }

    createProduct(formData) {
        return this.request('/products', {
            method: 'POST',
            body: formData
        });
    }

    updateProduct(id, formData) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: formData
        });
    }

    deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    markSold(id, isSold) {
        return this.request(`/products/${id}/sold`, {
            method: 'PATCH',
            body: JSON.stringify({ is_sold: isSold })
        });
    }

    getCategories() {
        return this.request('/products/categories/all');
    }

    // ---------- FAVORITES ----------
    favoriteProduct(productId) {
        return this.request(`/favorites/product/${productId}`, {
            method: 'POST'
        });
    }

    unfavoriteProduct(productId) {
        return this.request(`/favorites/product/${productId}`, {
            method: 'DELETE'
        });
    }

    favoriteSeller(sellerId) {
        return this.request(`/favorites/seller/${sellerId}`, {
            method: 'POST'
        });
    }

    unfavoriteSeller(sellerId) {
        return this.request(`/favorites/seller/${sellerId}`, {
            method: 'DELETE'
        });
    }

    getFavoriteProducts(page = 1, limit = 20) {
        return this.request(`/favorites/products?page=${page}&limit=${limit}`);
    }

    getFavoriteSellers(page = 1, limit = 20) {
        return this.request(`/favorites/sellers?page=${page}&limit=${limit}`);
    }

    checkProductFavorite(productId) {
        return this.request(`/favorites/product/${productId}/check`);
    }

    checkSellerFavorite(sellerId) {
        return this.request(`/favorites/seller/${sellerId}/check`);
    }

    // ---------- ADVERTISEMENTS ----------
    getPricing() {
        return this.request('/advertisements/pricing');
    }

    createAdvertisement(formData) {
        return this.request('/advertisements', {
            method: 'POST',
            body: formData
        });
    }

    initializePayment(id) {
        return this.request(`/advertisements/${id}/pay`, {
            method: 'POST'
        });
    }

    getPaymentStatus(id) {
        return this.request(`/advertisements/${id}/payment`);
    }

    getMyAdvertisements(page = 1, limit = 20) {
        return this.request(`/advertisements/my?page=${page}&limit=${limit}`);
    }

    // ---------- REPORTS ----------
    createReport(data) {
        return this.request('/reports', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    getMyReports(page = 1, limit = 20) {
        return this.request(`/reports/my?page=${page}&limit=${limit}`);
    }

    // ---------- CONTACT ----------
    sendContact(data) {
        return this.request('/contact', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    getContactInfo() {
        return this.request('/contact/info');
    }

    // ---------- ADMIN ----------
    // Users
    getAdminUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/users?${query}`);
    }

    getAdminUser(id) {
        return this.request(`/admin/users/${id}`);
    }

    suspendUser(id, reason) {
        return this.request(`/admin/users/${id}/suspend`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
    }

    unsuspendUser(id) {
        return this.request(`/admin/users/${id}/unsuspend`, {
            method: 'PATCH'
        });
    }

    deleteUser(id) {
        return this.request(`/admin/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Products (Admin)
    getAdminProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/products?${query}`);
    }

    getAdminProduct(id) {
        return this.request(`/admin/products/${id}`);
    }

    deleteAdminProduct(id) {
        return this.request(`/admin/products/${id}`, {
            method: 'DELETE'
        });
    }

    // Categories (Admin)
    getAdminCategories() {
        return this.request('/admin/categories');
    }

    createCategory(data) {
        return this.request('/admin/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    updateCategory(id, data) {
        return this.request(`/admin/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    deleteCategory(id) {
        return this.request(`/admin/categories/${id}`, {
            method: 'DELETE'
        });
    }

    // Advertisements (Admin)
    getAdminAdvertisements(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/advertisements?${query}`);
    }

    getAdminAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}`);
    }

    approveAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}/approve`, {
            method: 'PATCH'
        });
    }

    rejectAdvertisement(id, reason) {
        return this.request(`/admin/advertisements/${id}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
    }

    pauseAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}/pause`, {
            method: 'PATCH'
        });
    }

    deleteAdminAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}`, {
            method: 'DELETE'
        });
    }

    // Durations (Admin)
    getAdminDurations() {
        return this.request('/admin/durations');
    }

    createDuration(data) {
        return this.request('/admin/durations', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    updateDuration(id, data) {
        return this.request(`/admin/durations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    deleteDuration(id) {
        return this.request(`/admin/durations/${id}`, {
            method: 'DELETE'
        });
    }

    // Payments (Admin)
    getAdminPayments(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/payments?${query}`);
    }

    getAdminPayment(id) {
        return this.request(`/admin/payments/${id}`);
    }

    getPaymentStats() {
        return this.request('/admin/payments/stats');
    }

    // Reports (Admin)
    getAdminReports(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/reports?${query}`);
    }

    getAdminReport(id) {
        return this.request(`/admin/reports/${id}`);
    }

    resolveReport(id, notes) {
        return this.request(`/admin/reports/${id}/resolve`, {
            method: 'PATCH',
            body: JSON.stringify({ admin_notes: notes })
        });
    }

    dismissReport(id, notes) {
        return this.request(`/admin/reports/${id}/dismiss`, {
            method: 'PATCH',
            body: JSON.stringify({ admin_notes: notes })
        });
    }

    // Contact (Admin)
    getAdminContactMessages(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/contact?${query}`);
    }

    getAdminContactMessage(id) {
        return this.request(`/admin/contact/${id}`);
    }

    updateContactStatus(id, status) {
        return this.request(`/admin/contact/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    deleteContactMessage(id) {
        return this.request(`/admin/contact/${id}`, {
            method: 'DELETE'
        });
    }
}

// Create and export API instance
const api = new ApiClient();
