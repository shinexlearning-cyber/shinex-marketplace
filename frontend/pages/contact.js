const ContactPage = {
    render() {
        const html = `
            <div class="contact-page">
                <div class="page-header">
                    <h1>Contact Us</h1>
                    <p>Get in touch with the SHINEX team</p>
                </div>
                
                <div class="contact-container">
                    <div class="contact-info">
                        <div class="contact-card">
                            <i class="fas fa-phone"></i>
                            <h4>Phone</h4>
                            <a href="tel:+2347067574479">+234 706 757 4479</a>
                        </div>
                        
                        <div class="contact-card">
                            <i class="fab fa-whatsapp"></i>
                            <h4>WhatsApp</h4>
                            <a href="https://wa.me/2348025052852" target="_blank">+234 802 505 2852</a>
                        </div>
                        
                        <div class="contact-card">
                            <i class="fas fa-envelope"></i>
                            <h4>Email</h4>
                            <a href="mailto:info@shinex.com">info@shinex.com</a>
                        </div>
                        
                        <div class="contact-card">
                            <i class="fas fa-clock"></i>
                            <h4>Business Hours</h4>
                            <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                            <p>Saturday: 10:00 AM - 4:00 PM</p>
                            <p>Sunday: Closed</p>
                        </div>
                    </div>
                    
                    <div class="contact-form-container">
                        <h2>Send Us a Message</h2>
                        <form id="contact-form">
                            <div class="form-group">
                                <label for="contact-name">Your Name *</label>
                                <input type="text" id="contact-name" required placeholder="Enter your full name">
                            </div>
                            
                            <div class="form-group">
                                <label for="contact-email">Email Address *</label>
                                <input type="email" id="contact-email" required placeholder="Enter your email address">
                            </div>
                            
                            <div class="form-group">
                                <label for="contact-subject">Subject *</label>
                                <input type="text" id="contact-subject" required placeholder="Message subject">
                            </div>
                            
                            <div class="form-group">
                                <label for="contact-message">Message *</label>
                                <textarea id="contact-message" rows="5" required placeholder="Write your message here..."></textarea>
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-block">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        showPage(html);
        this.setupForm();
    },

    setupForm() {
        const form = document.getElementById('contact-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('contact-name').value.trim();
                const email = document.getElementById('contact-email').value.trim();
                const subject = document.getElementById('contact-subject').value.trim();
                const message = document.getElementById('contact-message').value.trim();
                
                if (!name || !email || !subject || !message) {
                    showToast('All fields are required', 'warning');
                    return;
                }
                
                try {
                    await api.sendContactMessage({ name, email, subject, message });
                    showToast('Message sent successfully!');
                    form.reset();
                } catch (error) {
                    showToast(error.message || 'Failed to send message', 'error');
                }
            };
        }
    }
};