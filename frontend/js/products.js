let currentPage = 1;
let currentCategory = '';
let authMode = 'login';

// Init
document.addEventListener('DOMContentLoaded', async () => {
  updateNavAuth();
  updateCartCount();
  await loadCategories();
  await loadProducts();

  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyFilters();
  });
});

async function loadCategories() {
  try {
    const cats = await api.getCategories();
    const pills = document.getElementById('category-pills');
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.dataset.slug = cat.slug;
      btn.textContent = cat.name;
      btn.onclick = () => selectCategory(btn);
      pills.appendChild(btn);
    });
  } catch {}
}

function selectCategory(el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  currentCategory = el.dataset.slug;
  currentPage = 1;
  loadProducts();
}

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = Array(8).fill(`
    <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div class="skeleton" style="height:200px"></div>
      <div style="padding:1rem">
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:20px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;margin-bottom:16px"></div>
        <div class="skeleton" style="height:36px"></div>
      </div>
    </div>`).join('');

  try {
    const params = { page: currentPage, limit: 12 };
    if (currentCategory) params.category = currentCategory;
    const search = document.getElementById('search-input').value.trim();
    if (search) params.search = search;
    const minPrice = document.getElementById('min-price').value;
    const maxPrice = document.getElementById('max-price').value;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    const data = await api.getProducts(params);
    renderProducts(data.products);
    renderPagination(data.pagination);

    document.getElementById('products-count').textContent =
      `${data.pagination.total} product${data.pagination.total !== 1 ? 's' : ''} found`;
    document.getElementById('products-title').textContent =
      currentCategory
        ? document.querySelector('.pill.active')?.textContent + ' Products'
        : 'All Products';
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">😕</div>
      <h3>Failed to load products</h3>
      <p>${err.message}</p>
    </div>`;
  }
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🔍</div>
      <h3>No products found</h3>
      <p>Try adjusting your search or filters</p>
    </div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const stockClass = p.stock === 0 ? 'out-stock' : p.stock < 10 ? 'low-stock' : 'in-stock';
    const stockText = p.stock === 0 ? 'Out of Stock' : p.stock < 10 ? `Only ${p.stock} left` : 'In Stock';
    return `
      <div class="product-card" onclick="window.location='product.html?id=${p.id}'">
        <img src="${p.image_url}" alt="${p.name}" loading="lazy" />
        <div class="product-card-body">
          <div class="product-category">${p.category_name || ''}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description || ''}</div>
          <div class="product-footer">
            <span class="product-price">$${parseFloat(p.price).toFixed(2)}</span>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem">
              <span class="stock-badge ${stockClass}">${stockText}</span>
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart(${p.id}, '${p.name}')"
                ${p.stock === 0 ? 'disabled' : ''}>
                🛒 Add
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderPagination({ page, pages }) {
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyFilters() { currentPage = 1; loadProducts(); }

function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('min-price').value = '';
  document.getElementById('max-price').value = '';
  currentCategory = '';
  document.querySelectorAll('.pill').forEach((p, i) => p.classList.toggle('active', i === 0));
  loadProducts();
}

async function addToCart(productId, name) {
  if (!api.token()) { openModal('login'); return; }
  try {
    await api.addToCart(productId);
    toast(`✓ "${name}" added to cart!`);
    updateCartCount();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// Auth modal
function openModal(mode) {
  authMode = mode;
  document.getElementById('auth-modal').classList.add('open');
  switchToMode(mode);
}

function closeModal() { document.getElementById('auth-modal').classList.remove('open'); }

function switchToMode(mode) {
  authMode = mode;
  document.getElementById('modal-title').textContent = mode === 'login' ? 'Welcome Back' : 'Create Account';
  document.getElementById('register-name-group').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('form-toggle').innerHTML = mode === 'login'
    ? `Don't have an account? <span onclick="switchMode()">Register</span>`
    : `Already have an account? <span onclick="switchMode()">Login</span>`;
}

function switchMode() { switchToMode(authMode === 'login' ? 'register' : 'login'); }

async function submitAuth() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { toast('Please fill all fields', 'error'); return; }

  try {
    let data;
    if (authMode === 'register') {
      const name = document.getElementById('reg-name').value;
      if (!name) { toast('Name is required', 'error'); return; }
      data = await api.register({ name, email, password });
    } else {
      data = await api.login({ email, password });
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    closeModal();
    updateNavAuth();
    updateCartCount();
    toast(`Welcome, ${data.user.name.split(' ')[0]}!`);
  } catch (err) {
    toast(err.message, 'error');
  }
}

// Close modal on overlay click
document.getElementById('auth-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('auth-modal')) closeModal();
});
