/**
 * Product Details Page Logic
 */

let currentProduct = null;
let selectedSize = '';
let selectedColor = '';
let selectedQuantity = 1;

async function initProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = 'shop.html';
    return;
  }

  const container = document.getElementById('product-details-container');
  if (!container) return;

  try {
    const data = await api.get(`/products/${productId}`);
    currentProduct = data.product;

    document.title = `${currentProduct.title} | ShopSphere`;

    renderProductView(currentProduct);
    renderRelatedProducts(data.relatedProducts);
    loadReviews(currentProduct._id);
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
        <h2>Product Not Found</h2>
        <p style="color: #64748b; margin-bottom: 1.5rem;">The product you are looking for does not exist or has been removed.</p>
        <a href="shop.html" class="btn btn-primary">Back to Shop</a>
      </div>
    `;
  }
}

function renderProductView(p) {
  const container = document.getElementById('product-details-container');
  if (!container) return;

  const savedPincode = localStorage.getItem('user_pincode') || '682011';
  const defaultStandardDate = formatDeliveryDate(getEstimatedDeliveryDate('standard'));
  const defaultExpressDate = formatDeliveryDate(getEstimatedDeliveryDate('express'));

  selectedSize = p.availableSizes?.[0] || '';
  selectedColor = p.availableColors?.[0] || '';
  selectedQuantity = 1;

  const discountBadge = p.discountPercentage > 0
    ? `<span class="discount-tag" style="font-size: 0.85rem;">${p.discountPercentage}% OFF</span>`
    : '';

  const origPriceHtml = p.discountPercentage > 0
    ? `<span class="original-price" style="font-size: 1.15rem;">${formatCurrency(p.originalPrice)}</span>`
    : '';

  const fallbackImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';
  const imgList = (p.images && p.images.length > 0) ? p.images : [fallbackImg];

  const thumbsHtml = imgList.map((img, idx) => `
    <img src="${img}" alt="${p.title}" class="detail-thumb ${idx === 0 ? 'active' : ''}" onerror="this.onerror=null; this.src='${fallbackImg}'" onclick="switchMainImage('${img}', this)" />
  `).join('');

  const sizesHtml = (p.availableSizes && p.availableSizes.length > 0) ? `
    <div style="margin-bottom: 1.5rem;">
      <label class="form-label">Select Size / Option: <span id="selected-size-label" style="font-weight: 500; color: var(--primary);">${selectedSize}</span></label>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${p.availableSizes.map((s, idx) => `
          <button class="variant-pill ${idx === 0 ? 'active' : ''}" onclick="selectVariantSize('${s}', this)">${s}</button>
        `).join('')}
      </div>
    </div>
  ` : '';

  const colorsHtml = (p.availableColors && p.availableColors.length > 0) ? `
    <div style="margin-bottom: 1.5rem;">
      <label class="form-label">Select Color / Finish: <span id="selected-color-label" style="font-weight: 500; color: var(--primary);">${selectedColor}</span></label>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${p.availableColors.map((c, idx) => `
          <button class="variant-pill ${idx === 0 ? 'active' : ''}" onclick="selectVariantColor('${c}', this)">${c}</button>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Specs table
  const specsEntries = p.specifications ? Object.entries(p.specifications) : [];
  const specsHtml = specsEntries.length > 0 ? `
    <table class="specs-table" style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
      <tbody>
        ${specsEntries.map(([k, v]) => `
          <tr style="border-bottom: 1px solid var(--surface-border);">
            <td style="padding: 10px; font-weight: 700; width: 35%; color: var(--text-muted);">${k}</td>
            <td style="padding: 10px; color: var(--text-main);">${v}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p style="color: #64748b; padding: 1rem 0;">Standard retail specifications apply.</p>';

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem;" class="product-detail-layout">
      <!-- Left: Gallery -->
      <div>
        <div style="position: relative; border-radius: var(--radius-xl); overflow: hidden; background: #fff; border: 1px solid var(--surface-border); box-shadow: var(--shadow-sm); aspect-ratio: 1/1;">
          <img id="main-product-img" src="${imgList[0]}" alt="${p.title}" onerror="this.onerror=null; this.src='${fallbackImg}';" style="width: 100%; height: 100%; object-fit: cover;" />
          <div style="position: absolute; top: 16px; left: 16px;">
            <span class="badge badge-primary">GST ${p.taxRate}% Included</span>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 1rem; overflow-x: auto; padding-bottom: 6px;">
          ${thumbsHtml}
        </div>
      </div>

      <!-- Right: Details -->
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: var(--primary); letter-spacing: 0.5px;">${p.brand}</span>
          <button class="product-wishlist-btn" onclick="toggleProductWishlist('${p._id}', this)" title="Add to Wishlist" style="position: static;">
            <i class="far fa-heart"></i>
          </button>
        </div>

        <h1 style="font-size: 1.85rem; font-weight: 800; line-height: 1.25; margin: 0.4rem 0 0.8rem; color: var(--text-main);">${p.title}</h1>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1.25rem;">
          <span class="rating-stars" style="color: #f59e0b; font-size: 0.95rem;">
            ${getStarRatingHtml(p.averageRating)}
          </span>
          <span style="font-weight: 700; font-size: 0.9rem;">${p.averageRating} / 5</span>
          <span style="color: var(--text-muted); font-size: 0.85rem;">(${p.numReviews} verified reviews)</span>
        </div>

        <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 1.5rem; background: var(--surface-alt); padding: 1.25rem 1.5rem; border-radius: var(--radius-lg);">
          <span style="font-size: 2.2rem; font-weight: 800; color: var(--text-main);">${formatCurrency(p.sellingPrice)}</span>
          ${origPriceHtml}
          ${discountBadge}
          <div style="margin-left: auto; font-size: 0.8rem; color: var(--text-muted);">Inclusive of all GST taxes</div>
        </div>

        <!-- Stock Status -->
        <div style="margin-bottom: 1.5rem;">
          ${p.stockQuantity > 0 ? `
            <span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 12px;">
              <i class="fas fa-check-circle"></i> In Stock (${p.stockQuantity} available)
            </span>
          ` : `
            <span class="badge badge-danger" style="font-size: 0.85rem; padding: 6px 12px;">
              <i class="fas fa-times-circle"></i> Out of Stock
            </span>
          `}
        </div>

        ${sizesHtml}
        ${colorsHtml}

        <!-- Quantity & Actions -->
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
          <div style="display: flex; align-items: center; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; background: #fff;">
            <button onclick="changeQuantity(-1)" style="padding: 10px 16px; background: none; border: none; cursor: pointer; font-size: 1.1rem; font-weight: 700;">-</button>
            <input id="product-quantity-input" type="number" min="1" max="${p.stockQuantity}" value="1" readonly style="width: 50px; text-align: center; border: none; font-weight: 700;" />
            <button onclick="changeQuantity(1)" style="padding: 10px 16px; background: none; border: none; cursor: pointer; font-size: 1.1rem; font-weight: 700;">+</button>
          </div>

          <button class="btn btn-primary btn-lg" onclick="handleAddToCart()" ${p.stockQuantity <= 0 ? 'disabled' : ''} style="flex: 1;">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
          <button class="btn btn-secondary btn-lg" onclick="handleBuyNow()" ${p.stockQuantity <= 0 ? 'disabled' : ''} style="background: #0f172a; color: #fff; border: none;">
            <i class="fas fa-bolt"></i> Buy Now
          </button>
        </div>

        <!-- Estimated Delivery & PIN Code Checker Box -->
        <div class="delivery-box" id="pincode-delivery-section" style="margin-bottom: 2rem;">
          <div class="delivery-box-header">
            <div class="delivery-box-title">
              <i class="fas fa-truck-fast" style="color: var(--primary); font-size: 1.1rem;"></i>
              <span>Delivery & Shipping Options</span>
            </div>
            <span id="pincode-city-badge" class="badge badge-primary" style="font-size: 0.75rem;">Check Delivery</span>
          </div>

          <div class="delivery-pincode-input-group">
            <input type="text" id="delivery-pincode-input" class="delivery-pincode-input" placeholder="Enter 6-digit PIN code" maxlength="6" value="${savedPincode}" onkeydown="if(event.key==='Enter') checkProductPincode()" />
            <button class="btn btn-secondary btn-sm" onclick="checkProductPincode()" style="padding: 0 16px; font-weight: 700;">Check</button>
          </div>

          <div id="delivery-results-box" class="delivery-results-list">
            <div class="delivery-timeline-row">
              <div class="delivery-timeline-left">
                <i class="fas fa-box" style="color: var(--accent);"></i>
                <span>Standard Delivery by <strong id="standard-delivery-date" style="color: var(--text-main);">${defaultStandardDate}</strong></span>
              </div>
              <span class="delivery-badge-pill free">FREE</span>
            </div>

            <div class="delivery-timeline-row">
              <div class="delivery-timeline-left">
                <i class="fas fa-bolt" style="color: #f59e0b;"></i>
                <span>Express Priority by <strong id="express-delivery-date" style="color: var(--text-main);">${defaultExpressDate}</strong></span>
              </div>
              <span class="delivery-badge-pill express">₹150</span>
            </div>

            <div class="fastest-delivery-callout" id="delivery-cutoff-banner">
              <i class="fas fa-clock"></i>
              <span id="delivery-cutoff-text">Order today for fastest delivery by <strong>${defaultExpressDate}</strong></span>
            </div>
          </div>
        </div>

        <!-- Trust Badges -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid var(--surface-border); padding-top: 1.5rem; font-size: 0.875rem;">
          <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
            <i class="fas fa-truck-fast" style="color: var(--primary);"></i> Free shipping over ₹999
          </div>
          <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
            <i class="fas fa-rotate-left" style="color: var(--primary);"></i> 7 Days Hassle-free Returns
          </div>
          <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
            <i class="fas fa-shield-halved" style="color: var(--primary);"></i> 100% Genuine Guaranteed
          </div>
          <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
            <i class="fas fa-lock" style="color: var(--primary);"></i> Secure Razorpay Checkout
          </div>
        </div>
      </div>
    </div>

    <!-- Product Description & Tabs Section -->
    <div style="margin-top: 4rem;">
      <div style="border-bottom: 2px solid var(--surface-border); display: flex; gap: 2rem; margin-bottom: 2rem;">
        <button class="tab-btn active" onclick="switchProductTab('desc', this)" style="padding: 12px 4px; font-weight: 700; font-size: 1.05rem; background: none; border: none; border-bottom: 3px solid var(--primary); color: var(--primary); cursor: pointer;">
          Description
        </button>
        <button class="tab-btn" onclick="switchProductTab('specs', this)" style="padding: 12px 4px; font-weight: 700; font-size: 1.05rem; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text-muted); cursor: pointer;">
          Specifications
        </button>
        <button class="tab-btn" onclick="switchProductTab('reviews', this)" style="padding: 12px 4px; font-weight: 700; font-size: 1.05rem; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text-muted); cursor: pointer;">
          Customer Reviews (${p.numReviews})
        </button>
      </div>

      <div id="tab-content-desc" class="tab-content" style="font-size: 1.05rem; line-height: 1.8; color: #334155; max-width: 900px;">
        <p>${p.description}</p>
      </div>

      <div id="tab-content-specs" class="tab-content" style="display: none; max-width: 800px;">
        ${specsHtml}
      </div>

      <div id="tab-content-reviews" class="tab-content" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700;">Customer Reviews</h3>
          <button class="btn btn-outline-primary btn-sm" onclick="openReviewModal()">Write a Review</button>
        </div>
        <div id="product-reviews-list">
          <div class="skeleton" style="height: 100px; margin-bottom: 12px;"></div>
        </div>
      </div>
    </div>
  `;

  if (savedPincode) {
    checkProductPincode(true);
  }
}

async function checkProductPincode(isSilent = false) {
  const input = document.getElementById('delivery-pincode-input');
  if (!input) return;
  const pin = input.value.trim();

  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    if (!isSilent) showToast('Please enter a valid 6-digit postal PIN code', 'warning');
    return;
  }

  try {
    const data = await fetchPincodeEstimate(pin);
    if (data.success && data.serviceable) {
      localStorage.setItem('user_pincode', pin);

      const cityBadge = document.getElementById('pincode-city-badge');
      if (cityBadge) {
        cityBadge.textContent = `${data.location.city}, ${data.location.state}`;
        cityBadge.className = 'badge badge-success';
      }

      const stdEl = document.getElementById('standard-delivery-date');
      if (stdEl) stdEl.textContent = data.delivery.standard.formatted;

      const expEl = document.getElementById('express-delivery-date');
      if (expEl) expEl.textContent = data.delivery.express.formatted;

      const cutoffText = document.getElementById('delivery-cutoff-text');
      if (cutoffText) {
        cutoffText.innerHTML = `${data.delivery.express.orderCutoffNotice} &bull; Fastest arrival: <strong>${data.delivery.express.formatted}</strong>`;
      }

      if (!isSilent) {
        showToast(`Delivery available to ${data.location.city}!`, 'success');
      }
    } else {
      if (!isSilent) showToast(data.message || 'Delivery not available for this PIN code', 'error');
    }
  } catch (err) {
    if (!isSilent) showToast(err.message || 'Unable to verify PIN code', 'error');
  }
}

function switchMainImage(src, thumbElement) {
  const mainImg = document.getElementById('main-product-img');
  if (mainImg) mainImg.src = src;

  document.querySelectorAll('.detail-thumb').forEach(el => el.classList.remove('active'));
  if (thumbElement) thumbElement.classList.add('active');
}

function selectVariantSize(size, btn) {
  selectedSize = size;
  const label = document.getElementById('selected-size-label');
  if (label) label.textContent = size;
  btn.parentElement.querySelectorAll('.variant-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function selectVariantColor(color, btn) {
  selectedColor = color;
  const label = document.getElementById('selected-color-label');
  if (label) label.textContent = color;
  btn.parentElement.querySelectorAll('.variant-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function changeQuantity(delta) {
  const input = document.getElementById('product-quantity-input');
  if (!input || !currentProduct) return;

  let val = parseInt(input.value, 10) + delta;
  val = Math.max(1, Math.min(val, currentProduct.stockQuantity));
  input.value = val;
  selectedQuantity = val;
}

async function handleAddToCart() {
  if (!currentProduct) return;

  try {
    if (!auth.isLoggedIn()) {
      let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      const idx = localCart.findIndex(i => i.product === currentProduct._id && i.size === selectedSize && i.color === selectedColor);
      if (idx > -1) {
        localCart[idx].quantity += selectedQuantity;
      } else {
        localCart.push({
          product: currentProduct._id,
          quantity: selectedQuantity,
          size: selectedSize,
          color: selectedColor
        });
      }
      localStorage.setItem('guest_cart', JSON.stringify(localCart));
      updateCartBadge();
      showToast('Added to cart! (Guest mode)', 'success');
      return;
    }

    await api.post('/cart/items', {
      productId: currentProduct._id,
      quantity: selectedQuantity,
      size: selectedSize,
      color: selectedColor
    });

    updateCartBadge();
    showToast('Added to shopping cart!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleBuyNow() {
  await handleAddToCart();
  window.location.href = 'checkout.html';
}

function switchProductTab(tabName, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.style.borderBottomColor = 'transparent';
    b.style.color = 'var(--text-muted)';
  });
  btn.style.borderBottomColor = 'var(--primary)';
  btn.style.color = 'var(--primary)';

  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  const target = document.getElementById(`tab-content-${tabName}`);
  if (target) target.style.display = 'block';
}

async function loadReviews(productId) {
  const container = document.getElementById('product-reviews-list');
  if (!container) return;

  try {
    const data = await api.get(`/reviews/product/${productId}`);
    if (!data.reviews || data.reviews.length === 0) {
      container.innerHTML = '<p style="color: #64748b; padding: 1.5rem 0;">No reviews yet. Be the first to share your thoughts!</p>';
      return;
    }

    container.innerHTML = data.reviews.map(r => `
      <div style="background: var(--surface); border: 1px solid var(--surface-border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700;">
              ${r.user?.name ? r.user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">${r.user?.name || 'Customer'}</div>
              ${r.isVerifiedPurchase ? '<span class="badge badge-success" style="font-size: 0.68rem;"><i class="fas fa-check"></i> Verified Purchase</span>' : ''}
            </div>
          </div>
          <div class="rating-stars" style="color: #f59e0b; font-size: 0.85rem;">
            ${getStarRatingHtml(r.rating)}
          </div>
        </div>
        ${r.title ? `<h4 style="font-size: 0.95rem; margin-bottom: 0.35rem;">${r.title}</h4>` : ''}
        <p style="color: #334155; font-size: 0.925rem; line-height: 1.5;">${r.comment}</p>
        <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 8px;">
          Reviewed on ${new Date(r.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444;">Could not load reviews.</p>`;
  }
}

function renderRelatedProducts(products) {
  const container = document.getElementById('related-products-grid');
  if (!container || !products || products.length === 0) return;
  container.innerHTML = products.map(renderProductCard).join('');
}

function openReviewModal() {
  if (!auth.isLoggedIn()) {
    showToast('Please login to write a review', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
    return;
  }
  const modal = document.getElementById('review-modal');
  if (modal) modal.classList.add('active');
}

function closeReviewModal() {
  const modal = document.getElementById('review-modal');
  if (modal) modal.classList.remove('active');
}

async function submitProductReview(e) {
  e.preventDefault();
  if (!currentProduct) return;

  const rating = document.getElementById('review-rating-select').value;
  const title = document.getElementById('review-title-input').value;
  const comment = document.getElementById('review-comment-input').value;

  try {
    await api.post(`/reviews/product/${currentProduct._id}`, { rating, title, comment });
    showToast('Review submitted successfully!', 'success');
    closeReviewModal();
    loadReviews(currentProduct._id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initProductDetails);
