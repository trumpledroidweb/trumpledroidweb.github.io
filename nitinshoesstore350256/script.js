/**
 * Nitin Shoes Store - Main Full-Stack Client Script
 * Built with vanilla ES6+ & TrumpleDroid Backend API
 */

(function () {
  'use strict';

  // Core Configuration & API Endpoints
  const CONFIG = {
    apiBaseUrl: 'https://trumpledroid-api.cloudbeta28624.workers.dev',
    appId: 'nitinshoesstore',
    whatsappStorePhone: '919876543210' // Nitin Store Official WhatsApp
  };

  // State Management
  const State = {
    products: [],
    cart: [],
    authToken: localStorage.getItem('nitin_shoes_token') || null,
    currentUserEmail: localStorage.getItem('nitin_shoes_user_email') || null,
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'featured',
    currentDetailProduct: null,
    selectedSize: 'UK 8',
    appliedCoupon: null,
    discountPercentage: 0
  };

  // Initial High-Quality Shoe Catalog Data (Real Unsplash Shoe Photos)
  const DEFAULT_SHOES = [
    {
      id: 'shoe-1',
      title: 'Nitin Air Blaze Sport Sneakers',
      category: 'Sneakers',
      price: 1499,
      original_price: 2999,
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80,https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
      description: 'अल्ट्रा-लाइटवेट डिजाइन, रबर ग्रिप सोल और ब्रीथेबल मेश फैब्रिक। रनिंग और डेली कॉलेज/ऑफिस वियर के लिए बेस्ट।',
      sizes: 'UK 6,UK 7,UK 8,UK 9,UK 10',
      badge: '🔥 Bestseller',
      rating: 4.9,
      in_stock: true
    },
    {
      id: 'shoe-2',
      title: 'Nitin Classic Oxford Leather Formals',
      category: 'Formal',
      price: 1899,
      original_price: 3499,
      image_url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80',
      description: 'शुद्ध क्लासिक ब्लैक शाइन फॉर्मल जूता। ऑफिस मीटिंग, इंटरव्यू और शादियों के लिए परफेक्ट चॉइस।',
      sizes: 'UK 7,UK 8,UK 9,UK 10',
      badge: 'Royal Look',
      rating: 4.8,
      in_stock: true
    },
    {
      id: 'shoe-3',
      title: 'Nitin Turbo Zoom Athletics Running Shoes',
      category: 'Sports',
      price: 1299,
      original_price: 2499,
      image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
      description: 'एंटी-स्किड कुशनिंग के साथ हाई-इम्पैक्ट रनिंग शूज़। दौड़ने और जिम वर्कआउट के लिए पैरों को मिले पूरा आराम।',
      sizes: 'UK 6,UK 7,UK 8,UK 9',
      badge: 'Top Rated',
      rating: 4.7,
      in_stock: true
    },
    {
      id: 'shoe-4',
      title: 'Nitin Velvet Suede Casual Loafers',
      category: 'Loafers',
      price: 1199,
      original_price: 2199,
      image_url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
      description: 'बिना फीते वाला आरामदायक स्लिप-ऑन लोफर। जींस, ट्राउजर और शॉर्ट्स के साथ ट्रेंडी कूल लुक।',
      sizes: 'UK 6,UK 7,UK 8,UK 9,UK 10',
      badge: 'Comfy Wear',
      rating: 4.6,
      in_stock: true
    },
    {
      id: 'shoe-5',
      title: 'Nitin All-Terrain Rugged Leather Boots',
      category: 'Boots',
      price: 2399,
      original_price: 4999,
      image_url: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=800&q=80',
      description: 'मजबूत सोल और प्रीमियम टैन लेदर फिनिश। ट्रैकिंग, विंटर राइडिंग और हार्डवेयर उपयोग के लिए टिकाऊ बूट।',
      sizes: 'UK 7,UK 8,UK 9,UK 10',
      badge: 'Heavy Duty',
      rating: 4.9,
      in_stock: true
    },
    {
      id: 'shoe-6',
      title: 'Nitin Street White Retro Low Sneakers',
      category: 'Sneakers',
      price: 1349,
      original_price: 2799,
      image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
      description: 'क्लासिक व्हाइट स्नीकर्स, आसान मेंटेनेंस और वॉटरप्रूफ सिंथेटिक फिनिश। हर आउटफिट पर जंचेगा।',
      sizes: 'UK 6,UK 7,UK 8,UK 9',
      badge: 'Trending',
      rating: 4.8,
      in_stock: true
    },
    {
      id: 'shoe-7',
      title: 'Nitin Flex Slip-On Walking Sport Shoes',
      category: 'Sports',
      price: 999,
      original_price: 1899,
      image_url: 'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?auto=format&fit=crop&w=800&q=80',
      description: 'मॉर्निंग वॉक और डेली यूज के लिए सुपर सॉफ्ट मेमोरी फोम वाला जूता। बिना वजन का हल्का अहसास।',
      sizes: 'UK 6,UK 7,UK 8,UK 9,UK 10',
      badge: 'Budget Pick',
      rating: 4.7,
      in_stock: true
    },
    {
      id: 'shoe-8',
      title: 'Nitin Italian Derby Tan Formal Shoes',
      category: 'Formal',
      price: 1999,
      original_price: 3999,
      image_url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
      gallery: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
      description: 'प्रीमियम टैन फिनिश डर्बी फॉर्मल शू। एग्जीक्यूटिव और पार्टी वेयर के लिए सबसे ज्यादा डिमांड में।',
      sizes: 'UK 7,UK 8,UK 9,UK 10',
      badge: 'Premium',
      rating: 4.8,
      in_stock: true
    }
  ];

  // DOM Elements Selector Helper
  const $ = (id) => document.getElementById(id);

  // Initialize App on DOM Ready
  document.addEventListener('DOMContentLoaded', async () => {
    loadSavedCart();
    await fetchAppMetaAndConfig();
    await initializeProductCatalog();
    setupEventListeners();
    updateAuthUI();
    renderProducts();
    updateCartUI();
  });

  // Fetch App Meta Runtime
  async function fetchAppMetaAndConfig() {
    try {
      const res = await fetch('app-meta.json');
      if (res.ok) {
        const meta = await res.json();
        if (meta && meta.app_id) {
          CONFIG.appId = meta.app_id;
        }
      }
    } catch (e) {
      console.warn('Using default app_id configuration', e);
    }
  }

  // Load Products from Backend GET /data or Fallback
  async function initializeProductCatalog() {
    let backendProducts = [];
    if (State.authToken) {
      try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/data?collection=products`, {
          headers: {
            'Authorization': `Bearer ${State.authToken}`
          }
        });
        const result = await res.json();
        if (result && result.success && Array.isArray(result.records)) {
          backendProducts = result.records.map(r => ({
            id: r.id,
            ...r.data
          }));
        }
      } catch (err) {
        console.warn('Backend product fetch error, fallback to initial catalog:', err);
      }
    }

    // Merge backend products with default stock
    const localSaved = localStorage.getItem('nitin_custom_shoes');
    let localCustom = [];
    if (localSaved) {
      try { localCustom = JSON.parse(localSaved); } catch (e) {}
    }

    State.products = [...DEFAULT_SHOES, ...localCustom, ...backendProducts];
    // Remove duplicate IDs
    const seen = new Set();
    State.products = State.products.filter(item => {
      const k = item.id || item.title;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // Set up all interactive event listeners
  function setupEventListeners() {
    // Search inputs
    const searchInput = $('searchInput');
    const mobileSearchInput = $('mobileSearchInput');
    const clearSearchBtn = $('clearSearchBtn');
    const mobileClearSearchBtn = $('mobileClearSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        State.searchQuery = e.target.value.trim().toLowerCase();
        toggleClearButton(clearSearchBtn, State.searchQuery);
        renderProducts();
      });
    }

    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', (e) => {
        State.searchQuery = e.target.value.trim().toLowerCase();
        toggleClearButton(mobileClearSearchBtn, State.searchQuery);
        renderProducts();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        State.searchQuery = '';
        toggleClearButton(clearSearchBtn, false);
        renderProducts();
      });
    }

    if (mobileClearSearchBtn) {
      mobileClearSearchBtn.addEventListener('click', () => {
        if (mobileSearchInput) mobileSearchInput.value = '';
        State.searchQuery = '';
        toggleClearButton(mobileClearSearchBtn, false);
        renderProducts();
      });
    }

    // Category Filter Pills
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => {
          p.classList.remove('active', 'bg-orange-600', 'text-white');
          p.classList.add('bg-slate-100', 'text-slate-700');
        });
        pill.classList.add('active', 'bg-orange-600', 'text-white');
        pill.classList.remove('bg-slate-100', 'text-slate-700');
        State.activeCategory = pill.dataset.category || 'all';
        renderProducts();
      });
    });

    // Sort select
    const sortSelect = $('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        State.sortBy = e.target.value;
        renderProducts();
      });
    }

    // Reset Filter Button
    $('resetFilterBtn')?.addEventListener('click', () => {
      State.activeCategory = 'all';
      State.searchQuery = '';
      if (searchInput) searchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      pills.forEach((p, idx) => {
        if (idx === 0) {
          p.classList.add('active', 'bg-orange-600', 'text-white');
          p.classList.remove('bg-slate-100', 'text-slate-700');
        } else {
          p.classList.remove('active', 'bg-orange-600', 'text-white');
          p.classList.add('bg-slate-100', 'text-slate-700');
        }
      });
      renderProducts();
    });

    // Cart Drawer Toggles
    $('cartBtn')?.addEventListener('click', () => toggleDrawer('cartDrawer', true));
    $('closeCartBtn')?.addEventListener('click', () => toggleDrawer('cartDrawer', false));
    $('cartOverlay')?.addEventListener('click', () => toggleDrawer('cartDrawer', false));

    // Modal Close Triggers
    $('closeDetailBtn')?.addEventListener('click', () => toggleModal('productDetailModal', false));
    $('closeDetailOverlay')?.addEventListener('click', () => toggleModal('productDetailModal', false));
    $('closeCheckoutBtn')?.addEventListener('click', () => toggleModal('checkoutModal', false));
    $('closeCheckoutOverlay')?.addEventListener('click', () => toggleModal('checkoutModal', false));

    // Size Guide Modal
    $('sizeGuideBtn')?.addEventListener('click', () => toggleModal('sizeChartModal', true));
    $('closeSizeOverlay')?.addEventListener('click', () => toggleModal('sizeChartModal', false));
    $('closeSizeModalBtn')?.addEventListener('click', () => toggleModal('sizeChartModal', false));

    // Size Pills inside Detail Modal
    document.querySelectorAll('#modalSizePills .size-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#modalSizePills .size-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.selectedSize = btn.dataset.size || 'UK 8';
      });
    });

    // Add to Cart from Detail Modal
    $('modalAddToCartBtn')?.addEventListener('click', () => {
      if (!State.currentDetailProduct) return;
      addToCart(State.currentDetailProduct, State.selectedSize);
      toggleModal('productDetailModal', false);
      showToast(`${State.currentDetailProduct.title} (Size: ${State.selectedSize}) कार्ट में जोड़ा गया!`);
    });

    // Direct WhatsApp Buy from Detail Modal
    $('modalDirectWhatsAppBtn')?.addEventListener('click', () => {
      if (!State.currentDetailProduct) return;
      const shoe = State.currentDetailProduct;
      const msg = `नमस्ते नितिन स्टोर! मुझे यह जूता खरीदना है:\n- मॉडल: ${shoe.title}\n- साइज: ${State.selectedSize}\n- मूल्य: ₹${shoe.price}\n- फोटो लिंक: ${shoe.image_url}\nकृपया डिलीवरी व पेमेंट की जानकारी दें।`;
      openWhatsApp(msg);
    });

    // Hero WhatsApp Button
    $('heroWhatsAppBtn')?.addEventListener('click', () => {
      const msg = `नमस्ते नितिन स्टोर! मुझे जूतों की नई वैरायटी व फोटो देखनी है और ऑर्डर करना है।`;
      openWhatsApp(msg);
    });

    // Coupon Code Apply Handler
    $('applyCouponBtn')?.addEventListener('click', handleCouponApply);

    // Proceed to Checkout
    $('proceedCheckoutBtn')?.addEventListener('click', () => {
      if (State.cart.length === 0) {
        showToast('आपकी कार्ट खाली है!', 'warning');
        return;
      }
      toggleDrawer('cartDrawer', false);
      const totals = calculateCartTotals();
      $('checkoutSummaryTotal').textContent = `₹${totals.finalTotal.toLocaleString('en-IN')}`;
      toggleModal('checkoutModal', true);
    });

    // Checkout via WhatsApp from Cart
    $('checkoutWhatsAppBtn')?.addEventListener('click', () => {
      if (State.cart.length === 0) {
        showToast('आपकी कार्ट खाली है!', 'warning');
        return;
      }
      const totals = calculateCartTotals();
      let text = `*🛍️ नितिन शू स्टोर नया ऑर्डर (New Order):*\n\n`;
      State.cart.forEach((item, index) => {
        text += `${index + 1}. *${item.title}*\n   - साइज: ${item.size}\n   - मात्रा: ${item.quantity}\n   - मूल्य: ₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}\n`;
      });
      text += `\n*सबटोटल:* ₹${totals.subtotal}\n*डिस्काउंट:* ₹${totals.discount}\n*डिलीवरी शुल्क:* ${totals.deliveryFee === 0 ? 'FREE' : '₹' + totals.deliveryFee}\n*कुल देय राशि:* ₹${totals.finalTotal}\n\nकृपया मेरा ऑर्डर कन्फर्म करें और भेजने की तारीख बताएं।`;
      openWhatsApp(text);
    });

    // Checkout Form Submit Handler (Cash on Delivery / Order Persistence)
    $('checkoutForm')?.addEventListener('submit', handleCheckoutSubmit);

    // Auth Navigation & Modals
    $('authNavBtn')?.addEventListener('click', () => {
      toggleModal('authModal', true);
    });
    $('closeAuthBtn')?.addEventListener('click', () => toggleModal('authModal', false));
    $('closeAuthOverlay')?.addEventListener('click', () => toggleModal('authModal', false));

    // Auth Tab Switching
    let isSignupMode = false;
    $('tabLogin')?.addEventListener('click', () => {
      isSignupMode = false;
      $('tabLogin').className = 'flex-1 py-3 text-xs font-bold text-orange-600 border-b-2 border-orange-600 text-center transition';
      $('tabSignup').className = 'flex-1 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 text-center transition';
      $('authModalTitle').textContent = 'Login to Nitin Store';
      $('authSubmitBtn').innerHTML = `<span>Login Now</span>`;
      $('forgotPasswordContainer').classList.remove('hidden');
      hideAuthAlert();
    });

    $('tabSignup')?.addEventListener('click', () => {
      isSignupMode = true;
      $('tabSignup').className = 'flex-1 py-3 text-xs font-bold text-orange-600 border-b-2 border-orange-600 text-center transition';
      $('tabLogin').className = 'flex-1 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 text-center transition';
      $('authModalTitle').textContent = 'Create Nitin Store Account';
      $('authSubmitBtn').innerHTML = `<span>Sign Up & Login</span>`;
      $('forgotPasswordContainer').classList.add('hidden');
      hideAuthAlert();
    });

    // Auth Form Submit
    $('authForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('authEmail').value.trim();
      const password = $('authPassword').value;
      if (!email || !password) return;

      const submitBtn = $('authSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

      try {
        if (isSignupMode) {
          // POST /register strictly does NOT return a token
          const regRes = await fetch(`${CONFIG.apiBaseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app_id: CONFIG.appId,
              email: email,
              password: password
            })
          });
          const regData = await regRes.json();
          if (!regRes.ok || !regData.success) {
            throw new Error(regData.message || regData.error || 'Registration failed');
          }

          // Automatic Login using POST /login to receive the token
          const loginRes = await fetch(`${CONFIG.apiBaseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app_id: CONFIG.appId,
              email: email,
              password: password
            })
          });
          const loginData = await loginRes.json();
          if (!loginRes.ok || !loginData.success || !loginData.token) {
            throw new Error(loginData.message || loginData.error || 'Automatic login failed after registration');
          }

          saveAuthSession(loginData.token, email);
          showToast('Account created and logged in successfully!');
          toggleModal('authModal', false);
        } else {
          // Standard Login via POST /login
          const loginRes = await fetch(`${CONFIG.apiBaseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app_id: CONFIG.appId,
              email: email,
              password: password
            })
          });
          const loginData = await loginRes.json();
          if (!loginRes.ok || !loginData.success || !loginData.token) {
            throw new Error(loginData.message || loginData.error || 'Invalid credentials');
          }

          saveAuthSession(loginData.token, email);
          showToast('Logged in successfully!');
          toggleModal('authModal', false);
        }
      } catch (err) {
        showAuthAlert(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isSignupMode ? `<span>Sign Up & Login</span>` : `<span>Login Now</span>`;
      }
    });

    // Logout Button
    $('authLogoutBtn')?.addEventListener('click', async () => {
      if (State.authToken) {
        try {
          await fetch(`${CONFIG.apiBaseUrl}/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${State.authToken}` }
          });
        } catch (e) {}
      }
      clearAuthSession();
      showToast('Logged out successfully.');
      toggleModal('authModal', false);
    });

    // Forgot Password Flow
    $('openForgotModalBtn')?.addEventListener('click', () => {
      toggleModal('authModal', false);
      toggleModal('forgotModal', true);
    });
    $('closeForgotBtn')?.addEventListener('click', () => toggleModal('forgotModal', false));
    $('closeForgotOverlay')?.addEventListener('click', () => toggleModal('forgotModal', false));

    // Request OTP
    $('requestOtpBtn')?.addEventListener('click', async () => {
      const email = $('forgotEmail').value.trim();
      if (!email) {
        showForgotAlert('कृपया ईमेल दर्ज करें', 'error');
        return;
      }
      const btn = $('requestOtpBtn');
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...`;

      try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_id: CONFIG.appId,
            email: email
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || data.error || 'OTP request failed');
        }
        $('forgotStep1').classList.add('hidden');
        $('forgotStep2').classList.remove('hidden');
        showForgotAlert('OTP sent to your email! Please check inbox.', 'success');
      } catch (err) {
        showForgotAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send OTP (ओटीपी भेजें)';
      }
    });

    // Reset Password with OTP
    $('resetPasswordBtn')?.addEventListener('click', async () => {
      const email = $('forgotEmail').value.trim();
      const otp = $('forgotOtp').value.trim();
      const new_password = $('forgotNewPass').value;
      if (!otp || !new_password) {
        showForgotAlert('OTP और नया पासवर्ड दोनों अनिवार्य हैं', 'error');
        return;
      }

      const btn = $('resetPasswordBtn');
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating...`;

      try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_id: CONFIG.appId,
            email: email,
            otp: otp,
            new_password: new_password
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || data.error || 'Failed to reset password');
        }
        showToast('Password updated successfully! Please login.');
        toggleModal('forgotModal', false);
        toggleModal('authModal', true);
      } catch (err) {
        showForgotAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    });

    // Store Owner Product Management Drawer
    const openAddProduct = () => toggleModal('addProductModal', true);
    $('openAddProductBtn')?.addEventListener('click', openAddProduct);
    $('ownerAddBtnMobile')?.addEventListener('click', openAddProduct);
    $('closeAddProductBtn')?.addEventListener('click', () => toggleModal('addProductModal', false));
    $('closeAddProductOverlay')?.addEventListener('click', () => toggleModal('addProductModal', false));

    // Owner Add Shoe Form Submit
    $('newShoeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = $('newShoeTitle').value.trim();
      const category = $('newShoeCategory').value;
      const badge = $('newShoeBadge').value.trim() || 'New Arrival';
      const price = parseFloat($('newShoePrice').value);
      const original_price = parseFloat($('newShoeOriginalPrice').value) || (price * 1.5);
      const image_url = $('newShoeImgUrl').value.trim();
      const description = $('newShoeDesc').value.trim() || 'प्रीमियम क्वालिटी जूता नितिन स्टोर की ओर से।';

      if (!title || isNaN(price) || !image_url) {
        showAddShoeAlert('सभी आवश्यक जानकारी सही से भरें', 'error');
        return;
      }

      const newShoeItem = {
        id: 'shoe-' + Date.now(),
        title,
        category,
        price,
        original_price,
        image_url,
        gallery: image_url,
        description,
        sizes: 'UK 6,UK 7,UK 8,UK 9,UK 10',
        badge,
        rating: 5.0,
        in_stock: true
      };

      // Try syncing to Backend if logged in
      if (State.authToken) {
        try {
          const res = await fetch(`${CONFIG.apiBaseUrl}/data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${State.authToken}`
            },
            body: JSON.stringify({
              collection: 'products',
              data: newShoeItem
            })
          });
          const resData = await res.json();
          if (resData.success && resData.record) {
            newShoeItem.id = resData.record.id;
          }
        } catch (e) {
          console.warn('Backend sync failed, saved locally:', e);
        }
      }

      // Save locally to preserve changes
      const localSaved = localStorage.getItem('nitin_custom_shoes');
      let customArr = localSaved ? JSON.parse(localSaved) : [];
      customArr.unshift(newShoeItem);
      localStorage.setItem('nitin_custom_shoes', JSON.stringify(customArr));

      State.products.unshift(newShoeItem);
      renderProducts();
      $('newShoeForm').reset();
      toggleModal('addProductModal', false);
      showToast('नया जूता स्टोर में सफलतापूर्वक जुड़ गया!');
    });

    // Orders History Modal Handlers
    $('myOrdersNavBtn')?.addEventListener('click', openOrdersModal);
    $('viewOrdersModalBtn')?.addEventListener('click', () => {
      toggleModal('authModal', false);
      openOrdersModal();
    });
    $('closeOrdersBtn')?.addEventListener('click', () => toggleModal('ordersModal', false));
    $('closeOrdersOverlay')?.addEventListener('click', () => toggleModal('ordersModal', false));
  }

  // ==================== RENDERING FUNCTIONS ====================

  function renderProducts() {
    const grid = $('productsGrid');
    const emptyState = $('emptyCatalogState');
    const totalBadge = $('productTotalCount');

    if (!grid) return;

    // Filter Logic
    let filtered = State.products.filter(item => {
      const matchCat = State.activeCategory === 'all' || item.category === State.activeCategory;
      const matchQuery = !State.searchQuery || 
        (item.title && item.title.toLowerCase().includes(State.searchQuery)) ||
        (item.category && item.category.toLowerCase().includes(State.searchQuery)) ||
        (item.description && item.description.toLowerCase().includes(State.searchQuery));
      return matchCat && matchQuery;
    });

    // Sort Logic
    if (State.sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (State.sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (State.sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (totalBadge) {
      totalBadge.textContent = `${filtered.length} Shoes Available`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    grid.innerHTML = filtered.map(shoe => {
      const discount = shoe.original_price > shoe.price 
        ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
        : 0;

      return `
        <div class="product-card bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl border border-slate-200/80 transition-all duration-300 flex flex-col justify-between group">
          
          <div>
            <!-- Image Card with Badges -->
            <div class="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer" onclick="window.viewShoeDetails('${shoe.id}')">
              <img 
                src="${shoe.image_url}" 
                alt="${shoe.title}" 
                loading="lazy" 
                class="product-card-img w-full h-full object-cover"
                onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'"
              />
              
              <!-- Badge -->
              ${shoe.badge ? `
                <span class="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
                  ${shoe.badge}
                </span>
              ` : ''}

              <!-- Discount Tag -->
              ${discount > 0 ? `
                <span class="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-lg shadow">
                  ${discount}% OFF
                </span>
              ` : ''}

              <!-- Quick View overlay on hover -->
              <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="bg-white/95 text-slate-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform">
                  <i class="fa-regular fa-eye mr-1"></i> Quick View
                </span>
              </div>
            </div>

            <!-- Meta details -->
            <div class="mt-3.5 space-y-1">
              <div class="flex items-center justify-between text-xs text-slate-500">
                <span class="font-semibold text-orange-600 uppercase tracking-wide text-[10px]">${shoe.category}</span>
                <span class="flex items-center gap-1 font-bold text-amber-500">
                  <i class="fa-solid fa-star text-[10px]"></i>
                  <span>${shoe.rating || 4.8}</span>
                </span>
              </div>

              <h3 
                class="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-orange-600 transition-colors cursor-pointer"
                onclick="window.viewShoeDetails('${shoe.id}')"
              >
                ${shoe.title}
              </h3>

              <p class="text-[11px] text-slate-500 line-clamp-1 hindi-text">
                ${shoe.description || 'प्रीमियम क्वालिटी जूता'}
              </p>
            </div>
          </div>

          <!-- Price & Action CTA -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div class="flex items-baseline gap-1.5">
                <span class="text-lg font-black text-slate-900">₹${shoe.price.toLocaleString('en-IN')}</span>
                ${shoe.original_price > shoe.price ? `
                  <span class="text-xs text-slate-400 line-through">₹${shoe.original_price.toLocaleString('en-IN')}</span>
                ` : ''}
              </div>
              <span class="text-[10px] font-semibold text-emerald-600">Free Delivery</span>
            </div>

            <button 
              onclick="window.quickAddToCart('${shoe.id}')"
              class="w-10 h-10 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-orange-600/20 transition-all"
              title="Add to Cart"
            >
              <i class="fa-solid fa-cart-plus text-sm"></i>
            </button>
          </div>

        </div>
      `;
    }).join('');
  }

  // View Shoe Details in Modal
  window.viewShoeDetails = function (id) {
    const product = State.products.find(p => p.id === id);
    if (!product) return;

    State.currentDetailProduct = product;
    State.selectedSize = 'UK 8'; // default

    $('modalTitle').textContent = product.title;
    $('modalCategory').textContent = product.category;
    $('modalDesc').textContent = product.description || '';
    $('modalPrice').textContent = `₹${product.price.toLocaleString('en-IN')}`;
    
    if (product.original_price > product.price) {
      $('modalOriginalPrice').textContent = `₹${product.original_price.toLocaleString('en-IN')}`;
      const disc = Math.round(((product.original_price - product.price) / product.original_price) * 100);
      $('modalDiscountBadge').textContent = `${disc}% OFF`;
      $('modalDiscountBadge').classList.remove('hidden');
      $('modalOriginalPrice').classList.remove('hidden');
    } else {
      $('modalDiscountBadge').classList.add('hidden');
      $('modalOriginalPrice').classList.add('hidden');
    }

    $('modalProductBadge').textContent = product.badge || `${product.category} Special`;
    
    // Main Photo
    const mainImg = $('modalMainImg');
    mainImg.src = product.image_url;

    // Gallery Thumbnails (Context aware dynamic handling)
    const galleryContainer = $('modalThumbnails');
    galleryContainer.innerHTML = '';

    const photoList = [product.image_url];
    if (product.gallery) {
      const extra = product.gallery.split(',').map(s => s.trim()).filter(Boolean);
      extra.forEach(u => {
        if (!photoList.includes(u)) photoList.push(u);
      });
    }

    if (photoList.length > 1) {
      photoList.forEach((url, i) => {
        const thumb = document.createElement('div');
        thumb.className = `w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition flex-shrink-0 ${i === 0 ? 'border-orange-600' : 'border-slate-200'}`;
        thumb.innerHTML = `<img src="${url}" class="w-full h-full object-cover" alt="Angle ${i+1}">`;
        thumb.onclick = () => {
          mainImg.src = url;
          galleryContainer.querySelectorAll('div').forEach(d => d.className = 'w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition flex-shrink-0 border-slate-200');
          thumb.className = 'w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition flex-shrink-0 border-orange-600';
        };
        galleryContainer.appendChild(thumb);
      });
      galleryContainer.classList.remove('hidden');
    } else {
      galleryContainer.classList.add('hidden');
    }

    // Reset Size buttons
    document.querySelectorAll('#modalSizePills .size-pill').forEach(btn => {
      if (btn.dataset.size === 'UK 8') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    toggleModal('productDetailModal', true);
  };

  // Quick Add from Grid
  window.quickAddToCart = function (id) {
    const product = State.products.find(p => p.id === id);
    if (!product) return;
    addToCart(product, 'UK 8');
    showToast(`${product.title} कार्ट में जोड़ा गया!`);
  };

  // ==================== CART OPERATIONS & DETERMINISTIC PRICING ====================

  function addToCart(product, size) {
    const existingIndex = State.cart.findIndex(item => item.id === product.id && item.size === size);
    if (existingIndex > -1) {
      State.cart[existingIndex].quantity += 1;
    } else {
      State.cart.push({
        id: product.id,
        title: product.title,
        price: Number(product.price),
        image_url: product.image_url,
        size: size || 'UK 8',
        quantity: 1
      });
    }
    saveCart();
    updateCartUI();
  }

  function updateCartQuantity(index, delta) {
    if (!State.cart[index]) return;
    State.cart[index].quantity += delta;
    if (State.cart[index].quantity <= 0) {
      State.cart.splice(index, 1);
    }
    saveCart();
    updateCartUI();
  }

  function removeCartItem(index) {
    if (!State.cart[index]) return;
    State.cart.splice(index, 1);
    saveCart();
    updateCartUI();
  }

  // Offline deterministic calculation matching api_schema logic
  function calculateCartTotals() {
    let subtotal = 0;
    State.cart.forEach(item => {
      subtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
    });

    // Discount formula
    let discount = 0;
    if (State.discountPercentage > 0) {
      discount = Math.round((subtotal * State.discountPercentage) / 100);
    }

    // Free delivery on ₹999+ else ₹70
    const deliveryFee = subtotal >= 999 || subtotal === 0 ? 0 : 70;

    const finalTotal = Math.max(0, subtotal - discount + deliveryFee);

    return {
      subtotal,
      discount,
      deliveryFee,
      finalTotal
    };
  }

  function updateCartUI() {
    const container = $('cartItemsContainer');
    const emptyPlaceholder = $('cartEmptyPlaceholder');
    const cartFooter = $('cartFooter');
    const badge = $('cartCountBadge');
    const drawerCount = $('cartDrawerCount');

    const totalQty = State.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) badge.textContent = totalQty;
    if (drawerCount) drawerCount.textContent = `${totalQty} items`;

    if (State.cart.length === 0) {
      if (container) container.innerHTML = '';
      emptyPlaceholder?.classList.remove('hidden');
      cartFooter?.classList.add('hidden');
      return;
    }

    emptyPlaceholder?.classList.add('hidden');
    cartFooter?.classList.remove('hidden');

    if (container) {
      container.innerHTML = State.cart.map((item, index) => `
        <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <img src="${item.image_url}" alt="${item.title}" class="w-16 h-16 rounded-xl object-cover bg-white border border-slate-200" onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80'">
          
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-slate-800 truncate">${item.title}</h4>
            <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <span class="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-700">Size: ${item.size}</span>
              <span class="font-extrabold text-orange-600">₹${item.price.toLocaleString('en-IN')}</span>
            </div>
            
            <!-- Quantity counter -->
            <div class="flex items-center gap-2 mt-2">
              <div class="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
                <button onclick="window.changeCartQty(${index}, -1)" class="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-bold">-</button>
                <span class="px-2 text-xs font-black text-slate-800">${item.quantity}</span>
                <button onclick="window.changeCartQty(${index}, 1)" class="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-bold">+</button>
              </div>
              <span class="text-xs font-bold text-slate-800">= ₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button onclick="window.removeCartRow(${index})" class="text-slate-400 hover:text-rose-600 p-2 transition" title="Remove">
            <i class="fa-solid fa-trash-can text-sm"></i>
          </button>
        </div>
      `).join('');
    }

    // Refresh totals locally
    const totals = calculateCartTotals();
    $('calcSubtotal').textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;
    $('calcDiscount').textContent = `- ₹${totals.discount.toLocaleString('en-IN')}`;
    $('calcDelivery').textContent = totals.deliveryFee === 0 ? 'FREE' : `₹${totals.deliveryFee}`;
    $('calcFinalTotal').textContent = `₹${totals.finalTotal.toLocaleString('en-IN')}`;
  }

  // Global Cart dispatchers for inline onclick
  window.changeCartQty = (idx, delta) => updateCartQuantity(idx, delta);
  window.removeCartRow = (idx) => removeCartItem(idx);

  // Local Storage Save/Load Cart
  function saveCart() {
    localStorage.setItem('nitin_shoes_cart', JSON.stringify(State.cart));
  }
  function loadSavedCart() {
    try {
      const data = localStorage.getItem('nitin_shoes_cart');
      if (data) State.cart = JSON.parse(data);
    } catch (e) {
      State.cart = [];
    }
  }

  // Coupon handling
  function handleCouponApply() {
    const input = $('couponInput');
    const msg = $('couponMessage');
    const code = input.value.trim().toUpperCase();

    if (code === 'NITIN50') {
      State.appliedCoupon = 'NITIN50';
      State.discountPercentage = 10; // 10% flat store discount
      msg.className = 'text-[11px] font-bold text-emerald-600';
      msg.textContent = '🎉 Coupon Applied! 10% Extra Discount मिल गया।';
      msg.classList.remove('hidden');
    } else if (code === 'FIRSTBUY') {
      State.appliedCoupon = 'FIRSTBUY';
      State.discountPercentage = 15;
      msg.className = 'text-[11px] font-bold text-emerald-600';
      msg.textContent = '🎉 15% First Purchase Discount Applied!';
      msg.classList.remove('hidden');
    } else {
      State.appliedCoupon = null;
      State.discountPercentage = 0;
      msg.className = 'text-[11px] font-bold text-rose-600';
      msg.textContent = 'अमान्य कूपन कोड (Try NITIN50 or FIRSTBUY)';
      msg.classList.remove('hidden');
    }
    updateCartUI();
  }

  // ==================== CHECKOUT & ORDER PERSISTENCE ====================

  async function handleCheckoutSubmit(e) {
    e.preventDefault();
    const custName = $('orderCustName').value.trim();
    const custPhone = $('orderCustPhone').value.trim();
    const custAddress = $('orderCustAddress').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentOption"]:checked')?.value || 'Cash On Delivery (COD)';

    if (!custName || !custPhone || !custAddress) {
      showCheckoutAlert('कृपया सभी जानकारी भरें', 'error');
      return;
    }

    const totals = calculateCartTotals();
    const itemsSummary = State.cart.map(i => `${i.title} (${i.size}) x${i.quantity}`).join(', ');

    const orderPayload = {
      customer_name: custName,
      customer_phone: custPhone,
      customer_address: custAddress,
      items_summary: itemsSummary,
      subtotal: totals.subtotal,
      discount: totals.discount,
      delivery_fee: totals.deliveryFee,
      total_amount: totals.finalTotal,
      payment_method: paymentMethod,
      order_status: 'Confirmed (Pending Dispatch)',
      order_date: new Date().toLocaleString('hi-IN')
    };

    const submitBtn = $('submitOrderBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...`;

    try {
      // If logged in, push to backend collection "orders" via POST /data
      if (State.authToken) {
        const res = await fetch(`${CONFIG.apiBaseUrl}/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${State.authToken}`
          },
          body: JSON.stringify({
            collection: 'orders',
            data: orderPayload
          })
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          console.warn('Backend order sync issue:', result);
        }
      }

      // Save order in local history for instant customer review
      const prevOrders = JSON.parse(localStorage.getItem('nitin_my_orders') || '[]');
      prevOrders.unshift({
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        ...orderPayload
      });
      localStorage.setItem('nitin_my_orders', JSON.stringify(prevOrders));

      // Reset cart
      State.cart = [];
      saveCart();
      updateCartUI();

      toggleModal('checkoutModal', false);
      showToast('बधाई हो! आपका ऑर्डर सफलतापूर्वक दर्ज कर लिया गया है।');

      // Offer instant WhatsApp dispatch notification to Nitin
      setTimeout(() => {
        const confirmSend = confirm('क्या आप इस ऑर्डर की सूचना नितिन स्टोर को व्हाट्सएप पर भी भेजना चाहते हैं?');
        if (confirmSend) {
          const msg = `*नया जूता ऑर्डर दर्ज हुआ:*%0A- ग्राहक: ${encodeURIComponent(custName)}%0A- फोन: ${encodeURIComponent(custPhone)}%0A- पता: ${encodeURIComponent(custAddress)}%0A- जूते: ${encodeURIComponent(itemsSummary)}%0A- कुल मूल्य: ₹${totals.finalTotal}%0A- पेमेंट: ${encodeURIComponent(paymentMethod)}`;
          window.open(`https://wa.me/${CONFIG.whatsappStorePhone}?text=${msg}`, '_blank');
        }
      }, 500);

    } catch (err) {
      showCheckoutAlert('ऑर्डर सेव करने में समस्या: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-check-circle"></i> Confirm & Place Order`;
    }
  }

  // Customer Order History Modal
  async function openOrdersModal() {
    const container = $('ordersListContainer');
    toggleModal('ordersModal', true);
    if (!container) return;

    container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin text-lg"></i> ऑर्डर्स लोड हो रहे हैं...</div>`;

    let allOrders = JSON.parse(localStorage.getItem('nitin_my_orders') || '[]');

    // If logged in, fetch from backend GET /data?collection=orders
    if (State.authToken) {
      try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/data?collection=orders`, {
          headers: { 'Authorization': `Bearer ${State.authToken}` }
        });
        const result = await res.json();
        if (result.success && Array.isArray(result.records)) {
          const backendList = result.records.map(r => ({
            id: r.id,
            ...r.data
          }));
          allOrders = [...backendList, ...allOrders];
        }
      } catch (e) {
        console.warn('Backend order list error:', e);
      }
    }

    if (allOrders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <i class="fa-solid fa-box-open text-4xl mb-2 text-slate-300"></i>
          <p class="text-xs font-bold text-slate-700">अभी तक कोई ऑर्डर नहीं मिला</p>
          <p class="text-[11px] text-slate-400 hindi-text">स्टोर से जूते चुनें और ऑर्डर करें।</p>
        </div>
      `;
      return;
    }

    container.innerHTML = allOrders.map(ord => `
      <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-extrabold text-slate-800">Order ID: #${ord.id ? ord.id.slice(0, 10) : 'ORD'}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">${ord.order_status || 'Confirmed'}</span>
        </div>
        <p class="text-xs text-slate-600 font-medium"><strong>जूते:</strong> ${ord.items_summary}</p>
        <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
          <span class="text-slate-500">${ord.order_date || 'Recent'}</span>
          <span class="font-black text-orange-600 text-sm">₹${(ord.total_amount || 0).toLocaleString('en-IN')} (${ord.payment_method || 'COD'})</span>
        </div>
      </div>
    `).join('');
  }

  // ==================== AUTH HELPERS ====================

  function saveAuthSession(token, email) {
    State.authToken = token;
    State.currentUserEmail = email;
    localStorage.setItem('nitin_shoes_token', token);
    localStorage.setItem('nitin_shoes_user_email', email);
    updateAuthUI();
  }

  function clearAuthSession() {
    State.authToken = null;
    State.currentUserEmail = null;
    localStorage.removeItem('nitin_shoes_token');
    localStorage.removeItem('nitin_shoes_user_email');
    updateAuthUI();
  }

  function updateAuthUI() {
    const authNavText = $('authNavText');
    const loggedInView = $('loggedInView');
    const authForm = $('authForm');
    const myOrdersBtn = $('myOrdersNavBtn');
    const emailLabel = $('loggedInEmail');
    const forgotBox = $('forgotPasswordContainer');

    if (State.authToken && State.currentUserEmail) {
      if (authNavText) authNavText.textContent = State.currentUserEmail.split('@')[0];
      if (emailLabel) emailLabel.textContent = State.currentUserEmail;
      loggedInView?.classList.remove('hidden');
      authForm?.classList.add('hidden');
      forgotBox?.classList.add('hidden');
      myOrdersBtn?.classList.remove('hidden');
      myOrdersBtn?.classList.add('flex');
    } else {
      if (authNavText) authNavText.textContent = 'Login / Sign Up';
      loggedInView?.classList.add('hidden');
      authForm?.classList.remove('hidden');
      forgotBox?.classList.remove('hidden');
      myOrdersBtn?.classList.add('hidden');
      myOrdersBtn?.classList.remove('flex');
    }
  }

  // ==================== UI HELPERS ====================

  function toggleModal(modalId, show) {
    const modal = $(modalId);
    if (!modal) return;
    if (show) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function toggleDrawer(drawerId, show) {
    const drawer = $(drawerId);
    if (!drawer) return;
    if (show) {
      drawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function openWhatsApp(message) {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${CONFIG.whatsappStorePhone}?text=${encoded}`, '_blank');
  }

  function showToast(message, type = 'success') {
    const toast = $('toastNotification');
    const msg = $('toastMessage');
    const icon = $('toastIcon');
    if (!toast || !msg) return;

    msg.textContent = message;
    if (type === 'warning') {
      icon.className = 'fa-solid fa-triangle-exclamation text-amber-400 text-base';
    } else {
      icon.className = 'fa-solid fa-circle-check text-emerald-400 text-base';
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 3200);
  }

  function toggleClearButton(btn, hasValue) {
    if (!btn) return;
    if (hasValue) btn.classList.remove('hidden');
    else btn.classList.add('hidden');
  }

  function showAuthAlert(msg, type) {
    const el = $('authAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = `text-xs font-semibold p-2.5 rounded-lg ${type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`;
    el.classList.remove('hidden');
  }
  function hideAuthAlert() {
    $('authAlert')?.classList.add('hidden');
  }

  function showForgotAlert(msg, type) {
    const el = $('forgotAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = `text-xs font-semibold p-2 rounded-lg ${type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`;
    el.classList.remove('hidden');
  }

  function showAddShoeAlert(msg, type) {
    const el = $('addProductAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = `text-xs font-semibold p-2.5 rounded-lg ${type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`;
    el.classList.remove('hidden');
  }

  function showCheckoutAlert(msg, type) {
    const el = $('checkoutStatusAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = `text-xs font-semibold p-2.5 rounded-lg ${type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`;
    el.classList.remove('hidden');
  }

})();