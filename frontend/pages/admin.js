// ========================================
// SHINEX MARKETPLACE — ADMIN DASHBOARD
// ========================================

let adminState = {
    activeSection: 'overview',
    stats: {
        users: 0,
        products: 0,
        ads: 0,
        pendingAds: 0,
        payments: 0,
        reports: 0
    },
    users: [],
    products: [],
    categories: [],
    ads: [],
    durations: [],
    payments: [],
    reports: [],
    messages: [],
    loading: true,
    pagination: {
        users: { page: 1, limit: 20, total: 0, totalPages: 0 },
        products: { page: 1, limit: 20, total: 0, totalPages: 0 },
        ads: { page: 1, limit: 20, total: 0, totalPages: 0 },
        payments: { page: 1, limit: 20, total: 0, totalPages: 0 },
        reports: { page: 1, limit: 20, total: 0, totalPages: 0 },
        messages: { page: 1, limit: 20, total: 0, totalPages: 0 }
    }
};

function adminPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!isAuthenticated()) {
        router.navigate('/login');
        showToast('Please login to access admin', 'warning');
        return;
    }

    // Check if user is admin
    const user = getCurrentUser();
    if (!user?.is_admin) {
        router.navigate('/');
        showToast('Access denied. Admin privileges required.', 'error');
        return;
    }

    renderAdminPage();
    loadAdminData();
}

function renderAdminPage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { activeSection, loading, stats } = adminState;

    main.innerHTML = `
        <div class="container page-container">
            <div class="page-header">
                <h1>Admin Dashboard</h1>
                <p>Manage SHINEX Marketplace</p>
            </div>

            <div style="display:grid;grid-template-columns:200px 1fr;gap:24px;">
                <!-- Sidebar -->
                <div class="card" style="padding:16px;">
                    <nav style="display:flex;flex-direction:column;gap:4px;">
                        ${getAdminNavItems().map(item => `
                            <button class="btn ${activeSection === item.id ? 'btn-primary' : 'btn-outline'}" 
                                    style="width:100%;justify-content:flex-start;${activeSection === item.id ? '' : 'border-color:transparent;'}"
                                    onclick="switchAdminSection('${item.id}')">
                                <i class="fas ${item.icon}"></i> ${item.label}
                                ${item.badge ? `<span style="margin-left:auto;background:var(--promo);color:white;padding:0 8px;border-radius:50px;font-size:11px;">${item.badge}</span>` : ''}
                            </button>
                        `).join('')}
                    </nav>
                </div>

                <!-- Content -->
                <div>
                    ${loading ? renderAdminLoading() : renderAdminContent()}
                </div>
            </div>
        </div>
    `;
}

function getAdminNavItems() {
    const { stats } = adminState;
    return [
        { id: 'overview', label: 'Overview', icon: 'fa-tachometer-alt' },
        { id: 'users', label: 'Users', icon: 'fa-users', badge: stats.users },
        { id: 'products', label: 'Products', icon: 'fa-boxes', badge: stats.products },
        { id: 'categories', label: 'Categories', icon: 'fa-tags' },
        { id: 'ads', label: 'Advertisements', icon: 'fa-bullhorn', badge: stats.pendingAds },
        { id: 'pricing', label: 'Ad Pricing', icon: 'fa-cog' },
        { id: 'payments', label: 'Payments', icon: 'fa-credit-card', badge: stats.payments },
        { id: 'reports', label: 'Reports', icon: 'fa-flag', badge: stats.reports },
        { id: 'contact', label: 'Contact Messages', icon: 'fa-envelope' }
    ];
}

function renderAdminLoading() {
    return `
        <div class="card">
            <div class="skeleton" style="height:200px;width:100%;"></div>
        </div>
    `;
}

function renderAdminContent() {
    const { activeSection } = adminState;

    switch (activeSection) {
        case 'overview': return renderAdminOverview();
        case 'users': return renderAdminUsers();
        case 'products': return renderAdminProducts();
        case 'categories': return renderAdminCategories();
        case 'ads': return renderAdminAds();
        case 'pricing': return renderAdminPricing();
        case 'payments': return renderAdminPayments();
        case 'reports': return renderAdminReports();
        case 'contact': return renderAdminContact();
        default: return '<p>Section not found</p>';
    }
}

// ---------- OVERVIEW ----------
function renderAdminOverview() {
    const { stats } = adminState;
    
    return `
        <div class="admin-stats">
            <div class="stat-card">
                <div class="stat-number">${stats.users}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.products}</div>
                <div class="stat-label">Total Products</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.ads}</div>
                <div class="stat-label">Total Ads</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color:var(--promo);">${stats.pendingAds}</div>
                <div class="stat-label">Pending Approval</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color:var(--success);">${stats.payments}</div>
                <div class="stat-label">Payments</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color:var(--secondary);">${stats.reports}</div>
                <div class="stat-label">Reports</div>
            </div>
        </div>
        <div class="card">
            <p class="text-muted">Welcome to the SHINEX Marketplace Admin Dashboard. Use the sidebar to manage different aspects of the marketplace.</p>
        </div>
    `;
}

// ---------- USERS ----------
function renderAdminUsers() {
    const { users, pagination } = adminState;
    const p = pagination.users;

    if (users.length === 0) {
        return `<div class="card"><p class="text-muted">No users found.</p></div>`;
    }

    return `
        <div class="card">
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                <input type="text" id="admin-user-search" placeholder="Search users..." style="flex:1;min-width:200px;" oninput="adminSearchUsers(this.value)">
                <select id="admin-user-status" onchange="adminFilterUsers(this.value)" style="width:auto;">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">User</th>
                            <th style="padding:8px;">Email</th>
                            <th style="padding:8px;">Phone</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <img src="${user.avatar_url || 'assets/images/placeholder.svg'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
                                        <div>
                                            <div style="font-weight:600;">${escapeHTML(user.full_name)}</div>
                                            <div style="font-size:12px;color:var(--text-muted);">@${escapeHTML(user.username)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style="padding:8px;">${escapeHTML(user.email)}</td>
                                <td style="padding:8px;">${escapeHTML(user.phone || 'N/A')}</td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${user.is_suspended ? '#DC2626' : '#16A34A'};color:white;">
                                        ${user.is_suspended ? 'Suspended' : 'Active'}
                                    </span>
                                    ${user.is_admin ? ' 👑' : ''}
                                </td>
                                <td style="padding:8px;">
                                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                        ${user.is_suspended ? 
                                            `<button class="btn btn-success btn-sm" onclick="adminUnsuspendUser('${user.id}')">Unsuspend</button>` :
                                            `<button class="btn btn-warning btn-sm" onclick="adminSuspendUser('${user.id}')">Suspend</button>`
                                        }
                                        <button class="btn btn-danger btn-sm" onclick="adminDeleteUser('${user.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${p.totalPages > 1 ? `
                <div style="display:flex;justify-content:center;gap:12px;margin-top:16px;">
                    <button class="btn btn-outline btn-sm" onclick="adminUsersPage(${p.page - 1})" ${p.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${p.page} of ${p.totalPages}</span>
                    <button class="btn btn-outline btn-sm" onclick="adminUsersPage(${p.page + 1})" ${p.page >= p.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ---------- PRODUCTS ----------
function renderAdminProducts() {
    const { products, pagination } = adminState;
    const p = pagination.products;

    if (products.length === 0) {
        return `<div class="card"><p class="text-muted">No products found.</p></div>`;
    }

    return `
        <div class="card">
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                <input type="text" id="admin-product-search" placeholder="Search products..." style="flex:1;min-width:200px;" oninput="adminSearchProducts(this.value)">
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">Product</th>
                            <th style="padding:8px;">Price</th>
                            <th style="padding:8px;">Seller</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <img src="${product.primary_image || 'assets/images/placeholder.svg'}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">
                                        <div>
                                            <div style="font-weight:600;">${escapeHTML(product.name)}</div>
                                            <div style="font-size:12px;color:var(--text-muted);">${product.category?.name || 'Uncategorized'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style="padding:8px;font-weight:600;color:var(--success);">${formatCurrency(product.price)}</td>
                                <td style="padding:8px;">${escapeHTML(product.user?.username || 'Unknown')}</td>
                                <td style="padding:8px;">
                                    ${product.is_sold ? 
                                        '<span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:#DC2626;color:white;">Sold</span>' :
                                        '<span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:#16A34A;color:white;">Active</span>'
                                    }
                                </td>
                                <td style="padding:8px;">
                                    <button class="btn btn-primary btn-sm" onclick="router.navigate('/product/${product.id}')">View</button>
                                    <button class="btn btn-danger btn-sm" onclick="adminDeleteProduct('${product.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${p.totalPages > 1 ? `
                <div style="display:flex;justify-content:center;gap:12px;margin-top:16px;">
                    <button class="btn btn-outline btn-sm" onclick="adminProductsPage(${p.page - 1})" ${p.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${p.page} of ${p.totalPages}</span>
                    <button class="btn btn-outline btn-sm" onclick="adminProductsPage(${p.page + 1})" ${p.page >= p.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ---------- CATEGORIES ----------
function renderAdminCategories() {
    const { categories } = adminState;

    return `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                <h3>Manage Categories</h3>
                <button class="btn btn-primary btn-sm" onclick="showAddCategoryModal()">
                    <i class="fas fa-plus"></i> Add Category
                </button>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">Name</th>
                            <th style="padding:8px;">Slug</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categories.map(cat => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;">
                                    ${cat.icon ? `<span style="font-size:20px;">${cat.icon}</span> ` : ''}
                                    ${escapeHTML(cat.name)}
                                </td>
                                <td style="padding:8px;">${escapeHTML(cat.slug)}</td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${cat.is_active ? '#16A34A' : '#DC2626'};color:white;">
                                        ${cat.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style="padding:8px;">
                                    <button class="btn btn-primary btn-sm" onclick="adminEditCategory('${cat.id}')">Edit</button>
                                    <button class="btn btn-danger btn-sm" onclick="adminDeleteCategory('${cat.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ---------- ADS ----------
function renderAdminAds() {
    const { ads, pagination } = adminState;
    const p = pagination.ads;

    if (ads.length === 0) {
        return `<div class="card"><p class="text-muted">No advertisements found.</p></div>`;
    }

    return `
        <div class="card">
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                <select id="admin-ad-status" onchange="adminFilterAds(this.value)" style="width:auto;">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paused">Paused</option>
                </select>
                <select id="admin-ad-payment" onchange="adminFilterAdPayment(this.value)" style="width:auto;">
                    <option value="">All Payment</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                </select>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">Title</th>
                            <th style="padding:8px;">User</th>
                            <th style="padding:8px;">Amount</th>
                            <th style="padding:8px;">Payment</th>
                            <th style="padding:8px;">Approval</th>
                            <th style="padding:8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ads.map(ad => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;font-weight:600;">${escapeHTML(ad.title)}</td>
                                <td style="padding:8px;">${escapeHTML(ad.user?.username || 'Unknown')}</td>
                                <td style="padding:8px;font-weight:600;color:var(--success);">${formatCurrency(ad.amount)}</td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${ad.payment_status === 'paid' ? '#16A34A' : ad.payment_status === 'pending' ? '#EA580C' : '#DC2626'};color:white;">
                                        ${ad.payment_status || 'Pending'}
                                    </span>
                                </td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${ad.approval_status === 'approved' ? '#16A34A' : ad.approval_status === 'pending' ? '#EA580C' : ad.approval_status === 'rejected' ? '#DC2626' : '#9CA3AF'};color:white;">
                                        ${ad.approval_status || 'Pending'}
                                    </span>
                                </td>
                                <td style="padding:8px;">
                                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                        ${ad.approval_status === 'pending' && ad.payment_status === 'paid' ? `
                                            <button class="btn btn-success btn-sm" onclick="adminApproveAd('${ad.id}')">Approve</button>
                                            <button class="btn btn-danger btn-sm" onclick="adminRejectAd('${ad.id}')">Reject</button>
                                        ` : ''}
                                        ${ad.approval_status === 'approved' ? `
                                            <button class="btn btn-warning btn-sm" onclick="adminPauseAd('${ad.id}')">Pause</button>
                                        ` : ''}
                                        ${ad.approval_status === 'paused' ? `
                                            <button class="btn btn-success btn-sm" onclick="adminApproveAd('${ad.id}')">Resume</button>
                                        ` : ''}
                                        <button class="btn btn-danger btn-sm" onclick="adminDeleteAd('${ad.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${p.totalPages > 1 ? `
                <div style="display:flex;justify-content:center;gap:12px;margin-top:16px;">
                    <button class="btn btn-outline btn-sm" onclick="adminAdsPage(${p.page - 1})" ${p.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${p.page} of ${p.totalPages}</span>
                    <button class="btn btn-outline btn-sm" onclick="adminAdsPage(${p.page + 1})" ${p.page >= p.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ---------- PRICING ----------
function renderAdminPricing() {
    const { durations } = adminState;

    return `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                <h3>Advertising Pricing</h3>
                <button class="btn btn-primary btn-sm" onclick="showAddDurationModal()">
                    <i class="fas fa-plus"></i> Add Duration
                </button>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">Duration</th>
                            <th style="padding:8px;">Price</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${durations.map(d => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;font-weight:600;">${d.duration_days} Day${d.duration_days > 1 ? 's' : ''}</td>
                                <td style="padding:8px;font-weight:600;color:var(--success);">${formatCurrency(d.price)}</td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${d.is_active ? '#16A34A' : '#DC2626'};color:white;">
                                        ${d.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style="padding:8px;">
                                    <button class="btn btn-primary btn-sm" onclick="adminEditDuration('${d.id}')">Edit</button>
                                    <button class="btn btn-danger btn-sm" onclick="adminDeleteDuration('${d.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:16px;padding:12px;background:var(--bg-secondary);border-radius:8px;">
                <p style="font-size:14px;color:var(--text-secondary);">
                    <i class="fas fa-info-circle"></i> 
                    These prices are displayed on the public advertise page. Changes affect new advertisements only.
                </p>
            </div>
        </div>
    `;
}

// ---------- PAYMENTS ----------
function renderAdminPayments() {
    const { payments, pagination } = adminState;
    const p = pagination.payments;

    if (payments.length === 0) {
        return `<div class="card"><p class="text-muted">No payments found.</p></div>`;
    }

    return `
        <div class="card">
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                <select id="admin-payment-status" onchange="adminFilterPayments(this.value)" style="width:auto;">
                    <option value="">All Status</option>
                    <option value="success">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                </select>
                <input type="text" id="admin-payment-search" placeholder="Search reference..." style="flex:1;min-width:200px;" oninput="adminSearchPayments(this.value)">
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">Reference</th>
                            <th style="padding:8px;">User</th>
                            <th style="padding:8px;">Amount</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;font-size:12px;font-family:monospace;">${escapeHTML(payment.paystack_reference)}</td>
                                <td style="padding:8px;">${escapeHTML(payment.user?.username || 'Unknown')}</td>
                                <td style="padding:8px;font-weight:600;color:var(--success);">${formatCurrency(payment.amount)}</td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${payment.status === 'success' ? '#16A34A' : payment.status === 'pending' ? '#EA580C' : '#DC2626'};color:white;">
                                        ${payment.status || 'Pending'}
                                    </span>
                                </td>
                                <td style="padding:8px;font-size:12px;">${formatDate(payment.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${p.totalPages > 1 ? `
                <div style="display:flex;justify-content:center;gap:12px;margin-top:16px;">
                    <button class="btn btn-outline btn-sm" onclick="adminPaymentsPage(${p.page - 1})" ${p.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${p.page} of ${p.totalPages}</span>
                    <button class="btn btn-outline btn-sm" onclick="adminPaymentsPage(${p.page + 1})" ${p.page >= p.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ---------- REPORTS ----------
function renderAdminReports() {
    const { reports, pagination } = adminState;
    const p = pagination.reports;

    if (reports.length === 0) {
        return `<div class="card"><p class="text-muted">No reports found.</p></div>`;
    }

    return `
        <div class="card">
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                <select id="admin-report-status" onchange="adminFilterReports(this.value)" style="width:auto;">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                </select>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">Reporter</th>
                            <th style="padding:8px;">Reason</th>
                            <th style="padding:8px;">Target</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.map(report => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;">${escapeHTML(report.reporter?.username || 'Unknown')}</td>
                                <td style="padding:8px;">${escapeHTML(report.reason)}</td>
                                <td style="padding:8px;font-size:12px;">
                                    ${report.target_product ? `Product: ${escapeHTML(report.target_product?.name || 'Unknown')}` : ''}
                                    ${report.target_user ? `User: @${escapeHTML(report.target_user?.username || 'Unknown')}` : ''}
                                    ${report.target_advertisement ? `Ad: ${escapeHTML(report.target_advertisement?.title || 'Unknown')}` : ''}
                                </td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${report.status === 'pending' ? '#EA580C' : report.status === 'resolved' ? '#16A34A' : '#9CA3AF'};color:white;">
                                        ${report.status || 'Pending'}
                                    </span>
                                </td>
                                <td style="padding:8px;">
                                    ${report.status === 'pending' ? `
                                        <button class="btn btn-success btn-sm" onclick="adminResolveReport('${report.id}')">Resolve</button>
                                        <button class="btn btn-outline btn-sm" onclick="adminDismissReport('${report.id}')">Dismiss</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${p.totalPages > 1 ? `
                <div style="display:flex;justify-content:center;gap:12px;margin-top:16px;">
                    <button class="btn btn-outline btn-sm" onclick="adminReportsPage(${p.page - 1})" ${p.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${p.page} of ${p.totalPages}</span>
                    <button class="btn btn-outline btn-sm" onclick="adminReportsPage(${p.page + 1})" ${p.page >= p.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ---------- CONTACT ----------
function renderAdminContact() {
    const { messages, pagination } = adminState;
    const p = pagination.messages;

    if (messages.length === 0) {
        return `<div class="card"><p class="text-muted">No contact messages found.</p></div>`;
    }

    return `
        <div class="card">
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                <select id="admin-msg-status" onchange="adminFilterMessages(this.value)" style="width:auto;">
                    <option value="">All Status</option>
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                </select>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                            <th style="padding:8px;">From</th>
                            <th style="padding:8px;">Subject</th>
                            <th style="padding:8px;">Status</th>
                            <th style="padding:8px;">Date</th>
                            <th style="padding:8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${messages.map(msg => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;">
                                    <div>
                                        <div style="font-weight:600;">${escapeHTML(msg.name)}</div>
                                        <div style="font-size:12px;color:var(--text-muted);">${escapeHTML(msg.email)}</div>
                                    </div>
                                </td>
                                <td style="padding:8px;">${escapeHTML(msg.subject)}</td>
                                <td style="padding:8px;">
                                    <span style="padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;background:${msg.status === 'new' ? '#EA580C' : msg.status === 'read' ? '#4F46E5' : '#16A34A'};color:white;">
                                        ${msg.status || 'New'}
                                    </span>
                                </td>
                                <td style="padding:8px;font-size:12px;">${formatDate(msg.created_at)}</td>
                                <td style="padding:8px;">
                                    <button class="btn btn-primary btn-sm" onclick="adminViewMessage('${msg.id}')">View</button>
                                    <button class="btn btn-success btn-sm" onclick="adminMarkReplied('${msg.id}')">Mark Replied</button>
                                    <button class="btn btn-danger btn-sm" onclick="adminDeleteMessage('${msg.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${p.totalPages > 1 ? `
                <div style="display:flex;justify-content:center;gap:12px;margin-top:16px;">
                    <button class="btn btn-outline btn-sm" onclick="adminMessagesPage(${p.page - 1})" ${p.page <= 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${p.page} of ${p.totalPages}</span>
                    <button class="btn btn-outline btn-sm" onclick="adminMessagesPage(${p.page + 1})" ${p.page >= p.totalPages ? 'disabled' : ''}>Next</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ---------- ADMIN DATA LOADING ----------
async function loadAdminData() {
    adminState.loading = true;
    renderAdminPage();

    try {
        // Load stats
        await loadAdminStats();

        // Load all sections
        await Promise.all([
            loadAdminUsers(),
            loadAdminProducts(),
            loadAdminCategories(),
            loadAdminAds(),
            loadAdminDurations(),
            loadAdminPayments(),
            loadAdminReports(),
            loadAdminMessages()
        ]);

    } catch (error) {
        console.error('Load admin data error:', error);
        showToast('Failed to load admin data', 'error');
    }

    adminState.loading = false;
    renderAdminPage();
}

async function loadAdminStats() {
    try {
        // Users count
        const usersRes = await api.getAdminUsers({ page: 1, limit: 1 });
        if (usersRes.success) adminState.stats.users = usersRes.pagination?.total || 0;

        // Products count
        const productsRes = await api.getAdminProducts({ page: 1, limit: 1 });
        if (productsRes.success) adminState.stats.products = productsRes.pagination?.total || 0;

        // Ads count
        const adsRes = await api.getAdminAdvertisements({ page: 1, limit: 1 });
        if (adsRes.success) {
            adminState.stats.ads = adsRes.pagination?.total || 0;
            // Count pending ads
            const pendingRes = await api.getAdminAdvertisements({ approval: 'pending', page: 1, limit: 1 });
            if (pendingRes.success) adminState.stats.pendingAds = pendingRes.pagination?.total || 0;
        }

        // Payments count
        const paymentsRes = await api.getAdminPayments({ page: 1, limit: 1 });
        if (paymentsRes.success) adminState.stats.payments = paymentsRes.pagination?.total || 0;

        // Reports count
        const reportsRes = await api.getAdminReports({ page: 1, limit: 1 });
        if (reportsRes.success) adminState.stats.reports = reportsRes.pagination?.total || 0;

    } catch (error) {
        console.error('Load admin stats error:', error);
    }
}

async function loadAdminUsers(search = '', status = '', page = 1) {
    try {
        const params = { page, limit: 20 };
        if (search) params.search = search;
        if (status) params.status = status;
        
        const response = await api.getAdminUsers(params);
        if (response.success) {
            adminState.users = response.data || [];
            adminState.pagination.users = response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
        }
    } catch (error) {
        console.error('Load admin users error:', error);
    }
}

async function loadAdminProducts(search = '', page = 1) {
    try {
        const params = { page, limit: 20 };
        if (search) params.search = search;
        
        const response = await api.getAdminProducts(params);
        if (response.success) {
            adminState.products = response.data || [];
            adminState.pagination.products = response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
        }
    } catch (error) {
        console.error('Load admin products error:', error);
    }
}

async function loadAdminCategories() {
    try {
        const response = await api.getAdminCategories();
        if (response.success) {
            adminState.categories = response.data || [];
        }
    } catch (error) {
        console.error('Load admin categories error:', error);
    }
}

async function loadAdminAds(status = '', payment = '', page = 1) {
    try {
        const params = { page, limit: 20 };
        if (status) params.approval = status;
        if (payment) params.payment = payment;
        
        const response = await api.getAdminAdvertisements(params);
        if (response.success) {
            adminState.ads = response.data || [];
            adminState.pagination.ads = response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
        }
    } catch (error) {
        console.error('Load admin ads error:', error);
    }
}

async function loadAdminDurations() {
    try {
        const response = await api.getAdminDurations();
        if (response.success) {
            adminState.durations = response.data || [];
        }
    } catch (error) {
        console.error('Load admin durations error:', error);
    }
}

async function loadAdminPayments(status = '', search = '', page = 1) {
    try {
        const params = { page, limit: 20 };
        if (status) params.status = status;
        if (search) params.search = search;
        
        const response = await api.getAdminPayments(params);
        if (response.success) {
            adminState.payments = response.data || [];
            adminState.pagination.payments = response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
        }
    } catch (error) {
        console.error('Load admin payments error:', error);
    }
}

async function loadAdminReports(status = '', page = 1) {
    try {
        const params = { page, limit: 20 };
        if (status) params.status = status;
        
        const response = await api.getAdminReports(params);
        if (response.success) {
            adminState.reports = response.data || [];
            adminState.pagination.reports = response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
        }
    } catch (error) {
        console.error('Load admin reports error:', error);
    }
}

async function loadAdminMessages(status = '', page = 1) {
    try {
        const params = { page, limit: 20 };
        if (status) params.status = status;
        
        const response = await api.getAdminContactMessages(params);
        if (response.success) {
            adminState.messages = response.data || [];
            adminState.pagination.messages = response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
        }
    } catch (error) {
        console.error('Load admin messages error:', error);
    }
}

// ---------- ADMIN ACTIONS ----------
function switchAdminSection(section) {
    adminState.activeSection = section;
    renderAdminPage();
}

// Users
async function adminSuspendUser(id) {
    const reason = prompt('Enter suspension reason:');
    if (reason === null) return;
    try {
        const response = await api.suspendUser(id, reason || 'No reason provided');
        if (response.success) {
            showToast('User suspended', 'success');
            loadAdminUsers();
        }
    } catch (error) {
        showToast(error.message || 'Failed to suspend user', 'error');
    }
}

async function adminUnsuspendUser(id) {
    if (!confirm('Unsuspend this user?')) return;
    try {
        const response = await api.unsuspendUser(id);
        if (response.success) {
            showToast('User unsuspended', 'success');
            loadAdminUsers();
        }
    } catch (error) {
        showToast(error.message || 'Failed to unsuspend user', 'error');
    }
}

async function adminDeleteUser(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        const response = await api.deleteUser(id);
        if (response.success) {
            showToast('User deleted', 'success');
            loadAdminUsers();
        }
    } catch (error) {
        showToast(error.message || 'Failed to delete user', 'error');
    }
}

function adminSearchUsers(query) {
    loadAdminUsers(query, document.getElementById('admin-user-status')?.value || '');
}

function adminFilterUsers(status) {
    loadAdminUsers(document.getElementById('admin-user-search')?.value || '', status);
}

function adminUsersPage(page) {
    loadAdminUsers(
        document.getElementById('admin-user-search')?.value || '',
        document.getElementById('admin-user-status')?.value || '',
        page
    );
}

// Products
async function adminDeleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
        const response = await api.deleteAdminProduct(id);
        if (response.success) {
            showToast('Product deleted', 'success');
            loadAdminProducts();
        }
    } catch (error) {
        showToast(error.message || 'Failed to delete product', 'error');
    }
}

function adminSearchProducts(query) {
    loadAdminProducts(query);
}

function adminProductsPage(page) {
    loadAdminProducts(document.getElementById('admin-product-search')?.value || '', page);
}

// Categories
function showAddCategoryModal() {
    const name = prompt('Enter category name:');
    if (!name) return;
    const description = prompt('Enter category description (optional):') || '';
    const icon = prompt('Enter emoji icon (optional):') || '';
    
    api.createCategory({ name, description, icon })
        .then(response => {
            if (response.success) {
                showToast('Category created', 'success');
                loadAdminCategories();
            }
        })
        .catch(error => showToast(error.message || 'Failed to create category', 'error'));
}

function adminEditCategory(id) {
    const cat = adminState.categories.find(c => c.id === id);
    if (!cat) return;
    const name = prompt('Category name:', cat.name);
    if (!name) return;
    const description = prompt('Description:', cat.description || '') || '';
    const icon = prompt('Emoji icon:', cat.icon || '') || '';
    const is_active = confirm('Is active? Click OK for Yes, Cancel for No');
    
    api.updateCategory(id, { name, description, icon, is_active })
        .then(response => {
            if (response.success) {
                showToast('Category updated', 'success');
                loadAdminCategories();
            }
        })
        .catch(error => showToast(error.message || 'Failed to update category', 'error'));
}

async function adminDeleteCategory(id) {
    if (!confirm('Delete this category? Only if not in use.')) return;
    try {
        const response = await api.deleteCategory(id);
        if (response.success) {
            showToast('Category deleted', 'success');
            loadAdminCategories();
        }
    } catch (error) {
        showToast(error.message || 'Failed to delete category', 'error');
    }
}

// Ads
async function adminApproveAd(id) {
    try {
        const response = await api.approveAdvertisement(id);
        if (response.success) {
            showToast('Advertisement approved', 'success');
            loadAdminAds();
        }
    } catch (error) {
        showToast(error.message || 'Failed to approve', 'error');
    }
}

async function adminRejectAd(id) {
    const reason = prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
        const response = await api.rejectAdvertisement(id, reason || 'No reason provided');
        if (response.success) {
            showToast('Advertisement rejected', 'success');
            loadAdminAds();
        }
    } catch (error) {
        showToast(error.message || 'Failed to reject', 'error');
    }
}

async function adminPauseAd(id) {
    try {
        const response = await api.pauseAdvertisement(id);
        if (response.success) {
            showToast('Advertisement paused', 'success');
            loadAdminAds();
        }
    } catch (error) {
        showToast(error.message || 'Failed to pause', 'error');
    }
}

async function adminDeleteAd(id) {
    if (!confirm('Delete this advertisement?')) return;
    try {
        const response = await api.deleteAdminAdvertisement(id);
        if (response.success) {
            showToast('Advertisement deleted', 'success');
            loadAdminAds();
        }
    } catch (error) {
        showToast(error.message || 'Failed to delete', 'error');
    }
}

function adminFilterAds(status) {
    loadAdminAds(status, document.getElementById('admin-ad-payment')?.value || '');
}

function adminFilterAdPayment(payment) {
    loadAdminAds(document.getElementById('admin-ad-status')?.value || '', payment);
}

function adminAdsPage(page) {
    loadAdminAds(
        document.getElementById('admin-ad-status')?.value || '',
        document.getElementById('admin-ad-payment')?.value || '',
        page
    );
}

// Durations
function showAddDurationModal() {
    const days = prompt('Enter duration in days:');
    if (!days || isNaN(days) || parseInt(days) < 1) {
        showToast('Please enter a valid number of days', 'warning');
        return;
    }
    const price = prompt('Enter price in Naira:');
    if (!price || isNaN(price) || parseFloat(price) < 0) {
        showToast('Please enter a valid price', 'warning');
        return;
    }
    
    api.createDuration({ duration_days: parseInt(days), price: parseFloat(price) })
        .then(response => {
            if (response.success) {
                showToast('Duration created', 'success');
                loadAdminDurations();
            }
        })
        .catch(error => showToast(error.message || 'Failed to create duration', 'error'));
}

function adminEditDuration(id) {
    const d = adminState.durations.find(dur => dur.id === id);
    if (!d) return;
    const days = prompt('Duration in days:', d.duration_days);
    if (!days || isNaN(days) || parseInt(days) < 1) return;
    const price = prompt('Price in Naira:', d.price);
    if (!price || isNaN(price) || parseFloat(price) < 0) return;
    const is_active = confirm('Is active? Click OK for Yes, Cancel for No');
    
    api.updateDuration(id, { 
        duration_days: parseInt(days), 
        price: parseFloat(price),
        is_active 
    })
        .then(response => {
            if (response.success) {
                showToast('Duration updated', 'success');
                loadAdminDurations();
            }
        })
        .catch(error => showToast(error.message || 'Failed to update duration', 'error'));
}

async function adminDeleteDuration(id) {
    if (!confirm('Delete this duration? Only if not in use.')) return;
    try {
        const response = await api.deleteDuration(id);
        if (response.success) {
            showToast('Duration deleted', 'success');
            loadAdminDurations();
        }
    } catch (error) {
        showToast(error.message || 'Failed to delete duration', 'error');
    }
}

// Payments
function adminFilterPayments(status) {
    loadAdminPayments(status, document.getElementById('admin-payment-search')?.value || '');
}

function adminSearchPayments(query) {
    loadAdminPayments(document.getElementById('admin-payment-status')?.value || '', query);
}

function adminPaymentsPage(page) {
    loadAdminPayments(
        document.getElementById('admin-payment-status')?.value || '',
        document.getElementById('admin-payment-search')?.value || '',
        page
    );
}

// Reports
async function adminResolveReport(id) {
    const notes = prompt('Enter resolution notes:');
    if (notes === null) return;
    try {
        const response = await api.resolveReport(id, notes || 'Resolved by admin');
        if (response.success) {
            showToast('Report resolved', 'success');
            loadAdminReports();
        }
    } catch (error) {
        showToast(error.message || 'Failed to resolve', 'error');
    }
}

async function adminDismissReport(id) {
    const notes = prompt('Enter dismissal notes:');
    if (notes === null) return;
    try {
        const response = await api.dismissReport(id, notes || 'Dismissed by admin');
        if (response.success) {
            showToast('Report dismissed', 'success');
            loadAdminReports();
        }
    } catch (error) {
        showToast(error.message || 'Failed to dismiss', 'error');
    }
}

function adminFilterReports(status) {
    loadAdminReports(status);
}

function adminReportsPage(page) {
    loadAdminReports(document.getElementById('admin-report-status')?.value || '', page);
}

// Messages
function adminViewMessage(id) {
    const msg = adminState.messages.find(m => m.id === id);
    if (!msg) return;
    alert(`From: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone || 'N/A'}\n\nSubject: ${msg.subject}\n\nMessage:\n${msg.message}`);
}

async function adminMarkReplied(id) {
    try {
        const response = await api.updateContactStatus(id, 'replied');
        if (response.success) {
            showToast('Marked as replied', 'success');
            loadAdminMessages();
        }
    } catch (error) {
        showToast(error.message || 'Failed to update status', 'error');
    }
}

async function adminDeleteMessage(id) {
    if (!confirm('Delete this message?')) return;
    try {
        const response = await api.deleteContactMessage(id);
        if (response.success) {
            showToast('Message deleted', 'success');
            loadAdminMessages();
        }
    } catch (error) {
        showToast(error.message || 'Failed to delete', 'error');
    }
}

function adminFilterMessages(status) {
    loadAdminMessages(status);
}

function adminMessagesPage(page) {
    loadAdminMessages(document.getElementById('admin-msg-status')?.value || '', page);
}

// Expose functions globally
window.adminPage = adminPage;
window.switchAdminSection = switchAdminSection;
window.adminSuspendUser = adminSuspendUser;
window.adminUnsuspendUser = adminUnsuspendUser;
window.adminDeleteUser = adminDeleteUser;
window.adminSearchUsers = adminSearchUsers;
window.adminFilterUsers = adminFilterUsers;
window.adminUsersPage = adminUsersPage;
window.adminDeleteProduct = adminDeleteProduct;
window.adminSearchProducts = adminSearchProducts;
window.adminProductsPage = adminProductsPage;
window.showAddCategoryModal = showAddCategoryModal;
window.adminEditCategory = adminEditCategory;
window.adminDeleteCategory = adminDeleteCategory;
window.adminApproveAd = adminApproveAd;
window.adminRejectAd = adminRejectAd;
window.adminPauseAd = adminPauseAd;
window.adminDeleteAd = adminDeleteAd;
window.adminFilterAds = adminFilterAds;
window.adminFilterAdPayment = adminFilterAdPayment;
window.adminAdsPage = adminAdsPage;
window.showAddDurationModal = showAddDurationModal;
window.adminEditDuration = adminEditDuration;
window.adminDeleteDuration = adminDeleteDuration;
window.adminFilterPayments = adminFilterPayments;
window.adminSearchPayments = adminSearchPayments;
window.adminPaymentsPage = adminPaymentsPage;
window.adminResolveReport = adminResolveReport;
window.adminDismissReport = adminDismissReport;
window.adminFilterReports = adminFilterReports;
window.adminReportsPage = adminReportsPage;
window.adminViewMessage = adminViewMessage;
window.adminMarkReplied = adminMarkReplied;
window.adminDeleteMessage = adminDeleteMessage;
window.adminFilterMessages = adminFilterMessages;
window.adminMessagesPage = adminMessagesPage;
