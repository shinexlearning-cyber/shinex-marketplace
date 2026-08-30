const ActivityPage = {
    async render() {
        if (!App.isAuthenticated) {
            showPage(`
                <div class="activity-page">
                    <div class="empty-state">
                        <i class="fas fa-bell"></i>
                        <h3>Login to see activity</h3>
                        <p>Please login to view your activity and notifications.</p>
                        <button class="btn btn-primary" onclick="navigateTo('/login')">Login</button>
                    </div>
                </div>
            `);
            return;
        }
        
        // Show loading
        showPage(`
            <div class="activity-page">
                <div class="page-header">
                    <h1>Activity</h1>
                </div>
                <div class="loading-spinner">
                    <i class="fas fa-spinner"></i>
                </div>
            </div>
        `);
        
        try {
            // Get user's activity data
            const [productsData, adsData, reportsData] = await Promise.all([
                api.getSellerProducts(App.currentUser.id),
                api.getMyAdvertisements(),
                api.getMyReports()
            ]);
            
            const products = productsData.products || [];
            const advertisements = adsData.advertisements || [];
            const reports = reportsData.reports || [];
            
            let html = `
                <div class="activity-page">
                    <div class="page-header">
                        <h1>Activity</h1>
                        <p>Your activity on SHINEX</p>
                    </div>
                    
                    <div class="activity-stats">
                        <div class="stat-card">
                            <div class="stat-number">${products.length}</div>
                            <div class="stat-label">Products Listed</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${products.filter(p => p.status === 'sold').length}</div>
                            <div class="stat-label">Products Sold</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${advertisements.filter(a => a.status === 'approved').length}</div>
                            <div class="stat-label">Active Ads</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${reports.length}</div>
                            <div class="stat-label">Reports Filed</div>
                        </div>
                    </div>
                    
                    <div class="activity-section">
                        <h2>My Listings</h2>
                        ${products.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-box-open"></i>
                                <p>You haven't listed any products yet.</p>
                                <button class="btn btn-primary" onclick="navigateTo('/sell')">Start Selling</button>
                            </div>
                        ` : `
                            <div class="activity-list">
                                ${products.slice(0, 10).map(product => `
                                    <div class="activity-item" onclick="navigateTo('/product/${product.id}')">
                                        <img src="${product.images?.[0] || '/images/placeholder.jpg'}" alt="${escapeHtml(product.name)}" class="activity-item-image">
                                        <div class="activity-item-info">
                                            <div class="activity-item-title">${escapeHtml(product.name)}</div>
                                            <div class="activity-item-meta">
                                                <span class="activity-item-price">${formatPrice(product.price)}</span>
                                                <span class="activity-item-status ${product.status}">${product.status.toUpperCase()}</span>
                                                <span class="activity-item-date">${getTimeAgo(product.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${products.length > 10 ? `<div class="activity-more"><a href="/profile">View all in profile</a></div>` : ''}
                            </div>
                        `}
                    </div>
                    
                    <div class="activity-section">
                        <h2>My Advertisements</h2>
                        ${advertisements.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-ad"></i>
                                <p>You haven't created any advertisements yet.</p>
                                <button class="btn btn-primary" onclick="navigateTo('/advertise')">Create Ad</button>
                            </div>
                        ` : `
                            <div class="activity-list">
                                ${advertisements.slice(0, 5).map(ad => `
                                    <div class="activity-item" onclick="navigateTo('/advertise')">
                                        ${ad.image ? `<img src="${ad.image}" alt="${escapeHtml(ad.title)}" class="activity-item-image">` : `<div class="activity-item-icon"><i class="fas fa-ad"></i></div>`}
                                        <div class="activity-item-info">
                                            <div class="activity-item-title">${escapeHtml(ad.title)}</div>
                                            <div class="activity-item-meta">
                                                <span class="activity-item-price">${formatPrice(ad.amount)}</span>
                                                <span class="activity-item-status ${ad.status}">${ad.status.toUpperCase()}</span>
                                                <span class="activity-item-date">${ad.payment_status}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                ${advertisements.length > 5 ? `<div class="activity-more"><a href="/profile">View all in profile</a></div>` : ''}
                            </div>
                        `}
                    </div>
                    
                    <div class="activity-section">
                        <h2>Recent Reports</h2>
                        ${reports.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-flag"></i>
                                <p>You haven't filed any reports.</p>
                            </div>
                        ` : `
                            <div class="activity-list">
                                ${reports.slice(0, 5).map(report => `
                                    <div class="activity-item">
                                        <div class="activity-item-icon"><i class="fas fa-flag"></i></div>
                                        <div class="activity-item-info">
                                            <div class="activity-item-title">Report on ${report.target_type}</div>
                                            <div class="activity-item-meta">
                                                <span class="activity-item-status ${report.status}">${report.status.toUpperCase()}</span>
                                                <span class="activity-item-date">${getTimeAgo(report.created_at)}</span>
                                            </div>
                                            <div class="activity-item-desc">${escapeHtml(report.reason)}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            showPage(html);
        } catch (error) {
            console.error('Error loading activity:', error);
            showPage(`
                <div class="activity-page">
                    <div class="page-header">
                        <h1>Activity</h1>
                    </div>
                    <div class="error-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Failed to load activity</h3>
                        <p>${error.message || 'Please try again later'}</p>
                    </div>
                </div>
            `);
        }
    }
};