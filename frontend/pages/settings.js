const SettingsPage = {
    activeTab: 'profile',

    render() {
        if (!App.isAuthenticated) {
            navigateTo('/login');
            return;
        }

        const user = App.currentUser;

        const html = `
            <div class="settings-page">
                <div class="page-header">
                    <h1>Settings</h1>
                    <p>Manage your account settings</p>
                </div>
                
                <div class="settings-container">
                    <div class="settings-sidebar">
                        <button class="settings-tab active" data-tab="profile">
                            <i class="fas fa-user"></i> Profile
                        </button>
                        <button class="settings-tab" data-tab="security">
                            <i class="fas fa-lock"></i> Security
                        </button>
                        <button class="settings-tab" data-tab="account">
                            <i class="fas fa-cog"></i> Account
                        </button>
                    </div>
                    
                    <div class="settings-content">
                        <div class="settings-panel active" id="settings-profile">
                            <h2>Profile Settings</h2>
                            <form id="profile-settings-form">
                                <div class="form-group">
                                    <label for="settings-fullname">Full Name</label>
                                    <input type="text" id="settings-fullname" value="${escapeHtml(user.full_name || '')}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-bio">Bio</label>
                                    <textarea id="settings-bio" rows="3">${escapeHtml(user.bio || '')}</textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-location">Location</label>
                                    <input type="text" id="settings-location" value="${escapeHtml(user.location || '')}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-phone">Phone Number</label>
                                    <input type="tel" id="settings-phone" value="${escapeHtml(user.phone || '')}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-whatsapp">WhatsApp Number</label>
                                    <input type="tel" id="settings-whatsapp" value="${escapeHtml(user.whatsapp || '')}">
                                    <div class="help-text">Customers will contact you via this WhatsApp number</div>
                                </div>
                                
                                <button type="submit" class="btn btn-primary">Update Profile</button>
                            </form>
                        </div>
                        
                        <div class="settings-panel" id="settings-security">
                            <h2>Security Settings</h2>
                            <form id="security-settings-form">
                                <div class="form-group">
                                    <label for="settings-current-password">Current Password</label>
                                    <input type="password" id="settings-current-password" required placeholder="Enter current password">
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-new-password">New Password</label>
                                    <input type="password" id="settings-new-password" required placeholder="Minimum 6 characters" minlength="6">
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-confirm-password">Confirm New Password</label>
                                    <input type="password" id="settings-confirm-password" required placeholder="Confirm new password">
                                </div>
                                
                                <button type="submit" class="btn btn-primary">Change Password</button>
                            </form>
                        </div>
                        
                        <div class="settings-panel" id="settings-account">
                            <h2>Account Settings</h2>
                            
                            <div class="settings-section">
                                <h3>Account Information</h3>
                                <p><strong>Username:</strong> @${escapeHtml(user.username)}</p>
                                <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
                                <p><strong>Account Type:</strong> ${user.is_admin ? 'Administrator' : 'User'}</p>
                                <p><strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                            
                            <div class="settings-section danger-zone">
                                <h3>Danger Zone</h3>
                                <p>Deleting your account is permanent and cannot be undone.</p>
                                <button class="btn btn-danger" onclick="SettingsPage.deleteAccount()">
                                    <i class="fas fa-trash"></i> Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        showPage(html);
        this.setupTabs();
        this.setupProfileForm();
        this.setupSecurityForm();
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById(`settings-${tabName}`);
                if (panel) panel.classList.add('active');
                this.activeTab = tabName;
            });
        });
    },

    setupProfileForm() {
        const form = document.getElementById('profile-settings-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                const full_name = document.getElementById('settings-fullname').value.trim();
                const bio = document.getElementById('settings-bio').value.trim();
                const location = document.getElementById('settings-location').value.trim();
                const phone = document.getElementById('settings-phone').value.trim();
                const whatsapp = document.getElementById('settings-whatsapp').value.trim();
                
                try {
                    await api.updateProfile({ full_name, bio, location, phone, whatsapp });
                    showToast('Profile updated successfully!');
                    App.currentUser = { ...App.currentUser, full_name, bio, location, phone, whatsapp };
                } catch (error) {
                    showToast(error.message || 'Failed to update profile', 'error');
                }
            };
        }
    },

    setupSecurityForm() {
        const form = document.getElementById('security-settings-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                const current_password = document.getElementById('settings-current-password').value;
                const new_password = document.getElementById('settings-new-password').value;
                const confirm_password = document.getElementById('settings-confirm-password').value;
                
                if (!current_password || !new_password || !confirm_password) {
                    showToast('All fields are required', 'warning');
                    return;
                }
                
                if (new_password.length < 6) {
                    showToast('New password must be at least 6 characters', 'warning');
                    return;
                }
                
                if (new_password !== confirm_password) {
                    showToast('Passwords do not match', 'warning');
                    return;
                }
                
                try {
                    await api.changePassword({ current_password, new_password });
                    showToast('Password changed successfully!');
                    form.reset();
                } catch (error) {
                    showToast(error.message || 'Failed to change password', 'error');
                }
            };
        }
    },

    async deleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
            return;
        }
        
        if (!confirm('All your listings, favorites, and data will be permanently deleted. Continue?')) {
            return;
        }
        
        try {
            await api.deleteAccount();
            api.logout();
            App.isAuthenticated = false;
            App.currentUser = null;
            showToast('Account deleted successfully');
            navigateTo('/home');
        } catch (error) {
            showToast(error.message || 'Failed to delete account', 'error');
            if (error.message.includes('active listings')) {
                showToast('Please delete or mark all active listings as sold first', 'warning');
            }
        }
    }
};