// ========================================
// SHINEX MARKETPLACE — SETTINGS PAGE
// ========================================

function settingsPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!isAuthenticated()) {
        router.navigate('/login');
        showToast('Please login to access settings', 'warning');
        return;
    }

    const user = getCurrentUser();

    main.innerHTML = `
        <div class="container page-container" style="max-width:600px;">
            <div class="page-header">
                <h1>Settings</h1>
                <p>Manage your account preferences</p>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <h3>Theme Preference</h3>
                <div style="display:flex;gap:12px;margin-top:12px;">
                    <button class="btn ${getTheme() === 'light' ? 'btn-primary' : 'btn-outline'}" onclick="setThemeAndUpdate('light')">
                        <i class="fas fa-sun"></i> Light
                    </button>
                    <button class="btn ${getTheme() === 'dark' ? 'btn-primary' : 'btn-outline'}" onclick="setThemeAndUpdate('dark')">
                        <i class="fas fa-moon"></i> Dark
                    </button>
                </div>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <h3>Account Information</h3>
                <div style="margin-top:12px;">
                    <p><strong>Name:</strong> ${escapeHTML(user?.full_name || 'N/A')}</p>
                    <p><strong>Email:</strong> ${escapeHTML(user?.email || 'N/A')}</p>
                    <p><strong>Username:</strong> @${escapeHTML(user?.username || 'N/A')}</p>
                    <p><strong>Member Since:</strong> ${user?.created_at ? formatDate(user.created_at) : 'N/A'}</p>
                </div>
                <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="router.navigate('/profile')">
                    <i class="fas fa-edit"></i> Edit Profile
                </button>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <h3 style="color:#DC2626;">Danger Zone</h3>
                <div style="margin-top:12px;">
                    <p style="color:var(--text-secondary);font-size:14px;">
                        Once you delete your account, all your data will be permanently removed.
                    </p>
                    <button class="btn btn-danger" onclick="handleDeleteAccount()" style="margin-top:12px;">
                        <i class="fas fa-trash"></i> Delete Account
                    </button>
                </div>
            </div>

            <button class="btn btn-outline btn-block" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
}

function setThemeAndUpdate(theme) {
    setTheme(theme);
    renderHeader();
    renderFooter();
    renderBottomNav();
    settingsPage({});
    showToast(`Switched to ${theme} mode`, 'info', 2000);
}

async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }

    const confirmText = prompt('Type "DELETE" to confirm:');
    if (confirmText !== 'DELETE') {
        showToast('Account deletion cancelled', 'info');
        return;
    }

    try {
        // Note: This endpoint needs to be implemented in the backend
        // For now, we'll show a message
        showToast('Account deletion feature coming soon. Please contact support.', 'info');
    } catch (error) {
        showToast(error.message || 'Failed to delete account', 'error');
    }
}

// Expose functions globally
window.settingsPage = settingsPage;
window.setThemeAndUpdate = setThemeAndUpdate;
window.handleDeleteAccount = handleDeleteAccount;
