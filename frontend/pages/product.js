// ========================================
// SHINEX MARKETPLACE — PRODUCT PAGE
// ========================================

let productState = {
    product: null,
    images: [],
    currentImageIndex: 0,
    isFavorited: false,
    loading: true
};

async function productPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    const productId = params.id;
    if (!productId) {
        router.navigate('/');
        return;
    }

    productState.loading = true;
    productState.product = null;
    productState.images = [];
    productState.currentImageIndex = 0;

    // Show loading
    main.innerHTML = `
        <div class="container page-container">
            <div class="card" style="padding:0;overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr 1fr;min-height:400px;">
                    <div style="background:var(--bg-secondary);">
                        <div class="skeleton" style="width:100%;height:400px;"></div>
                    </div>
                    <div style="padding:32px;">
                        <div class="skeleton" style="height:32px;width:70%;margin-bottom:16px;"></div>
                        <div class="skeleton" style="height:28px;width:40%;margin-bottom:16px;"></div>
                        <div class="skeleton" style="height:16px;width:100%;margin-bottom:8px;"></div>
                        <div class="skeleton" style="height:16px;width:90%;margin-bottom:8px;"></div>
                        <div class="skeleton" style="height:16px;width:80%;margin-bottom:24px;"></div>
                        <div class="skeleton" style="height:100px;width:100%;margin-bottom:16px;"></div>
                        <div class="skeleton" style="height:48px;width:100%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const response = await api.getProduct(productId);
        
        if (response.success) {
            productState.product = response.data;
            productState.images = response.data.images || [];
            
            // Check if favorited
            if (isAuthenticated()) {
                try {
                    const favCheck = await api.checkProductFavorite(productId);
                    if (favCheck.success) {
                        productState.isFavorited = favCheck.data.is_favorited;
                    }
                } catch (e) {
                    // Ignore
                }
            }

            renderProductPage();
        } else {
            showToast('Product not found', 'error');
            router.navigate('/');
        }
    } catch (error) {
        console.error('Product fetch error:', error);
        showToast('Failed to load product', 'error');
        router.navigate('/');
    }

    productState.loading = false;
}

function renderProductPage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { product, images, isFavorited } = productState;
    if (!product) return;

    const seller = product.seller || {};
    const primaryImage = product.primary_image || images[0]?.image_url || 'assets/images/placeholder.svg';

    // Gallery navigation
    let galleryHTML = `
        <div style="position:relative;background:var(--bg-secondary);min-height:400px;display:flex;align-items:center;justify-content:center;">
            <img src="${primaryImage}" alt="${product.name}" 
                 style="max-width:100%;max-height:500px;object-fit:contain;"
                 onerror="this.src='assets/images/placeholder.svg'">
        </div>
    `;

    if (images.length > 1) {
        galleryHTML += `
            <div style="display:flex;gap:8px;padding:12px;overflow-x:auto;background:var(--bg-secondary);">
                ${images.map((img, i) => `
                    <img src="${img.image_url}" alt="Thumbnail ${i + 1}"
                         style="width:60px;height:60px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${i === productState.currentImageIndex ? 'var(--primary)' : 'transparent'};"
                         onclick="changeProductImage(${i})">
                `).join('')}
            </div>
        `;
    }

    main.innerHTML = `
        <div class="container page-container">
            <div class="card" style="padding:0;overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <!-- Image Gallery -->
                    <div>
                        ${galleryHTML}
                    </div>

                    <!-- Product Info -->
                    <div style="padding:32px;">
                        <div class="flex-between" style="margin-bottom:8px;">
                            <span style="font-size:14px;color:var(--text-muted);">
                                <a href="#/shop/${seller.username}" style="color:var(--primary);">${seller.shop_name || seller.username || 'Unknown Seller'}</a>
                            </span>
                            <button class="btn-icon" onclick="toggleProductFavorite()" style="font-size:20px;">
                                <i class="fas fa-heart" style="color:${isFavorited ? '#DC2626' : 'var(--text-muted)'};"></i>
                            </button>
                        </div>

                        <h1 style="font-size:28px;margin-bottom:8px;">${escapeHTML(product.name)}</h1>
                        
                        <div class="product-price" style="font-size:32px;font-weight:800;color:var(--success);margin-bottom:16px;">
                            ${formatCurrency(product.price)}
                        </div>

                        ${product.is_sold ? `
                            <div style="background:#DC2626;color:white;padding:8px 16px;border-radius:8px;display:inline-block;font-weight:600;margin-bottom:16px;">
                                SOLD
                            </div>
                        ` : ''}

                        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px;font-size:14px;color:var(--text-secondary);">
                            <span><i class="fas fa-tag"></i> ${product.category?.name || 'Uncategorized'}</span>
                            ${product.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(product.location)}</span>` : ''}
                            <span><i class="fas fa-eye"></i> ${product.views_count || 0} views</span>
                            ${product.condition ? `<span><i class="fas fa-clipboard-check"></i> ${escapeHTML(product.condition)}</span>` : ''}
                        </div>

                        <div style="margin-bottom:24px;">
                            <h4 style="margin-bottom:8px;">Description</h4>
                            <p style="color:var(--text-secondary);line-height:1.8;">${escapeHTML(product.description || 'No description provided.')}</p>
                        </div>

                        <!-- Seller Info -->
                        <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:24px;">
                            <div class="flex-between flex-wrap" style="gap:12px;">
                                <div>
                                    <div style="font-weight:600;">${escapeHTML(seller.full_name || seller.username || 'Unknown')}</div>
                                    <div style="font-size:14px;color:var(--text-muted);">
                                        <i class="fas fa-store"></i> ${seller.shop_name || 'No shop name'}
                                    </div>
                                </div>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    ${seller.whatsapp ? `
                                        <a href="https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}%20on%20SHINEX%20Marketplace." 
                                           target="_blank" 
                                           class="btn btn-secondary btn-sm">
                                            <i class="fab fa-whatsapp"></i> WhatsApp
                                        </a>
                                    ` : ''}
                                    <button class="btn btn-outline btn-sm" onclick="reportProduct('${product.id}')">
                                        <i class="fas fa-flag"></i> Report
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div style="display:flex;gap:12px;flex-wrap:wrap;">
                            ${!product.is_sold ? `
                                <button class="btn btn-success btn-lg" style="flex:1;" onclick="contactSeller('${product.id}')">
                                    <i class="fas fa-shopping-cart"></i> Buy Now
                                </button>
                            ` : ''}
                            <button class="btn btn-outline btn-lg" onclick="window.location.href='#/shop/${seller.username}'">
                                <i class="fas fa-store"></i> Visit Shop
                            </button>
                        </div>

                        ${isAuthenticated() && product.user_id === getCurrentUser()?.id ? `
                            <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--border-color);padding-top:16px;">
                                <button class="btn btn-primary btn-sm" onclick="editProduct('${product.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-outline btn-sm" onclick="toggleSoldStatus('${product.id}')">
                                    <i class="fas fa-${product.is_sold ? 'undo' : 'check-circle'}"></i> 
                                    ${product.is_sold ? 'Mark Available' : 'Mark Sold'}
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Change product image
 */
function changeProductImage(index) {
    if (index >= 0 && index < productState.images.length) {
        productState.currentImageIndex = index;
        renderProductPage();
    }
}

/**
 * Toggle product favorite
 */
async function toggleProductFavorite() {
    if (!isAuthenticated()) {
        showToast('Please login to favorite items', 'warning');
        router.navigate('/login');
        return;
    }

    const productId = productState.product?.id;
    if (!productId) return;

    try {
        let response;
        if (productState.isFavorited) {
            response = await api.unfavoriteProduct(productId);
        } else {
            response = await api.favoriteProduct(productId);
        }

        if (response.success) {
            productState.isFavorited = !productState.isFavorited;
            showToast(response.message, 'success');
            renderProductPage();
        }
    } catch (error) {
        showToast(error.message || 'Failed to update favorites', 'error');
    }
}

/**
 * Contact seller via WhatsApp
 */
function contactSeller(productId) {
    const product = productState.product;
    if (!product) return;

    const seller = product.seller;
    if (!seller?.whatsapp) {
        showToast('Seller has not provided a WhatsApp number', 'warning');
        return;
    }

    const message = `Hi, I'm interested in ${product.name} on SHINEX Marketplace.`;
    const url = `https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

/**
 * Report product
 */
async function reportProduct(productId) {
    if (!isAuthenticated()) {
        showToast('Please login to report items', 'warning');
        router.navigate('/login');
        return;
    }

    const reason = prompt('Please provide a reason for reporting this product:');
    if (!reason) return;

    try {
        const response = await api.createReport({
            target_product_id: productId,
            reason: reason.substring(0, 255),
            description: reason
        });

        if (response.success) {
            showToast('Report submitted successfully. Our team will review it.', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to submit report', 'error');
    }
}

/**
 * Edit product (redirect to sell page with edit mode)
 */
function editProduct(productId) {
    router.navigate(`/sell?edit=${productId}`);
}

/**
 * Toggle sold status
 */
async function toggleSoldStatus(productId) {
    const product = productState.product;
    if (!product) return;

    try {
        const response = await api.markSold(productId, !product.is_sold);
        if (response.success) {
            showToast(response.message, 'success');
            // Refresh product
            const refresh = await api.getProduct(productId);
            if (refresh.success) {
                productState.product = refresh.data;
                renderProductPage();
            }
        }
    } catch (error) {
        showToast(error.message || 'Failed to update status', 'error');
    }
}

/**
 * Delete product
 */
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await api.deleteProduct(productId);
        if (response.success) {
            showToast('Product deleted successfully', 'success');
            router.navigate('/');
        }
    } catch (error) {
        showToast(error.message || 'Failed to delete product', 'error');
    }
}

// Expose functions globally
window.productPage = productPage;
window.changeProductImage = changeProductImage;
window.toggleProductFavorite = toggleProductFavorite;
window.contactSeller = contactSeller;
window.reportProduct = reportProduct;
window.editProduct = editProduct;
window.toggleSoldStatus = toggleSoldStatus;
window.deleteProduct = deleteProduct;
