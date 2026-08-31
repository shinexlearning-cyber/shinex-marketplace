const TermsPage = {
    render() {
        const html = `
            <div class="legal-page">
                <div class="page-header">
                    <h1>Terms and Conditions</h1>
                    <p>Last updated: January 2026</p>
                </div>
                
                <div class="legal-content">
                    <section>
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By using SHINEX, you agree to these Terms and Conditions. If you do not agree, 
                            please do not use our platform.
                        </p>
                    </section>

                    <section>
                        <h2>2. User Accounts</h2>
                        <ul>
                            <li>You must be at least 18 years old to use SHINEX</li>
                            <li>You must provide accurate and complete information during registration</li>
                            <li>You are responsible for maintaining the security of your account</li>
                            <li>You must not share your account credentials with others</li>
                            <li>You must not create multiple accounts</li>
                            <li>You must accept our Terms and Conditions to register</li>
                        </ul>
                    </section>

                    <section>
                        <h2>3. Product Listings</h2>
                        <ul>
                            <li>You must have the right to sell any product you list</li>
                            <li>Products must be accurately described with honest condition and pricing</li>
                            <li>All product images must be genuine and representative</li>
                            <li>You must not list prohibited or illegal items</li>
                            <li>You are responsible for managing your listings (edit, delete, mark as sold)</li>
                            <li>SHINEX reserves the right to remove any listing at our discretion</li>
                        </ul>
                    </section>

                    <section>
                        <h2>4. Prohibited Items</h2>
                        <p>The following items are prohibited on SHINEX:</p>
                        <ul>
                            <li>Illegal drugs and paraphernalia</li>
                            <li>Firearms, weapons, and explosives</li>
                            <li>Stolen goods</li>
                            <li>Counterfeit products</li>
                            <li>Hate speech or discriminatory content</li>
                            <li>Adult content or services</li>
                            <li>Items that infringe on intellectual property rights</li>
                            <li>Hazardous materials</li>
                            <li>Live animals</li>
                            <li>Any items prohibited by law</li>
                        </ul>
                    </section>

                    <section>
                        <h2>5. Transactions</h2>
                        <ul>
                            <li>SHINEX is a marketplace platform and is not a party to any transaction</li>
                            <li>Buyers and sellers are responsible for their own transactions</li>
                            <li>We recommend meeting in safe, public places for in-person transactions</li>
                            <li>We recommend using secure payment methods</li>
                            <li>SHINEX is not responsible for disputes between users</li>
                            <li>We encourage users to report any issues</li>
                        </ul>
                    </section>

                    <section>
                        <h2>6. Advertisements</h2>
                        <ul>
                            <li>Advertisements must be truthful and not misleading</li>
                            <li>Advertisements must comply with all applicable laws</li>
                            <li>Advertisements are subject to admin approval</li>
                            <li>Payments for advertisements are non-refundable</li>
                            <li>Advertisements will expire after the purchased duration</li>
                            <li>SHINEX reserves the right to reject or remove advertisements</li>
                        </ul>
                    </section>

                    <section>
                        <h2>7. User Conduct</h2>
                        <p>Users must not:</p>
                        <ul>
                            <li>Harass, abuse, or harm other users</li>
                            <li>Post false or misleading information</li>
                            <li>Attempt to defraud other users</li>
                            <li>Use the platform for illegal activities</li>
                            <li>Post spam or unsolicited messages</li>
                            <li>Use bots or automated systems</li>
                            <li>Violate any applicable laws or regulations</li>
                        </ul>
                    </section>

                    <section>
                        <h2>8. Account Suspension</h2>
                        <p>
                            SHINEX reserves the right to suspend or terminate accounts that violate these terms, 
                            including but not limited to:
                        </p>
                        <ul>
                            <li>Fraudulent activity</li>
                            <li>Harassment of other users</li>
                            <li>Repeated policy violations</li>
                            <li>Misrepresentation</li>
                            <li>Illegal activities</li>
                            <li>Unauthorized access</li>
                        </ul>
                    </section>

                    <section>
                        <h2>9. Liability</h2>
                        <ul>
                            <li>SHINEX is provided "as is" without warranties of any kind</li>
                            <li>We are not liable for any direct, indirect, or consequential damages</li>
                            <li>We are not responsible for user-generated content</li>
                            <li>We are not responsible for transactions between users</li>
                            <li>We are not responsible for third-party service issues</li>
                        </ul>
                    </section>

                    <section>
                        <h2>10. Intellectual Property</h2>
                        <ul>
                            <li>SHINEX owns all rights to the platform, design, and brand</li>
                            <li>Users retain rights to their content but grant SHINEX license to display it</li>
                            <li>You must not copy or reproduce SHINEX content without permission</li>
                            <li>You must respect intellectual property rights of others</li>
                        </ul>
                    </section>

                    <section>
                        <h2>11. Changes to Terms</h2>
                        <p>
                            We may update these Terms and Conditions from time to time. 
                            We will notify users of significant changes.
                        </p>
                    </section>

                    <section>
                        <h2>12. Contact</h2>
                        <p>For questions about these terms, please contact us:</p>
                        <ul>
                            <li>Email: <a href="mailto:info@shinex.com">info@shinex.com</a></li>
                            <li>Phone: <a href="tel:+2347067574479">+234 706 757 4479</a></li>
                        </ul>
                    </section>
                </div>
            </div>
        `;

        showPage(html);
    }
};