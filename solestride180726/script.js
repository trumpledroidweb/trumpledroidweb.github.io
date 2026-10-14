// SoleStride E-Commerce & Landing Page JavaScript

// Shoe Catalog Data
const shoes = [
  {
    id: 1,
    name: "Apex Velocity Pro",
    category: "running",
    price: 189.00,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    desc: "Dual-density Cloud foam with embedded carbon fiber plate for maximum speed and energy return."
  },
  {
    id: 2,
    name: "Urban Nomad Knit",
    category: "lifestyle",
    price: 140.00,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
    desc: "Ultra-breathable AeroMesh upper combined with plush lifestyle cushioning for all-day city walks."
  },
  {
    id: 3,
    name: "Court Titan High",
    category: "basketball",
    price: 175.00,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80",
    desc: "High-top ankle support and maximum impact absorption built for explosive hardwood maneuvers."
  },
  {
    id: 4,
    name: "Stride CrossTrainer",
    category: "training",
    price: 130.00,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=800&q=80",
    desc: "Flat, stable base for heavy lifting paired with flexible forefoot movement for agile HIIT workouts."
  },
  {
    id: 5,
    name: "Echo Carbon Elite",
    category: "running",
    price: 220.00,
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
    desc: "Professional race-day footwear designed to break personal records with nitrogen infused cushioning."
  },
  {
    id: 6,
    name: "Metro Minimalist",
    category: "lifestyle",
    price: 115.00,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80",
    desc: "Sleek, understated leather and mesh hybrid designed for modern minimalist wardrobes."
  }
];

// State variables
let cart = [];
let wishlist = [];
let currentUser = null;
let authToken = localStorage.getItem("solestride_token") || null;
let appMeta = null;

// DOM Elements
const productGrid = document.getElementById("product-grid");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const cartBadge = document.getElementById("cart-badge");
const wishlistBadge = document.getElementById("wishlist-badge");
const cartDrawer = document.getElementById("cart-drawer");
const wishlistDrawer = document.getElementById("wishlist-drawer");
const openCartBtn = document.getElementById("open-cart-btn");
const closeCartBtn = document.getElementById("close-cart-btn");
const cartBackdrop = document.getElementById("cart-backdrop");
const openWishlistBtn = document.getElementById("open-wishlist-btn");
const closeWishlistBtn = document.getElementById("close-wishlist-btn");
const wishlistBackdrop = document.getElementById("wishlist-backdrop");
const cartItemsContainer = document.getElementById("cart-items-container");
const wishlistItemsContainer = document.getElementById("wishlist-items-container");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartTaxEl = document.getElementById("cart-tax");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");

const authModal = document.getElementById("auth-modal");
const authBackdrop = document.getElementById("auth-backdrop");
const authModalOpen = document.getElementById("auth-modal-open");
const closeAuthModal = document.getElementById("close-auth-modal");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");
const authContainer = document.getElementById("auth-container");

const orderModal = document.getElementById("order-modal");
const closeOrderModal = document.getElementById("close-order-modal");

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  await fetchAppMeta();
  renderProducts(shoes);
  setupEventListeners();
  updateCartUI();
  updateWishlistUI();
  checkAuthStatus();
});

async function fetchAppMeta() {
  try {
    const res = await fetch("app-meta.json");
    appMeta = await res.json();
  } catch (err) {
    appMeta = { app_name: "solestride", project_type: "web" };
  }
}

// Render Products Catalog
function renderProducts(items) {
  productGrid.innerHTML = "";
  if (items.length === 0) {
    productGrid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400">No sneakers found matching your criteria.</div>`;
    return;
  }

  items.forEach(shoe => {
    const isWishlisted = wishlist.some(item => item.id === shoe.id);
    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl card-hover flex flex-col justify-between";
    card.innerHTML = `
      <div class="relative">
        <img src="${shoe.image}" alt="${shoe.name}" class="w-full h-64 object-cover">
        <button onclick="toggleWishlist(${shoe.id})" class="absolute top-4 right-4 w-10 h-10 bg-slate-900/80 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-300 hover:text-pink-500 transition-colors shadow-lg">
          <i class="${isWishlisted ? 'fa-solid text-pink-500' : 'fa-regular'} fa-heart text-lg"></i>
        </button>
        <span class="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">${shoe.category}</span>
      </div>
      <div class="p-6 flex flex-col flex-grow justify-between space-y-4">
        <div>
          <div class="flex justify-between items-center mb-1">
            <h3 class="text-xl font-bold text-white">${shoe.name}</h3>
            <div class="flex items-center space-x-1 text-amber-400 text-xs font-semibold">
              <i class="fa-solid fa-star"></i>
              <span>${shoe.rating}</span>
            </div>
          </div>
          <p class="text-slate-400 text-sm leading-relaxed">${shoe.desc}</p>
        </div>
        <div class="flex items-center justify-between pt-4 border-t border-slate-800">
          <span class="text-2xl font-black text-emerald-400">$${shoe.price.toFixed(2)}</span>
          <button onclick="addToCart(${shoe.id})" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2">
            <i class="fa-solid fa-cart-plus"></i>
            <span>Add</span>
          </button>
        </div>
      </div>
    `;
    productGrid.appendChild(card);
  });
}

// Quick Add from Hero
function quickAddHero() {
  addToCart(shoes[0].id);
  openCart();
}

// Cart Management
function addToCart(shoeId) {
  const shoe = shoes.find(s => s.id === shoeId);
  if (!shoe) return;

  const existing = cart.find(item => item.id === shoeId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...shoe, quantity: 1 });
  }
  updateCartUI();
  openCart();
}

function updateCartQuantity(shoeId, delta) {
  const item = cart.find(i => i.id === shoeId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== shoeId);
  }
  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (totalCount > 0) {
    cartBadge.innerText = totalCount;
    cartBadge.classList.remove("hidden");
  } else {
    cartBadge.classList.add("hidden");
  }

  cartItemsContainer.innerHTML = "";
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<div class="text-center py-12 text-slate-500 text-sm">Your shopping cart is currently empty.</div>`;
    cartSubtotalEl.innerText = "$0.00";
    cartTaxEl.innerText = "$0.00";
    cartTotalEl.innerText = "$0.00";
    return;
  }

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.price * item.quantity;
    const div = document.createElement("div");
    div.className = "flex items-center space-x-4 py-4";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded-xl border border-slate-800">
      <div class="flex-1">
        <h4 class="text-sm font-bold text-white">${item.name}</h4>
        <span class="text-xs text-emerald-400 font-semibold">$${item.price.toFixed(2)}</span>
        <div class="flex items-center space-x-3 mt-2">
          <button onclick="updateCartQuantity(${item.id}, -1)" class="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center text-xs transition-colors">-</button>
          <span class="text-sm font-bold text-white">${item.quantity}</span>
          <button onclick="updateCartQuantity(${item.id}, 1)" class="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center text-xs transition-colors">+</button>
        </div>
      </div>
      <button onclick="removeFromCart(${item.id})" class="text-slate-500 hover:text-red-400 p-2 transition-colors">
        <i class="fa-solid fa-trash text-sm"></i>
      </button>
    `;
    cartItemsContainer.appendChild(div);
  });

  // Local calculation formula matching api_schema.json logic
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  cartSubtotalEl.innerText = `$${subtotal.toFixed(2)}`;
  cartTaxEl.innerText = `$${tax.toFixed(2)}`;
  cartTotalEl.innerText = `$${total.toFixed(2)}`;
}

function removeFromCart(shoeId) {
  cart = cart.filter(i => i.id !== shoeId);
  updateCartUI();
}

// Wishlist Management
function toggleWishlist(shoeId) {
  const shoe = shoes.find(s => s.id === shoeId);
  if (!shoe) return;

  const index = wishlist.findIndex(item => item.id === shoeId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(shoe);
  }
  updateWishlistUI();
  renderProducts(shoes);
}

function updateWishlistUI() {
  if (wishlist.length > 0) {
    wishlistBadge.innerText = wishlist.length;
    wishlistBadge.classList.remove("hidden");
  } else {
    wishlistBadge.classList.add("hidden");
  }

  wishlistItemsContainer.innerHTML = "";
  if (wishlist.length === 0) {
    wishlistItemsContainer.innerHTML = `<div class="text-center py-12 text-slate-500 text-sm">Your wishlist is currently empty.</div>`;
    return;
  }

  wishlist.forEach(item => {
    const div = document.createElement("div");
    div.className = "flex items-center space-x-4 py-4";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded-xl border border-slate-800">
      <div class="flex-1">
        <h4 class="text-sm font-bold text-white">${item.name}</h4>
        <span class="text-xs text-emerald-400 font-semibold">$${item.price.toFixed(2)}</span>
      </div>
      <div class="flex flex-col space-y-2">
        <button onclick="addToCart(${item.id}); toggleWishlist(${item.id});" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors">Move to Cart</button>
        <button onclick="toggleWishlist(${item.id})" class="text-slate-500 hover:text-red-400 text-xs transition-colors text-center">Remove</button>
      </div>
    `;
    wishlistItemsContainer.appendChild(div);
  });
}

// Drawer Controls
function openCart() { cartDrawer.classList.remove("hidden"); }
function closeCart() { cartDrawer.classList.add("hidden"); }
function openWishlist() { wishlistDrawer.classList.remove("hidden"); }
function closeWishlist() { wishlistDrawer.classList.add("hidden"); }

// Event Listeners Setup
function setupEventListeners() {
  openCartBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);
  cartBackdrop.addEventListener("click", closeCart);

  openWishlistBtn.addEventListener("click", openWishlist);
  closeWishlistBtn.addEventListener("click", closeWishlist);
  wishlistBackdrop.addEventListener("click", closeWishlist);

  // Search & Filter
  searchInput.addEventListener("input", filterProducts);
  categoryFilter.addEventListener("change", filterProducts);

  // Auth Modal
  authModalOpen.addEventListener("click", () => authModal.classList.remove("hidden"));
  authBackdrop.addEventListener("click", () => authModal.classList.add("hidden"));
  closeAuthModal.addEventListener("click", () => authModal.classList.add("hidden"));

  tabLogin.addEventListener("click", () => {
    tabLogin.className = "text-lg font-bold text-white pb-1 border-b-2 border-blue-500";
    tabRegister.className = "text-lg font-bold text-slate-400 pb-1 hover:text-white";
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  });

  tabRegister.addEventListener("click", () => {
    tabRegister.className = "text-lg font-bold text-white pb-1 border-b-2 border-blue-500";
    tabLogin.className = "text-lg font-bold text-slate-400 pb-1 hover:text-white";
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  });

  // Login Form Submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const res = await fetch("https://trumpledroid-api.cloudbeta28624.workers.dev/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appMeta.app_name, email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        authToken = data.token;
        localStorage.setItem("solestride_token", authToken);
        currentUser = email;
        authModal.classList.add("hidden");
        checkAuthStatus();
      } else {
        loginError.innerText = data.error || "Login failed. Please check credentials.";
        loginError.classList.remove("hidden");
      }
    } catch (err) {
      loginError.innerText = "Network error during login.";
      loginError.classList.remove("hidden");
    }
  });

  // Register Form Submission
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerError.classList.add("hidden");
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const res = await fetch("https://trumpledroid-api.cloudbeta28624.workers.dev/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appMeta.app_name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        // Automatic login after registration
        const loginRes = await fetch("https://trumpledroid-api.cloudbeta28624.workers.dev/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: appMeta.app_name, email, password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.token) {
          authToken = loginData.token;
          localStorage.setItem("solestride_token", authToken);
          currentUser = email;
          authModal.classList.add("hidden");
          checkAuthStatus();
        } else {
          tabLogin.click();
        }
      } else {
        registerError.innerText = data.error || "Registration failed.";
        registerError.classList.remove("hidden");
      }
    } catch (err) {
      registerError.innerText = "Network error during registration.";
      registerError.classList.remove("hidden");
    }
  });

  // Checkout Button
  checkoutBtn.addEventListener("click", async () => {
    if (cart.length === 0) return;
    if (!authToken) {
      closeCart();
      authModal.classList.remove("hidden");
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + (subtotal * 0.08);

    try {
      const res = await fetch("https://trumpledroid-api.cloudbeta28624.workers.dev/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          collection: "orders",
          data: {
            items: JSON.stringify(cart.map(i => `${i.name} (x${i.quantity})`)),
            total: total,
            shipping_address: "Standard Customer Address",
            status: "Processing"
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        cart = [];
        updateCartUI();
        closeCart();
        orderModal.classList.remove("hidden");
      } else {
        alert("Checkout failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network error during checkout.");
    }
  });

  closeOrderModal.addEventListener("click", () => {
    orderModal.classList.add("hidden");
  });
}

function filterProducts() {
  const query = searchInput.value.toLowerCase();
  const category = categoryFilter.value;

  const filtered = shoes.filter(shoe => {
    const matchesQuery = shoe.name.toLowerCase().includes(query) || shoe.desc.toLowerCase().includes(query);
    const matchesCategory = category === "all" || shoe.category === category;
    return matchesQuery && matchesCategory;
  });

  renderProducts(filtered);
}

function checkAuthStatus() {
  if (authToken) {
    authContainer.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
          <i class="fa-solid fa-user"></i>
        </div>
        <button onclick="logout()" class="text-xs text-slate-400 hover:text-red-400 font-semibold transition-colors">Sign Out</button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button id="auth-modal-open-btn" onclick="document.getElementById('auth-modal').classList.remove('hidden')" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5">
        Sign In
      </button>
    `;
  }
}

function logout() {
  authToken = null;
  localStorage.removeItem("solestride_token");
  currentUser = null;
  checkAuthStatus();
}