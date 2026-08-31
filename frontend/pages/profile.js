const ProfilePage = {
    user: null,
    products: [],
    advertisements: [],
    activeTab: 'listings',

    async render() {
        if (!App.isAuthenticated) {
            showPage(`
                <div class="profile-page">
                    <div class="empty-state">
                        <i class="fas fa-lock"></i>
                        <h3>Login to view profile</h3>
                        <p>Please login to access your profile.</p>
                        <button class="btn btn-primary" onclick="navigateTo('/login')">Login</button>
                    </div>
                </div>
            `);
            return;
        }

        showPage(`
            <div class="profile-page">
                <div class="loading-spinner">
                    <i class="fas fa-spinner"></i>
                </div>
            </div>
        `);

        try {
            // Get user data
            const userData = await api.getCurrentUser();
            this.user = userData.user;

            // Get products
            const productsData = await api.getSellerProducts(this.user.id);
            this.products = productsData.products || [];

            // Get advertisements
            const adsData = await api.getMyAdvertisements();
            this.advertisements = adsData.advertisements || [];

            this.renderProfile();
        } catch (error) {
            showToast(error.message || 'Failed to load profile', 'error');
        }
    },

    renderProfile() {
        const user = this.user;

        let html = `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <img src="${user.avatar || '/images/default-avatar.jpg'}" alt="${escapeHtml(user.full_name)}">
                        <button class="btn btn-sm btn-secondary" onclick="ProfilePage.changeAvatar()">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div class="profile-info">
                        <h1>${escapeHtml(user.full_name)}</h1>
                        <div class="profile-username">@${escapeHtml(user.username)}</div>
                        ${user.bio ? `<div class="profile-bio">${escapeHtml(user.bio)}</div>` : ''}
                        <div class="profile-meta">
                            ${user.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(user.location)}</span>` : ''}
                            ${user.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(user.phone)}</span>` : ''}
                            ${user.whatsapp ? `<span><i class="fab fa-whatsapp"></i> ${escapeHtml(user.whatsapp)}</span>` : ''}
                            <span><i class="fas fa-calendar"></i> Joined ${new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="btn btn-primary" onclick="navigateTo('/shop/${user.username}')">
                        <i class="fas fa-store"></i> View My Shop
                    </button>
                    <button class="btn btn-secondary" onclick="ProfilePage.shareShop()">
                        <i class="fas fa-share-alt"></i> Share Shop
                    </button>
                    <button class="btn btn-secondary" onclick="navigateTo('/settings')">
                        <i class="fas fa-cog"></i> Settings
                    </button>
                    <button class="btn btn-danger" onclick="ProfilePage.logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>

                <div class="profile-tabs">
                    <button class="profile-tab active" data-tab="listings">
                        <i class="fas fa-box"></i> My Listings (${this.products.length})
                    </button>
                    <button class="profile-tab" data-tab="ads">
                        <i class="fas fa-ad"></i> My Ads (${this.advertisements.length})
                    </button>
                    <button class="profile-tab" data-tab="favorites" onclick="navigateTo('/favorites')">
                        <i class="fas fa-heart"></i> Favorites
                    </button>
                </div>

                <div class="profile-content active" id="profile-listings">
                    ${this.renderListings()}
                </div>

                <div class="profile-content" id="profile-ads">
                    ${this.renderAds()}
                </div>
            </div>
        `;

        showPage(html);

        // Setup tabs
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
                const content = document.getElementById(`profile-${tabName}`);
                if (content) content.classList.add('active');
            });
        });
    },

    renderListings() {
        if (this.products.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No listings yet</h3>
                    <p>Start selling your products!</p>
                    <button class="btn btn-primary" onclick="navigateTo('/sell')">Sell Now</button>
                </div>
            `;
        }

        return `
            <div class="products-grid">
                ${this.products.map(product => `
                    <div class="product-card" onclick="navigateTo('/product/${product.id}')">
                        <div class="product-image">
                            <img src="${product.images?.[0] || '/images/placeholder.jpg'}" alt="${escapeHtml(product.name)}" loading="lazy">
                            <span class="product-status-badge ${product.status}">${product.status.toUpperCase()}</span>
                        </div>
                        <div class="product-info">
                            <div class="product-name">${escapeHtml(product.name)}</div>
                            <div class="product-price">${formatPrice(product.price)}</div>
                            <div class="product-meta">
                                <span>${escapeHtml(product.location || '')}</span>
                                <span class="product-condition ${product.condition?.toLowerCase() || ''}">${product.condition || ''}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderAds() {
        if (this.advertisements.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-ad"></i>
                    <h3>No advertisements</h3>
                    <p>Create an ad to promote your business or services!</p>
                    <button class="btn btn-primary" onclick="navigateTo('/advertise')">Create Ad</button>
                </div>
            `;
        }

        return `
            <div class="ads-grid">
                ${this.advertisements.map(ad => `
                    <div class="ad-card">
                        ${ad.image ? `<img src="${ad.image}" alt="${escapeHtml(ad.title)}" class="ad-image">` : ''}
                        <div class="ad-info">
                            <h4>${escapeHtml(ad.title)}</h4>
                            <p>${escapeHtml(ad.description || '')}</p>
                            <div class="ad-meta">
                                <span class="ad-package ${ad.package}">${ad.package.toUpperCase()}</span>
                                <span class="ad-status ${ad.status}">${ad.status.toUpperCase()}</span>
                                <span class="ad-price">${formatPrice(ad.amount)}</span>
                            </div>
                            <div class="ad-dates">
                                ${ad.expires_at ? `<span>Expires: ${new Date(ad.expires_at).toLocaleDateString()}</span>` : ''}
                                <span>Created: ${getTimeAgo(ad.created_at)}</span>
                            </div>
                            ${ad.status === 'pending' && ad.payment_status === 'paid' ? `
                                <button class="btn btn-sm btn-secondary" disabled>Awaiting Admin Approval</button>
                            ` : ''}
                            ${ad.payment_status === 'unpaid' ? `
                                <button class="btn btn-sm btn-primary" onclick="ProfilePage.payForAd('${ad.id}')">
                                    Pay Now
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async changeAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showToast('Image must be less than 5MB', 'warning');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'shinex_avatars');
                formData.append('cloud_name', 'your_cloudinary_cloud_name');

                const response = await fetch('https://api.cloudinary.com/v1_1/your_cloudinary_cloud_name/image/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.secure_url) {
                    await api.updateProfile({ avatar: data.secure_url });
                    showToast('Profile picture updated!');
                    this.render();
                } else {
                    showToast('Failed to upload image', 'error');
                }
            } catch (error) {
                showToast(error.message || 'Failed to update avatar', 'error');
            }
        };

        input.click();
    },

    async payForAd(adId) {
        try {
            const data = await api.initializePayment(adId);
            if (data.authorization_url) {
                window.open(data.authorization_url, '_blank');
            }
        } catch (error) {
            showToast(error.message || 'Failed to initialize payment', 'error');
        }
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
            navigator.clipboard.writeText(url).then(() => {
                showToast('Shop link copied to clipboard!');
            }).catch(() => {
                prompt('Copy this link to share:', url);
            });
        }
    },

    logout() {
        api.logout();
        App.isAuthenticated = false;
        App.currentUser = null;
        showToast('Logged out successfully');
        navigateTo('/home');
    }
};