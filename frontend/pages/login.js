// ========================================
// SHINEX MARKETPLACE — LOGIN PAGE
// ========================================

function loginPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    // If already authenticated, redirect to home
    if (isAuthenticated()) {
        router.navigate('/');
        return;
    }

    main.innerHTML = `
        <div class="container page-container" style="max-width:420px;margin:0 auto;padding-top:40px;">
            <div class="card">
                <div style="text-align:center;margin-bottom:24px;">
                    <h2 style="font-size:28px;color:var(--primary);">SHINEX</h2>
                    <p style="color:var(--text-secondary);">Welcome back! Login to your account.</p>
                </div>

                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label for="login-email">Email or Username</label>
                        <input type="text" id="login-email" placeholder="Enter your email or username" required>
                    </div>

                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <div style="position:relative;">
                            <input type="password" id="login-password" placeholder="Enter your password" required>
                            <button type="button" onclick="togglePasswordVisibility('login-password')" 
                                    style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--text-muted);">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
                        <a href="#forgot-password" style="font-size:14px;color:var(--primary);">Forgot Password?</a>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">
                        <i class="fas fa-spinner fa-spin hidden" id="login-spinner"></i>
                        <span id="login-text">Login</span>
                    </button>
                </form>

                <div style="text-align:center;margin-top:16px;">
                    <p style="font-size:14px;color:var(--text-secondary);">
                        Don't have an account? <a href="#register" style="color:var(--primary);font-weight:600;">Sign Up</a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    const btn = document.getElementById('login-btn');
    const spinner = document.getElementById('login-spinner');
    const text = document.getElementById('login-text');

    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Logging in...';

    try {
        const response = await api.login({ 
            email: email, 
            password: password 
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
        showToast(error.message || 'Login failed', 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'Login';
    }
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
}

// Expose functions globally
window.loginPage = loginPage;
window.handleLogin = handleLogin;
window.togglePasswordVisibility = togglePasswordVisibility;
