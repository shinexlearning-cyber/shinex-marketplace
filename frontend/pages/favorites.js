// ========================================
// SHINEX MARKETPLACE — FAVORITES PAGE
// ========================================

let favoritesState = {
    activeTab: 'products', // 'products' | 'shops'
    products: [],
    shops: [],
    loading: true,
    pagination: {
        products: { page: 1, limit: 20, total: 0, totalPages: 0 },
        shops: { page: 1, limit: 20, total: 0, totalPages: 0 }
    }
};

function favoritesPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!isAuthenticated()) {
        router.navigate('/login');
        showToast('Please login to view favorites', 'warning');
        return;
    }

    renderFavoritesPage();
    loadFavorites();
}

function renderFavoritesPage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { activeTab, products, shops, loading, pagination } = favoritesState;

    main.innerHTML = `
        <div class="container page-container">
            <div class="page-header">
                <h1>My Favorites</h1>
                <p>Products and shops you've saved</p>
            </div>

            <div class="tabs">
                <button class="tab ${activeTab === 'products' ? 'active' : ''}" onclick="switchFavoritesTab('products')">
                    <i class="fas fa-box"></i> Products (${pagination.products.total || 0})
                </button>
                <button class="tab ${activeTab === 'shops' ? 'active' : ''}" onclick="switchFavoritesTab('shops')">
                    <i class="fas fa-store"></i> Shops (${pagination.shops.total || 0})
                </button>
            </div>

            <div id="favorites-content">
                ${loading ? renderSkeletons() : renderFavoritesContent()}
            </div>
        </div>
    `;
}

function renderSkeletons() {
    return `
        <div class="product-grid">
            ${Array(6).fill().map(() => `
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
    `;
}

function renderFavoritesContent() {
    const { activeTab, products, shops, pagination } = favoritesState;

    if (activeTab === 'products') {
        if (products.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h3>No favorite products</h3>
                    <p>Start saving products you love by clicking the heart icon on any product.</p>
                    <button class="btn btn-primary" onclick="router.navigate('/')">
                        <i class="fas fa-search"></i> Browse Products
                    </button>
                </div>
            `;
        }

        const productsHTML = products.map(item => {
            const product = item.product;
            if (!product) return '';
            return `
                <div class="product-card" onclick="router.navigate('/product/${product.id}')">
                    <div class="image-wrapper">
                        <img src="${product.primary_image || 'assets/images/placeholder.svg'}" 
                             alt="${product.name}"
                             loading="lazy"
                             onerror="this.src='assets/images/placeholder.svg'">
                        ${product.is_sold ? '<span class="sold-badge">SOLD</span>' : ''}
                        <button class="favorite-btn active" onclick="event.stopPropagation(); removeFavorite('product', '${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="product-name">${escapeHTML(product.name)}</div>
                        <div class="product-price">${formatCurrency(product.price)}</div>
                        <div class="product-seller">${product.seller?.shop_name || product.seller?.username || 'Unknown'}</div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="product-grid">${productsHTML}</div>`;

    } else {
        // Shops tab
        if (shops.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-store"></i>
                    <h3>No favorite shops</h3>
                    <p>Follow your favorite sellers to stay updated on their products.</p>
                    <button class="btn btn-primary" onclick="router.navigate('/')">
                        <i class="fas fa-search"></i> Find Sellers
                    </button>
                </div>
            `;
        }

        const shopsHTML = shops.map(item => {
            const seller = item.seller;
            if (!seller) return '';
            return `
                <div class="card" style="cursor:pointer;margin-bottom:12px;" onclick="router.navigate('/shop/${seller.username}')">
                    <div style="display:flex;gap:16px;align-items:center;">
                        <img src="${seller.avatar_url || 'assets/images/placeholder.svg'}" 
                             alt="${seller.shop_name || seller.username}"
                             style="width:60px;height:60px;border-radius:50%;object-fit:cover;"
                             onerror="this.src='assets/images/placeholder.svg'">
                        <div style="flex:1;">
                            <h4>${escapeHTML(seller.shop_name || seller.username)}</h4>
                            <p style="font-size:14px;color:var(--text-muted);">@${escapeHTML(seller.username)}</p>
                            ${seller.bio ? `<p style="font-size:14px;color:var(--text-secondary);">${truncateText(seller.bio, 60)}</p>` : ''}
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); removeFavorite('seller', '${seller.id}')">
                            <i class="fas fa-heart-broken"></i> Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `<div>${shopsHTML}</div>`;
    }
}

async function loadFavorites() {
    favoritesState.loading = true;

    try {
        // Load favorite products
        const productResponse = await api.getFavoriteProducts(
            favoritesState.pagination.products.page,
            favoritesState.pagination.products.limit
        );

        if (productResponse.success) {
            favoritesState.products = productResponse.data || [];
            favoritesState.pagination.products = productResponse.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0
            };
        }

        // Load favorite shops
        const shopResponse = await api.getFavoriteSellers(
            favoritesState.pagination.shops.page,
            favoritesState.pagination.shops.limit
        );

        if (shopResponse.success) {
            favoritesState.shops = shopResponse.data || [];
            favoritesState.pagination.shops = shopResponse.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0
            };
        }

    } catch (error) {
        console.error('Load favorites error:', error);
        showToast('Failed to load favorites', 'error');
    }

    favoritesState.loading = false;
    renderFavoritesPage();
}

function switchFavoritesTab(tab) {
    favoritesState.activeTab = tab;
    renderFavoritesPage();
}

async function removeFavorite(type, id) {
    try {
        let response;
        if (type === 'product') {
            response = await api.unfavoriteProduct(id);
        } else {
            response = await api.unfavoriteSeller(id);
        }

        if (response.success) {
            showToast('Removed from favorites', 'success');
            await loadFavorites();
        }
    } catch (error) {
        showToast(error.message || 'Failed to remove favorite', 'error');
    }
}

// Expose functions globally
window.favoritesPage = favoritesPage;
window.switchFavoritesTab = switchFavoritesTab;
window.removeFavorite = removeFavorite;
window.loadFavorites = loadFavorites;
