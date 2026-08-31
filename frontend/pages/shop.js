// ========================================
// SHINEX MARKETPLACE — SHOP PAGE
// ========================================

let shopState = {
    username: '',
    shop: null,
    products: [],
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    },
    isFavorited: false,
    loading: true
};

async function shopPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    const username = params.username;
    if (!username) {
        router.navigate('/');
        return;
    }

    shopState.username = username;
    shopState.loading = true;
    shopState.shop = null;
    shopState.products = [];
    shopState.isFavorited = false;

    // Show loading
    main.innerHTML = `
        <div class="container page-container">
            <div class="card" style="padding:32px;">
                <div style="display:flex;gap:24px;flex-wrap:wrap;">
                    <div class="skeleton" style="width:120px;height:120px;border-radius:50%;"></div>
                    <div style="flex:1;">
                        <div class="skeleton" style="height:32px;width:60%;margin-bottom:8px;"></div>
                        <div class="skeleton" style="height:16px;width:40%;margin-bottom:8px;"></div>
                        <div class="skeleton" style="height:16px;width:80%;margin-bottom:16px;"></div>
                        <div class="skeleton" style="height:40px;width:200px;"></div>
                    </div>
                </div>
                <div style="margin-top:24px;">
                    <div class="skeleton" style="height:200px;width:100%;"></div>
                </div>
            </div>
        </div>
    `;

    try {
        // Fetch shop data
        const shopResponse = await api.getShop(username, shopState.pagination.page, shopState.pagination.limit);
        
        if (shopResponse.success) {
            shopState.shop = shopResponse.data.shop;
            shopState.products = shopResponse.data.products || [];
            shopState.pagination = shopResponse.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0
            };

            // Check if favorited
            if (isAuthenticated() && shopState.shop) {
                try {
                    // We need to get the user ID from the shop data
                    // Since the shop response doesn't include the user ID directly,
                    // we'll fetch the user profile first
                    const profileResponse = await api.getProfile(username);
                    if (profileResponse.success && profileResponse.data.user) {
                        const favCheck = await api.checkSellerFavorite(profileResponse.data.user.id);
                        if (favCheck.success) {
                            shopState.isFavorited = favCheck.data.is_favorited;
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            }

            renderShopPage();
        } else {
            showToast('Shop not found', 'error');
            router.navigate('/');
        }
    } catch (error) {
        console.error('Shop fetch error:', error);
        showToast('Failed to load shop', 'error');
        router.navigate('/');
    }

    shopState.loading = false;
}

function renderShopPage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { shop, products, pagination, isFavorited } = shopState;
    if (!shop) return;

    // Build products grid
    let productsHTML = '';
    if (products.length === 0) {
        productsHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No products yet</h3>
                <p>This seller hasn't listed any products yet.</p>
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
                </div>
                <div class="card-body">
                    <div class="product-name">${escapeHTML(product.name)}</div>
                    <div class="product-price">${formatCurrency(product.price)}</div>
                    <div class="product-location"><i class="fas fa-map-marker-alt"></i> ${product.location || 'Location not specified'}</div>
                </div>
            </div>
        `).join('');
    }

    // Pagination
    let paginationHTML = '';
    if (pagination.totalPages > 1) {
        paginationHTML = `
            <div class="flex flex-center gap-2" style="margin-top:24px;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="shopChangePage(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span style="color:var(--text-secondary);font-size:14px;">
                    Page ${pagination.page} of ${pagination.totalPages}
                </span>
                <button class="btn btn-outline btn-sm" onclick="shopChangePage(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    main.innerHTML = `
        <div class="container page-container">
            <!-- Shop Header -->
            <div class="card" style="padding:32px;margin-bottom:24px;">
                <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
                    <div style="flex-shrink:0;">
                        <img src="${shop.avatar_url || 'assets/images/placeholder.svg'}" 
                             alt="${shop.shop_name}"
                             style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid var(--primary);"
                             onerror="this.src='assets/images/placeholder.svg'">
                    </div>
                    <div style="flex:1;">
                        <div class="flex-between flex-wrap" style="gap:12px;">
                            <div>
                                <h1 style="font-size:28px;">${escapeHTML(shop.shop_name)}</h1>
                                <p style="color:var(--text-secondary);">@${escapeHTML(shop.username)}</p>
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                <button class="btn ${isFavorited ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="toggleShopFavorite()">
                                    <i class="fas fa-heart"></i> ${isFavorited ? 'Favorited' : 'Favorite Shop'}
                                </button>
                            </div>
                        </div>
                        ${shop.bio ? `<p style="margin-top:8px;color:var(--text-secondary);">${escapeHTML(shop.bio)}</p>` : ''}
                        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:12px;font-size:14px;color:var(--text-muted);">
                            ${shop.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(shop.location)}</span>` : ''}
                            ${shop.product_count !== undefined ? `<span><i class="fas fa-box"></i> ${shop.product_count} products</span>` : ''}
                            ${shop.whatsapp ? `<span><i class="fab fa-whatsapp"></i> <a href="https://wa.me/${shop.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" style="color:var(--secondary);">${escapeHTML(shop.whatsapp)}</a></span>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Products -->
            <h2 style="margin-bottom:16px;">Products</h2>
            <div class="product-grid">
                ${productsHTML}
            </div>

            <!-- Pagination -->
            ${paginationHTML}
        </div>
    `;
}

/**
 * Shop page change page
 */
function shopChangePage(page) {
    const { totalPages } = shopState.pagination;
    if (page < 1 || page > totalPages) return;
    shopState.pagination.page = page;
    shopPage({ username: shopState.username });
}

/**
 * Toggle shop favorite
 */
async function toggleShopFavorite() {
    if (!isAuthenticated()) {
        showToast('Please login to favorite shops', 'warning');
        router.navigate('/login');
        return;
    }

    try {
        // Get user ID from profile
        const profileResponse = await api.getProfile(shopState.username);
        if (!profileResponse.success || !profileResponse.data.user) {
            showToast('Failed to find seller', 'error');
            return;
        }

        const sellerId = profileResponse.data.user.id;
        let response;
        
        if (shopState.isFavorited) {
            response = await api.unfavoriteSeller(sellerId);
        } else {
            response = await api.favoriteSeller(sellerId);
        }

        if (response.success) {
            shopState.isFavorited = !shopState.isFavorited;
            showToast(response.message, 'success');
            renderShopPage();
        }
    } catch (error) {
        showToast(error.message || 'Failed to update favorites', 'error');
    }
}

// Expose functions globally
window.shopPage = shopPage;
window.shopChangePage = shopChangePage;
window.toggleShopFavorite = toggleShopFavorite;
