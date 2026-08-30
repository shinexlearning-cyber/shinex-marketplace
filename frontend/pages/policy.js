const PrivacyPage = {
    render() {
        const html = `
            <div class="legal-page">
                <div class="page-header">
                    <h1>Privacy Policy</h1>
                    <p>Last updated: January 2026</p>
                </div>
                
                <div class="legal-content">
                    <section>
                        <h2>Information We Collect</h2>
                        <p>When you use SHINEX, we collect the following information:</p>
                        <ul>
                            <li><strong>Account Information:</strong> Full name, username, email address, phone number, and password.</li>
                            <li><strong>Profile Information:</strong> Profile picture, bio, location, and WhatsApp number.</li>
                            <li><strong>Product Information:</strong> Product listings, descriptions, prices, images, and categories.</li>
                            <li><strong>Activity Data:</strong> Products viewed, favorites, searches, and interactions.</li>
                            <li><strong>Payment Information:</strong> Payment transactions processed through Paystack.</li>
                        </ul>
                    </section>

                    <section>
                        <h2>How We Use Your Information</h2>
                        <ul>
                            <li>To create and manage your account</li>
                            <li>To enable buying and selling on the marketplace</li>
                            <li>To process payments and advertisements</li>
                            <li>To improve our platform and user experience</li>
                            <li>To communicate with you about your account and listings</li>
                            <li>To provide customer support</li>
                            <li>To enforce our terms and policies</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Information Sharing</h2>
                        <p>We do not sell your personal information to third parties. We may share information:</p>
                        <ul>
                            <li>With other users as part of the marketplace (e.g., your shop page, product listings)</li>
                            <li>With service providers who help us operate the platform (Cloudinary, Paystack, Supabase)</li>
                            <li>When required by law or to protect our rights</li>
                            <li>With your consent</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Data Security</h2>
                        <p>
                            We implement appropriate security measures to protect your data:
                        </p>
                        <ul>
                            <li>Passwords are hashed using bcrypt</li>
                            <li>JWT tokens for secure authentication</li>
                            <li>HTTPS encryption for all data transmission</li>
                            <li>Regular security audits and updates</li>
                            <li>Row Level Security in Supabase</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Third-Party Services</h2>
                        <p>SHINEX uses the following third-party services:</p>
                        <ul>
                            <li><strong>Supabase:</strong> Database and authentication</li>
                            <li><strong>Cloudinary:</strong> Image storage and optimization</li>
                            <li><strong>Paystack:</strong> Payment processing</li>
                            <li><strong>Google Fonts:</strong> Typography</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Delete your account and data</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Export your data</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Cookies</h2>
                        <p>
                            SHINEX uses cookies for authentication and to improve your experience. 
                            You can control cookie settings in your browser.
                        </p>
                    </section>

                    <section>
                        <h2>Updates to This Policy</h2>
                        <p>
                            We may update this privacy policy from time to time. We will notify you of 
                            significant changes through the platform or via email.
                        </p>
                    </section>

                    <section>
                        <h2>Contact Us</h2>
                        <p>If you have questions about this privacy policy, please contact us:</p>
                        <ul>
                            <li>Email: <a href="mailto:info@shinex.com">info@shinex.com</a></li>
                            <li>Phone: <a href="tel:+2347067574479">+234 706 757 4479</a></li>
                            <li>WhatsApp: <a href="https://wa.me/2348025052852">+234 802 505 2852</a></li>
                        </ul>
                    </section>
                </div>
            </div>
        `;

        showPage(html);
    }
};