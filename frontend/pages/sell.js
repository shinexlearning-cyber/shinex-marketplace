// ========================================
// SHINEX MARKETPLACE — SELL PAGE
// ========================================

let sellState = {
    categories: [],
    images: [],
    uploading: false,
    submitting: false
};

function sellPage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Check authentication
    if (!isAuthenticated()) {
        router.navigate('/login');
        showToast('Please login to sell items', 'warning');
        return;
    }

    // Fetch categories
    if (sellState.categories.length === 0) {
        api.getCategories()
            .then(response => {
                if (response.success) {
                    sellState.categories = response.data;
                    renderSellForm();
                }
            })
            .catch(() => {
                showToast('Failed to load categories', 'error');
            });
    }

    renderSellForm();
}

function renderSellForm() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { categories, images } = sellState;

    // Category options
    const categoryOptions = categories.map(cat => `
        <option value="${cat.id}">${cat.name}</option>
    `).join('');

    // Image previews
    const imagePreviews = images.map((img, index) => `
        <div class="image-preview-item">
            <img src="${img.url}" alt="Product image ${index + 1}">
            <button class="remove-image" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    main.innerHTML = `
        <div class="container page-container" style="max-width:700px;margin:0 auto;">
            <div class="page-header">
                <h1>List Your Product</h1>
                <p>Fill in the details to sell your item</p>
            </div>

            <div class="card">
                <form id="sell-form" onsubmit="handleSellSubmit(event)">
                    <div class="form-group">
                        <label for="product-name">Product Name *</label>
                        <input type="text" id="product-name" placeholder="Enter product name" required>
                    </div>

                    <div class="form-group">
                        <label for="product-description">Description</label>
                        <textarea id="product-description" placeholder="Describe your product in detail..." rows="4"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="product-price">Price (₦) *</label>
                            <input type="number" id="product-price" placeholder="e.g., 50000" required min="0">
                        </div>
                        <div class="form-group">
                            <label for="product-category">Category *</label>
                            <select id="product-category" required>
                                <option value="">Select a category</option>
                                ${categoryOptions}
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="product-condition">Condition</label>
                            <select id="product-condition">
                                <option value="new">New</option>
                                <option value="used" selected>Used</option>
                                <option value="refurbished">Refurbished</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="product-location">Location</label>
                            <input type="text" id="product-location" placeholder="City, State">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Product Images</label>
                        <div style="border:2px dashed var(--border-color);border-radius:8px;padding:24px;text-align:center;cursor:pointer;" 
                             onclick="document.getElementById('image-upload').click()">
                            <i class="fas fa-cloud-upload-alt" style="font-size:32px;color:var(--text-muted);"></i>
                            <p style="margin-top:8px;color:var(--text-muted);">
                                Click to upload images (Max 5)
                            </p>
                            <input type="file" id="image-upload" accept="image/*" multiple style="display:none;" onchange="handleImageUpload(event)">
                        </div>
                        ${images.length > 0 ? `<div class="image-preview-grid">${imagePreviews}</div>` : ''}
                        <div class="helper-text">${images.length}/5 images uploaded</div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block btn-lg" id="sell-submit-btn">
                        <i class="fas fa-spinner fa-spin hidden" id="sell-spinner"></i>
                        <span id="sell-text">List Product</span>
                    </button>
                </form>
            </div>
        </div>
    `;
}

/**
 * Handle image upload
 */
function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remaining = 5 - sellState.images.length;
    if (files.length > remaining) {
        showToast(`You can only upload ${remaining} more images`, 'warning');
        return;
    }

    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'warning');
            continue;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            sellState.images.push({
                file: file,
                url: e.target.result
            });
            renderSellForm();
        };
        reader.readAsDataURL(file);
    }

    // Reset input
    event.target.value = '';
}

/**
 * Remove image
 */
function removeImage(index) {
    sellState.images.splice(index, 1);
    renderSellForm();
}

/**
 * Handle sell form submit
 */
async function handleSellSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('product-name').value.trim();
    const description = document.getElementById('product-description').value.trim();
    const price = document.getElementById('product-price').value;
    const category_id = document.getElementById('product-category').value;
    const condition = document.getElementById('product-condition').value;
    const location = document.getElementById('product-location').value.trim();

    // Validation
    if (!name) {
        showToast('Product name is required', 'warning');
        return;
    }

    if (!price || parseFloat(price) < 0) {
        showToast('Please enter a valid price', 'warning');
        return;
    }

    if (!category_id) {
        showToast('Please select a category', 'warning');
        return;
    }

    if (sellState.images.length === 0) {
        showToast('Please upload at least one image', 'warning');
        return;
    }

    const btn = document.getElementById('sell-submit-btn');
    const spinner = document.getElementById('sell-spinner');
    const text = document.getElementById('sell-text');

    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Listing product...';

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', parseFloat(price));
        formData.append('category_id', category_id);
        formData.append('condition', condition);
        formData.append('location', location || '');

        // Append images
        for (const img of sellState.images) {
            formData.append('images', img.file);
        }

        const response = await api.createProduct(formData);

        if (response.success) {
            showToast('Product listed successfully!', 'success');
            // Reset state
            sellState.images = [];
            // Redirect to product page
            setTimeout(() => {
                router.navigate(`/product/${response.data.product.id}`);
            }, 1000);
        }
    } catch (error) {
        showToast(error.message || 'Failed to list product', 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'List Product';
    }
}

// Expose functions globally
window.sellPage = sellPage;
window.handleImageUpload = handleImageUpload;
window.removeImage = removeImage;
window.handleSellSubmit = handleSellSubmit;
