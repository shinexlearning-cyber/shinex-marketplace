const HomePage = {
    currentPage: 1,
    loading: false,
    hasMore: true,
    products: [],

    async render(params = {}) {
        const { search, category } = params;
        
        let html = `
            <div class="home-page">
                <div class="home-header">
                    <h1>Discover Products</h1>
                    <p>Find amazing products from sellers across the marketplace</p>
                </div>
                
                <div class="home-filters">
                    <div class="filter-group">
                        <label for="category-filter">Category</label>
                        <select id="category-filter" class="filter-select">
                            <option value="">All Categories</option>
                            ${App.categories.map(cat => 
                                `<option value="${cat.id}" ${category === cat.id ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div id="products-container">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner"></i>
                    </div>
                </div>
            </div>
        `;
        
        showPage(html);
        
        // Load products
        this.products = [];
        this.currentPage = 1;
        this.hasMore = true;
        this.loading = false;
        
        await this.loadProducts(search, category);
        
        // Setup filters
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                const selected = categoryFilter.value;
                const currentSearch = document.getElementById('search-input')?.value || '';
                const params = {};
                if (selected) params.category = selected;
                if (currentSearch) params.search = currentSearch;
                navigateTo('/home', params);
            });
        }
        
        // Infinite scroll
        window.addEventListener('scroll', () => {
            const container = document.getElementById('products-container');
            if (!container) return;
            
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 200) {
                if (!this.loading && this.hasMore) {
                    const searchVal = document.getElementById('search-input')?.value || '';
                    this.loadProducts(searchVal, categoryFilter?.value || '');
                }
            }
        });
    },

    async loadProducts(search, category) {
        if (this.loading || !this.hasMore) return;
        
        this.loading = true;
        const container = document.getElementById('products-container');
        
        try {
            const params = {
                limit: 20,
                offset: (this.currentPage - 1) * 20
            };
            
            if (search) params.search = search;
            if (category) params.category = category;
            
            const data = await api.getProducts(params);
            const products = data.products || [];
            
            if (products.length < 20) {
                this.hasMore = false;
            }
            
            this.products = [...this.products, ...products];
            
            // Render products
            if (this.products.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No products found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                `;
            } else {
                const productsHtml = this.products.map(product => generateProductCard(product)).join('');
                container.innerHTML = `
                    <div class="products-grid">${productsHtml}</div>
                    ${this.hasMore ? '<div class="loading-spinner" id="load-more-spinner"><i class="fas fa-spinner"></i></div>' : ''}
                `;
                
                // Add click listeners to product cards
                document.querySelectorAll('.product-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const id = card.dataset.productId;
                        if (id) navigateTo(`/product/${id}`);
                    });
                });
                
                // Add favorite listeners
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
            }
            
            this.currentPage++;
        } catch (error) {
            console.error('Error loading products:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load products</h3>
                    <p>${error.message || 'Please try again later'}</p>
                    <button class="btn btn-primary" onclick="HomePage.loadProducts()">Retry</button>
                </div>
            `;
        } finally {
            this.loading = false;
        }
    }
};

// Global function for toggling favorites
async function toggleFavorite(type, id) {
    if (!App.isAuthenticated) {
        showToast('Please login to favorite', 'warning');
        navigateTo('/login');
        return;
    }
    
    try {
        let result;
        if (type === 'product') {
            result = await api.toggleProductFavorite(id);
        } else if (type === 'seller') {
            result = await api.toggleSellerFavorite(id);
        }
        
        showToast(result.message || 'Favorite updated');
        
        // Refresh current page
        const currentPath = router.getCurrentPath();
        if (currentPath.includes('product')) {
            ProductPage.render({ id: currentPath.split('/').pop() });
        } else if (currentPath.includes('shop')) {
            const username = currentPath.split('/').pop();
            ShopPage.render({ username });
        } else if (currentPath === '/favorites' || currentPath === 'favorites') {
            FavoritesPage.render();
        } else {
            HomePage.render();
        }
    } catch (error) {
        showToast(error.message || 'Failed to update favorite', 'error');
    }
}