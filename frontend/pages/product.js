const ProductPage = {
    product: null,
    isFavorited: false,

    async render(params) {
        const { id } = params;
        
        showPage(`
            <div class="product-page">
                <div class="loading-spinner">
                    <i class="fas fa-spinner"></i>
                </div>
            </div>
        `);
        
        try {
            const data = await api.getProduct(id);
            this.product = data.product;
            
            // Check if favorited
            if (App.isAuthenticated) {
                try {
                    const favData = await api.checkProductFavorite(id);
                    this.isFavorited = favData.favorited;
                } catch (e) {
                    this.isFavorited = false;
                }
            }
            
            this.renderProduct();
        } catch (error) {
            showPage(`
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Product not found</h3>
                    <p>${error.message || 'The product you are looking for does not exist.'}</p>
                    <button class="btn btn-primary" onclick="navigateTo('/home')">Go Home</button>
                </div>
            `);
        }
    },

    renderProduct() {
        const product = this.product;
        const seller = product.seller;
        const images = product.images || [];
        const mainImage = images.length > 0 ? images[0] : '/images/placeholder.jpg';
        const thumbnails = images.slice(1);
        
        let html = `
            <div class="product-detail-container">
                <div class="product-detail-images">
                    <div class="product-detail-main-image">
                        <img id="main-product-image" src="${mainImage}" alt="${escapeHtml(product.name)}">
                    </div>
                    ${images.length > 1 ? `
                        <div class="product-detail-thumbnails">
                            ${images.map((img, index) => `
                                <div class="product-detail-thumbnail ${index === 0 ? 'active' : ''}" onclick="ProductPage.changeImage('${img}', ${index})">
                                    <img src="${img}" alt="Product image ${index + 1}">
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="product-detail-info">
                    <h1>${escapeHtml(product.name)}</h1>
                    <div class="product-detail-price">${formatPrice(product.price)}</div>
                    
                    <div class="product-detail-meta">
                        <div class="product-detail-meta-item">
                            <label>Condition</label>
                            <span class="product-condition ${product.condition?.toLowerCase() || ''}">${product.condition || 'N/A'}</span>
                        </div>
                        <div class="product-detail-meta-item">
                            <label>Location</label>
                            <span>${escapeHtml(product.location || 'Not specified')}</span>
                        </div>
                        <div class="product-detail-meta-item">
                            <label>Category</label>
                            <span>${escapeHtml(product.category?.name || 'Other')}</span>
                        </div>
                        <div class="product-detail-meta-item">
                            <label>Posted</label>
                            <span>${getTimeAgo(product.created_at)}</span>
                        </div>
                        <div class="product-detail-meta-item">
                            <label>Views</label>
                            <span>${product.views || 0}</span>
                        </div>
                        <div class="product-detail-meta-item">
                            <label>Status</label>
                            <span class="product-status ${product.status}">${product.status?.toUpperCase() || 'ACTIVE'}</span>
                        </div>
                    </div>
                    
                    ${product.description ? `
                        <div class="product-detail-description">
                            <h4>Description</h4>
                            <p>${escapeHtml(product.description)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="product-detail-seller">
                        <h4>Seller</h4>
                        <div class="product-seller-info">
                            <img src="${seller?.avatar || '/images/default-avatar.jpg'}" alt="${escapeHtml(seller?.full_name)}" class="seller-avatar">
                            <div>
                                <a href="/shop/${seller?.username}" class="seller-name">${escapeHtml(seller?.full_name || 'Unknown')}</a>
                                <span class="seller-username">@${escapeHtml(seller?.username || '')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="product-detail-actions">
                        ${product.status === 'active' ? `
                            ${seller?.whatsapp ? `
                                <a href="https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}%20on%20SHINEX" 
                                   target="_blank" class="btn btn-success">
                                    <i class="fab fa-whatsapp"></i> Contact Seller
                                </a>
                            ` : `
                                <button class="btn btn-secondary" onclick="showToast('Seller has not provided WhatsApp contact', 'warning')">
                                    <i class="fab fa-whatsapp"></i> No WhatsApp Contact
                                </button>
                            `}
                        ` : `
                            <button class="btn btn-secondary" disabled>${product.status?.toUpperCase() || 'UNAVAILABLE'}</button>
                        `}
                        
                        <button class="btn btn-outline" onclick="navigateTo('/shop/${seller?.username}')">
                            <i class="fas fa-store"></i> Visit Shop
                        </button>
                        
                        <button class="btn ${this.isFavorited ? 'btn-danger' : 'btn-outline'}" 
                                onclick="toggleFavorite('product', '${product.id}')">
                            <i class="fas fa-heart"></i> ${this.isFavorited ? 'Unfavorite' : 'Favorite'}
                        </button>
                        
                        <button class="btn btn-secondary" onclick="ProductPage.openReport()">
                            <i class="fas fa-flag"></i> Report
                        </button>
                    </div>
                    
                    ${App.isAuthenticated && App.currentUser?.id === product.seller_id ? `
                        <div class="product-owner-actions">
                            <h4>Manage Listing</h4>
                            <div class="btn-group">
                                <button class="btn btn-primary" onclick="ProductPage.editProduct()">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-success" onclick="ProductPage.markSold()">
                                    <i class="fas fa-check"></i> Mark as Sold
                                </button>
                                <button class="btn btn-danger" onclick="ProductPage.deleteProduct()">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showPage(html);
        
        // Setup report modal
        this.setupReportModal();
    },

    changeImage(url, index) {
        const mainImage = document.getElementById('main-product-image');
        if (mainImage) {
            mainImage.src = url;
        }
        
        document.querySelectorAll('.product-detail-thumbnail').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });
    },

    openReport() {
        const modal = document.getElementById('report-modal');
        if (modal) {
            document.getElementById('report-target-type').value = 'product';
            document.getElementById('report-target-id').value = this.product?.id || '';
            modal.classList.remove('hidden');
        }
    },

    setupReportModal() {
        const form = document.getElementById('report-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const targetType = document.getElementById('report-target-type').value;
                const targetId = document.getElementById('report-target-id').value;
                const reason = document.getElementById('report-reason').value;
                const details = document.getElementById('report-details').value;
                
                if (!reason) {
                    showToast('Please select a reason', 'warning');
                    return;
                }
                
                try {
                    await api.createReport({
                        target_type: targetType,
                        target_id: targetId,
                        reason,
                        details
                    });
                    
                    showToast('Report submitted successfully');
                    document.getElementById('report-modal').classList.add('hidden');
                    form.reset();
                } catch (error) {
                    showToast(error.message || 'Failed to submit report', 'error');
                }
            };
            
            // Close modal
            const closeBtn = document.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    document.getElementById('report-modal').classList.add('hidden');
                };
            }
            
            // Click outside to close
            const modal = document.getElementById('report-modal');
            if (modal) {
                modal.onclick = (e) => {
                    if (e.target === modal) {
                        modal.classList.add('hidden');
                    }
                };
            }
        }
    },

    async editProduct() {
        // Navigate to sell page with product ID for editing
        const product = this.product;
        if (product) {
            navigateTo('/sell', { edit: product.id });
        }
    },

    async markSold() {
        if (!confirm('Mark this product as sold?')) return;
        
        try {
            await api.updateProduct(this.product.id, { status: 'sold' });
            showToast('Product marked as sold');
            navigateTo(`/product/${this.product.id}`);
        } catch (error) {
            showToast(error.message || 'Failed to update product', 'error');
        }
    },

    async deleteProduct() {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            await api.deleteProduct(this.product.id);
            showToast('Product deleted');
            navigateTo('/home');
        } catch (error) {
            showToast(error.message || 'Failed to delete product', 'error');
        }
    }
};