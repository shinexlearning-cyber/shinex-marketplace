// ========================================
// SHINEX MARKETPLACE — ABOUT PAGE
// ========================================

function aboutPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="container page-container">
            <div class="page-header">
                <h1>About SHINEX Marketplace</h1>
                <p>Building trust through safe and easy buying and selling</p>
            </div>

            <div class="card" style="margin-bottom:24px;">
                <h2>Who We Are</h2>
                <p style="margin-top:8px;color:var(--text-secondary);line-height:1.8;">
                    SHINEX Marketplace is a peer-to-peer platform designed to connect buyers and sellers 
                    in a safe, simple, and trustworthy environment. We believe that buying and selling 
                    should be easy, secure, and accessible to everyone.
                </p>
                <p style="margin-top:12px;color:var(--text-secondary);line-height:1.8;">
                    Whether you're a student looking to sell your used books, a small business owner 
                    showcasing products, or someone searching for great deals, SHINEX is built for you.
                </p>
            </div>

            <div class="card" style="margin-bottom:24px;">
                <h2>Our Mission</h2>
                <p style="margin-top:8px;color:var(--text-secondary);line-height:1.8;">
                    To create a vibrant marketplace where anyone can buy and sell with confidence, 
                    powered by technology that protects both parties and makes every transaction seamless.
                </p>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
                <div class="card" style="text-align:center;">
                    <i class="fas fa-shield-alt" style="font-size:32px;color:var(--primary);"></i>
                    <h4 style="margin-top:8px;">Safe & Secure</h4>
                    <p style="font-size:14px;color:var(--text-muted);">We prioritize your safety with secure transactions and user verification.</p>
                </div>
                <div class="card" style="text-align:center;">
                    <i class="fas fa-handshake" style="font-size:32px;color:var(--secondary);"></i>
                    <h4 style="margin-top:8px;">Trusted Community</h4>
                    <p style="font-size:14px;color:var(--text-muted);">Build trust through transparent seller information and user reporting.</p>
                </div>
                <div class="card" style="text-align:center;">
                    <i class="fas fa-bolt" style="font-size:32px;color:var(--promo);"></i>
                    <h4 style="margin-top:8px;">Fast & Easy</h4>
                    <p style="font-size:14px;color:var(--text-muted);">List products in minutes and find what you need with powerful search.</p>
                </div>
                <div class="card" style="text-align:center;">
                    <i class="fas fa-mobile-alt" style="font-size:32px;color:var(--success);"></i>
                    <h4 style="margin-top:8px;">Mobile Friendly</h4>
                    <p style="font-size:14px;color:var(--text-muted);">Access the marketplace anytime, anywhere from your phone.</p>
                </div>
            </div>

            <div class="card" style="margin-top:24px;">
                <h2>Contact Us</h2>
                <p style="margin-top:8px;color:var(--text-secondary);">
                    Have questions or feedback? We'd love to hear from you.
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:16px;">
                    <a href="#contact" class="btn btn-primary">
                        <i class="fas fa-envelope"></i> Get in Touch
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Expose functions globally
window.aboutPage = aboutPage;
