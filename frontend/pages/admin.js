const AdminPage = {
    activeTab: 'dashboard',
    users: [],
    products: [],
    advertisements: [],
    reports: [],
    payments: [],
    messages: [],
    categories: [],

    render() {
        if (!App.isAuthenticated || !App.currentUser?.is_admin) {
            showPage(`
                <div class="admin-page">
                    <div class="empty-state">
                        <i class="fas fa-lock"></i>
                        <h3>Admin Access Required</h3>
                        <p>You do not have permission to access this page.</p>
                        <button class="btn btn-primary" onclick="navigateTo('/home')">Go Home</button>
                    </div>
                </div>
            `);
            return;
        }

        showPage(`
            <div class="admin-container">
                <div class="admin-header">
                    <h1>Admin Dashboard</h1>
                    <p>Manage SHINEX marketplace</p>
                </div>
                
                <div class="admin-sidebar">
                    <button class="admin-tab active" data-tab="dashboard">Dashboard</button>
                    <button class="admin-tab" data-tab="users">Users</button>
                    <button class="admin-tab" data-tab="products">Products</button>
                    <button class="admin-tab" data-tab="categories">Categories</button>
                    <button class="admin-tab" data-tab="advertisements">Advertisements</button>
                    <button class="admin-tab" data-tab="reports">Reports</button>
                    <button class="admin-tab" data-tab="payments">Payments</button>
                    <button class="admin-tab" data-tab="messages">Messages</button>
                </div>
                
                <div id="admin-content">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner"></i>
                    </div>
                </div>
            </div>
        `);

        // Setup tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tabName;
                await this.loadTab(tabName);
            });
        });

        // Load initial tab
        this.loadTab('dashboard');
    },

    async loadTab(tab) {
        const content = document.getElementById('admin-content');
        if (!content) return;

        try {
            switch(tab) {
                case 'dashboard':
                    await this.renderDashboard(content);
                    break;
                case 'users':
                    await this.renderUsers(content);
                    break;
                case 'products':
                    await this.renderProducts(content);
                    break;
                case 'categories':
                    await this.renderCategories(content);
                    break;
                case 'advertisements':
                    await this.renderAdvertisements(content);
                    break;
                case 'reports':
                    await this.renderReports(content);
                    break;
                case 'payments':
                    await this.renderPayments(content);
                    break;
                case 'messages':
                    await this.renderMessages(content);
                    break;
                default:
                    content.innerHTML = '<p>Loading...</p>';
            }
        } catch (error) {
            content.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load</h3>
                    <p>${error.message || 'Please try again'}</p>
                </div>
            `;
        }
    },

    async renderDashboard(content) {
        const stats = await api.getAdminStats();
        
        content.innerHTML = `
            <div class="admin-stats">
                <div class="admin-stat-card">
                    <div class="number">${stats.total_users || 0}</div>
                    <div class="label">Total Users</div>
                </div>
                <div class="admin-stat-card">
                    <div class="number">${stats.total_products || 0}</div>
                    <div class="label">Total Products</div>
                </div>
                <div class="admin-stat-card">
                    <div class="number">${stats.total_advertisements || 0}</div>
                    <div class="label">Advertisements</div>
                </div>
                <div class="admin-stat-card">
                    <div class="number">${stats.pending_reports || 0}</div>
                    <div class="label">Pending Reports</div>
                </div>
                <div class="admin-stat-card">
                    <div class="number">${stats.total_payments || 0}</div>
                    <div class="label">Successful Payments</div>
                </div>
            </div>
            
            <div class="admin-quick-actions">
                <h3>Quick Actions</h3>
                <div class="admin-actions-grid">
                    <button class="btn btn-primary" onclick="AdminPage.loadTab('users')">
                        <i class="fas fa-users"></i> Manage Users
                    </button>
                    <button class="btn btn-primary" onclick="AdminPage.loadTab('products')">
                        <i class="fas fa-box"></i> Manage Products
                    </button>
                    <button class="btn btn-primary" onclick="AdminPage.loadTab('advertisements')">
                        <i class="fas fa-ad"></i> Manage Ads
                    </button>
                    <button class="btn btn-primary" onclick="AdminPage.loadTab('reports')">
                        <i class="fas fa-flag"></i> Review Reports
                    </button>
                </div>
            </div>
            
            <div class="admin-recent">
                <h3>Recent Activity</h3>
                <p class="text-muted">Latest activity on the platform will appear here.</p>
            </div>
        `;
    },

    async renderUsers(content) {
        const data = await api.getAdminUsers({ limit: 100 });
        this.users = data.users || [];

        content.innerHTML = `
            <h3>Users (${data.total || this.users.length})</h3>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.users.map(user => `
                            <tr>
                                <td>${escapeHtml(user.full_name)}</td>
                                <td>@${escapeHtml(user.username)}</td>
                                <td>${escapeHtml(user.email)}</td>
                                <td>
                                    <span class="badge ${user.suspended ? 'badge-danger' : 'badge-success'}">
                                        ${user.suspended ? 'Suspended' : 'Active'}
                                    </span>
                                    ${user.is_admin ? '<span class="badge badge-primary">Admin</span>' : ''}
                                </td>
                                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div class="actions">
                                        ${!user.is_admin ? `
                                            ${user.suspended ? 
                                                `<button class="btn btn-sm btn-success" onclick="AdminPage.unsuspendUser('${user.id}')">Unsuspend</button>` :
                                                `<button class="btn btn-sm btn-warning" onclick="AdminPage.suspendUser('${user.id}')">Suspend</button>`
                                            }
                                            <button class="btn btn-sm btn-danger" onclick="AdminPage.deleteUser('${user.id}')">Delete</button>
                                        ` : '<span class="text-muted">Admin</span>'}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderProducts(content) {
        const data = await api.getAdminProducts({ limit: 100 });
        this.products = data.products || [];

        content.innerHTML = `
            <h3>Products (${data.total || this.products.length})</h3>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Seller</th>
                            <th>Status</th>
                            <th>Posted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.products.map(product => `
                            <tr>
                                <td>${escapeHtml(product.name)}</td>
                                <td>${formatPrice(product.price)}</td>
                                <td>${escapeHtml(product.seller?.full_name || 'Unknown')}</td>
                                <td>
                                    <span class="badge badge-${product.status}">${product.status.toUpperCase()}</span>
                                </td>
                                <td>${getTimeAgo(product.created_at)}</td>
                                <td>
                                    <div class="actions">
                                        <button class="btn btn-sm btn-primary" onclick="navigateTo('/product/${product.id}')">View</button>
                                        <button class="btn btn-sm btn-danger" onclick="AdminPage.deleteProduct('${product.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderCategories(content) {
        const data = await api.getAdminCategories();
        this.categories = data.categories || [];

        content.innerHTML = `
            <h3>Categories</h3>
            <div class="admin-add-form">
                <div class="form-group inline-form">
                    <input type="text" id="new-category-name" placeholder="New category name">
                    <button class="btn btn-primary" onclick="AdminPage.addCategory()">Add Category</button>
                </div>
            </div>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.categories.map(cat => `
                            <tr>
                                <td>${escapeHtml(cat.name)}</td>
                                <td>${new Date(cat.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div class="actions">
                                        <button class="btn btn-sm btn-secondary" onclick="AdminPage.editCategory('${cat.id}', '${escapeHtml(cat.name)}')">Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="AdminPage.deleteCategory('${cat.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderAdvertisements(content) {
        const data = await api.getAdminAdvertisements({ limit: 100 });
        this.advertisements = data.advertisements || [];

        content.innerHTML = `
            <h3>Advertisements (${data.total || this.advertisements.length})</h3>
            <div class="admin-toolbar">
                <button class="btn btn-primary" onclick="navigateTo('/advertise')">
                    <i class="fas fa-plus"></i> Create Ad
                </button>
            </div>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>User</th>
                            <th>Package</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.advertisements.map(ad => `
                            <tr>
                                <td>${escapeHtml(ad.title)}</td>
                                <td>${escapeHtml(ad.user?.full_name || 'Unknown')}</td>
                                <td><span class="badge badge-${ad.package}">${ad.package.toUpperCase()}</span></td>
                                <td><span class="badge badge-${ad.status}">${ad.status.toUpperCase()}</span></td>
                                <td><span class="badge badge-${ad.payment_status}">${ad.payment_status.toUpperCase()}</span></td>
                                <td>${ad.expires_at ? new Date(ad.expires_at).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <div class="actions">
                                        ${ad.status === 'pending' && ad.payment_status === 'paid' ? `
                                            <button class="btn btn-sm btn-success" onclick="AdminPage.approveAd('${ad.id}')">Approve</button>
                                            <button class="btn btn-sm btn-danger" onclick="AdminPage.rejectAd('${ad.id}')">Reject</button>
                                        ` : ''}
                                        ${ad.status === 'approved' ? `
                                            <button class="btn btn-sm btn-warning" onclick="AdminPage.pauseAd('${ad.id}')">Pause</button>
                                        ` : ''}
                                        ${ad.status === 'paused' ? `
                                            <button class="btn btn-sm btn-success" onclick="AdminPage.approveAd('${ad.id}')">Resume</button>
                                        ` : ''}
                                        <button class="btn btn-sm btn-danger" onclick="AdminPage.deleteAd('${ad.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderReports(content) {
        const data = await api.getAdminReports({ limit: 100 });
        this.reports = data.reports || [];

        content.innerHTML = `
            <h3>Reports (${data.total || this.reports.length})</h3>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Reason</th>
                            <th>Reporter</th>
                            <th>Status</th>
                            <th>Reported</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.reports.map(report => `
                            <tr>
                                <td><span class="badge badge-info">${report.target_type.toUpperCase()}</span></td>
                                <td>${escapeHtml(report.reason)}</td>
                                <td>${escapeHtml(report.reporter?.full_name || 'Unknown')}</td>
                                <td><span class="badge badge-${report.status}">${report.status.toUpperCase()}</span></td>
                                <td>${getTimeAgo(report.created_at)}</td>
                                <td>
                                    <div class="actions">
                                        ${report.status === 'pending' ? `
                                            <button class="btn btn-sm btn-success" onclick="AdminPage.resolveReport('${report.id}')">Resolve</button>
                                            <button class="btn btn-sm btn-danger" onclick="AdminPage.dismissReport('${report.id}')">Dismiss</button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderPayments(content) {
        const data = await api.getAdminPayments({ limit: 100 });
        this.payments = data.payments || [];

        content.innerHTML = `
            <h3>Payments (${data.total || this.payments.length})</h3>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.payments.map(payment => `
                            <tr>
                                <td><code>${escapeHtml(payment.reference)}</code></td>
                                <td>${escapeHtml(payment.user?.full_name || 'Unknown')}</td>
                                <td>${formatPrice(payment.amount)}</td>
                                <td><span class="badge badge-${payment.status}">${payment.status.toUpperCase()}</span></td>
                                <td>${new Date(payment.created_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderMessages(content) {
        const data = await api.getContactMessages({ limit: 100 });
        this.messages = data.messages || [];

        content.innerHTML = `
            <h3>Contact Messages (${data.total || this.messages.length})</h3>
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Subject</th>
                            <th>Status</th>
                            <th>Received</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.messages.map(msg => `
                            <tr>
                                <td>${escapeHtml(msg.name)}</td>
                                <td>${escapeHtml(msg.email)}</td>
                                <td>${escapeHtml(msg.subject)}</td>
                                <td><span class="badge badge-${msg.status}">${msg.status.toUpperCase()}</span></td>
                                <td>${getTimeAgo(msg.created_at)}</td>
                                <td>
                                    <div class="actions">
                                        <button class="btn btn-sm btn-primary" onclick="AdminPage.viewMessage('${msg.id}')">View</button>
                                        ${msg.status !== 'replied' ? `
                                            <button class="btn btn-sm btn-success" onclick="AdminPage.markReplied('${msg.id}')">Replied</button>
                                        ` : ''}
                                        <button class="btn btn-sm btn-danger" onclick="AdminPage.deleteMessage('${msg.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // ===== USER ACTIONS =====
    async suspendUser(userId) {
        if (!confirm('Suspend this user?')) return;
        try {
            await api.suspendUser(userId);
            showToast('User suspended');
            this.loadTab('users');
        } catch (error) {
            showToast(error.message || 'Failed to suspend user', 'error');
        }
    },

    async unsuspendUser(userId) {
        try {
            await api.unsuspendUser(userId);
            showToast('User unsuspended');
            this.loadTab('users');
        } catch (error) {
            showToast(error.message || 'Failed to unsuspend user', 'error');
        }
    },

    async deleteUser(userId) {
        if (!confirm('Delete this user permanently?')) return;
        try {
            await api.deleteUser(userId);
            showToast('User deleted');
            this.loadTab('users');
        } catch (error) {
            showToast(error.message || 'Failed to delete user', 'error');
        }
    },

    // ===== PRODUCT ACTIONS =====
    async deleteProduct(productId) {
        if (!confirm('Delete this product?')) return;
        try {
            await api.deleteAdminProduct(productId);
            showToast('Product deleted');
            this.loadTab('products');
        } catch (error) {
            showToast(error.message || 'Failed to delete product', 'error');
        }
    },

    // ===== CATEGORY ACTIONS =====
    async addCategory() {
        const input = document.getElementById('new-category-name');
        const name = input?.value.trim();
        if (!name) {
            showToast('Category name is required', 'warning');
            return;
        }
        try {
            await api.createCategory(name);
            showToast('Category added');
            input.value = '';
            this.loadTab('categories');
        } catch (error) {
            showToast(error.message || 'Failed to add category', 'error');
        }
    },

    editCategory(id, currentName) {
        const newName = prompt('Enter new category name:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            api.updateCategory(id, newName.trim())
                .then(() => {
                    showToast('Category updated');
                    this.loadTab('categories');
                })
                .catch(error => showToast(error.message || 'Failed to update category', 'error'));
        }
    },

    async deleteCategory(id) {
        if (!confirm('Delete this category?')) return;
        try {
            await api.deleteCategory(id);
            showToast('Category deleted');
            this.loadTab('categories');
        } catch (error) {
            showToast(error.message || 'Failed to delete category', 'error');
        }
    },

    // ===== ADVERTISEMENT ACTIONS =====
    async approveAd(adId) {
        try {
            await api.approveAdvertisement(adId);
            showToast('Advertisement approved');
            this.loadTab('advertisements');
        } catch (error) {
            showToast(error.message || 'Failed to approve ad', 'error');
        }
    },

    async rejectAd(adId) {
        if (!confirm('Reject this advertisement?')) return;
        try {
            await api.rejectAdvertisement(adId);
            showToast('Advertisement rejected');
            this.loadTab('advertisements');
        } catch (error) {
            showToast(error.message || 'Failed to reject ad', 'error');
        }
    },

    async pauseAd(adId) {
        try {
            await api.pauseAdvertisement(adId);
            showToast('Advertisement paused');
            this.loadTab('advertisements');
        } catch (error) {
            showToast(error.message || 'Failed to pause ad', 'error');
        }
    },

    async deleteAd(adId) {
        if (!confirm('Delete this advertisement?')) return;
        try {
            await api.deleteAdminAdvertisement(adId);
            showToast('Advertisement deleted');
            this.loadTab('advertisements');
        } catch (error) {
            showToast(error.message || 'Failed to delete ad', 'error');
        }
    },

    // ===== REPORT ACTIONS =====
    async resolveReport(reportId) {
        try {
            await api.resolveReport(reportId);
            showToast('Report resolved');
            this.loadTab('reports');
        } catch (error) {
            showToast(error.message || 'Failed to resolve report', 'error');
        }
    },

    async dismissReport(reportId) {
        try {
            await api.dismissReport(reportId);
            showToast('Report dismissed');
            this.loadTab('reports');
        } catch (error) {
            showToast(error.message || 'Failed to dismiss report', 'error');
        }
    },

    // ===== MESSAGE ACTIONS =====
    viewMessage(messageId) {
        const msg = this.messages.find(m => m.id === messageId);
        if (msg) {
            alert(`From: ${msg.name}\nEmail: ${msg.email}\nSubject: ${msg.subject}\n\nMessage:\n${msg.message}`);
            if (msg.status === 'unread') {
                api.updateContactMessageStatus(messageId, 'read');
            }
        }
    },

    async markReplied(messageId) {
        try {
            await api.updateContactMessageStatus(messageId, 'replied');
            showToast('Message marked as replied');
            this.loadTab('messages');
        } catch (error) {
            showToast(error.message || 'Failed to update message', 'error');
        }
    },

    async deleteMessage(messageId) {
        if (!confirm('Delete this message?')) return;
        try {
            await api.deleteContactMessage(messageId);
            showToast('Message deleted');
            this.loadTab('messages');
        } catch (error) {
            showToast(error.message || 'Failed to delete message', 'error');
        }
    }
};