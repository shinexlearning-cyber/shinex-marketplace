// ========================================
// SHINEX MARKETPLACE — HOME PAGE
// ========================================

let homeState = {
    products: [],
    categories: [],
    advertisements: [],
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    },
    filters: {
        search: '',
        category: '',
        min_price: '',
        max_price: '',
        sort: 'newest'
    },
    loading: true
};

/**
 * Home Page
 */
async function homePage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Show loading
    main.innerHTML = `
        <div class="container page-container">
            <div class="page-header">
                <h1>Welcome to SHINEX Marketplace</h1>
                <p>Discover amazing products from trusted sellers</p>
            </div>
            <div class="product-grid">
                ${Array(8).fill().map(() => `
                    <div class="product-card">
                        <div class="image-wrapper">
                            <div class="skeleton" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
                        </div>
                        <div class="card-body">
                            <div class="skeleton" style="height:16px;width:80%;margin-bottom:8px;"></div>
                            <div class="skeleton" style="height:20px;width:60%;margin-bottom:8px;"></div>
                            <div class="skeleton" style="height:12px;width:50%;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    try {
        // Fetch categories
        const catResponse = await api.getCategories();
        if (catResponse.success) {
            homeState.categories = catResponse.data;
        }

        // Fetch advertisements
        try {
            const adResponse = await api.getMyAdvertisements(1, 10);
            if (adResponse.success) {
                homeState.advertisements = adResponse.data.filter(ad => 
                    ad.approval_status === 'approved' && ad.payment_status === 'paid'
                );
            }
        } catch (e) {
            console.log('No ads available');
        }

        // Fetch products
        await loadProducts();

    } catch (error) {
        console.error('Home page error:', error);
        showToast('Failed to load marketplace. Please try again.', 'error');
        renderEmptyState(main, 'Failed to load products', 'Please check your connection and try again.', true);
    }
}

/**
 * Load products with filters
 */
async function loadProducts() {
    const main = document.getElementById('main-content');
    if (!main) return;

    homeState.loading = true;

    try {
        const params = {
            page: homeState.pagination.page,
            limit: homeState.pagination.limit,
            ...homeState.filters
        };

        // Remove empty filters
        Object.keys(params).forEach(key => {
            if (!params[key]) delete params[key];
        });

        const response = await api.getProducts(params);

        if (response.success) {
            homeState.products = response.data || [];
            homeState.pagination = response.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0
            };
        } else {
            homeState.products = [];
            homeState.pagination.total = 0;
        }

    } catch (error) {
        console.error('Load products error:', error);
        homeState.products = [];
        homeState.pagination.total = 0;
        showToast('Failed to load products', 'error');
    }

    homeState.loading = false;
    renderHomePage();
}

/**
 * Render home page
 */
function renderHomePage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { products, categories, advertisements, pagination, filters } = homeState;

    // Build category filter HTML
    const categoryOptions = categories.map(cat => `
        <option value="${cat.id}" ${filters.category === cat.id ? 'selected' : ''}>
            ${cat.name}
        </option>
    `).join('');

    // Build product grid HTML
    let productsHTML = '';
    if (products.length === 0 && !homeState.loading) {
        productsHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <i class="fas fa-box-open"></i>
                <h3>No products found</h3>
                <p>${filters.search ? `No results for "${filters.search}"` : 'No products available at the moment.'}</p>
                ${filters.search ? `<button class="btn btn-primary" onclick="clearSearch()"><i class="fas fa-times"></i> Clear Search</button>` : ''}
            </div>
        `;
    } else {
        productsHTML = products.map(product => `
            <div class="product-card" onclick="router.navigate('/product/${product.id}')">
                <div class="image-wrapper">
                    <img src="${product.primary_image || 'assets/images/placeholder.svg'}" 
                         alt="${product.name}"
                         loading="lazy"
                         onerror="this.src='assets/images/placeholder.svg'">
                    ${product.is_sold ? '<span class="sold-badge">SOLD</span>' : ''}
                    <button class="favorite-btn ${product.is_favorited ? 'active' : ''}" 
                            onclick="event.stopPropagation(); toggleFavorite('product', '${product.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="card-body">
                    <div class="product-name">${escapeHTML(product.name)}</div>
                    <div class="product-price">${formatCurrency(product.price)}</div>
                    <div class="product-seller">${product.seller?.shop_name || product.seller?.username || 'Unknown seller'}</div>
                    <div class="product-location"><i class="fas fa-map-marker-alt"></i> ${product.location || 'Location not specified'}</div>
                </div>
            </div>
        `).join('');
    }

    // Build pagination
    let paginationHTML = '';
    if (pagination.totalPages > 1) {
        paginationHTML = `
            <div class="flex flex-center gap-2" style="margin-top:24px;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="changePage(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span style="color:var(--text-secondary);font-size:14px;">
                    Page ${pagination.page} of ${pagination.totalPages}
                </span>
                <button class="btn btn-outline btn-sm" onclick="changePage(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    // Build ads section
    let adsHTML = '';
    if (advertisements.length > 0) {
        adsHTML = `
            <div style="margin-bottom:32px;">
                <h2 style="margin-bottom:16px;">Featured Advertisements</h2>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;">
                    ${advertisements.map(ad => `
                        <div class="card" style="cursor:pointer;" onclick="router.navigate('/product/${ad.id}')">
                            <img src="${ad.image_url}" alt="${ad.title}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;">
                            <h4 style="margin-top:8px;">${escapeHTML(ad.title)}</h4>
                            <p style="font-size:14px;color:var(--text-muted);">${escapeHTML(ad.description?.substring(0, 80) || '')}...</p>
                            <span class="badge" style="display:inline-block;background:var(--promo);color:white;padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;">Sponsored</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    main.innerHTML = `
        <div class="container page-container">
            <!-- Advertisements -->
            ${adsHTML}

            <!-- Filters -->
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;align-items:center;">
                <div style="flex:1;min-width:150px;">
                    <select id="category-filter" onchange="applyFilters()" style="width:100%;">
                        <option value="">All Categories</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div style="flex:1;min-width:120px;">
                    <input type="number" id="min-price" placeholder="Min ₦" onchange="applyFilters()" value="${filters.min_price || ''}">
                </div>
                <div style="flex:1;min-width:120px;">
                    <input type="number" id="max-price" placeholder="Max ₦" onchange="applyFilters()" value="${filters.max_price || ''}">
                </div>
                <div style="flex:0 0 auto;">
                    <select id="sort-filter" onchange="applyFilters()" style="width:100%;">
                        <option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>Newest</option>
                        <option value="oldest" ${filters.sort === 'oldest' ? 'selected' : ''}>Oldest</option>
                        <option value="price_low" ${filters.sort === 'price_low' ? 'selected' : ''}>Price: Low to High</option>
                        <option value="price_high" ${filters.sort === 'price_high' ? 'selected' : ''}>Price: High to Low</option>
                    </select>
                </div>
                <button class="btn btn-outline btn-sm" onclick="clearFilters()">
                    <i class="fas fa-times"></i> Clear
                </button>
            </div>

            <!-- Products -->
            <div class="product-grid">
                ${productsHTML}
            </div>

            <!-- Pagination -->
            ${paginationHTML}
        </div>
    `;
}

/**
 * Apply filters
 */
function applyFilters() {
    const category = document.getElementById('category-filter')?.value || '';
    const min_price = document.getElementById('min-price')?.value || '';
    const max_price = document.getElementById('max-price')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || 'newest';

    homeState.filters = {
        ...homeState.filters,
        category,
        min_price,
        max_price,
        sort
    };
    homeState.pagination.page = 1;
    loadProducts();
}

/**
 * Clear filters
 */
function clearFilters() {
    homeState.filters = {
        search: homeState.filters.search || '',
        category: '',
        min_price: '',
        max_price: '',
        sort: 'newest'
    };
    homeState.pagination.page = 1;
    const catFilter = document.getElementById('category-filter');
    const minPrice = document.getElementById('min-price');
    const maxPrice = document.getElementById('max-price');
    const sortFilter = document.getElementById('sort-filter');
    if (catFilter) catFilter.value = '';
    if (minPrice) minPrice.value = '';
    if (maxPrice) maxPrice.value = '';
    if (sortFilter) sortFilter.value = 'newest';
    loadProducts();
}

/**
 * Clear search
 */
function clearSearch() {
    homeState.filters.search = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    homeState.pagination.page = 1;
    loadProducts();
}

/**
 * Change page
 */
function changePage(page) {
    const { totalPages } = homeState.pagination;
    if (page < 1 || page > totalPages) return;
    homeState.pagination.page = page;
    loadProducts();
}

/**
 * Search products (called from header)
 */
function searchProducts(query) {
    homeState.filters.search = query;
    homeState.pagination.page = 1;
    loadProducts();
}

/**
 * Toggle favorite
 */
async function toggleFavorite(type, id) {
    if (!isAuthenticated()) {
        showToast('Please login to favorite items', 'warning');
        router.navigate('/login');
        return;
    }

    try {
        let response;
        if (type === 'product') {
            // Check if already favorited
            const check = await api.checkProductFavorite(id);
            if (check.success && check.data.is_favorited) {
                response = await api.unfavoriteProduct(id);
            } else {
                response = await api.favoriteProduct(id);
            }
        } else if (type === 'seller') {
            const check = await api.checkSellerFavorite(id);
            if (check.success && check.data.is_favorited) {
                response = await api.unfavoriteSeller(id);
            } else {
                response = await api.favoriteSeller(id);
            }
        }

        if (response.success) {
            showToast(response.message, 'success');
            // Refresh product list to update favorite states
            loadProducts();
        }
    } catch (error) {
        showToast(error.message || 'Failed to update favorites', 'error');
    }
}

// Expose functions globally
window.homePage = homePage;
window.loadProducts = loadProducts;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.clearSearch = clearSearch;
window.changePage = changePage;
window.searchProducts = searchProducts;
window.toggleFavorite = toggleFavorite;
