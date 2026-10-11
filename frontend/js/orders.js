/**
 * Customer Orders & Visual Timeline Tracking Module
 */

async function initOrdersListPage() {
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  const container = document.getElementById('orders-list-container');
  if (!container) return;

  try {
    const data = await api.get('/orders/my-orders');

    if (!data.orders || data.orders.length === 0) {
      container.innerHTML = `
        <div style="background: #ffffff; border-radius: var(--radius-lg); padding: 4rem 1rem; text-align: center; border: 1px solid var(--surface-border);">
          <i class="fas fa-box-open" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">No orders placed yet</h3>
          <p style="color: #64748b; margin-bottom: 1.5rem;">You haven't purchased any items yet. Discover our latest collections!</p>
          <a href="shop.html" class="btn btn-primary">Start Shopping</a>
        </div>
      `;
      return;
    }

    container.innerHTML = data.orders.map(order => {
      const estDate = order.estimatedDeliveryDate
        ? formatDeliveryDate(order.estimatedDeliveryDate)
        : formatDeliveryDate(getEstimatedDeliveryDate(order.deliveryMethod || 'standard', order.createdAt));

      let deliveryBadgeHtml = '';
      if (order.orderStatus === 'Delivered') {
        deliveryBadgeHtml = `<span class="order-delivery-tag delivered"><i class="fas fa-check-circle"></i> Delivered on ${formatDeliveryDate(order.updatedAt)}</span>`;
      } else if (order.orderStatus === 'Cancelled') {
        deliveryBadgeHtml = `<span class="order-delivery-tag cancelled"><i class="fas fa-ban"></i> Cancelled</span>`;
      } else {
        deliveryBadgeHtml = `<span class="order-delivery-tag in-transit"><i class="fas fa-truck-fast"></i> Expected Delivery: <strong>${estDate}</strong></span>`;
      }

      return `
        <div class="order-card" style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-xs);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--surface-border); padding-bottom: 1rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Order ID</div>
              <strong style="font-size: 1.05rem; color: var(--primary);">${order.orderNumber}</strong>
              <span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 10px;">
                Placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
              ${getOrderStatusBadge(order.orderStatus)}
              <a href="order-details.html?id=${order._id}" class="btn btn-secondary btn-sm">
                View Order Details <i class="fas fa-chevron-right"></i>
              </a>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; padding-bottom: 0.6rem; border-bottom: 1px dashed var(--surface-border); flex-wrap: wrap; gap: 8px;">
            ${deliveryBadgeHtml}
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              <i class="fas fa-shipping-fast" style="color: var(--primary);"></i> ${order.deliveryMethod === 'express' ? 'Express Priority' : 'Standard Delivery'}
            </span>
          </div>

          <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 1rem;">
            ${order.items.map(i => `
              <img src="${i.image}" alt="${i.title}" title="${i.title} (${i.quantity}x)" style="width: 64px; height: 64px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--surface-border);" />
            `).join('')}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; border-top: 1px dashed var(--surface-border); padding-top: 0.75rem;">
            <span style="color: var(--text-muted);">${order.items.length} items total</span>
            <div>
              <span style="color: var(--text-muted); margin-right: 6px;">Total Paid:</span>
              <strong style="font-size: 1.15rem; color: var(--text-main);">${formatCurrency(order.totalAmount)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error: ${err.message}</div>`;
  }
}

async function initOrderDetailsPage() {
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');

  if (!orderId) {
    window.location.href = 'orders.html';
    return;
  }

  const container = document.getElementById('order-details-container');
  if (!container) return;

  try {
    const data = await api.get(`/orders/${orderId}`);
    const order = data.order;

    document.title = `Order ${order.orderNumber} | ShopSphere`;
    renderOrderDetailsView(order);
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
        <h2>Order Not Found</h2>
        <p style="color: #64748b; margin-bottom: 1.5rem;">${err.message}</p>
        <a href="orders.html" class="btn btn-primary">Back to Orders</a>
      </div>
    `;
  }
}

function renderOrderDetailsView(order) {
  const container = document.getElementById('order-details-container');
  if (!container) return;

  const cancellable = ['Pending', 'Confirmed', 'Processing'].includes(order.orderStatus);
  const returnable = order.orderStatus === 'Delivered';
  const estDate = order.estimatedDeliveryDate
    ? formatDeliveryDate(order.estimatedDeliveryDate)
    : formatDeliveryDate(getEstimatedDeliveryDate(order.deliveryMethod || 'standard', order.createdAt));

  container.innerHTML = `
    <!-- Header with Actions -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <h1 style="font-size: 1.75rem; font-weight: 800;">Order ${order.orderNumber}</h1>
          ${getOrderStatusBadge(order.orderStatus)}
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">
          Placed on ${new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" onclick="printInvoice()">
          <i class="fas fa-print"></i> Print Invoice
        </button>
        ${cancellable ? `
          <button class="btn btn-danger btn-sm" onclick="cancelCustomerOrder('${order._id}')">
            <i class="fas fa-times"></i> Cancel Order
          </button>
        ` : ''}
        ${returnable ? `
          <button class="btn btn-warning btn-sm" onclick="requestCustomerReturn('${order._id}')">
            <i class="fas fa-undo"></i> Request Return
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Estimated Delivery Hero Card -->
    <div style="background: ${order.orderStatus === 'Delivered' ? 'var(--accent-light)' : (order.orderStatus === 'Cancelled' ? 'var(--danger-light)' : 'linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%)')}; border: 1.5px solid ${order.orderStatus === 'Delivered' ? 'rgba(16, 185, 129, 0.3)' : (order.orderStatus === 'Cancelled' ? 'rgba(239, 68, 68, 0.3)' : 'var(--primary-glow)')}; border-radius: var(--radius-lg); padding: 1.25rem 1.75rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: ${order.orderStatus === 'Delivered' ? 'var(--accent)' : (order.orderStatus === 'Cancelled' ? 'var(--danger)' : 'var(--primary)')}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
          <i class="fas ${order.orderStatus === 'Delivered' ? 'fa-check' : (order.orderStatus === 'Cancelled' ? 'fa-ban' : 'fa-truck-fast')}"></i>
        </div>
        <div>
          <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">
            ${order.orderStatus === 'Delivered' ? 'Delivered' : (order.orderStatus === 'Cancelled' ? 'Order Cancelled' : 'Estimated Delivery Date')}
          </span>
          <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">
            ${order.orderStatus === 'Delivered' ? `Delivered on ${formatDeliveryDate(order.updatedAt)}` : (order.orderStatus === 'Cancelled' ? 'This order was cancelled' : `Arriving by ${estDate}`)}
          </h2>
        </div>
      </div>
      <div>
        <span class="badge ${order.deliveryMethod === 'express' ? 'badge-primary' : 'badge-info'}" style="font-size: 0.85rem; padding: 6px 14px;">
          ${order.deliveryMethod === 'express' ? '⚡ Express Priority' : '📦 Standard Delivery'}
        </span>
      </div>
    </div>

    <!-- Timeline Tracker -->
    <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: 2.25rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
      <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 1.5rem;">
        <i class="fas fa-truck" style="color: var(--primary);"></i> Shipment Progress
      </h3>
      ${renderTimelineTracker(order, estDate)}
    </div>

    <!-- 2 Column Details: Items & Summary -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;" class="order-detail-grid">
      <!-- Items table -->
      <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: 2rem;">
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 1.25rem;">Purchased Items</h3>
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${order.items.map(item => `
            <div style="display: flex; gap: 1rem; align-items: center; border-bottom: 1px solid var(--surface-border); padding-bottom: 1rem;">
              <img src="${item.image}" alt="${item.title}" style="width: 70px; height: 70px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--surface-border);" />
              <div style="flex: 1;">
                <h4 style="font-size: 0.95rem; font-weight: 700;">${item.title}</h4>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Qty: <strong>${item.quantity}</strong> | Price: <strong>${formatCurrency(item.sellingPrice)}</strong>
                  ${item.size ? ' | Size: ' + item.size : ''} ${item.color ? ' | Color: ' + item.color : ''}
                  <span style="margin-left: 8px;" class="badge badge-primary">GST ${item.taxRate}%</span>
                </div>
              </div>
              <div style="font-weight: 800; font-size: 1.05rem;">
                ${formatCurrency(item.subtotal)}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Shipping & Payment Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--surface-border); font-size: 0.9rem;">
          <div>
            <h5 style="font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem; text-transform: uppercase; font-size: 0.8rem;">Delivery Address</h5>
            <strong>${order.shippingAddress.fullName}</strong><br/>
            ${order.shippingAddress.street}, ${order.shippingAddress.city}<br/>
            ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}<br/>
            Phone: ${order.shippingAddress.phone}
          </div>
          <div>
            <h5 style="font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem; text-transform: uppercase; font-size: 0.8rem;">Payment & Shipping Info</h5>
            Method: <strong>${order.paymentMethod}</strong><br/>
            Status: <span class="badge badge-success">${order.paymentStatus.toUpperCase()}</span><br/>
            Tracking ID: <strong>${order.trackingNumber || 'TRK' + order._id.toString().slice(-8).toUpperCase()}</strong><br/>
            Estimated Arrival: <strong style="color: #047857;">${estDate}</strong>
          </div>
        </div>
      </div>

      <!-- Financial Breakdown -->
      <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: 2rem; height: fit-content;">
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 1.25rem;">Payment Summary</h3>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Original Subtotal</span>
            <span>${formatCurrency(order.originalSubtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: var(--accent);">
            <span>Product Discount</span>
            <span>-${formatCurrency(order.productDiscountTotal)}</span>
          </div>
          ${order.couponDiscountTotal > 0 ? `
            <div style="display: flex; justify-content: space-between; color: var(--primary); font-weight: 700;">
              <span>Coupon Discount (${order.couponCode})</span>
              <span>-${formatCurrency(order.couponDiscountTotal)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Delivery Fee</span>
            <span>${order.shippingFee === 0 ? '<strong style="color: var(--accent);">FREE</strong>' : formatCurrency(order.shippingFee)}</span>
          </div>
          <div style="border-top: 1px dashed var(--surface-border); padding-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
            <div style="display: flex; justify-content: space-between;">
              <span>Taxable Subtotal</span>
              <span>${formatCurrency(order.taxableAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Total GST Included</span>
              <span>${formatCurrency(order.taxAmount)}</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 2px solid var(--surface-border); padding-top: 0.75rem; font-size: 1.25rem; font-weight: 800;">
            <span>Grand Total</span>
            <span style="color: var(--primary);">${formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTimelineTracker(order, estDate = '') {
  const steps = [
    { key: 'Confirmed', label: 'Order Confirmed', icon: 'fa-check' },
    { key: 'Processing', label: 'Processing & Packed', icon: 'fa-box' },
    { key: 'Shipped', label: 'Shipped', icon: 'fa-truck-fast' },
    { key: 'Out for Delivery', label: 'Out for Delivery', icon: 'fa-motorcycle' },
    { key: 'Delivered', label: 'Delivered', icon: 'fa-house-circle-check' }
  ];

  const statusOrder = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
  const currentIndex = statusOrder.indexOf(order.orderStatus);

  if (order.orderStatus === 'Cancelled') {
    return `
      <div style="background: var(--danger-light); color: var(--danger); padding: 1.25rem; border-radius: var(--radius-md); font-weight: 700;">
        <i class="fas fa-ban"></i> This order was Cancelled. ${order.cancelReason ? 'Reason: ' + order.cancelReason : ''}
      </div>
    `;
  }

  const timelineEvents = order.timeline || [];

  return `
    <div style="display: flex; justify-content: space-between; position: relative; margin-top: 1.5rem;" class="order-timeline-stepper">
      ${steps.map((st, idx) => {
        const isPastOrCurrent = currentIndex >= statusOrder.indexOf(st.key);
        const event = timelineEvents.find(e => e.status === st.key);

        return `
          <div style="display: flex; flex-direction: column; align-items: center; flex: 1; text-align: center; position: relative;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: ${isPastOrCurrent ? 'var(--accent)' : '#e2e8f0'}; color: ${isPastOrCurrent ? '#ffffff' : '#94a3b8'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 0.6rem; z-index: 2; box-shadow: ${isPastOrCurrent ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'};">
              <i class="fas ${st.icon}"></i>
            </div>
            <strong style="font-size: 0.85rem; color: ${isPastOrCurrent ? 'var(--text-main)' : 'var(--text-muted)'}; margin-bottom: 2px;">${st.label}</strong>
            ${event ? `
              <span style="font-size: 0.72rem; color: var(--text-muted);">
                ${new Date(event.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </span>
            ` : (st.key === 'Delivered' && estDate ? `
              <span style="font-size: 0.72rem; color: #047857; font-weight: 700;">
                Est: ${estDate}
              </span>
            ` : '')}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getOrderStatusBadge(status) {
  const map = {
    'Pending': 'badge-warning',
    'Confirmed': 'badge-primary',
    'Processing': 'badge-info',
    'Packed': 'badge-info',
    'Shipped': 'badge-primary',
    'Out for Delivery': 'badge-warning',
    'Delivered': 'badge-success',
    'Cancelled': 'badge-danger',
    'Return Requested': 'badge-warning',
    'Returned': 'badge-danger',
    'Refunded': 'badge-success'
  };
  return `<span class="badge ${map[status] || 'badge-primary'}" style="font-size: 0.825rem; padding: 4px 10px;">${status}</span>`;
}

async function cancelCustomerOrder(orderId) {
  const reason = prompt('Please tell us why you want to cancel this order:');
  if (!reason) return;

  try {
    const res = await api.post(`/orders/${orderId}/cancel`, { reason });
    showToast(res.message, 'success');
    setTimeout(() => { location.reload(); }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function requestCustomerReturn(orderId) {
  const reason = prompt('Please state the reason for requesting a return:');
  if (!reason) return;

  try {
    const res = await api.post(`/orders/${orderId}/return`, { reason });
    showToast(res.message, 'success');
    setTimeout(() => { location.reload(); }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function printInvoice() {
  window.print();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('orders-list-container')) initOrdersListPage();
  if (document.getElementById('order-details-container')) initOrderDetailsPage();
});
