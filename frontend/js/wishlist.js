/**
 * Wishlist Management Module
 */

async function initWishlistPage() {
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=wishlist.html';
    return;
  }

  const container = document.getElementById('wishlist-grid');
  const emptyState = document.getElementById('empty-wishlist-state');
  if (!container) return;

  try {
    const data = await api.get('/wishlist');
    const products = data.products || [];

    if (products.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      container.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    container.style.display = 'grid';

    container.innerHTML = products.map(p => `
      <div class="product-card" data-id="${p._id}">
        <div class="product-thumb-wrap">
          <a href="product.html?id=${p._id}">
            <img src="${p.images[0]}" alt="${p.title}" />
          </a>
          <button class="product-wishlist-btn active" onclick="removeFromWishlistPage('${p._id}')" title="Remove from wishlist">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>

        <div class="product-info">
          <span class="product-brand">${p.brand}</span>
          <a href="product.html?id=${p._id}" class="product-title">${p.title}</a>

          <div class="product-price-row">
            <span class="current-price">${formatCurrency(p.sellingPrice)}</span>
            ${p.discountPercentage > 0 ? `<span class="original-price">${formatCurrency(p.originalPrice)}</span>` : ''}
          </div>

          <button class="btn btn-primary btn-sm btn-block" onclick="moveWishlistItemToCart('${p._id}')" ${p.stockQuantity <= 0 ? 'disabled' : ''}>
            <i class="fas fa-shopping-cart"></i> Move to Cart
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function moveWishlistItemToCart(productId) {
  try {
    const res = await api.post(`/wishlist/move-to-cart/${productId}`, {});
    showToast(res.message, 'success');
    updateCartBadge();
    initWishlistPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeFromWishlistPage(productId) {
  try {
    await api.post('/wishlist/toggle', { productId });
    showToast('Removed from wishlist', 'info');
    initWishlistPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initWishlistPage);
