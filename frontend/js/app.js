// ========================================
// SHINEX MARKETPLACE — MAIN APP
// ========================================

// Import API and Router (already loaded via script tags)

// ---------- APP STATE ----------
const AppState = {
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    cartCount: 0,
    favoritesCount: 0
};

// ---------- INITIALIZATION ----------
document.addEventListener('DOMContentLoaded', function() {
    // Apply theme
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);

    // Register routes
    registerRoutes();

    // Initialize router
    router.init();

    // Render header and footer
    renderHeader();
    renderFooter();
    renderBottomNav();

    // Check auth status
    checkAuth();

    // Set up event listeners
    setupEventListeners();
});

// ---------- ROUTE REGISTRATION ----------
function registerRoutes() {
    router
        .add('/', homePage)
        .add('/home', homePage)
        .add('/login', loginPage)
        .add('/register', registerPage)
        .add('/favorites', favoritesPage)
        .add('/sell', sellPage)
        .add('/activity', activityPage)
        .add('/profile', profilePage)
        .add('/settings', settingsPage)
        .add('/advertise', advertisePage)
        .add('/admin', adminPage)
        .add('/contact', contactPage)
        .add('/about', aboutPage)
        .add('/privacy-policy', policyPage)
        .add('/terms', termsPage)
        .add('/shop/:username', shopPage)
        .add('/product/:id', productPage);
}

// ---------- AUTH CHECK ----------
async function checkAuth() {
    const token = getToken();
    if (!token) {
        AppState.isAuthenticated = false;
        AppState.user = null;
        updateUIForAuth();
        return;
    }

    try {
        const response = await api.getMe();
        if (response.success) {
            AppState.user = response.data.user;
            AppState.isAuthenticated = true;
            AppState.isAdmin = response.data.user.is_admin || false;
            localStorage.setItem('user', JSON.stringify(response.data.user));
        } else {
            clearAuthData();
            AppState.isAuthenticated = false;
            AppState.user = null;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        clearAuthData();
        AppState.isAuthenticated = false;
        AppState.user = null;
    }

    updateUIForAuth();
}

// ---------- UI UPDATE ----------
function updateUIForAuth() {
    renderHeader();
    renderBottomNav();
    
    // Update profile link
    const profileLink = document.querySelector('.profile-link');
    if (profileLink) {
        if (AppState.isAuthenticated) {
            profileLink.href = '#profile';
            profileLink.innerHTML = `<i class="fas fa-user"></i> ${AppState.user?.full_name || 'Profile'}`;
        } else {
            profileLink.href = '#login';
            profileLink.innerHTML = `<i class="fas fa-sign-in-alt"></i> Login`;
        }
    }
}

// ---------- HEADER ----------
function renderHeader() {
    const header = document.getElementById('main-header');
    if (!header) return;

    const isAuth = AppState.isAuthenticated;
    const user = AppState.user;

    header.innerHTML = `
        <div class="container">
            <div class="header-inner">
                <div class="logo" onclick="router.navigate('/')">
                    <span>SHINEX</span>
                    <span class="marketplace">Marketplace</span>
                </div>

                <div class="header-search" id="header-search">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" id="search-input" placeholder="What are you looking for?" autocomplete="off">
                </div>

                <div class="header-actions">
                    <button class="btn-icon mobile-search-btn" onclick="toggleMobileSearch()">
                        <i class="fas fa-search"></i>
                    </button>

                    <button class="btn-icon theme-toggle" onclick="toggleThemeAndUpdate()">
                        <i class="fas ${getTheme() === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
                    </button>

                    <a href="#favorites" class="btn-icon">
                        <i class="fas fa-heart"></i>
                    </a>

                    ${isAuth ? `
                        <a href="#sell" class="btn btn-primary btn-sm">
                            <i class="fas fa-plus"></i> Sell
                        </a>
                        <a href="#profile" class="btn-icon profile-link">
                            <i class="fas fa-user"></i>
                        </a>
                    ` : `
                        <a href="#login" class="btn btn-primary btn-sm">Login</a>
                        <a href="#register" class="btn btn-outline btn-sm">Sign Up</a>
                    `}
                </div>
            </div>
        </div>
    `;

    // Set up search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const debouncedSearch = debounce((e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                // Navigate to home with search query
                router.navigate('/');
                // Trigger search in home page
                setTimeout(() => {
                    if (window.searchProducts) {
                        window.searchProducts(query);
                    }
                }, 100);
            }
        }, 400);
        searchInput.addEventListener('input', debouncedSearch);
    }
}

// ---------- FOOTER ----------
function renderFooter() {
    const footer = document.getElementById('main-footer');
    if (!footer) return;

    footer.innerHTML = `
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <h3>SHINEX Marketplace</h3>
                    <p>Buy and sell with confidence. Safe, fast, and reliable.</p>
                </div>
                <div class="footer-links">
                    <h4>Quick Links</h4>
                    <a href="#/about">About</a>
                    <a href="#/contact">Contact</a>
                    <a href="#/favorites">Favorites</a>
                    <a href="#/sell">Sell</a>
                    <a href="#/advertise">Advertise</a>
                </div>
                <div class="footer-links">
                    <h4>Legal</h4>
                    <a href="#/privacy-policy">Privacy Policy</a>
                    <a href="#/terms">Terms & Conditions</a>
                </div>
                <div class="footer-contact">
                    <h4>Contact</h4>
                    <p><i class="fas fa-envelope"></i> shinexlearning@gmail.com</p>
                    <p><i class="fas fa-phone"></i> +234 706 757 4479</p>
                    <p><i class="fab fa-whatsapp"></i> +234 802 505 2852</p>
                </div>
            </div>
            <div class="footer-bottom">
                &copy; ${new Date().getFullYear()} SHINEX Marketplace. All rights reserved.
            </div>
        </div>
    `;
}

// ---------- BOTTOM NAV ----------
function renderBottomNav() {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;

    const isAuth = AppState.isAuthenticated;

    nav.innerHTML = `
        <button class="nav-item ${window.location.hash === '#/' || window.location.hash === '#/home' ? 'active' : ''}" onclick="router.navigate('/')">
            <i class="fas fa-home"></i>
            <span class="nav-label">Home</span>
        </button>
        <button class="nav-item ${window.location.hash === '#/favorites' ? 'active' : ''}" onclick="router.navigate('/favorites')">
            <i class="fas fa-heart"></i>
            <span class="nav-label">Favorites</span>
        </button>
        <button class="nav-item ${window.location.hash === '#/sell' ? 'active' : ''}" onclick="router.navigate('/sell')">
            <i class="fas fa-plus-circle"></i>
            <span class="nav-label">Sell</span>
        </button>
        <button class="nav-item ${window.location.hash === '#/advertise' ? 'active' : ''}" onclick="router.navigate('/advertise')">
            <i class="fas fa-bullhorn"></i>
            <span class="nav-label">Advertise</span>
        </button>
        <button class="nav-item ${window.location.hash === '#/profile' ? 'active' : ''}" onclick="router.navigate('${isAuth ? '/profile' : '/login'}')">
            <i class="fas fa-user"></i>
            <span class="nav-label">${isAuth ? 'Profile' : 'Login'}</span>
        </button>
    `;
}

// ---------- EVENT LISTENERS ----------
function setupEventListeners() {
    // Close mobile search on outside click
    document.addEventListener('click', function(e) {
        const search = document.getElementById('header-search');
        const searchBtn = document.querySelector('.mobile-search-btn');
        if (search && search.classList.contains('mobile-show')) {
            if (!search.contains(e.target) && !searchBtn?.contains(e.target)) {
                search.classList.remove('mobile-show');
            }
        }
    });
}

// ---------- TOGGLE MOBILE SEARCH ----------
function toggleMobileSearch() {
    const search = document.getElementById('header-search');
    if (search) {
        search.classList.toggle('mobile-show');
        if (search.classList.contains('mobile-show')) {
            const input = search.querySelector('input');
            setTimeout(() => input?.focus(), 100);
        }
    }
}

// ---------- TOGGLE THEME ----------
function toggleThemeAndUpdate() {
    const newTheme = toggleTheme();
    // Update header to show correct icon
    renderHeader();
    // Update footer
    renderFooter();
    // Update bottom nav
    renderBottomNav();
    showToast(`Switched to ${newTheme} mode`, 'info', 2000);
}

// ---------- EXPOSE GLOBALLY ----------
window.router = router;
window.api = api;
window.AppState = AppState;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.truncateText = truncateText;
window.toggleMobileSearch = toggleMobileSearch;
window.toggleThemeAndUpdate = toggleThemeAndUpdate;
window.checkAuth = checkAuth;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.clearAuthData = clearAuthData;
