const AdvertisePage = {
    imageUrl: null,

    render() {
        let html = `
            <div class="advertise-page">
                <div class="page-header">
                    <h1>Advertise With Us</h1>
                    <p>Promote your business, services, or products to thousands of shoppers</p>
                </div>

                <div class="advertise-packages">
                    <div class="package-card basic">
                        <h3>Basic</h3>
                        <div class="package-price">₦5,000</div>
                        <ul>
                            <li>7 days visibility</li>
                            <li>Single flyer/image</li>
                            <li>WhatsApp contact</li>
                            <li>Basic promotion</li>
                        </ul>
                        <button class="btn btn-outline" onclick="AdvertisePage.selectPackage('basic')">Select</button>
                    </div>

                    <div class="package-card standard featured">
                        <h3>Standard</h3>
                        <div class="package-price">₦15,000</div>
                        <ul>
                            <li>30 days visibility</li>
                            <li>Single flyer/image</li>
                            <li>WhatsApp contact</li>
                            <li>Featured placement</li>
                            <li>Priority support</li>
                        </ul>
                        <button class="btn btn-primary" onclick="AdvertisePage.selectPackage('standard')">Select</button>
                    </div>

                    <div class="package-card premium">
                        <h3>Premium</h3>
                        <div class="package-price">₦50,000</div>
                        <ul>
                            <li>90 days visibility</li>
                            <li>Single flyer/image</li>
                            <li>WhatsApp contact</li>
                            <li>Top featured placement</li>
                            <li>Priority support</li>
                            <li>Social media promotion</li>
                        </ul>
                        <button class="btn btn-outline" onclick="AdvertisePage.selectPackage('premium')">Select</button>
                    </div>
                </div>

                <div class="advertise-form-container hidden" id="advertise-form-container">
                    <h2>Create Your Advertisement</h2>
                    <form id="advertise-form">
                        <input type="hidden" id="ad-package" value="">
                        
                        <div class="form-group">
                            <label for="ad-title">Advertisement Title *</label>
                            <input type="text" id="ad-title" required placeholder="Enter advertisement title">
                        </div>
                        
                        <div class="form-group">
                            <label for="ad-description">Description</label>
                            <textarea id="ad-description" rows="4" placeholder="Describe what you're advertising"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="ad-whatsapp">WhatsApp Number</label>
                            <input type="text" id="ad-whatsapp" placeholder="08012345678">
                            <div class="help-text">Customers will contact you via this WhatsApp number</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Advertisement Flyer/Image</label>
                            <div class="image-upload-area" id="ad-image-upload">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Click to upload flyer/banner</p>
                                <span class="upload-hint">PNG, JPG up to 5MB</span>
                            </div>
                            <input type="file" id="ad-image-input" accept="image/*" style="display:none">
                            <div class="image-preview-container" id="ad-image-preview"></div>
                        </div>
                        
                        <div class="form-group">
                            <label>Selected Package: <strong id="selected-package-display">None</strong></label>
                            <div class="package-summary">
                                <span id="package-duration">Duration: -</span>
                                <span id="package-amount">Amount: -</span>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-block btn-lg">
                            Create Advertisement
                        </button>
                    </form>
                </div>
            </div>
        `;

        showPage(html);

        this.setupImageUpload();
        this.setupForm();
    },

    selectPackage(pkg) {
        document.getElementById('ad-package').value = pkg;
        document.getElementById('selected-package-display').textContent = pkg.toUpperCase();
        
        const packages = {
            basic: { duration: '7 days', amount: '₦5,000' },
            standard: { duration: '30 days', amount: '₦15,000' },
            premium: { duration: '90 days', amount: '₦50,000' }
        };
        
        const details = packages[pkg];
        document.getElementById('package-duration').textContent = `Duration: ${details.duration}`;
        document.getElementById('package-amount').textContent = `Amount: ${details.amount}`;
        
        // Show form
        document.getElementById('advertise-form-container').classList.remove('hidden');
        
        // Highlight selected package
        document.querySelectorAll('.package-card').forEach(card => {
            card.classList.remove('selected');
            if (card.classList.contains(pkg)) {
                card.classList.add('selected');
            }
        });
        
        // Scroll to form
        document.getElementById('advertise-form-container').scrollIntoView({ behavior: 'smooth' });
    },

    setupImageUpload() {
        const uploadArea = document.getElementById('ad-image-upload');
        const fileInput = document.getElementById('ad-image-input');
        const previewContainer = document.getElementById('ad-image-preview');
        
        if (!uploadArea || !fileInput) return;
        
        uploadArea.onclick = () => fileInput.click();
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                showToast('Please upload an image file', 'warning');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image must be less than 5MB', 'warning');
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'shinex_ads');
                formData.append('cloud_name', 'your_cloudinary_cloud_name');
                
                const response = await fetch('https://api.cloudinary.com/v1_1/your_cloudinary_cloud_name/image/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.secure_url) {
                    this.imageUrl = data.secure_url;
                    previewContainer.innerHTML = `
                        <div class="image-preview">
                            <img src="${data.secure_url}" alt="Advertisement flyer">
                            <button type="button" class="remove-image" onclick="AdvertisePage.removeImage()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                    showToast('Image uploaded successfully!');
                } else {
                    showToast('Failed to upload image', 'error');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showToast('Failed to upload image', 'error');
            }
        };
    },

    removeImage() {
        this.imageUrl = null;
        document.getElementById('ad-image-preview').innerHTML = '';
        document.getElementById('ad-image-input').value = '';
    },

    setupForm() {
        const form = document.getElementById('advertise-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.submitAd();
            };
        }
    },

    async submitAd() {
        if (!App.isAuthenticated) {
            showToast('Please login to create an advertisement', 'warning');
            navigateTo('/login');
            return;
        }

        const title = document.getElementById('ad-title').value.trim();
        const description = document.getElementById('ad-description').value.trim();
        const whatsapp = document.getElementById('ad-whatsapp').value.trim();
        const packageType = document.getElementById('ad-package').value;
        
        if (!title) {
            showToast('Advertisement title is required', 'warning');
            return;
        }
        
        if (!packageType) {
            showToast('Please select a package', 'warning');
            return;
        }
        
        if (!this.imageUrl) {
            showToast('Please upload a flyer/image', 'warning');
            return;
        }
        
        try {
            const adData = {
                title,
                description: description || '',
                whatsapp: whatsapp || '',
                package: packageType,
                image: this.imageUrl
            };
            
            const result = await api.createAdvertisement(adData);
            showToast('Advertisement created! Please proceed to payment.');
            
            // Redirect to payment
            const paymentData = await api.initializePayment(result.advertisement.id);
            if (paymentData.authorization_url) {
                window.open(paymentData.authorization_url, '_blank');
            }
            
            navigateTo('/profile');
        } catch (error) {
            showToast(error.message || 'Failed to create advertisement', 'error');
        }
    }
};