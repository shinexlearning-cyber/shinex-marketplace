// ========================================
// SHINEX MARKETPLACE — CONTACT PAGE
// ========================================

function contactPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="container page-container">
            <div class="page-header">
                <h1>Contact Us</h1>
                <p>We'd love to hear from you. Get in touch with us.</p>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
                <!-- Contact Info -->
                <div>
                    <div class="card" style="margin-bottom:24px;">
                        <h3>Get in Touch</h3>
                        <div style="margin-top:16px;">
                            <div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-color);">
                                <i class="fas fa-envelope" style="font-size:20px;color:var(--primary);width:40px;"></i>
                                <div>
                                    <div style="font-weight:600;">Email</div>
                                    <a href="mailto:shinexlearning@gmail.com" style="color:var(--text-secondary);">shinexlearning@gmail.com</a>
                                </div>
                            </div>
                            <div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-color);">
                                <i class="fas fa-phone" style="font-size:20px;color:var(--secondary);width:40px;"></i>
                                <div>
                                    <div style="font-weight:600;">Phone</div>
                                    <a href="tel:+2347067574479" style="color:var(--text-secondary);">+234 706 757 4479</a>
                                </div>
                            </div>
                            <div style="display:flex;gap:12px;align-items:center;padding:12px 0;">
                                <i class="fab fa-whatsapp" style="font-size:20px;color:#25D366;width:40px;"></i>
                                <div>
                                    <div style="font-weight:600;">WhatsApp</div>
                                    <a href="https://wa.me/2348025052852" target="_blank" style="color:var(--text-secondary);">+234 802 505 2852</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <h3>Quick Actions</h3>
                        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:16px;">
                            <a href="mailto:shinexlearning@gmail.com" class="btn btn-primary">
                                <i class="fas fa-envelope"></i> Email Us
                            </a>
                            <a href="tel:+2347067574479" class="btn btn-secondary">
                                <i class="fas fa-phone"></i> Call Us
                            </a>
                            <a href="https://wa.me/2348025052852" target="_blank" class="btn btn-success">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Contact Form -->
                <div class="card">
                    <h3>Send a Message</h3>
                    <form id="contact-form" onsubmit="handleContactSubmit(event)" style="margin-top:16px;">
                        <div class="form-group">
                            <label for="contact-name">Your Name *</label>
                            <input type="text" id="contact-name" placeholder="John Doe" required>
                        </div>

                        <div class="form-group">
                            <label for="contact-email">Your Email *</label>
                            <input type="email" id="contact-email" placeholder="john@example.com" required>
                        </div>

                        <div class="form-group">
                            <label for="contact-phone">Phone Number</label>
                            <input type="tel" id="contact-phone" placeholder="08012345678">
                        </div>

                        <div class="form-group">
                            <label for="contact-subject">Subject *</label>
                            <input type="text" id="contact-subject" placeholder="Question about..." required>
                        </div>

                        <div class="form-group">
                            <label for="contact-message">Message *</label>
                            <textarea id="contact-message" rows="4" placeholder="Write your message here..." required></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block" id="contact-submit-btn">
                            <i class="fas fa-spinner fa-spin hidden" id="contact-spinner"></i>
                            <span id="contact-submit-text">Send Message</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Load contact info from API
    loadContactInfo();
}

async function loadContactInfo() {
    try {
        const response = await api.getContactInfo();
        if (response.success) {
            const info = response.data;
            // Update contact info if needed
        }
    } catch (error) {
        console.error('Load contact info error:', error);
    }
}

async function handleContactSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    if (!name || !email || !subject || !message) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address', 'warning');
        return;
    }

    const btn = document.getElementById('contact-submit-btn');
    const spinner = document.getElementById('contact-spinner');
    const text = document.getElementById('contact-submit-text');

    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Sending...';

    try {
        const response = await api.sendContact({
            name,
            email,
            phone: phone || '',
            subject,
            message
        });

        if (response.success) {
            showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
            document.getElementById('contact-form').reset();
        }
    } catch (error) {
        showToast(error.message || 'Failed to send message. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'Send Message';
    }
}

// Expose functions globally
window.contactPage = contactPage;
window.handleContactSubmit = handleContactSubmit;
