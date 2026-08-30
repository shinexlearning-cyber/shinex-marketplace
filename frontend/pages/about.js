const AboutPage = {
    render() {
        const html = `
            <div class="about-page">
                <div class="page-header">
                    <h1>About SHINEX</h1>
                    <p>Your trusted marketplace for buying and selling</p>
                </div>
                
                <div class="about-content">
                    <section class="about-section">
                        <h2>Our Mission</h2>
                        <p>
                            SHINEX is dedicated to creating a safe, reliable, and user-friendly marketplace 
                            where individuals and businesses can connect to buy and sell products and services. 
                            We believe in empowering local economies and making commerce accessible to everyone.
                        </p>
                    </section>
                    
                    <section class="about-section">
                        <h2>What We Offer</h2>
                        <div class="about-grid">
                            <div class="about-item">
                                <i class="fas fa-store"></i>
                                <h4>Marketplace</h4>
                                <p>Buy and sell products across multiple categories with ease.</p>
                            </div>
                            <div class="about-item">
                                <i class="fas fa-ad"></i>
                                <h4>Advertising</h4>
                                <p>Promote your business or services to a wide audience.</p>
                            </div>
                            <div class="about-item">
                                <i class="fas fa-shield-alt"></i>
                                <h4>Safety</h4>
                                <p>Secure transactions and reporting system for a safe experience.</p>
                            </div>
                            <div class="about-item">
                                <i class="fas fa-heart"></i>
                                <h4>Community</h4>
                                <p>Connect with sellers and build your network on SHINEX.</p>
                            </div>
                        </div>
                    </section>
                    
                    <section class="about-section">
                        <h2>Why Choose SHINEX</h2>
                        <ul class="about-list">
                            <li>Free to list products for sale</li>
                            <li>No hidden fees or commissions</li>
                            <li>Direct communication with sellers via WhatsApp</li>
                            <li>Secure payment processing through Paystack</li>
                            <li>Featured advertising opportunities</li>
                            <li>Mobile-friendly platform</li>
                            <li>Verified user profiles</li>
                            <li>Active moderation and reporting system</li>
                        </ul>
                    </section>
                    
                    <section class="about-section">
                        <h2>Get Started</h2>
                        <p>
                            Join thousands of users already buying and selling on SHINEX. 
                            Create your account today and start your marketplace journey.
                        </p>
                        <div class="about-actions">
                            <button class="btn btn-primary" onclick="navigateTo('/register')">Create Account</button>
                            <button class="btn btn-secondary" onclick="navigateTo('/contact')">Contact Us</button>
                        </div>
                    </section>
                </div>
            </div>
        `;

        showPage(html);
    }
};