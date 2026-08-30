const FavoritesPage = {
    favoriteProducts: [],
    favoriteSellers: [],
    activeTab: 'products',

    async render() {
        if (!App.isAuthenticated) {
            showPage(`
                <div class="favorites-page">
                    <div class="empty-state">
                        <i class="fas fa-heart"></i>
                        <h3>Login to see favorites</h3>
                        <p>Please login to view your favorite products and sellers.</p>
                        <button class="btn btn-primary" onclick="navigateTo('/login')">Login</button>
                    </div>
                </div>
            `);
            return;
        }
        
        showPage(`
            <div class="favorites-page">
                <div class="page-header">
                    <h1>My Favorites</h1>
                </div>
                
                <div class="favorites-tabs">
                    <button class="favorites-tab active" data-tab="products">
                        <i class="fas fa-box"></i> Products
                    </button>
                    <button class="favorites-tab" data-tab="sellers">
                        <i class="fas fa-store"></i> Sellers
                    </button>
                </div>
                
                <div class="favorites-content active" id="favorites-products">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner"></i>
                    </div>
                </div>
                
                <div class="favorites-content" id="favorites-sellers">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner"></i>
                    </div>
                </div>
            </div>
        `);
        
        await this.loadFavorites();
        this.setupTabs();
    },

    async loadFavorites() {
        try {
            const data = await api.getFavorites();
            this.favoriteProducts = data.products || [];
            this.favoriteSellers = data.sellers || [];
            
            this.renderProducts();
            this.renderSellers();
        } catch (error) {
            showToast(error.message || 'Failed to load favorites', 'error');
        }
    },

    renderProducts() {
        const container = document.getElementById('favorites-products');
        if (!container) return;
        
        if (this.favoriteProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h3>No favorite products</h3>
                    <p>Start favoriting products you like!</p>
                    <button class="btn btn-primary" onclick="navigateTo('/home')">Browse Products</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="products-grid">
                    ${this.favoriteProducts.map(product => generateProductCard(product)).join('')}
                </div>
            `;
            
            // Add click listeners
            document.querySelectorAll('#favorites-products .product-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.productId;
                    if (id) navigateTo(`/product/${id}`);
                });
            });
            
            // Add favorite listeners
            document.querySelectorAll('#favorites-products .product-favorite-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.product-card');
                    const productId = card?.dataset.productId;
                    if (productId) {
                        toggleFavorite('product', productId);
                    }
                });
            });
        }
    },

    renderSellers() {
        const container = document.getElementById('favorites-sellers');
        if (!container) return;
        
        if (this.favoriteSellers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-store"></i>
                    <h3>No favorite sellers</h3>
                    <p>Start following sellers you like!</p>
                    <button class="btn btn-primary" onclick="navigateTo('/home')">Browse Products</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="sellers-grid">
                    ${this.favoriteSellers.map(seller => generateSellerCard(seller)).join('')}
                </div>
            `;
        }
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.favorites-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show content
                document.querySelectorAll('.favorites-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                const content = document.getElementById(`favorites-${tabName}`);
                if (content) content.classList.add('active');
                
                this.activeTab = tabName;
            });
        });
    }
};