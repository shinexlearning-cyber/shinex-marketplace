const ShopPage = {
    user: null,
    products: [],
    isFavorited: false,

    async render(params) {
        const { username } = params;
        
        showPage(`
            <div class="shop-page">
                <div class="loading-spinner">
                    <i class="fas fa-spinner"></i>
                </div>
            </div>
        `);
        
        try {
            // Get user data
            const userData = await api.getUser(username);
            this.user = userData.user;
            
            // Get products
            const productsData = await api.getSellerProducts(this.user.id);
            this.products = productsData.products || [];
            
            // Check if favorited
            if (App.isAuthenticated && App.currentUser?.id !== this.user.id) {
                try {
                    const favData = await api.checkSellerFavorite(this.user.id);
                    this.isFavorited = favData.favorited;
                } catch (e) {
                    this.isFavorited = false;
                }
            }
            
            this.renderShop();
        } catch (error) {
            showPage(`
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Shop not found</h3>
                    <p>${error.message || 'This shop does not exist.'}</p>
                    <button class="btn btn-primary" onclick="navigateTo('/home')">Go Home</button>
                </div>
            `);
        }
    },

    renderShop() {
        const user = this.user;
        const isOwner = App.isAuthenticated && App.currentUser?.id === user.id;
        
        let html = `
            <div class="shop-header">
                <div class="shop-avatar">
                    <img src="${user.avatar || '/images/default-avatar.jpg'}" alt="${escapeHtml(user.full_name)}">
                </div>
                <div class="shop-info">
                    <h1>${escapeHtml(user.full_name)}</h1>
                    <div class="shop-username">@${escapeHtml(user.username)}</div>
                    
                    ${user.bio ? `<div class="shop-bio">${escapeHtml(user.bio)}</div>` : ''}
                    
                    <div class="shop-meta">
                        ${user.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(user.location)}</span>` : ''}
                        ${user.whatsapp ? `<span><i class="fab fa-whatsapp"></i> <a href="https://wa.me/${user.whatsapp.replace(/[^0-9]/g, '')}" target="_blank">${escapeHtml(user.whatsapp)}</a></span>` : ''}
                        <span><i class="fas fa-calendar"></i> Joined ${new Date(user.created_at).toLocaleDateString()}</span>
                        <span><i class="fas fa-box"></i> ${this.products.length} products</span>
                    </div>
                    
                    <div class="shop-actions">
                        <button class="btn btn-primary" onclick="navigateTo('/')">
                            <i class="fas fa-store"></i> Browse Products
                        </button>
                        
                        ${!isOwner && App.isAuthenticated ? `
                            <button class="btn ${this.isFavorited ? 'btn-danger' : 'btn-outline'}" 
                                    onclick="toggleFavorite('seller', '${user.id}')">
                                <i class="fas fa-heart"></i> ${this.isFavorited ? 'Unfavorite' : 'Favorite Shop'}
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-secondary" onclick="ShopPage.shareShop()">
                            <i class="fas fa-share-alt"></i> Share Shop
                        </button>
                        
                        ${user.whatsapp ? `
                            <a href="https://wa.me/${user.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-success">
                                <i class="fab fa-whatsapp"></i> Contact
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="shop-products">
                <h2>Products by ${escapeHtml(user.full_name)}</h2>
                ${this.products.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>No products listed</h3>
                        <p>${isOwner ? 'Start selling by posting your first product!' : 'This seller has no products available.'}</p>
                        ${isOwner ? `<button class="btn btn-primary" onclick="navigateTo('/sell')">Sell Now</button>` : ''}
                    </div>
                ` : `
                    <div class="products-grid">
                        ${this.products.map(product => generateProductCard(product)).join('')}
                    </div>
                `}
            </div>
        `;
        
        showPage(html);
        
        // Add click listeners to product cards
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.productId;
                if (id) navigateTo(`/product/${id}`);
            });
        });
        
        // Add favorite listeners to product cards
        document.querySelectorAll('.product-favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.product-card');
                const productId = card?.dataset.productId;
                if (productId) {
                    toggleFavorite('product', productId);
                }
            });
        });
    },

    shareShop() {
        const url = `${window.location.origin}/shop/${this.user.username}`;
        if (navigator.share) {
            navigator.share({
                title: `${this.user.full_name}'s Shop on SHINEX`,
                text: `Check out ${this.user.full_name}'s products on SHINEX!`,
                url: url
            }).catch(() => {});
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(url).then(() => {
                showToast('Shop link copied to clipboard!');
            }).catch(() => {
                // If clipboard not available, show the link
                prompt('Copy this link to share:', url);
            });
        }
    }
};