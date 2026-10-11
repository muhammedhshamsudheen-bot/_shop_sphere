/**
 * ShopSphere Authentication & User Session Manager
 */

const auth = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user_data') || 'null');
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_data');
    }
  },

  isLoggedIn() {
    return Boolean(this.getUser() && api.getToken());
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  async fetchCurrentUser() {
    try {
      if (!api.getToken()) {
        this.setUser(null);
        return null;
      }
      const data = await api.get('/auth/me');
      this.setUser(data.user);
      return data.user;
    } catch (err) {
      this.setUser(null);
      api.setToken(null);
      return null;
    }
  },

  async login(email, password) {
    try {
      const data = await api.post('/auth/login', { email, password });
      api.setToken(data.token);
      this.setUser(data.user);

      // Sync guest cart if any
      await this.syncGuestCart();

      showToast(`Welcome back, ${data.user.name}!`, 'success');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  },

  async register(formData) {
    try {
      const data = await api.post('/auth/register', formData);
      api.setToken(data.token);
      this.setUser(data.user);

      await this.syncGuestCart();

      showToast('Registration successful! Welcome to ShopSphere.', 'success');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      // Ignore network errors on logout
    }
    api.setToken(null);
    this.setUser(null);
    showToast('You have been logged out.', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  },

  async syncGuestCart() {
    try {
      const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      if (guestCart.length > 0) {
        await api.post('/cart/sync', { localItems: guestCart });
        localStorage.removeItem('guest_cart');
      }
      await updateCartBadge();
    } catch (e) {
      console.warn('Could not sync guest cart:', e);
    }
  },

  syncAuthUI() {
    const user = this.getUser();
    const userNavSlots = document.querySelectorAll('.auth-nav-slot');

    userNavSlots.forEach(slot => {
      if (user) {
        slot.innerHTML = `
          <div style="position: relative; display: inline-block;">
            <button class="nav-action-btn" id="user-profile-menu-toggle" style="background: var(--surface-alt); border-radius: var(--radius-full);">
              <i class="fas fa-user-circle" style="color: var(--primary);"></i>
              <span class="btn-text-label" style="font-weight: 700;">${user.name.split(' ')[0]}</span>
              <i class="fas fa-chevron-down" style="font-size: 0.7rem; margin-left: 2px;"></i>
            </button>
            <div id="user-profile-dropdown" class="user-dropdown-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); background: #ffffff; border-radius: var(--radius-md); box-shadow: var(--shadow-xl); border: 1px solid var(--surface-border); min-width: 200px; z-index: 1000; overflow: hidden;">
              <div style="padding: 12px 16px; border-bottom: 1px solid var(--surface-border); background: var(--surface-alt);">
                <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${user.name}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${user.email}</div>
                ${user.role === 'admin' ? '<span class="badge badge-primary" style="margin-top: 4px;">ADMIN</span>' : ''}
              </div>
              <a href="profile.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 0.875rem; color: var(--text-main);"><i class="fas fa-id-card"></i> My Profile</a>
              <a href="orders.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 0.875rem; color: var(--text-main);"><i class="fas fa-box"></i> My Orders</a>
              <a href="wishlist.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 0.875rem; color: var(--text-main);"><i class="fas fa-heart"></i> My Wishlist</a>
              ${user.role === 'admin' ? '<a href="admin.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 0.875rem; color: var(--primary); font-weight: 700;"><i class="fas fa-chart-line"></i> Admin Dashboard</a>' : ''}
              <div style="border-top: 1px solid var(--surface-border);"></div>
              <button onclick="auth.logout()" style="width: 100%; text-align: left; display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 0.875rem; color: var(--danger); background: none; border: none; cursor: pointer; font-weight: 600;"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
          </div>
        `;

        const toggleBtn = slot.querySelector('#user-profile-menu-toggle');
        const dropdown = slot.querySelector('#user-profile-dropdown');

        if (toggleBtn && dropdown) {
          toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
          });
          document.addEventListener('click', (e) => {
            if (!toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
              dropdown.style.display = 'none';
            }
          });
        }
      } else {
        slot.innerHTML = `
          <a href="login.html" class="btn btn-primary btn-sm">
            <i class="fas fa-sign-in-alt"></i>
            <span class="btn-text-label">Login</span>
          </a>
        `;
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (api.getToken()) {
    await auth.fetchCurrentUser();
  }
  auth.syncAuthUI();
});
