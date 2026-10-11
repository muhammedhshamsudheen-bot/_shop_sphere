/**
 * Shopping Cart Management Module
 */

let currentCartData = null;

async function loadCartPage() {
  const tableBody = document.getElementById('cart-items-body');
  const summaryBox = document.getElementById('cart-summary-box');
  const emptyState = document.getElementById('empty-cart-state');
  const cartContent = document.getElementById('cart-content-wrapper');

  if (!tableBody) return;

  try {
    const data = await api.get('/cart');
    currentCartData = data.cart;

    if (!currentCartData || !currentCartData.items || currentCartData.items.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (cartContent) cartContent.style.display = 'none';
      updateCartBadge();
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (cartContent) cartContent.style.display = 'grid';

    renderCartItems(currentCartData.items);
    renderOrderSummary(currentCartData);
    renderFreeShippingMeter(currentCartData);
    updateCartBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCartItems(items) {
  const container = document.getElementById('cart-items-body');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="cart-item-row" data-id="${item._id || item.product}" style="display: flex; gap: 1.25rem; padding: 1.5rem 0; border-bottom: 1px solid var(--surface-border); align-items: center;">
      <a href="product.html?id=${item.product}">
        <img src="${item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'}" alt="${item.title}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';" style="width: 84px; height: 84px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--surface-border);" />
      </a>

      <div style="flex: 1;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">${item.brand || ''}</span>
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem;">
          <a href="product.html?id=${item.product}">${item.title}</a>
        </h4>
        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 12px; margin-bottom: 0.5rem;">
          ${item.size ? `<span>Size: <strong>${item.size}</strong></span>` : ''}
          ${item.color ? `<span>Color: <strong>${item.color}</strong></span>` : ''}
          <span>GST: <strong>${item.taxRate}%</strong></span>
        </div>

        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span style="font-weight: 800; font-size: 1.05rem; color: var(--text-main);">${formatCurrency(item.sellingPrice)}</span>
          ${item.originalPrice > item.sellingPrice ? `<span style="font-size: 0.825rem; color: var(--text-light); text-decoration: line-through;">${formatCurrency(item.originalPrice)}</span>` : ''}
        </div>
        <div style="font-size: 0.8rem; color: #047857; margin-top: 6px; display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-truck-fast" style="font-size: 0.75rem;"></i> Delivery by <strong>${formatDeliveryDate(getEstimatedDeliveryDate('standard'))}</strong>
        </div>
      </div>

      <!-- Quantity controls -->
      <div style="display: flex; align-items: center; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; background: #fff;">
        <button onclick="updateItemQuantity('${item._id || item.product}', ${item.quantity - 1})" style="padding: 6px 12px; background: none; border: none; cursor: pointer; font-weight: 700;">-</button>
        <span style="padding: 0 10px; font-weight: 700; font-size: 0.9rem;">${item.quantity}</span>
        <button onclick="updateItemQuantity('${item._id || item.product}', ${item.quantity + 1})" style="padding: 6px 12px; background: none; border: none; cursor: pointer; font-weight: 700;" ${item.quantity >= item.stockQuantity ? 'disabled' : ''}>+</button>
      </div>

      <!-- Line Total -->
      <div style="text-align: right; min-width: 90px;">
        <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-main);">${formatCurrency(item.lineSellingSubtotal)}</div>
        <button onclick="removeCartItem('${item._id || item.product}')" style="background: none; border: none; color: var(--danger); font-size: 0.8rem; cursor: pointer; margin-top: 4px; font-weight: 600;">
          <i class="far fa-trash-alt"></i> Remove
        </button>
      </div>
    </div>
  `).join('');
}

function renderOrderSummary(cart) {
  const container = document.getElementById('cart-summary-box');
  if (!container) return;

  const couponApplied = cart.couponApplied;
  const estDeliveryDate = cart.estimatedDeliveryDate
    ? formatDeliveryDate(cart.estimatedDeliveryDate)
    : formatDeliveryDate(getEstimatedDeliveryDate('standard'));

  container.innerHTML = `
    <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: 1.75rem; box-shadow: var(--shadow-sm); position: sticky; top: 96px;">
      <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 1.25rem; border-bottom: 1px solid var(--surface-border); padding-bottom: 0.75rem;">
        Order Summary
      </h3>

      <!-- Estimated Delivery Banner -->
      <div class="cart-delivery-banner">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
          <i class="fas fa-truck-fast"></i>
        </div>
        <div>
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Estimated Delivery</div>
          <strong style="color: var(--text-main); font-size: 0.95rem;">Arriving by ${estDeliveryDate}</strong>
        </div>
      </div>

      <!-- Pricing Breakdown -->
      <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.925rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Product Subtotal</span>
          <span style="font-weight: 600;">${formatCurrency(cart.originalSubtotal)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; color: var(--accent);">
          <span>Product Discount</span>
          <span style="font-weight: 600;">-${formatCurrency(cart.productDiscount)}</span>
        </div>

        ${cart.couponDiscount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: var(--primary);">
            <span>Coupon Savings (${couponApplied.code})</span>
            <span style="font-weight: 700;">-${formatCurrency(cart.couponDiscount)}</span>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Shipping Fee</span>
          <span style="font-weight: 600;">${cart.shippingFee === 0 ? '<span style="color: var(--accent); font-weight: 700;">FREE</span>' : formatCurrency(cart.shippingFee)}</span>
        </div>

        <!-- GST Tax Breakdown -->
        <div style="border-top: 1px dashed var(--surface-border); padding-top: 0.75rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">
            <span>Taxable Value</span>
            <span>${formatCurrency(cart.taxableAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">
            <span>CGST</span>
            <span>${formatCurrency(cart.taxBreakdown?.cgst || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
            <span>SGST</span>
            <span>${formatCurrency(cart.taxBreakdown?.sgst || 0)}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 2px solid var(--surface-border); padding-top: 1rem; font-size: 1.2rem; font-weight: 800;">
          <span>Final Total</span>
          <span style="color: var(--primary);">${formatCurrency(cart.finalTotal)}</span>
        </div>
      </div>

      <!-- Coupon Form -->
      <div style="margin-bottom: 1.5rem; border-top: 1px solid var(--surface-border); padding-top: 1.25rem;">
        <label class="form-label" style="font-size: 0.825rem;">Have a Coupon Code?</label>
        ${couponApplied ? `
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--primary-light); border: 1px dashed var(--primary); padding: 8px 12px; border-radius: var(--radius-md);">
            <div>
              <strong style="color: var(--primary); font-size: 0.9rem;">${couponApplied.code}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${couponApplied.description || 'Coupon Applied'}</div>
            </div>
            <button onclick="removeCoupon()" style="background: none; border: none; color: var(--danger); font-size: 0.85rem; cursor: pointer; font-weight: 700;">
              Remove
            </button>
          </div>
        ` : `
          <div style="display: flex; gap: 8px;">
            <input id="coupon-code-input" type="text" placeholder="e.g. WELCOME10" class="form-control" style="text-transform: uppercase;" />
            <button class="btn btn-secondary btn-sm" onclick="applyCoupon()" style="font-weight: 700;">Apply</button>
          </div>
          <!-- Quick coupon chips -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
            <span class="badge badge-primary" style="cursor: pointer;" onclick="quickFillCoupon('WELCOME10')">WELCOME10</span>
            <span class="badge badge-primary" style="cursor: pointer;" onclick="quickFillCoupon('SAVE200')">SAVE200</span>
            <span class="badge badge-primary" style="cursor: pointer;" onclick="quickFillCoupon('FREESHIP')">FREESHIP</span>
          </div>
        `}
      </div>

      <!-- Checkout Button -->
      <a href="checkout.html" class="btn btn-primary btn-lg btn-block" style="box-shadow: 0 4px 14px var(--primary-glow);">
        Proceed to Checkout <i class="fas fa-arrow-right"></i>
      </a>

      <div style="text-align: center; margin-top: 1rem;">
        <a href="shop.html" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
          <i class="fas fa-arrow-left"></i> Continue Shopping
        </a>
      </div>
    </div>
  `;
}

function renderFreeShippingMeter(cart) {
  const meter = document.getElementById('free-shipping-meter');
  if (!meter) return;

  const threshold = cart.freeShippingThreshold || 999;
  const current = cart.sellingSubtotal - cart.couponDiscount;
  const diff = threshold - current;

  if (diff <= 0) {
    meter.innerHTML = `
      <div style="background: var(--accent-light); color: var(--accent); padding: 10px 16px; border-radius: var(--radius-md); font-weight: 700; font-size: 0.875rem; display: flex; align-items: center; gap: 8px; margin-bottom: 1.5rem;">
        <i class="fas fa-truck-fast"></i> You have unlocked FREE Standard Shipping on this order!
      </div>
    `;
  } else {
    const pct = Math.min(100, Math.round((current / threshold) * 100));
    meter.innerHTML = `
      <div style="background: var(--surface-alt); border: 1px solid var(--surface-border); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; margin-bottom: 6px;">
          <span>Add ${formatCurrency(diff)} more for FREE shipping</span>
          <span>${pct}%</span>
        </div>
        <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: var(--primary); transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }
}

async function updateItemQuantity(itemId, newQty) {
  if (newQty < 1) {
    removeCartItem(itemId);
    return;
  }

  try {
    if (!auth.isLoggedIn()) {
      let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      const idx = localCart.findIndex(i => (i._id || i.product) === itemId);
      if (idx > -1) {
        localCart[idx].quantity = newQty;
        localStorage.setItem('guest_cart', JSON.stringify(localCart));
      }
      loadCartPage();
      return;
    }

    await api.patch(`/cart/items/${itemId}`, { quantity: newQty });
    loadCartPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeCartItem(itemId) {
  try {
    if (!auth.isLoggedIn()) {
      let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      localCart = localCart.filter(i => (i._id || i.product) !== itemId);
      localStorage.setItem('guest_cart', JSON.stringify(localCart));
      loadCartPage();
      showToast('Item removed', 'info');
      return;
    }

    await api.delete(`/cart/items/${itemId}`);
    showToast('Item removed from cart', 'info');
    loadCartPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function clearEntireCart() {
  if (!confirm('Are you sure you want to clear your shopping cart?')) return;

  try {
    if (!auth.isLoggedIn()) {
      localStorage.removeItem('guest_cart');
      loadCartPage();
      showToast('Cart cleared', 'info');
      return;
    }

    await api.delete('/cart');
    showToast('Cart cleared', 'info');
    loadCartPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function quickFillCoupon(code) {
  const input = document.getElementById('coupon-code-input');
  if (input) {
    input.value = code;
    applyCoupon();
  }
}

async function applyCoupon() {
  const input = document.getElementById('coupon-code-input');
  if (!input) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    showToast('Please enter a coupon code', 'warning');
    return;
  }

  if (!auth.isLoggedIn()) {
    showToast('Please log in to apply coupons to your order', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
    return;
  }

  try {
    const res = await api.post('/cart/coupon', { code });
    showToast(res.message, 'success');
    loadCartPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeCoupon() {
  try {
    const res = await api.delete('/cart/coupon');
    showToast(res.message, 'info');
    loadCartPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadCartPage);
