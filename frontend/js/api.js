/**
 * ShopSphere API Client & Global Utilities
 */

const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Send HTTP-only cookies
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
      throw err;
    }
  },

  get(endpoint, params) {
    let url = endpoint;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      ).toString();
      if (qs) url += `?${qs}`;
    }
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

/**
 * Currency Formatter (INR default)
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

/**
 * Delivery Date Utilities
 */
function getEstimatedDeliveryDate(type = 'standard', baseDate = new Date()) {
  const d = new Date(baseDate);
  const daysToAdd = type === 'express' ? 2 : 5;
  d.setDate(d.getDate() + daysToAdd);
  return d;
}

function formatDeliveryDate(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const defaults = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };
  return d.toLocaleDateString('en-IN', { ...defaults, ...options });
}

async function fetchPincodeEstimate(pincode) {
  try {
    return await api.get(`/shipping/estimate?pincode=${encodeURIComponent(pincode)}`);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${iconMap[type] || 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Update Header Cart Count Badge
 */
async function updateCartBadge() {
  try {
    const data = await api.get('/cart');
    const count = data.cart?.itemCount || 0;
    document.querySelectorAll('.cart-badge, .mobile-nav-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (err) {
    // If not logged in or error, check local storage cart
    const local = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    const count = local.reduce((sum, i) => sum + (i.quantity || 1), 0);
    document.querySelectorAll('.cart-badge, .mobile-nav-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }
}

/**
 * Global Search Autocomplete Handler
 */
function setupGlobalSearch() {
  const searchInputs = document.querySelectorAll('.global-search-input');
  searchInputs.forEach(input => {
    const dropdown = input.closest('.header-search')?.querySelector('.search-suggestions-dropdown');
    if (!dropdown) return;

    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const val = e.target.value.trim();
      if (val.length < 2) {
        dropdown.style.display = 'none';
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await api.get('/products', { search: val, limit: 5 });
          if (res.products && res.products.length > 0) {
            dropdown.innerHTML = res.products.map(p => `
              <div class="search-suggestion-item" onclick="window.location.href='product.html?id=${p._id}'">
                <img src="${p.images[0]}" alt="${p.title}" class="search-suggestion-img" />
                <div class="search-suggestion-info">
                  <h5>${p.title}</h5>
                  <span>${formatCurrency(p.sellingPrice)}</span>
                </div>
              </div>
            `).join('');
            dropdown.style.display = 'block';
          } else {
            dropdown.innerHTML = '<div style="padding: 12px; text-align: center; color: #64748b; font-size: 0.85rem;">No products found</div>';
            dropdown.style.display = 'block';
          }
        } catch (err) {
          dropdown.style.display = 'none';
        }
      }, 300);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Handle enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) window.location.href = `shop.html?search=${encodeURIComponent(val)}`;
      }
    });
  });
}

// Auto-run badge update on load
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  setupGlobalSearch();
});
