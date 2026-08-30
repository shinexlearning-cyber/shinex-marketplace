// ===== APP STATE =====
const App = {
    currentUser: null,
    isAuthenticated: false,
    page: 'home',
    categories: []
};

// ===== DOM HELPERS =====
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function createElement(tag, className = '', innerHTML = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
}

function showPage(content) {
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
        pageContent.innerHTML = content;
    }
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-container');
    if (!existing) {
        const container = createElement('div', 'toast-container');
        container.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = createElement('div', 'toast');
    toast.style.cssText = `
        background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        margin-top: 0.5rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    toast.textContent = message;
    
    document.querySelector('.toast-container').appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== ROUTE HANDLERS =====
function loadHome(params) {
    HomePage.render(params);
}

function loadShop(params) {
    ShopPage.render(params);
}

function loadProduct(params) {
    ProductPage.render(params);
}

function loadFavorites() {
    FavoritesPage.render();
}

function loadSell() {
    SellPage.render();
}

function loadActivity() {
    ActivityPage.render();
}

function loadProfile() {
    ProfilePage.render();
}

function loadAdvertise() {
    AdvertisePage.render();
}

function loadAdmin() {
    AdminPage.render();
}

function loadContact() {
    ContactPage.render();
}

function loadAbout() {
    AboutPage.render();
}

function loadPrivacy() {
    PrivacyPage.render();
}

function loadTerms() {
    TermsPage.render();
}

function loadLogin() {
    LoginPage.render();
}

function loadRegister() {
    RegisterPage.render();
}

// ===== NAVIGATION =====
function navigateTo(path, params = {}) {
    router.navigate(path, params);
}

// ===== SETUP ROUTES =====
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
    router.addRoute('*', (path) => {
        showPage(`<div class="container"><h1>404 - Page Not Found</h1><p>The page "${path}" does not exist.</p><a href="/">Go Home</a></div>`);
    });
}

// ===== NAVIGATION BUTTONS =====
function setupNavigation() {
    // Desktop nav buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = btn.dataset.page;
            if (page === 'sell') {
                if (!App.isAuthenticated) {
                    showToast('Please login to sell', 'warning');
                    navigateTo('/login');
                    return;
                }
            }
            if (page) {
                navigateTo(`/${page}`);
                // Update active state
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Mobile nav
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('hidden');
        });
    }

    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                navigateTo(`/${page}`);
                mobileNav.classList.add('hidden');
            }
        });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            navigateTo('/home', { search: query });
        }
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// ===== CHECK AUTH =====
async function checkAuth() {
    try {
        const data = await api.getCurrentUser();
        App.currentUser = data.user;
        App.isAuthenticated = true;
        updateNavForAuth(true);
        return data.user;
    } catch (error) {
        App.currentUser = null;
        App.isAuthenticated = false;
        updateNavForAuth(false);
        return null;
    }
}

function updateNavForAuth(isAuth) {
    const navProfile = document.getElementById('nav-profile');
    const sellBtn = document.getElementById('nav-sell');
    
    if (navProfile) {
        if (isAuth) {
            navProfile.innerHTML = `<i class="fas fa-user"></i><span>Profile</span>`;
        } else {
            navProfile.innerHTML = `<i class="fas fa-sign-in-alt"></i><span>Login</span>`;
        }
    }
    
    if (sellBtn) {
        if (!isAuth) {
            sellBtn.style.display = 'flex';
        } else {
            sellBtn.style.display = 'flex';
        }
    }
}

// ===== LOAD CATEGORIES =====
async function loadCategories() {
    try {
        const data = await api.getAdminCategories();
        App.categories = data.categories || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        App.categories = [];
    }
}

// ===== INIT =====
async function init() {
    // Setup routes
    setupRoutes();
    
    // Setup navigation
    setupNavigation();
    
    // Load categories
    await loadCategories();
    
    // Check authentication
    await checkAuth();
    
    // Handle initial route
    const path = window.location.pathname.slice(1) || 'home';
    router.handleRoute(path);
    
    // Handle popstate (browser back/forward)
    window.addEventListener('popstate', () => {
        const path = window.location.pathname.slice(1) || 'home';
        router.handleRoute(path);
    });
    
    // Global error handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled rejection:', event.reason);
        showToast('An unexpected error occurred', 'error');
    });
}

// ===== UTILITY FUNCTIONS =====
function formatPrice(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0
    }).format(amount);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
}

function generateProductCard(product) {
    const firstImage = product.images && product.images.length > 0 ? product.images[0] : '/images/placeholder.jpg';
    const isFavorited = false; // Will be checked later
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${firstImage}" alt="${escapeHtml(product.name)}" loading="lazy">
                <button class="product-favorite-btn ${isFavorited ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleFavorite('product', '${product.id}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-seller">
                    <span>by</span>
                    <a href="/shop/${product.seller?.username || ''}" onclick="event.stopPropagation(); navigateTo('/shop/${product.seller?.username || ''}')">
                        ${escapeHtml(product.seller?.full_name || 'Unknown')}
                    </a>
                </div>
                <div class="product-meta">
                    <span>${escapeHtml(product.location || '')}</span>
                    <span class="product-condition ${product.condition?.toLowerCase() || ''}">${product.condition || ''}</span>
                </div>
            </div>
        </div>
    `;
}

function generateSellerCard(seller) {
    return `
        <div class="seller-card" onclick="navigateTo('/shop/${seller.username}')">
            <div class="avatar">
                <img src="${seller.avatar || '/images/default-avatar.jpg'}" alt="${escapeHtml(seller.full_name)}">
            </div>
            <div class="name">${escapeHtml(seller.full_name)}</div>
            <div class="username">@${escapeHtml(seller.username)}</div>
        </div>
    `;
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);