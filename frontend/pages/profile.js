// ========================================
// SHINEX MARKETPLACE — PROFILE PAGE
// ========================================

let profileState = {
    user: null,
    loading: true,
    editing: false,
    stats: {
        products: 0,
        favorites: 0,
        ads: 0
    }
};

function profilePage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!isAuthenticated()) {
        router.navigate('/login');
        showToast('Please login to view your profile', 'warning');
        return;
    }

    profileState.loading = true;
    renderProfilePage();
    loadProfile();
}

function renderProfilePage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { user, loading, editing, stats } = profileState;

    if (loading) {
        main.innerHTML = `
            <div class="container page-container">
                <div class="card" style="padding:32px;">
                    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
                        <div class="skeleton" style="width:120px;height:120px;border-radius:50%;"></div>
                        <div style="flex:1;">
                            <div class="skeleton" style="height:32px;width:60%;margin-bottom:8px;"></div>
                            <div class="skeleton" style="height:16px;width:40%;margin-bottom:8px;"></div>
                            <div class="skeleton" style="height:16px;width:80%;margin-bottom:16px;"></div>
                            <div style="display:flex;gap:16px;">
                                <div class="skeleton" style="height:40px;width:100px;"></div>
                                <div class="skeleton" style="height:40px;width:100px;"></div>
                                <div class="skeleton" style="height:40px;width:100px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (!user) {
        main.innerHTML = `
            <div class="container page-container">
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <h3>Profile Not Found</h3>
                    <p>We couldn't find your profile information.</p>
                    <button class="btn btn-primary" onclick="router.navigate('/')">Go Home</button>
                </div>
            </div>
        `;
        return;
    }

    main.innerHTML = `
        <div class="container page-container">
            <!-- Profile Header -->
            <div class="card" style="padding:32px;margin-bottom:24px;">
                <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
                    <div style="position:relative;flex-shrink:0;">
                        <img src="${user.avatar_url || 'assets/images/placeholder.svg'}" 
                             alt="${user.full_name}"
                             style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid var(--primary);"
                             onerror="this.src='assets/images/placeholder.svg'">
                        <button class="btn btn-primary btn-sm" style="position:absolute;bottom:0;right:0;border-radius:50%;width:32px;height:32px;padding:0;" onclick="document.getElementById('avatar-upload').click()">
                            <i class="fas fa-camera"></i>
                        </button>
                        <input type="file" id="avatar-upload" accept="image/*" style="display:none;" onchange="uploadAvatar(event)">
                    </div>
                    <div style="flex:1;">
                        <div class="flex-between flex-wrap" style="gap:12px;">
                            <div>
                                <h1 style="font-size:28px;">${escapeHTML(user.full_name)}</h1>
                                <p style="color:var(--text-secondary);">@${escapeHTML(user.username)}</p>
                            </div>
                            ${!editing ? `
                                <button class="btn btn-outline btn-sm" onclick="toggleProfileEdit()">
                                    <i class="fas fa-edit"></i> Edit Profile
                                </button>
                            ` : ''}
                        </div>
                        ${user.bio ? `<p style="margin-top:8px;color:var(--text-secondary);">${escapeHTML(user.bio)}</p>` : ''}
                        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:12px;font-size:14px;color:var(--text-muted);">
                            ${user.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(user.location)}</span>` : ''}
                            ${user.whatsapp ? `<span><i class="fab fa-whatsapp"></i> ${escapeHTML(user.whatsapp)}</span>` : ''}
                            <span><i class="fas fa-calendar-alt"></i> Joined ${formatDate(user.created_at)}</span>
                        </div>
                        ${user.is_admin ? `<span style="display:inline-block;margin-top:8px;background:var(--primary);color:white;padding:2px 12px;border-radius:50px;font-size:12px;font-weight:600;"><i class="fas fa-crown"></i> Admin</span>` : ''}
                    </div>
                </div>

                <!-- Stats -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:16px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border-color);">
                    <div style="text-align:center;">
                        <div style="font-size:24px;font-weight:800;color:var(--primary);">${stats.products}</div>
                        <div style="font-size:14px;color:var(--text-muted);">Products</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:24px;font-weight:800;color:var(--secondary);">${stats.favorites}</div>
                        <div style="font-size:14px;color:var(--text-muted);">Favorites</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:24px;font-weight:800;color:var(--promo);">${stats.ads}</div>
                        <div style="font-size:14px;color:var(--text-muted);">Advertisements</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:24px;font-weight:800;color:var(--success);">${user.shop_name ? '✓' : '✗'}</div>
                        <div style="font-size:14px;color:var(--text-muted);">Shop Status</div>
                    </div>
                </div>
            </div>

            <!-- Edit Profile Form -->
            ${editing ? `
                <div class="card" style="margin-bottom:24px;">
                    <h3 style="margin-bottom:16px;">Edit Profile</h3>
                    <form id="profile-edit-form" onsubmit="handleProfileUpdate(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-fullname">Full Name</label>
                                <input type="text" id="edit-fullname" value="${escapeHTML(user.full_name)}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-username">Username</label>
                                <input type="text" id="edit-username" value="${escapeHTML(user.username)}" disabled style="opacity:0.6;">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="edit-bio">Bio</label>
                            <textarea id="edit-bio" rows="3">${escapeHTML(user.bio || '')}</textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-location">Location</label>
                                <input type="text" id="edit-location" value="${escapeHTML(user.location || '')}" placeholder="City, State">
                            </div>
                            <div class="form-group">
                                <label for="edit-whatsapp">WhatsApp Number</label>
                                <input type="tel" id="edit-whatsapp" value="${escapeHTML(user.whatsapp || '')}" placeholder="08012345678">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-shopname">Shop Name</label>
                                <input type="text" id="edit-shopname" value="${escapeHTML(user.shop_name || '')}" placeholder="Your shop name">
                            </div>
                            <div class="form-group">
                                <label for="edit-shopdesc">Shop Description</label>
                                <input type="text" id="edit-shopdesc" value="${escapeHTML(user.shop_description || '')}" placeholder="What do you sell?">
                            </div>
                        </div>

                        <div style="display:flex;gap:12px;flex-wrap:wrap;">
                            <button type="submit" class="btn btn-primary" id="profile-update-btn">
                                <i class="fas fa-spinner fa-spin hidden" id="profile-spinner"></i>
                                <span id="profile-update-text">Save Changes</span>
                            </button>
                            <button type="button" class="btn btn-outline" onclick="toggleProfileEdit()">Cancel</button>
                        </div>
                    </form>
                </div>
            ` : ''}

            <!-- Actions -->
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
                <button class="btn btn-primary" onclick="router.navigate('/sell')">
                    <i class="fas fa-plus"></i> Sell Product
                </button>
                <button class="btn btn-secondary" onclick="router.navigate('/advertise')">
                    <i class="fas fa-bullhorn"></i> Advertise
                </button>
                <button class="btn btn-outline" onclick="router.navigate('/activity')">
                    <i class="fas fa-clock"></i> View Activity
                </button>
                <button class="btn btn-danger" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>

            ${user.is_admin ? `
                <div style="margin-top:24px;padding-top:24px;border-top:2px solid var(--border-color);">
                    <h3 style="color:var(--primary);"><i class="fas fa-crown"></i> Admin Dashboard</h3>
                    <p style="margin-bottom:12px;">Access admin controls to manage the marketplace.</p>
                    <button class="btn btn-primary" onclick="router.navigate('/admin')">
                        <i class="fas fa-tachometer-alt"></i> Open Admin Dashboard
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

async function loadProfile() {
    try {
        const response = await api.getMe();
        if (response.success) {
            profileState.user = response.data.user;
            
            // Update localStorage
            localStorage.setItem('user', JSON.stringify(response.data.user));
            AppState.user = response.data.user;
            
            // Get stats
            await loadProfileStats();
        } else {
            showToast('Failed to load profile', 'error');
        }
    } catch (error) {
        console.error('Load profile error:', error);
        showToast('Failed to load profile', 'error');
    }

    profileState.loading = false;
    renderProfilePage();
}

async function loadProfileStats() {
    try {
        // Get product count
        const productResponse = await api.getProducts({ 
            seller: profileState.user?.id,
            page: 1,
            limit: 1
        });
        if (productResponse.success) {
            profileState.stats.products = productResponse.pagination?.total || 0;
        }

        // Get favorites count
        const favResponse = await api.getFavoriteProducts(1, 1);
        if (favResponse.success) {
            profileState.stats.favorites = favResponse.pagination?.total || 0;
        }

        // Get ad count
        const adResponse = await api.getMyAdvertisements(1, 1);
        if (adResponse.success) {
            profileState.stats.ads = adResponse.pagination?.total || 0;
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

function toggleProfileEdit() {
    profileState.editing = !profileState.editing;
    renderProfilePage();
}

async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'warning');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.uploadAvatar(formData);
        if (response.success) {
            showToast('Profile picture updated!', 'success');
            await loadProfile();
        }
    } catch (error) {
        showToast(error.message || 'Failed to upload avatar', 'error');
    }

    event.target.value = '';
}

async function handleProfileUpdate(event) {
    event.preventDefault();

    const full_name = document.getElementById('edit-fullname').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const location = document.getElementById('edit-location').value.trim();
    const whatsapp = document.getElementById('edit-whatsapp').value.trim();
    const shop_name = document.getElementById('edit-shopname').value.trim();
    const shop_description = document.getElementById('edit-shopdesc').value.trim();

    if (!full_name) {
        showToast('Full name is required', 'warning');
        return;
    }

    const btn = document.getElementById('profile-update-btn');
    const spinner = document.getElementById('profile-spinner');
    const text = document.getElementById('profile-update-text');

    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Saving...';

    try {
        const response = await api.updateProfile({
            full_name,
            bio: bio || '',
            location: location || '',
            whatsapp: whatsapp || '',
            shop_name: shop_name || '',
            shop_description: shop_description || ''
        });

        if (response.success) {
            showToast('Profile updated successfully!', 'success');
            profileState.editing = false;
            await loadProfile();
        }
    } catch (error) {
        showToast(error.message || 'Failed to update profile', 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'Save Changes';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuthData();
        AppState.isAuthenticated = false;
        AppState.user = null;
        AppState.isAdmin = false;
        renderHeader();
        renderBottomNav();
        showToast('Logged out successfully', 'info');
        router.navigate('/');
    }
}

// Expose functions globally
window.profilePage = profilePage;
window.toggleProfileEdit = toggleProfileEdit;
window.uploadAvatar = uploadAvatar;
window.handleProfileUpdate = handleProfileUpdate;
window.handleLogout = handleLogout;
