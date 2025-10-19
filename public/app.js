const productsEl = document.getElementById('products');
const cartDialog = document.getElementById('cartDialog');
const checkoutDialog = document.getElementById('checkoutDialog');
const cartButton = document.getElementById('cartButton');
const cartCountEl = document.getElementById('cartCount');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutButton = document.getElementById('checkoutButton');
const checkoutForm = document.getElementById('checkoutForm');
const placeOrderButton = document.getElementById('placeOrderButton');
const searchInput = document.getElementById('searchInput');

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

let productList = [];
let cart = /** @type {Array<{productId:number, name:string, price:number, image_url:string, quantity:number}>} */([]);

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }
function loadCart() { cart = JSON.parse(localStorage.getItem('cart') || '[]'); updateCartBadge(); }
function updateCartBadge() { cartCountEl.textContent = String(cart.reduce((n, it) => n + it.quantity, 0)); }

async function fetchProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to load products');
  productList = await res.json();
  renderProducts(productList);
}

function renderProducts(list) {
  productsEl.innerHTML = '';
  for (const p of list) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}" />
      <div class="body">
        <h3>${p.name}</h3>
        <p>${p.description ?? ''}</p>
      </div>
      <div class="foot">
        <span class="price">${currency.format(p.price)}</span>
        <button class="primary" data-id="${p.id}">Add</button>
      </div>`;
    card.querySelector('button').addEventListener('click', () => addToCart(p));
    productsEl.appendChild(card);
  }
}

function addToCart(product) {
  const existing = cart.find((it) => it.productId === product.id);
  if (existing) existing.quantity += 1;
  else cart.push({ productId: product.id, name: product.name, price: product.price, image_url: product.image_url, quantity: 1 });
  saveCart();
  updateCartBadge();
}

function renderCart() {
  cartItemsEl.innerHTML = '';
  for (const item of cart) {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <img src="${item.image_url}" alt="${item.name}" />
      <div>
        <h4>${item.name}</h4>
        <div class="qty">
          <button aria-label="Decrease">−</button>
          <input type="text" inputmode="numeric" value="${item.quantity}" />
          <button aria-label="Increase">+</button>
        </div>
      </div>
      <strong>${currency.format(item.price * item.quantity)}</strong>`;
    const [decrBtn, qtyInput, incrBtn] = row.querySelectorAll('button, input');
    decrBtn.addEventListener('click', () => changeQty(item.productId, item.quantity - 1));
    incrBtn.addEventListener('click', () => changeQty(item.productId, item.quantity + 1));
    qtyInput.addEventListener('change', () => {
      const v = Math.max(1, parseInt(qtyInput.value || '1', 10));
      changeQty(item.productId, v);
    });
    cartItemsEl.appendChild(row);
  }
  cartTotalEl.textContent = currency.format(cart.reduce((sum, it) => sum + it.price * it.quantity, 0));
}

function changeQty(productId, qty) {
  const idx = cart.findIndex((it) => it.productId === productId);
  if (idx === -1) return;
  if (qty <= 0) cart.splice(idx, 1);
  else cart[idx].quantity = qty;
  saveCart();
  renderCart();
  updateCartBadge();
}

cartButton.addEventListener('click', () => {
  renderCart();
  cartDialog.showModal();
});

checkoutButton.addEventListener('click', (e) => {
  e.preventDefault();
  cartDialog.close();
  checkoutDialog.showModal();
});

placeOrderButton.addEventListener('click', async (e) => {
  e.preventDefault();
  const form = new FormData(checkoutForm);
  const customer = {
    name: (form.get('name') || '').toString(),
    email: (form.get('email') || '').toString(),
    address: (form.get('address') || '').toString(),
  };
  const items = cart.map((it) => ({ productId: it.productId, quantity: it.quantity }));
  if (items.length === 0) return alert('Your cart is empty.');
  const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, items }) });
  if (!res.ok) {
    const msg = (await res.json().catch(() => ({ error: 'Checkout failed' }))).error || 'Checkout failed';
    alert(msg);
    return;
  }
  const { orderId, total } = await res.json();
  alert(`Order #${orderId} placed! Total ${currency.format(total)}`);
  cart = [];
  saveCart();
  updateCartBadge();
  checkoutDialog.close();
});

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  const filtered = productList.filter((p) =>
    p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
  );
  renderProducts(filtered);
});

loadCart();
fetchProducts().catch((e) => {
  console.error(e);
  productsEl.innerHTML = '<p>Failed to load products.</p>';
});
