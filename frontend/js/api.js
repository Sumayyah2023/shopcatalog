const API_BASE = 'http://localhost:5000/api';

const api = {
  // Auth
  token: () => localStorage.getItem('token'),
  user: () => JSON.parse(localStorage.getItem('user') || 'null'),

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
    return h;
  },

  async request(method, path, body = null) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.request('GET', `/products?${qs}`);
  },
  getProduct: (id) => api.request('GET', `/products/${id}`),

  // Categories
  getCategories: () => api.request('GET', '/categories'),

  // Auth
  register: (data) => api.request('POST', '/auth/register', data),
  login: (data) => api.request('POST', '/auth/login', data),
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  },

  // Cart
  getCart: () => api.request('GET', '/cart'),
  addToCart: (product_id, quantity = 1) => api.request('POST', '/cart', { product_id, quantity }),
  removeFromCart: (itemId) => api.request('DELETE', `/cart/${itemId}`),
};

// Toast helper
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Update nav cart count
async function updateCartCount() {
  if (!api.token()) return;
  try {
    const cart = await api.getCart();
    const badge = document.getElementById('cart-count');
    if (badge) {
      badge.textContent = cart.items.length;
      badge.style.display = cart.items.length > 0 ? 'flex' : 'none';
    }
  } catch {}
}

// Update nav auth state
function updateNavAuth() {
  const user = api.user();
  const loginBtn = document.getElementById('login-btn');
  const userMenu = document.getElementById('user-menu');
  const userName = document.getElementById('user-name');

  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (userName) userName.textContent = user.name.split(' ')[0];
  } else {
    if (loginBtn) loginBtn.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
  }
}
