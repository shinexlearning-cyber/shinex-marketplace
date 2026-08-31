const SellPage = {
    isEditing: false,
    productId: null,
    images: [],
    uploadedImages: [],

    async render(params = {}) {
        if (!App.isAuthenticated) {
            showPage(`
                <div class="sell-page">
                    <div class="empty-state">
                        <i class="fas fa-lock"></i>
                        <h3>Login to sell</h3>
                        <p>Please login to post your products for sale.</p>
                        <button class="btn btn-primary" onclick="navigateTo('/login')">Login</button>
                    </div>
                </div>
            `);
            return;
        }
        
        this.isEditing = !!params.edit;
        this.productId = params.edit || null;
        this.images = [];
        this.uploadedImages = [];
        
        let html = `
            <div class="sell-form-container">
                <h1>${this.isEditing ? 'Edit Product' : 'Sell a Product'}</h1>
                
                <form id="sell-form">
                    <div class="form-group">
                        <label for="product-name">Product Name *</label>
                        <input type="text" id="product-name" required placeholder="Enter product name">
                    </div>
                    
                    <div class="form-group">
                        <label for="product-price">Price (NGN) *</label>
                        <input type="number" id="product-price" required placeholder="0.00" step="0.01" min="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="product-description">Description</label>
                        <textarea id="product-description" rows="4" placeholder="Describe your product"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-category">Category *</label>
                        <select id="product-category" required>
                            <option value="">Select a category</option>
                            ${App.categories.map(cat => 
                                `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-location">Location</label>
                        <input type="text" id="product-location" placeholder="City, State">
                    </div>
                    
                    <div class="form-group">
                        <label for="product-condition">Condition *</label>
                        <select id="product-condition" required>
                            <option value="">Select condition</option>
                            <option value="New">New</option>
                            <option value="Used">Used</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Product Images</label>
                        <div class="image-upload-area" id="image-upload-area">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click or drag to upload images</p>
                            <span class="upload-hint">PNG, JPG up to 5MB (Max 5 images)</span>
                        </div>
                        <input type="file" id="image-input" accept="image/*" multiple style="display:none">
                        <div class="image-preview-container" id="image-preview-container"></div>
                        <div class="help-text">Upload up to 5 images. First image will be the main cover.</div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block btn-lg">
                        ${this.isEditing ? 'Update Product' : 'Post Product'}
                    </button>
                    
                    ${this.isEditing ? `
                        <button type="button" class="btn btn-secondary btn-block mt-2" onclick="navigateTo('/product/${this.productId}')">
                            Cancel
                        </button>
                    ` : ''}
                </form>
            </div>
        `;
        
        showPage(html);
        
        // If editing, load product data
        if (this.isEditing && this.productId) {
            await this.loadProductData();
        }
        
        this.setupForm();
        this.setupImageUpload();
    },

    async loadProductData() {
        try {
            const data = await api.getProduct(this.productId);
            const product = data.product;
            
            if (product.seller_id !== App.currentUser.id) {
                showToast('You can only edit your own products', 'error');
                navigateTo('/home');
                return;
            }
            
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-category').value = product.category_id || '';
            document.getElementById('product-location').value = product.location || '';
            document.getElementById('product-condition').value = product.condition || '';
            
            this.images = product.images || [];
            this.uploadedImages = [...this.images];
            this.renderImagePreviews();
        } catch (error) {
            showToast(error.message || 'Failed to load product', 'error');
            navigateTo('/home');
        }
    },

    setupForm() {
        const form = document.getElementById('sell-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.submitProduct();
            };
        }
    },

    setupImageUpload() {
        const uploadArea = document.getElementById('image-upload-area');
        const fileInput = document.getElementById('image-input');
        
        if (uploadArea && fileInput) {
            uploadArea.onclick = () => fileInput.click();
            
            uploadArea.ondragover = (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--color-accent)';
                uploadArea.style.background = 'var(--color-accent-light)';
            };
            
            uploadArea.ondragleave = () => {
                uploadArea.style.borderColor = 'var(--color-gray-300)';
                uploadArea.style.background = 'transparent';
            };
            
            uploadArea.ondrop = (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--color-gray-300)';
                uploadArea.style.background = 'transparent';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFiles(files);
                }
            };
            
            fileInput.onchange = () => {
                if (fileInput.files.length > 0) {
                    this.handleFiles(fileInput.files);
                }
                fileInput.value = '';
            };
        }
    },

    async handleFiles(files) {
        const maxFiles = 5;
        const currentCount = this.uploadedImages.length;
        const remaining = maxFiles - currentCount;
        
        if (files.length > remaining) {
            showToast(`You can only upload ${remaining} more image(s)`, 'warning');
            return;
        }
        
        // Upload each file to Cloudinary
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                showToast('Only image files are allowed', 'warning');
                continue;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size must be less than 5MB', 'warning');
                continue;
            }
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'shinex_products');
                formData.append('cloud_name', 'your_cloudinary_cloud_name'); // Replace with your cloud name
                
                // Upload to Cloudinary
                const response = await fetch('https://api.cloudinary.com/v1_1/your_cloudinary_cloud_name/image/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.secure_url) {
                    this.uploadedImages.push(data.secure_url);
                    this.renderImagePreviews();
                } else {
                    showToast('Failed to upload image', 'error');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showToast('Failed to upload image', 'error');
            }
        }
    },

    renderImagePreviews() {
        const container = document.getElementById('image-preview-container');
        if (!container) return;
        
        if (this.uploadedImages.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = this.uploadedImages.map((url, index) => `
            <div class="image-preview">
                <img src="${url}" alt="Product image ${index + 1}">
                <button type="button" class="remove-image" onclick="SellPage.removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
                ${index === 0 ? '<div class="image-badge">Cover</div>' : ''}
            </div>
        `).join('');
    },

    removeImage(index) {
        this.uploadedImages.splice(index, 1);
        this.renderImagePreviews();
    },

    async submitProduct() {
        const name = document.getElementById('product-name').value.trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value.trim();
        const category_id = document.getElementById('product-category').value;
        const location = document.getElementById('product-location').value.trim();
        const condition = document.getElementById('product-condition').value;
        
        // Validation
        if (!name) {
            showToast('Product name is required', 'warning');
            return;
        }
        
        if (isNaN(price) || price <= 0) {
            showToast('Valid price is required', 'warning');
            return;
        }
        
        if (!category_id) {
            showToast('Please select a category', 'warning');
            return;
        }
        
        if (!condition) {
            showToast('Please select condition', 'warning');
            return;
        }
        
        if (this.uploadedImages.length === 0) {
            showToast('Please upload at least one image', 'warning');
            return;
        }
        
        try {
            const productData = {
                name,
                price,
                description: description || '',
                category_id,
                location: location || '',
                condition,
                images: this.uploadedImages
            };
            
            let result;
            if (this.isEditing) {
                result = await api.updateProduct(this.productId, productData);
                showToast('Product updated successfully!');
            } else {
                result = await api.createProduct(productData);
                showToast('Product posted successfully!');
            }
            
            navigateTo(`/product/${result.product.id}`);
        } catch (error) {
            showToast(error.message || 'Failed to save product', 'error');
        }
    }
};