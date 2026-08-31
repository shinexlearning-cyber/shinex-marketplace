const LoginPage = {
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
                            <h1>Welcome Back</h1>
                            <p>Login to your SHINEX account</p>
                        </div>
                        
                        <form id="login-form">
                            <div class="form-group">
                                <label for="login-email">Email Address</label>
                                <input type="email" id="login-email" required placeholder="Enter your email">
                            </div>
                            
                            <div class="form-group">
                                <label for="login-password">Password</label>
                                <input type="password" id="login-password" required placeholder="Enter your password">
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-block btn-lg">
                                Login
                            </button>
                        </form>
                        
                        <div class="auth-footer">
                            <p>Don't have an account? <a href="/register" onclick="navigateTo('/register'); return false;">Register here</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        showPage(html);
        this.setupForm();
    },

    setupForm() {
        const form = document.getElementById('login-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;
                
                if (!email || !password) {
                    showToast('All fields are required', 'warning');
                    return;
                }
                
                try {
                    const result = await api.login({ email, password });
                    App.currentUser = result.user;
                    App.isAuthenticated = true;
                    showToast('Login successful! Welcome back!');
                    navigateTo('/home');
                } catch (error) {
                    showToast(error.message || 'Login failed', 'error');
                }
            };
        }
    }
};