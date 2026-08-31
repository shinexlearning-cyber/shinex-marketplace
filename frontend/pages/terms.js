// ========================================
// SHINEX MARKETPLACE — TERMS & CONDITIONS
// ========================================

function termsPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="container page-container" style="max-width:800px;">
            <div class="page-header">
                <h1>Terms & Conditions</h1>
                <p>Last updated: ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="card">
                <h2>1. Acceptance of Terms</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    By using SHINEX Marketplace, you agree to comply with and be bound by these Terms and Conditions. 
                    If you do not agree, please do not use our services.
                </p>

                <h2 style="margin-top:24px;">2. User Accounts</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    You must create an account to list products or make purchases. You are responsible for maintaining 
                    the confidentiality of your account credentials and for all activities under your account.
                </p>

                <h2 style="margin-top:24px;">3. Product Listings</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    All product listings must be accurate, honest, and comply with applicable laws. You retain ownership 
                    of your products, but grant us permission to display them on the marketplace.
                </p>

                <h2 style="margin-top:24px;">4. Transactions</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    SHINEX Marketplace facilitates peer-to-peer transactions. We are not party to the actual sale agreement 
                    between buyers and sellers. All transactions are between the buyer and seller.
                </p>

                <h2 style="margin-top:24px;">5. Payments</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    Payments are processed through our trusted payment partner, Paystack. We do not store your payment 
                    card details. All payment information is securely handled by Paystack.
                </p>

                <h2 style="margin-top:24px;">6. Prohibited Items</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    The following items are prohibited from being listed on SHINEX Marketplace:
                    Illegal items, counterfeit goods, weapons, adult content, and any items that violate applicable laws.
                </p>

                <h2 style="margin-top:24px;">7. User Conduct</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    Users must not engage in fraudulent, abusive, or harassing behavior. Any violation may result in 
                    account suspension or permanent ban from the marketplace.
                </p>

                <h2 style="margin-top:24px;">8. Disclaimers</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    SHINEX Marketplace is provided "as is" without warranties of any kind. We do not guarantee the 
                    accuracy, completeness, or reliability of any content on the platform.
                </p>

                <h2 style="margin-top:24px;">9. Limitation of Liability</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    To the fullest extent permitted by law, SHINEX Marketplace shall not be liable for any indirect, 
                    incidental, special, consequential, or punitive damages arising from your use of the platform.
                </p>

                <h2 style="margin-top:24px;">10. Changes to Terms</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    We reserve the right to update these Terms and Conditions at any time. Continued use of the 
                    platform after changes constitutes acceptance of the new terms.
                </p>

                <h2 style="margin-top:24px;">11. Contact Us</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    For questions about these Terms and Conditions, please contact us at 
                    <a href="mailto:shinexlearning@gmail.com" style="color:var(--primary);">shinexlearning@gmail.com</a>
                </p>
            </div>
        </div>
    `;
}

window.termsPage = termsPage;
