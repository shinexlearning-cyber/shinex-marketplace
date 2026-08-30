const RegisterPage = {
    render() {
        if (App.isAuthenticated) {
            navigateTo('/home');
            return;
        }

        const html = `
            <div class="auth-page">
                <div class="auth-container">
                    <div class="auth-box">
                        <div class="auth-header">
                            <h1>Create Account</h1>
                            <p>Join SHINEX marketplace</p>
                        </div>
                        
                        <form id="register-form">
                            <div class="form-group">
                                <label for="register-fullname">Full Name *</label>
                                <input type="text" id="register-fullname" required placeholder="Enter your full name">
                            </div>
                            
                            <div class="form-group">
                                <label for="register-username">Username *</label>
                                <input type="text" id="register-username" required placeholder="Choose a unique username">
                                <div class="help-text">This will be your shop URL: /shop/username</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="register-email">Email Address *</label>
                                <input type="email" id="register-email" required placeholder="Enter your email address">
                            </div>
                            
                            <div class="form-group">
                                <label for="register-phone">Phone Number *</label>
                                <input type="tel" id="register-phone" required placeholder="08012345678">
                            </div>
                            
                            <div class="form-group">
                                <label for="register-password">Password *</label>
                                <input type="password" id="register-password" required placeholder="Minimum 6 characters" minlength="6">
                                <div class="help-text">Password must be at least 6 characters</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="register-confirm-password">Confirm Password *</label>
                                <input type="password" id="register-confirm-password" required placeholder="Confirm your password">
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="register-terms" required>
                                    I have read and agree to the 
                                    <a href="/terms" onclick="navigateTo('/terms'); return false;">Terms and Conditions</a>
                                    and 
                                    <a href="/privacy-policy" onclick="navigateTo('/privacy-policy'); return false;">Privacy Policy</a>
                                </label>
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-block btn-lg">
                                Create Account
                            </button>
                        </form>
                        
                        <div class="auth-footer">
                            <p>Already have an account? <a href="/login" onclick="navigateTo('/login'); return false;">Login here</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        showPage(html);
        this.setupForm();
    },

    setupForm() {
        const form = document.getElementById('register-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                const fullName = document.getElementById('register-fullname').value.trim();
                const username = document.getElementById('register-username').value.trim();
                const email = document.getElementById('register-email').value.trim();
                const phone = document.getElementById('register-phone').value.trim();
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                const terms = document.getElementById('register-terms').checked;
                
                // Validation
                if (!fullName || !username || !email || !phone || !password) {
                    showToast('All fields are required', 'warning');
                    return;
                }
                
                if (password.length < 6) {
                    showToast('Password must be at least 6 characters', 'warning');
                    return;
                }
                
                if (password !== confirmPassword) {
                    showToast('Passwords do not match', 'warning');
                    return;
                }
                
                if (!terms) {
                    showToast('You must accept the Terms and Conditions', 'warning');
                    return;
                }
                
                // Username validation (alphanumeric and underscore only)
                if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    showToast('Username can only contain letters, numbers, and underscore', 'warning');
                    return;
                }
                
                try {
                    const result = await api.register({
                        full_name: fullName,
                        username,
                        email,
                        phone,
                        password,
                        terms: true
                    });
                    
                    App.currentUser = result.user;
                    App.isAuthenticated = true;
                    showToast('Registration successful! Welcome to SHINEX!');
                    navigateTo('/home');
                } catch (error) {
                    showToast(error.message || 'Registration failed', 'error');
                }
            };
        }
    }
};