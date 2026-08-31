// ========================================
// SHINEX MARKETPLACE — ACTIVITY PAGE
// ========================================

let activityState = {
    activities: [],
    loading: true,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    }
};

function activityPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!isAuthenticated()) {
        router.navigate('/login');
        showToast('Please login to view your activity', 'warning');
        return;
    }

    renderActivityPage();
    loadActivities();
}

function renderActivityPage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { activities, loading, pagination } = activityState;

    main.innerHTML = `
        <div class="container page-container">
            <div class="page-header">
                <h1>My Activity</h1>
                <p>Your recent marketplace activity</p>
            </div>

            <div id="activity-content">
                ${loading ? renderActivitySkeletons() : renderActivityContent()}
            </div>

            ${!loading && pagination.totalPages > 1 ? `
                <div class="flex flex-center gap-2" style="margin-top:24px;flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" onclick="activityChangePage(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span style="color:var(--text-secondary);font-size:14px;">
                        Page ${pagination.page} of ${pagination.totalPages}
                    </span>
                    <button class="btn btn-outline btn-sm" onclick="activityChangePage(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderActivitySkeletons() {
    return Array(5).fill().map(() => `
        <div class="card" style="margin-bottom:12px;padding:16px;">
            <div style="display:flex;gap:12px;align-items:center;">
                <div class="skeleton" style="width:40px;height:40px;border-radius:50%;"></div>
                <div style="flex:1;">
                    <div class="skeleton" style="height:16px;width:60%;margin-bottom:8px;"></div>
                    <div class="skeleton" style="height:12px;width:40%;"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderActivityContent() {
    const { activities } = activityState;

    if (activities.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h3>No Activity Yet</h3>
                <p>Your activity will appear here when you interact with the marketplace.</p>
                <button class="btn btn-primary" onclick="router.navigate('/')">
                    <i class="fas fa-shopping-bag"></i> Start Shopping
                </button>
            </div>
        `;
    }

    return activities.map(activity => {
        const icon = getActivityIcon(activity.type);
        const color = getActivityColor(activity.type);
        const time = timeAgo(activity.created_at);

        return `
            <div class="card" style="margin-bottom:12px;padding:16px;cursor:pointer;" onclick="${activity.link ? `router.navigate('${activity.link}')` : ''}">
                <div style="display:flex;gap:12px;align-items:flex-start;">
                    <div style="width:40px;height:40px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:600;">${escapeHTML(activity.title)}</div>
                        <div style="font-size:14px;color:var(--text-secondary);">${escapeHTML(activity.description)}</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${time}</div>
                    </div>
                    ${activity.status ? `
                        <span style="font-size:12px;padding:2px 12px;border-radius:50px;background:${getStatusColor(activity.status)};color:white;flex-shrink:0;">
                            ${escapeHTML(activity.status)}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getActivityIcon(type) {
    const icons = {
        'product_created': 'fa-plus-circle',
        'product_updated': 'fa-edit',
        'product_deleted': 'fa-trash',
        'product_sold': 'fa-check-circle',
        'favorite_added': 'fa-heart',
        'favorite_removed': 'fa-heart-broken',
        'ad_created': 'fa-bullhorn',
        'ad_approved': 'fa-check',
        'ad_rejected': 'fa-times',
        'payment_success': 'fa-credit-card',
        'report_submitted': 'fa-flag',
        'report_resolved': 'fa-check-double',
        'login': 'fa-sign-in-alt',
        'profile_updated': 'fa-user-edit',
        'default': 'fa-circle'
    };
    return icons[type] || icons.default;
}

function getActivityColor(type) {
    const colors = {
        'product_created': '#4F46E5',
        'product_updated': '#0D9488',
        'product_deleted': '#DC2626',
        'product_sold': '#16A34A',
        'favorite_added': '#DC2626',
        'favorite_removed': '#9CA3AF',
        'ad_created': '#EA580C',
        'ad_approved': '#16A34A',
        'ad_rejected': '#DC2626',
        'payment_success': '#16A34A',
        'report_submitted': '#EA580C',
        'report_resolved': '#4F46E5',
        'login': '#4F46E5',
        'profile_updated': '#0D9488',
        'default': '#9CA3AF'
    };
    return colors[type] || colors.default;
}

function getStatusColor(status) {
    const colors = {
        'pending': '#EA580C',
        'approved': '#16A34A',
        'rejected': '#DC2626',
        'completed': '#4F46E5',
        'failed': '#DC2626',
        'success': '#16A34A'
    };
    return colors[status?.toLowerCase()] || '#9CA3AF';
}

async function loadActivities() {
    activityState.loading = true;
    renderActivityPage();

    try {
        // Fetch user's products (activity from products)
        const productResponse = await api.getProducts({ 
            seller: getCurrentUser()?.id,
            page: 1,
            limit: 10
        });

        if (productResponse.success) {
            const productActivities = (productResponse.data || []).map(p => ({
                type: p.is_sold ? 'product_sold' : 'product_created',
                title: p.is_sold ? `Sold: ${p.name}` : `Listed: ${p.name}`,
                description: `${formatCurrency(p.price)} • ${p.location || 'Location not specified'}`,
                created_at: p.updated_at || p.created_at,
                status: p.is_sold ? 'Sold' : 'Active',
                link: `/product/${p.id}`
            }));
            activityState.activities = productActivities;
        }

        // Fetch user's advertisements
        try {
            const adResponse = await api.getMyAdvertisements(1, 10);
            if (adResponse.success) {
                const adActivities = (adResponse.data || []).map(ad => ({
                    type: ad.payment_status === 'paid' ? 'payment_success' : 'ad_created',
                    title: `Ad: ${ad.title}`,
                    description: `${formatCurrency(ad.amount)} • ${ad.duration_days} days • ${ad.approval_status}`,
                    created_at: ad.created_at,
                    status: ad.approval_status,
                    link: `/advertise`
                }));
                activityState.activities = [...activityState.activities, ...adActivities];
            }
        } catch (e) {
            // Ignore if no ads
        }

        // Sort by date (newest first)
        activityState.activities.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );

        activityState.pagination.total = activityState.activities.length;
        activityState.pagination.totalPages = Math.ceil(activityState.activities.length / 20);

    } catch (error) {
        console.error('Load activities error:', error);
        showToast('Failed to load activity', 'error');
    }

    activityState.loading = false;
    renderActivityPage();
}

function activityChangePage(page) {
    const { totalPages } = activityState.pagination;
    if (page < 1 || page > totalPages) return;
    activityState.pagination.page = page;
    renderActivityPage();
}

// Expose functions globally
window.activityPage = activityPage;
window.activityChangePage = activityChangePage;
window.loadActivities = loadActivities;
