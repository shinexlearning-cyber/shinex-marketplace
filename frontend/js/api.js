class ApiClient {
    constructor() {
        // Auto-detect if we're on Render or localhost
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

this.baseUrl = isProduction 
    ? 'https://shinex-marketplace.onrender.com/api'
    : 'http://localhost:5000/api';
        
        this.token = localStorage.getItem('shinex_token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('shinex_token', token);
        } else {
            localStorage.removeItem('shinex_token');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    this.setToken(null);
                    window.location.href = '/login';
                }
                throw new Error(data.error || data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ===== AUTH =====
    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    logout() {
        this.setToken(null);
    }

    // ===== PRODUCTS =====
    async getProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/products?${query}`);
    }

    async getProduct(id) {
        return this.request(`/products/${id}`);
    }

    async createProduct(productData) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(id, productData) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    async getSellerProducts(userId, status = 'active') {
        return this.request(`/products/seller/${userId}?status=${status}`);
    }

    // ===== USERS =====
    async getUser(username) {
        return this.request(`/users/${username}`);
    }

    async updateProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async changePassword(passwordData) {
        return this.request('/users/change-password', {
            method: 'POST',
            body: JSON.stringify(passwordData)
        });
    }

    async deleteAccount() {
        return this.request('/users/account', {
            method: 'DELETE'
        });
    }

    // ===== FAVORITES =====
    async getFavorites() {
        return this.request('/favorites');
    }

    async toggleProductFavorite(productId) {
        return this.request(`/favorites/product/${productId}`, {
            method: 'POST'
        });
    }

    async toggleSellerFavorite(sellerId) {
        return this.request(`/favorites/seller/${sellerId}`, {
            method: 'POST'
        });
    }

    async checkProductFavorite(productId) {
        return this.request(`/favorites/check/product/${productId}`);
    }

    async checkSellerFavorite(sellerId) {
        return this.request(`/favorites/check/seller/${sellerId}`);
    }

    // ===== ADVERTISEMENTS =====
    async getAdvertisements() {
        return this.request('/advertisements');
    }

    async getMyAdvertisements() {
        return this.request('/advertisements/my');
    }

    async createAdvertisement(adData) {
        return this.request('/advertisements', {
            method: 'POST',
            body: JSON.stringify(adData)
        });
    }

    async initializePayment(adId) {
        return this.request(`/advertisements/${adId}/pay`, {
            method: 'POST'
        });
    }

    async verifyPayment(reference) {
        return this.request(`/advertisements/verify/${reference}`);
    }

    async updateAdvertisement(id, adData) {
        return this.request(`/advertisements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(adData)
        });
    }

    async deleteAdvertisement(id) {
        return this.request(`/advertisements/${id}`, {
            method: 'DELETE'
        });
    }

    // ===== REPORTS =====
    async createReport(reportData) {
        return this.request('/reports', {
            method: 'POST',
            body: JSON.stringify(reportData)
        });
    }

    async getMyReports() {
        return this.request('/reports/my');
    }

    // ===== CONTACT =====
    async sendContactMessage(messageData) {
        return this.request('/contact', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
    }

    // ===== ADMIN =====
    async getAdminStats() {
        return this.request('/admin/stats');
    }

    async getAdminUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/users?${query}`);
    }

    async suspendUser(userId) {
        return this.request(`/admin/users/${userId}/suspend`, {
            method: 'PUT'
        });
    }

    async unsuspendUser(userId) {
        return this.request(`/admin/users/${userId}/unsuspend`, {
            method: 'PUT'
        });
    }

    async deleteUser(userId) {
        return this.request(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    }

    async getAdminProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/products?${query}`);
    }

    async deleteAdminProduct(productId) {
        return this.request(`/admin/products/${productId}`, {
            method: 'DELETE'
        });
    }

    async getAdminCategories() {
        return this.request('/admin/categories');
    }

    async createCategory(name) {
        return this.request('/admin/categories', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async updateCategory(id, name) {
        return this.request(`/admin/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });
    }

    async deleteCategory(id) {
        return this.request(`/admin/categories/${id}`, {
            method: 'DELETE'
        });
    }

    async getAdminAdvertisements(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/advertisements?${query}`);
    }

    async approveAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}/approve`, {
            method: 'PUT'
        });
    }

    async rejectAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}/reject`, {
            method: 'PUT'
        });
    }

    async pauseAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}/pause`, {
            method: 'PUT'
        });
    }

    async deleteAdminAdvertisement(id) {
        return this.request(`/admin/advertisements/${id}`, {
            method: 'DELETE'
        });
    }

    async getAdminReports(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/reports?${query}`);
    }

    async resolveReport(id) {
        return this.request(`/admin/reports/${id}/resolve`, {
            method: 'PUT'
        });
    }

    async dismissReport(id) {
        return this.request(`/admin/reports/${id}/dismiss`, {
            method: 'PUT'
        });
    }

    async getAdminPayments(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/admin/payments?${query}`);
    }

    async getContactMessages(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/contact?${query}`);
    }

    async updateContactMessageStatus(id, status) {
        return this.request(`/contact/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async deleteContactMessage(id) {
        return this.request(`/contact/${id}`, {
            method: 'DELETE'
        });
    }
}

function setupRoutes() {
    router.addRoute('', loadHome);
    router.addRoute('home', loadHome);
    router.addRoute('shop/:username', loadShop);
    router.addRoute('product/:id', loadProduct);
    router.addRoute('favorites', loadFavorites);
    router.addRoute('sell', loadSell);
    router.addRoute('activity', loadActivity);
    router.addRoute('profile', loadProfile);
    router.addRoute('advertise', loadAdvertise);
    router.addRoute('admin', loadAdmin);
    router.addRoute('contact', loadContact);
    router.addRoute('about', loadAbout);
    router.addRoute('privacy-policy', loadPrivacy);
    router.addRoute('terms', loadTerms);
    router.addRoute('login', loadLogin);
    router.addRoute('register', loadRegister);
    router.addRoute('settings', loadSettings);  // <-- ADD THIS LINE
    router.addRoute('*', (path) => {
        showPage(`<div class="container"><h1>404 - Page Not Found</h1><p>The page "${path}" does not exist.</p><a href="/">Go Home</a></div>`);
    });
}

function loadSettings() {
    SettingsPage.render();
}

// Create global instance
const api = new ApiClient();
