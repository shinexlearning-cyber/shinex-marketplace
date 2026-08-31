// ========================================
// SHINEX MARKETPLACE — REGISTER PAGE
// ========================================

function registerPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    // If already authenticated, redirect to home
    if (isAuthenticated()) {
        router.navigate('/');
        return;
    }

    main.innerHTML = `
        <div class="container page-container" style="max-width:500px;margin:0 auto;padding-top:40px;">
            <div class="card">
                <div style="text-align:center;margin-bottom:24px;">
                    <h2 style="font-size:28px;color:var(--primary);">Create Account</h2>
                    <p style="color:var(--text-secondary);">Join SHINEX Marketplace today</p>
                </div>

                <form id="register-form" onsubmit="handleRegister(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="reg-fullname">Full Name</label>
                            <input type="text" id="reg-fullname" placeholder="John Doe" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-username">Username</label>
                            <input type="text" id="reg-username" placeholder="johndoe" required>
                            <div class="helper-text">Letters, numbers, and underscores only</div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="reg-email">Email</label>
                        <input type="email" id="reg-email" placeholder="john@example.com" required>
                    </div>

                    <div class="form-group">
                        <label for="reg-phone">Phone Number</label>
                        <input type="tel" id="reg-phone" placeholder="08012345678" required>
                    </div>

                    <div class="form-group">
                        <label for="reg-password">Password</label>
                        <div style="position:relative;">
                            <input type="password" id="reg-password" placeholder="Min 8 characters" required minlength="8">
                            <button type="button" onclick="togglePasswordVisibility('reg-password')" 
                                    style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--text-muted);">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="reg-confirm-password">Confirm Password</label>
                        <div style="position:relative;">
                            <input type="password" id="reg-confirm-password" placeholder="Confirm your password" required>
                            <button type="button" onclick="togglePasswordVisibility('reg-confirm-password')" 
                                    style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--text-muted);">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top:16px;">
                        <label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;cursor:pointer;">
                            <input type="checkbox" id="reg-terms" required style="width:auto;margin-top:2px;">
                            <span style="font-size:14px;">
                                I agree to the <a href="#terms" style="color:var(--primary);">Terms & Conditions</a> and 
                                <a href="#privacy-policy" style="color:var(--primary);">Privacy Policy</a>
                            </span>
                        </label>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block btn-lg" id="register-btn">
                        <i class="fas fa-spinner fa-spin hidden" id="register-spinner"></i>
                        <span id="register-text">Create Account</span>
                    </button>
                </form>

                <div style="text-align:center;margin-top:16px;">
                    <p style="font-size:14px;color:var(--text-secondary);">
                        Already have an account? <a href="#login" style="color:var(--primary);font-weight:600;">Login</a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Handle register form submission
 */
async function handleRegister(event) {
    event.preventDefault();

    const full_name = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const terms = document.getElementById('reg-terms').checked;

    // Validation
    if (!full_name || !username || !email || !phone || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'warning');
        return;
    }

    if (!terms) {
        showToast('Please accept the Terms & Conditions', 'warning');
        return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showToast('Username can only contain letters, numbers, and underscores', 'warning');
        return;
    }

    const btn = document.getElementById('register-btn');
    const spinner = document.getElementById('register-spinner');
    const text = document.getElementById('register-text');

    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Creating account...';

    try {
        const response = await api.register({
            full_name,
            username,
            email,
            phone,
            password
        });

        if (response.success) {
            saveAuthData(response.data.token, response.data.user);
            showToast(response.message, 'success');
            
            // Update app state
            AppState.user = response.data.user;
            AppState.isAuthenticated = true;
            AppState.isAdmin = response.data.user.is_admin || false;
            
            // Update UI
            renderHeader();
            renderBottomNav();
            
            // Redirect to home
            setTimeout(() => router.navigate('/'), 500);
        }
    } catch (error) {
        showToast(error.message || 'Registration failed', 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'Create Account';
    }
}

// Expose functions globally
window.registerPage = registerPage;
window.handleRegister = handleRegister;
