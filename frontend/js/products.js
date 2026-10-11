/**
 * Product Catalog & Browsing Module
 */

let currentFilters = {
  search: '',
  category: 'all',
  brand: 'all',
  minPrice: '',
  maxPrice: '',
  rating: '',
  inStock: false,
  sort: 'newest',
  page: 1,
  limit: 12
};

function renderProductCard(p) {
  const discountHtml = p.discountPercentage > 0
    ? `<span class="discount-tag">${p.discountPercentage}% OFF</span>`
    : '';

  const origPriceHtml = p.discountPercentage > 0
    ? `<span class="original-price">${formatCurrency(p.originalPrice)}</span>`
    : '';

  return `
    <div class="product-card" data-id="${p._id}">
      <div class="product-thumb-wrap">
        <a href="product.html?id=${p._id}">
          <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'}" alt="${p.title}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';" />
        </a>
        <div class="product-badges">
          ${p.isBestSeller ? '<span class="badge badge-warning">BEST SELLER</span>' : ''}
          ${p.isTrending ? '<span class="badge badge-primary">TRENDING</span>' : ''}
          ${p.isNewArrival ? '<span class="badge badge-success">NEW</span>' : ''}
        </div>
        <button class="product-wishlist-btn" onclick="toggleProductWishlist('${p._id}', this)" title="Add to Wishlist">
          <i class="far fa-heart"></i>
        </button>
      </div>

      <div class="product-info">
        <span class="product-brand">${p.brand}</span>
        <a href="product.html?id=${p._id}" class="product-title" title="${p.title}">${p.title}</a>

        <div class="product-rating">
          <span class="rating-stars">
            ${getStarRatingHtml(p.averageRating)}
          </span>
          <span class="rating-count">(${p.numReviews || 0})</span>
          <span style="margin-left: auto; font-size: 0.72rem; color: #10b981; font-weight: 700;">
            ${p.stockQuantity > 0 ? (p.stockQuantity <= 5 ? 'Only ' + p.stockQuantity + ' left' : 'In Stock') : '<span style="color:#ef4444">Out of Stock</span>'}
          </span>
        </div>

        <div class="product-price-row">
          <span class="current-price">${formatCurrency(p.sellingPrice)}</span>
          ${origPriceHtml}
          ${discountHtml}
        </div>

        <div style="font-size: 0.78rem; color: #475569; margin: 4px 0 10px; display: flex; align-items: center; gap: 5px;">
          <i class="fas fa-truck-fast" style="color: var(--primary); font-size: 0.72rem;"></i>
          <span>FREE delivery <strong>${formatDeliveryDate(getEstimatedDeliveryDate('standard'))}</strong></span>
        </div>

        <div class="product-card-footer">
          <button class="btn btn-primary btn-sm btn-block" onclick="quickAddToCart('${p._id}', event)" ${p.stockQuantity <= 0 ? 'disabled' : ''}>
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
          <a href="product.html?id=${p._id}" class="btn btn-secondary btn-sm" title="View Details">
            <i class="fas fa-eye"></i>
          </a>
        </div>
      </div>
    </div>
  `;
}

function getStarRatingHtml(rating) {
  const fullStars = Math.floor(rating || 0);
  const halfStar = (rating || 0) % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  let html = '';
  for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
  if (halfStar) html += '<i class="fas fa-star-half-alt"></i>';
  for (let i = 0; i < emptyStars; i++) html += '<i class="far fa-star"></i>';
  return html;
}

async function quickAddToCart(productId, event) {
  if (event) event.stopPropagation();

  try {
    if (!auth.isLoggedIn()) {
      // Add to guest cart in localStorage
      let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      const idx = localCart.findIndex(item => item.product === productId);
      if (idx > -1) {
        localCart[idx].quantity += 1;
      } else {
        localCart.push({ product: productId, quantity: 1 });
      }
      localStorage.setItem('guest_cart', JSON.stringify(localCart));
      updateCartBadge();
      showToast('Item added to cart (Saved locally. Log in to sync across devices!)', 'success');
      return;
    }

    const res = await api.post('/cart/items', { productId, quantity: 1 });
    updateCartBadge();
    showToast(res.message || 'Added to cart!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleProductWishlist(productId, btnElement) {
  if (!auth.isLoggedIn()) {
    showToast('Please log in to save items to your wishlist', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    return;
  }

  try {
    const res = await api.post('/wishlist/toggle', { productId });
    showToast(res.message, 'success');
    if (btnElement) {
      const icon = btnElement.querySelector('i');
      if (res.action === 'added') {
        btnElement.classList.add('active');
        icon.className = 'fas fa-heart';
      } else {
        btnElement.classList.remove('active');
        icon.className = 'far fa-heart';
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load and render catalog with current filters
async function loadCatalog(page = 1) {
  currentFilters.page = page;
  const grid = document.getElementById('products-catalog-grid');
  const countEl = document.getElementById('results-count');
  const paginationEl = document.getElementById('catalog-pagination');

  if (!grid) return;

  grid.innerHTML = Array(6).fill('<div class="skeleton skeleton-card"></div>').join('');

  try {
    const data = await api.get('/products', currentFilters);

    if (countEl) {
      countEl.textContent = `Showing ${data.products.length} of ${data.total} products`;
    }

    if (!data.products || data.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-box-open" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">No products match your criteria</h3>
          <p style="color: #64748b; margin-bottom: 1.5rem;">Try adjusting your filters or search keywords.</p>
          <button class="btn btn-primary btn-sm" onclick="clearAllFilters()">Reset All Filters</button>
        </div>
      `;
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    grid.innerHTML = data.products.map(renderProductCard).join('');

    // Render pagination
    if (paginationEl) {
      let pageHtml = '';
      if (data.pages > 1) {
        pageHtml += `
          <button class="btn btn-secondary btn-sm" ${data.page <= 1 ? 'disabled' : ''} onclick="loadCatalog(${data.page - 1})">
            <i class="fas fa-chevron-left"></i> Previous
          </button>
        `;

        for (let p = 1; p <= data.pages; p++) {
          if (p === 1 || p === data.pages || (p >= data.page - 1 && p <= data.page + 1)) {
            pageHtml += `
              <button class="btn ${p === data.page ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="loadCatalog(${p})">
                ${p}
              </button>
            `;
          } else if (p === data.page - 2 || p === data.page + 2) {
            pageHtml += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
          }
        }

        pageHtml += `
          <button class="btn btn-secondary btn-sm" ${data.page >= data.pages ? 'disabled' : ''} onclick="loadCatalog(${data.page + 1})">
            Next <i class="fas fa-chevron-right"></i>
          </button>
        `;
      }
      paginationEl.innerHTML = pageHtml;
    }
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; color: #ef4444; padding: 2rem; text-align: center;">Error loading products: ${err.message}</div>`;
  }
}

function clearAllFilters() {
  currentFilters = {
    search: '',
    category: 'all',
    brand: 'all',
    minPrice: '',
    maxPrice: '',
    rating: '',
    inStock: false,
    sort: 'newest',
    page: 1,
    limit: 12
  };

  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('catalog-sort-select');
  if (sortSelect) sortSelect.value = 'newest';

  const inStockCheck = document.getElementById('filter-in-stock');
  if (inStockCheck) inStockCheck.checked = false;

  const minPriceInput = document.getElementById('filter-min-price');
  if (minPriceInput) minPriceInput.value = '';

  const maxPriceInput = document.getElementById('filter-max-price');
  if (maxPriceInput) maxPriceInput.value = '';

  document.querySelectorAll('.category-filter-item, .brand-filter-item, .rating-filter-item').forEach(el => {
    el.classList.remove('active');
  });

  loadCatalog(1);
}
