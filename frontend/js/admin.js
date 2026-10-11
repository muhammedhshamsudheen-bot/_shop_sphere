/**
 * Admin Dashboard Management Controller
 */

let adminActiveTab = 'overview';
let cachedCategories = [];

async function checkAdminAuth() {
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=admin.html';
    return false;
  }
  const user = await auth.fetchCurrentUser();
  if (!user || user.role !== 'admin') {
    alert('Access Denied: You must be an administrator to access this area.');
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

async function initAdminDashboard() {
  const isAuth = await checkAdminAuth();
  if (!isAuth) return;

  // Load categories for product forms
  try {
    const catData = await api.get('/categories');
    cachedCategories = catData.categories || [];
  } catch (e) {}

  switchAdminTab('overview');
}

function switchAdminTab(tab) {
  adminActiveTab = tab;

  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-tab') === tab) link.classList.add('active');
  });

  const titleEl = document.getElementById('admin-page-title');
  const contentEl = document.getElementById('admin-tab-content');

  if (tab === 'overview') {
    if (titleEl) titleEl.textContent = 'Store Overview & Analytics';
    loadAdminOverview(contentEl);
  } else if (tab === 'products') {
    if (titleEl) titleEl.textContent = 'Product Inventory Management';
    loadAdminProducts(contentEl);
  } else if (tab === 'orders') {
    if (titleEl) titleEl.textContent = 'Order Fulfillment & Logistics';
    loadAdminOrders(contentEl);
  } else if (tab === 'customers') {
    if (titleEl) titleEl.textContent = 'Customer Accounts';
    loadAdminCustomers(contentEl);
  } else if (tab === 'coupons') {
    if (titleEl) titleEl.textContent = 'Promotions & Coupons';
    loadAdminCoupons(contentEl);
  } else if (tab === 'reports') {
    if (titleEl) titleEl.textContent = 'Revenue & Sales Reports';
    loadAdminReports(contentEl);
  }
}

async function loadAdminOverview(container) {
  container.innerHTML = '<div class="skeleton" style="height: 300px;"></div>';

  try {
    const data = await api.get('/admin/dashboard');
    const { stats, recentOrders, lowStockProducts, dailySales } = data;

    container.innerHTML = `
      <!-- KPI Metrics -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-info">
            <h5>Total Revenue</h5>
            <h3>${formatCurrency(stats.totalRevenue)}</h3>
          </div>
          <div class="kpi-icon primary"><i class="fas fa-wallet"></i></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <h5>Total Orders</h5>
            <h3>${stats.totalOrders}</h3>
          </div>
          <div class="kpi-icon success"><i class="fas fa-shopping-bag"></i></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <h5>Total Customers</h5>
            <h3>${stats.totalCustomers}</h3>
          </div>
          <div class="kpi-icon warning"><i class="fas fa-users"></i></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-info">
            <h5>Low Stock Items</h5>
            <h3 style="color: ${stats.lowStockCount > 0 ? '#ef4444' : 'inherit'};">${stats.lowStockCount}</h3>
          </div>
          <div class="kpi-icon danger"><i class="fas fa-box"></i></div>
        </div>
      </div>

      <!-- 2 Columns: Recent Orders & Low Stock Alert -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Recent Orders</h3>
            <button class="btn btn-secondary btn-sm" onclick="switchAdminTab('orders')">View All</button>
          </div>
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentOrders.map(o => `
                  <tr>
                    <td><strong>${o.orderNumber}</strong></td>
                    <td>${o.shippingAddress?.fullName || o.user?.name || 'Customer'}</td>
                    <td><strong>${formatCurrency(o.totalAmount)}</strong></td>
                    <td><span class="status-badge ${o.orderStatus.toLowerCase().replace(/\s+/g, '')}">${o.orderStatus}</span></td>
                    <td>
                      <a href="order-details.html?id=${o._id}" class="btn btn-secondary btn-sm" target="_blank">
                        <i class="fas fa-eye"></i>
                      </a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Low Stock Alert Box -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Low Stock Watchlist</h3>
          </div>
          <div style="padding: 1rem;">
            ${lowStockProducts.length === 0 ? '<p style="color: #64748b; font-size: 0.85rem;">All inventory items healthy.</p>' : ''}
            ${lowStockProducts.map(p => `
              <div style="display: flex; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--surface-border);">
                <img src="${p.images[0]}" alt="${p.title}" style="width: 40px; height: 40px; object-fit: cover; border-radius: var(--radius-sm);" />
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 0.85rem; line-height: 1.2;">${p.title}</div>
                  <span class="badge badge-danger" style="margin-top: 2px;">Only ${p.stockQuantity} left</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">Error loading dashboard: ${err.message}</div>`;
  }
}

async function loadAdminProducts(container) {
  container.innerHTML = '<div class="skeleton" style="height: 300px;"></div>';

  try {
    const data = await api.get('/products', { limit: 50 });
    const products = data.products || [];

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <input type="text" id="admin-prod-search" placeholder="Search product..." class="form-control" style="width: 250px; padding: 6px 12px;" onkeyup="filterAdminProducts(this.value)" />
          </div>
          <button class="btn btn-primary btn-sm" onclick="openProductModal()">
            <i class="fas fa-plus"></i> Add New Product
          </button>
        </div>

        <div class="admin-table-container">
          <table class="admin-table" id="admin-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>GST Rate</th>
                <th>Stock</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr data-title="${p.title.toLowerCase()}">
                  <td>
                    <div class="table-product-cell">
                      <img src="${p.images[0]}" class="table-product-thumb" alt="${p.title}" />
                      <div>
                        <strong>${p.title}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td>${p.categoryName || 'General'}</td>
                  <td><strong>${formatCurrency(p.sellingPrice)}</strong></td>
                  <td><span class="badge badge-primary">${p.taxRate}%</span></td>
                  <td>
                    <span class="badge ${p.stockQuantity <= 5 ? 'badge-danger' : 'badge-success'}">
                      ${p.stockQuantity}
                    </span>
                  </td>
                  <td>★ ${p.averageRating} (${p.numReviews})</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="editProductModal('${p._id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">${err.message}</div>`;
  }
}

function filterAdminProducts(term) {
  const rows = document.querySelectorAll('#admin-products-table tbody tr');
  rows.forEach(r => {
    const title = r.getAttribute('data-title') || '';
    r.style.display = title.includes(term.toLowerCase()) ? '' : 'none';
  });
}

async function loadAdminOrders(container) {
  container.innerHTML = '<div class="skeleton" style="height: 300px;"></div>';

  try {
    const data = await api.get('/admin/orders');
    const orders = data.orders || [];

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>Customer Orders (${data.total})</h3>
        </div>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Order Status</th>
                <th>Fulfillment Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td><strong>${o.orderNumber}</strong></td>
                  <td>
                    <strong>${o.shippingAddress?.fullName || 'Customer'}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${o.shippingAddress?.phone}</div>
                  </td>
                  <td>${new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</td>
                  <td><strong>${formatCurrency(o.totalAmount)}</strong></td>
                  <td><span class="badge badge-success">${o.paymentStatus}</span></td>
                  <td><span class="status-badge ${o.orderStatus.toLowerCase().replace(/\s+/g, '')}">${o.orderStatus}</span></td>
                  <td>
                    <select onchange="updateOrderStatus('${o._id}', this.value)" class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: 150px;">
                      <option value="">Update Status...</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Processing">Processing</option>
                      <option value="Packed">Packed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Returned">Returned</option>
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">${err.message}</div>`;
  }
}

async function updateOrderStatus(orderId, status) {
  if (!status) return;
  const note = prompt(`Enter tracking note for status update to "${status}" (optional):`);

  try {
    await api.patch(`/admin/orders/${orderId}/status`, { status, note });
    showToast(`Order status updated to ${status}`, 'success');
    switchAdminTab('orders');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAdminCustomers(container) {
  container.innerHTML = '<div class="skeleton" style="height: 300px;"></div>';

  try {
    const data = await api.get('/admin/customers');
    const customers = data.customers || [];

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>Customer Accounts (${data.total})</h3>
        </div>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map(c => `
                <tr>
                  <td>
                    <strong>${c.name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${c.email}</div>
                  </td>
                  <td>${c.phone || 'N/A'}</td>
                  <td><strong>${c.totalOrders || 0}</strong></td>
                  <td><strong>${formatCurrency(c.totalSpent || 0)}</strong></td>
                  <td><span class="badge ${c.isActive ? 'badge-success' : 'badge-danger'}">${c.isActive ? 'Active' : 'Disabled'}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="toggleCustomerAccount('${c._id}')">
                      ${c.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">${err.message}</div>`;
  }
}

async function toggleCustomerAccount(userId) {
  try {
    const res = await api.patch(`/admin/customers/${userId}/toggle-status`, {});
    showToast(res.message, 'info');
    switchAdminTab('customers');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAdminCoupons(container) {
  container.innerHTML = '<div class="skeleton" style="height: 300px;"></div>';

  try {
    const data = await api.get('/coupons/admin/all');
    const coupons = data.coupons || [];

    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>Coupons & Discount Engine</h3>
          <button class="btn btn-primary btn-sm" onclick="openCouponModal()">
            <i class="fas fa-plus"></i> Create Coupon
          </button>
        </div>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Spend</th>
                <th>Used / Limit</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${coupons.map(cp => `
                <tr>
                  <td><strong style="color: var(--primary);">${cp.code}</strong></td>
                  <td>${cp.discountType === 'percentage' ? cp.discountValue + '%' : formatCurrency(cp.discountValue)}</td>
                  <td>${formatCurrency(cp.minOrderValue)}</td>
                  <td>${cp.usedCount} / ${cp.usageLimit}</td>
                  <td>${new Date(cp.validUntil).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td><span class="badge ${cp.isActive ? 'badge-success' : 'badge-danger'}">${cp.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteCoupon('${cp._id}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">${err.message}</div>`;
  }
}

async function loadAdminReports(container) {
  container.innerHTML = '<div class="skeleton" style="height: 300px;"></div>';

  try {
    const data = await api.get('/admin/reports');
    const { bestSelling, categoryRevenue } = data;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Top Selling Products</h3>
          </div>
          <div style="padding: 1.5rem;">
            ${bestSelling.map(b => `
              <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 1rem;">
                <img src="${b.image}" alt="${b.title}" style="width: 44px; height: 44px; object-fit: cover; border-radius: var(--radius-sm);" />
                <div style="flex: 1;">
                  <strong>${b.title}</strong>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">${b.totalUnitsSold} units sold</div>
                </div>
                <strong>${formatCurrency(b.totalRevenue)}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">
            <h3>Revenue by Category</h3>
          </div>
          <div style="padding: 1.5rem;">
            ${categoryRevenue.map(c => `
              <div style="margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px;">
                  <span>${c._id || 'General'}</span>
                  <span>${formatCurrency(c.revenue)} (${c.units} items)</span>
                </div>
                <div style="height: 6px; background: #e2e8f0; border-radius: 999px;">
                  <div style="height: 100%; width: 65%; background: var(--primary); border-radius: 999px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444;">${err.message}</div>`;
  }
}

function openProductModal(product = null) {
  let modal = document.getElementById('admin-product-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-product-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const categoryOptions = cachedCategories.map(c => `
    <option value="${c._id}" ${product && product.category === c._id ? 'selected' : ''}>${c.name}</option>
  `).join('');

  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 650px;">
      <div class="modal-header">
        <h3>${product ? 'Edit Product' : 'Add New Product'}</h3>
        <button class="modal-close-btn" onclick="closeProductModal()">&times;</button>
      </div>
      <form onsubmit="handleSaveProduct(event, '${product ? product._id : ''}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Product Title *</label>
            <input type="text" id="p-title" class="form-control" value="${product ? product.title : ''}" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Brand *</label>
              <input type="text" id="p-brand" class="form-control" value="${product ? product.brand : ''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Category *</label>
              <select id="p-category" class="form-control" required>
                ${categoryOptions}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Original Price (₹) *</label>
              <input type="number" id="p-orig-price" class="form-control" value="${product ? product.originalPrice : ''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Selling Price (₹) *</label>
              <input type="number" id="p-sell-price" class="form-control" value="${product ? product.sellingPrice : ''}" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">GST Tax Rate (%)</label>
              <select id="p-tax" class="form-control">
                <option value="5" ${product && product.taxRate === 5 ? 'selected' : ''}>5% (Footwear/Apparel)</option>
                <option value="12" ${product && product.taxRate === 12 ? 'selected' : ''}>12% (Standard Goods)</option>
                <option value="18" ${!product || product.taxRate === 18 ? 'selected' : ''}>18% (Electronics/Luxury)</option>
                <option value="28" ${product && product.taxRate === 28 ? 'selected' : ''}>28% (Special Goods)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Initial Stock Quantity *</label>
              <input type="number" id="p-stock" class="form-control" value="${product ? product.stockQuantity : 20}" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Image URL *</label>
            <input type="url" id="p-image" class="form-control" value="${product ? product.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'}" required />
          </div>

          <div class="form-group">
            <label class="form-label">Description *</label>
            <textarea id="p-desc" class="form-control" rows="3" required>${product ? product.description : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeProductModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Product</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('admin-product-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveProduct(e, productId) {
  e.preventDefault();
  const title = document.getElementById('p-title').value;
  const brand = document.getElementById('p-brand').value;
  const category = document.getElementById('p-category').value;
  const originalPrice = Number(document.getElementById('p-orig-price').value);
  const sellingPrice = Number(document.getElementById('p-sell-price').value);
  const taxRate = Number(document.getElementById('p-tax').value);
  const stockQuantity = Number(document.getElementById('p-stock').value);
  const image = document.getElementById('p-image').value;
  const description = document.getElementById('p-desc').value;

  const payload = {
    title, brand, category, originalPrice, sellingPrice, taxRate, stockQuantity,
    images: [image], description
  };

  try {
    if (productId) {
      await api.put(`/products/${productId}`, payload);
      showToast('Product updated successfully', 'success');
    } else {
      await api.post('/products', payload);
      showToast('Product created successfully', 'success');
    }
    closeProductModal();
    switchAdminTab('products');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editProductModal(productId) {
  try {
    const data = await api.get(`/products/${productId}`);
    openProductModal(data.product);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to deactivate/delete this product?')) return;
  try {
    await api.delete(`/products/${productId}`);
    showToast('Product removed', 'info');
    switchAdminTab('products');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openCouponModal() {
  let modal = document.getElementById('admin-coupon-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-coupon-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Create Promotional Coupon</h3>
        <button class="modal-close-btn" onclick="closeCouponModal()">&times;</button>
      </div>
      <form onsubmit="handleCreateCoupon(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Coupon Code (Uppercase) *</label>
            <input type="text" id="cp-code" class="form-control" placeholder="e.g. FLASH20" required style="text-transform: uppercase;" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Discount Type *</label>
              <select id="cp-type" class="form-control">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="shipping">Free Shipping</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Discount Value *</label>
              <input type="number" id="cp-value" class="form-control" placeholder="10 or 200" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Min Order Spend (₹)</label>
              <input type="number" id="cp-min" class="form-control" value="500" />
            </div>
            <div class="form-group">
              <label class="form-label">Usage Limit</label>
              <input type="number" id="cp-limit" class="form-control" value="1000" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Valid Until *</label>
            <input type="date" id="cp-date" class="form-control" value="2027-12-31" required />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeCouponModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Coupon</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.add('active');
}

function closeCouponModal() {
  const modal = document.getElementById('admin-coupon-modal');
  if (modal) modal.classList.remove('active');
}

async function handleCreateCoupon(e) {
  e.preventDefault();
  const code = document.getElementById('cp-code').value.trim().toUpperCase();
  const discountType = document.getElementById('cp-type').value;
  const discountValue = Number(document.getElementById('cp-value').value);
  const minOrderValue = Number(document.getElementById('cp-min').value);
  const usageLimit = Number(document.getElementById('cp-limit').value);
  const validUntil = new Date(document.getElementById('cp-date').value);

  try {
    await api.post('/coupons/admin', {
      code, discountType, discountValue, minOrderValue, usageLimit, validUntil
    });
    showToast(`Coupon ${code} created successfully`, 'success');
    closeCouponModal();
    switchAdminTab('coupons');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCoupon(couponId) {
  if (!confirm('Are you sure you want to delete this coupon?')) return;
  try {
    await api.delete(`/coupons/admin/${couponId}`);
    showToast('Coupon deleted', 'info');
    switchAdminTab('coupons');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initAdminDashboard);
