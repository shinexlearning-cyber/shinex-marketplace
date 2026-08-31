// ========================================
// SHINEX MARKETPLACE — ADVERTISE PAGE
// ========================================

let advertiseState = {
    pricing: [],
    selectedDuration: null,
    images: [],
    submitting: false,
    loading: true
};

function advertisePage(params) {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!isAuthenticated()) {
        router.navigate('/login');
        showToast('Please login to create advertisements', 'warning');
        return;
    }

    renderAdvertisePage();
    loadPricing();
}

function renderAdvertisePage() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const { pricing, selectedDuration, images, loading } = advertiseState;

    // Build pricing options
    const pricingHTML = pricing.map(p => {
        const isSelected = selectedDuration?.id === p.id;
        const displayPrice = formatCurrency(p.price);
        return `
            <div class="card" style="cursor:pointer;border:2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'};padding:16px;transition:all var(--transition);"
                 onclick="selectDuration('${p.id}')">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h4>${p.duration_days} Day${p.duration_days > 1 ? 's' : ''}</h4>
                        <span style="font-size:20px;font-weight:700;color:var(--success);">${displayPrice}</span>
                    </div>
                    ${isSelected ? `<i class="fas fa-check-circle" style="color:var(--primary);font-size:24px;"></i>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Image previews
    const imagePreviews = images.map((img, index) => `
        <div class="image-preview-item">
            <img src="${img.url}" alt="Ad image ${index + 1}">
            <button class="remove-image" onclick="removeAdImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    main.innerHTML = `
        <div class="container page-container" style="max-width:700px;margin:0 auto;">
            <div class="page-header">
                <h1>Advertise on SHINEX</h1>
                <p>Reach more customers with sponsored advertisements</p>
            </div>

            <div class="card">
                <form id="advertise-form" onsubmit="handleAdSubmit(event)">
                    <div class="form-group">
                        <label for="ad-title">Advertisement Title *</label>
                        <input type="text" id="ad-title" placeholder="Enter a catchy title" required>
                    </div>

                    <div class="form-group">
                        <label for="ad-description">Description</label>
                        <textarea id="ad-description" placeholder="Describe what you're promoting..." rows="3"></textarea>
                    </div>

                    <div class="form-group">
                        <label>Advertisement Image *</label>
                        <div style="border:2px dashed var(--border-color);border-radius:8px;padding:24px;text-align:center;cursor:pointer;" 
                             onclick="document.getElementById('ad-image-upload').click()">
                            <i class="fas fa-cloud-upload-alt" style="font-size:32px;color:var(--text-muted);"></i>
                            <p style="margin-top:8px;color:var(--text-muted);">Click to upload your ad flyer</p>
                            <input type="file" id="ad-image-upload" accept="image/*" style="display:none;" onchange="handleAdImageUpload(event)">
                        </div>
                        ${images.length > 0 ? `<div class="image-preview-grid">${imagePreviews}</div>` : ''}
                    </div>

                    <div class="form-group">
                        <label>Select Duration & Price</label>
                        ${loading ? '<p class="text-muted">Loading pricing options...</p>' : pricingHTML}
                    </div>

                    ${selectedDuration ? `
                        <div style="background:var(--bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px;">
                            <div class="flex-between">
                                <span>Duration:</span>
                                <strong>${selectedDuration.duration_days} Day${selectedDuration.duration_days > 1 ? 's' : ''}</strong>
                            </div>
                            <div class="flex-between" style="margin-top:4px;">
                                <span>Total Price:</span>
                                <strong style="color:var(--success);font-size:20px;">${formatCurrency(selectedDuration.price)}</strong>
                            </div>
                        </div>
                    ` : ''}

                    <button type="submit" class="btn btn-primary btn-block btn-lg" id="ad-submit-btn" ${!selectedDuration || images.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-spinner fa-spin hidden" id="ad-spinner"></i>
                        <span id="ad-text">Proceed to Payment</span>
                    </button>
                </form>
            </div>
        </div>
    `;
}

async function loadPricing() {
    advertiseState.loading = true;

    try {
        const response = await api.getPricing();
        if (response.success) {
            advertiseState.pricing = response.data || [];
        }
    } catch (error) {
        console.error('Load pricing error:', error);
        showToast('Failed to load pricing options', 'error');
    }

    advertiseState.loading = false;
    renderAdvertisePage();
}

function selectDuration(id) {
    const duration = advertiseState.pricing.find(p => p.id === id);
    if (duration) {
        advertiseState.selectedDuration = duration;
        renderAdvertisePage();
    }
}

function handleAdImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'warning');
        return;
    }

    // Clear previous images (ad only allows 1 image)
    advertiseState.images = [];

    const reader = new FileReader();
    reader.onload = (e) => {
        advertiseState.images.push({
            file: file,
            url: e.target.result
        });
        renderAdvertisePage();
    };
    reader.readAsDataURL(file);

    event.target.value = '';
}

function removeAdImage(index) {
    advertiseState.images.splice(index, 1);
    renderAdvertisePage();
}

async function handleAdSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('ad-title').value.trim();
    const description = document.getElementById('ad-description').value.trim();
    const duration = advertiseState.selectedDuration;
    const image = advertiseState.images[0];

    if (!title) {
        showToast('Please enter an advertisement title', 'warning');
        return;
    }

    if (!duration) {
        showToast('Please select a duration', 'warning');
        return;
    }

    if (!image) {
        showToast('Please upload an image', 'warning');
        return;
    }

    const btn = document.getElementById('ad-submit-btn');
    const spinner = document.getElementById('ad-spinner');
    const text = document.getElementById('ad-text');

    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = 'Creating advertisement...';

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('duration_id', duration.id);
        formData.append('image', image.file);

        const response = await api.createAdvertisement(formData);

        if (response.success) {
            const adId = response.data.advertisement.id;
            showToast('Advertisement created! Processing payment...', 'success');

            // Initialize payment
            try {
                const paymentResponse = await api.initializePayment(adId);
                if (paymentResponse.success && paymentResponse.data.authorization_url) {
                    // Redirect to Paystack
                    window.location.href = paymentResponse.data.authorization_url;
                } else {
                    showToast('Failed to initialize payment. Please try again.', 'error');
                }
            } catch (payError) {
                showToast(payError.message || 'Payment initialization failed', 'error');
            }
        }
    } catch (error) {
        showToast(error.message || 'Failed to create advertisement', 'error');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = 'Proceed to Payment';
    }
}

// Check for payment callback
function checkPaymentCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const reference = urlParams.get('reference');

    if (paymentStatus) {
        if (paymentStatus === 'success') {
            showToast('Payment successful! Your advertisement is pending admin approval.', 'success');
        } else if (paymentStatus === 'failed') {
            showToast('Payment failed. Please try again.', 'error');
        } else {
            showToast('Payment verification in progress...', 'info');
        }
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname + '#advertise');
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', checkPaymentCallback);

// Expose functions globally
window.advertisePage = advertisePage;
window.selectDuration = selectDuration;
window.handleAdImageUpload = handleAdImageUpload;
window.removeAdImage = removeAdImage;
window.handleAdSubmit = handleAdSubmit;
