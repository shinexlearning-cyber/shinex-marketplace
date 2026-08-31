// ========================================
// SHINEX MARKETPLACE — PRIVACY POLICY
// ========================================

function policyPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="container page-container" style="max-width:800px;">
            <div class="page-header">
                <h1>Privacy Policy</h1>
                <p>Last updated: ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="card">
                <h2>1. Information We Collect</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    We collect information you provide directly, such as your name, email address, phone number, 
                    and payment details when you register, list products, or make purchases on SHINEX Marketplace.
                </p>

                <h2 style="margin-top:24px;">2. How We Use Your Information</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    We use your information to operate, maintain, and improve our marketplace services, 
                    process transactions, communicate with you, and provide customer support.
                </p>

                <h2 style="margin-top:24px;">3. Information Sharing</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    We do not sell your personal information. We share information only with trusted service providers 
                    who assist us in operating the marketplace (payment processors, hosting services) and as required by law.
                </p>

                <h2 style="margin-top:24px;">4. Data Security</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    We implement appropriate technical and organizational measures to protect your personal information 
                    against unauthorized access, alteration, disclosure, or destruction.
                </p>

                <h2 style="margin-top:24px;">5. Your Rights</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    You have the right to access, update, or delete your personal information at any time 
                    through your account settings or by contacting us.
                </p>

                <h2 style="margin-top:24px;">6. Contact Us</h2>
                <p style="color:var(--text-secondary);line-height:1.8;">
                    If you have questions about this Privacy Policy, please contact us at 
                    <a href="mailto:shinexlearning@gmail.com" style="color:var(--primary);">shinexlearning@gmail.com</a>
                </p>
            </div>
        </div>
    `;
}

window.policyPage = policyPage;
