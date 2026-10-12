/**
 * Smart Business Manager - Vanilla Client-Side Application
 * Completely offline with localStorage persistence.
 */

(function () {
  'use strict';

  // --- DEFAULT INITIAL STATE / DATA SEED ---
  const DEFAULT_SETTINGS = {
    businessName: "Nexus Enterprise Ltd.",
    currency: "$",
    taxRate: 7.5,
    invoiceNote: "Thank you for choosing us! Payment due within 15 days."
  };

  const SAMPLE_PRODUCTS = [
    { id: "PRD-101", name: "Ergonomic Mechanical Keyboard", sku: "KB-9001", category: "Electronics", price: 89.99, cost: 45.00, stock: 24 },
    { id: "PRD-102", name: "Ultra-HD 4K Curved Monitor 27\"", sku: "MON-4K27", category: "Electronics", price: 299.50, cost: 180.00, stock: 7 },
    { id: "PRD-103", name: "Premium Leather Desk Pad", sku: "PAD-LTH01", category: "Office Supplies", price: 34.00, cost: 12.50, stock: 45 },
    { id: "PRD-104", name: "Anodized Aluminum Laptop Stand", sku: "STN-ALU22", category: "Office Supplies", price: 42.00, cost: 18.00, stock: 3 },
    { id: "PRD-105", name: "Studio Noise-Canceling Headset", sku: "AUD-NC80", category: "Electronics", price: 149.00, cost: 72.00, stock: 12 },
    { id: "PRD-106", name: "Ceramic Thermal Coffee Tumbler", sku: "DRK-CRM12", category: "Accessories", price: 22.00, cost: 7.00, stock: 38 }
  ];

  const SAMPLE_CUSTOMERS = [
    { id: "CST-201", name: "Sophia Martinez", email: "sophia.m@gmail.com", phone: "+1 (555) 234-9812", address: "742 Evergreen Terrace, Springfield" },
    { id: "CST-202", name: "Marcus Vance", email: "marcus.vance@techcorp.io", phone: "+1 (555) 891-2345", address: "100 Innovation Way, Suite 4B" },
    { id: "CST-203", name: "Elena Rostova", email: "elena@designstudio.co", phone: "+1 (555) 345-6789", address: "22 Kingfisher Crescent, Austin" }
  ];

  const SAMPLE_SALES = [
    {
      id: "INV-1001",
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      customer: "Sophia Martinez",
      items: [
        { id: "PRD-101", name: "Ergonomic Mechanical Keyboard", price: 89.99, qty: 1, total: 89.99 },
        { id: "PRD-103", name: "Premium Leather Desk Pad", price: 34.00, qty: 2, total: 68.00 }
      ],
      subtotal: 157.99,
      discountPercent: 5,
      taxPercent: 7.5,
      taxAmount: 11.26,
      grandTotal: 161.35,
      paymentMethod: "Card"
    },
    {
      id: "INV-1002",
      date: new Date(Date.now() - 1 * 86400000).toISOString(),
      customer: "Marcus Vance",
      items: [
        { id: "PRD-102", name: "Ultra-HD 4K Curved Monitor 27\"", price: 299.50, qty: 1, total: 299.50 },
        { id: "PRD-104", name: "Anodized Aluminum Laptop Stand", price: 42.00, qty: 1, total: 42.00 }
      ],
      subtotal: 341.50,
      discountPercent: 0,
      taxPercent: 7.5,
      taxAmount: 25.61,
      grandTotal: 367.11,
      paymentMethod: "Transfer"
    }
  ];

  const SAMPLE_EXPENSES = [
    { id: "EXP-501", title: "Coworking Office Lease", category: "Rent", amount: 450.00, method: "Bank Transfer", date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0] },
    { id: "EXP-502", title: "High-Speed Fiber Internet", category: "Utilities", amount: 75.00, method: "Credit Card", date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0] },
    { id: "EXP-503", title: "Packing & Shipping Boxes", category: "Logistics", amount: 62.50, method: "Cash", date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] }
  ];

  // --- STATE CONTAINER ---
  const state = {
    settings: { ...DEFAULT_SETTINGS },
    products: [],
    sales: [],
    expenses: [],
    customers: [],
    currentCart: [],
    currentView: 'dashboard',
    theme: 'light'
  };

  // --- STORAGE HELPERS ---
  const storage = {
    load() {
      try {
        const localSettings = localStorage.getItem('sbm_settings');
        const localProducts = localStorage.getItem('sbm_products');
        const localSales = localStorage.getItem('sbm_sales');
        const localExpenses = localStorage.getItem('sbm_expenses');
        const localCustomers = localStorage.getItem('sbm_customers');
        const localTheme = localStorage.getItem('sbm_theme');

        if (localSettings) state.settings = JSON.parse(localSettings);
        if (localTheme) state.theme = localTheme;

        if (localProducts) {
          state.products = JSON.parse(localProducts);
        } else {
          state.products = [...SAMPLE_PRODUCTS];
          storage.save('products');
        }

        if (localSales) {
          state.sales = JSON.parse(localSales);
        } else {
          state.sales = [...SAMPLE_SALES];
          storage.save('sales');
        }

        if (localExpenses) {
          state.expenses = JSON.parse(localExpenses);
        } else {
          state.expenses = [...SAMPLE_EXPENSES];
          storage.save('expenses');
        }

        if (localCustomers) {
          state.customers = JSON.parse(localCustomers);
        } else {
          state.customers = [...SAMPLE_CUSTOMERS];
          storage.save('customers');
        }
      } catch (err) {
        console.error('Storage reading failed:', err);
      }
    },
    save(key) {
      try {
        if (key === 'settings' || !key) localStorage.setItem('sbm_settings', JSON.stringify(state.settings));
        if (key === 'products' || !key) localStorage.setItem('sbm_products', JSON.stringify(state.products));
        if (key === 'sales' || !key) localStorage.setItem('sbm_sales', JSON.stringify(state.sales));
        if (key === 'expenses' || !key) localStorage.setItem('sbm_expenses', JSON.stringify(state.expenses));
        if (key === 'customers' || !key) localStorage.setItem('sbm_customers', JSON.stringify(state.customers));
        if (key === 'theme' || !key) localStorage.setItem('sbm_theme', state.theme);
      } catch (e) {
        toast.show("Storage limit exceeded or write error", "error");
      }
    },
    wipe() {
      localStorage.removeItem('sbm_settings');
      localStorage.removeItem('sbm_products');
      localStorage.removeItem('sbm_sales');
      localStorage.removeItem('sbm_expenses');
      localStorage.removeItem('sbm_customers');
      state.settings = { ...DEFAULT_SETTINGS };
      state.products = [];
      state.sales = [];
      state.expenses = [];
      state.customers = [];
      storage.save();
    },
    seed() {
      state.settings = { ...DEFAULT_SETTINGS };
      state.products = JSON.parse(JSON.stringify(SAMPLE_PRODUCTS));
      state.sales = JSON.parse(JSON.stringify(SAMPLE_SALES));
      state.expenses = JSON.parse(JSON.stringify(SAMPLE_EXPENSES));
      state.customers = JSON.parse(JSON.stringify(SAMPLE_CUSTOMERS));
      storage.save();
    }
  };

  // --- FORMATTING UTILITIES ---
  const fmt = {
    currency(val) {
      const num = Number(val) || 0;
      return `${state.settings.currency || '$'}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    date(isoString) {
      if (!isoString) return '-';
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    dateTime(isoString) {
      if (!isoString) return '-';
      const d = new Date(isoString);
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    },
    escape(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  };

  // --- TOAST NOTIFICATIONS ---
  const toast = {
    show(message, type = 'success') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const el = document.createElement('div');
      const isSuccess = type === 'success';
      const isError = type === 'error';

      el.className = `toast-item px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-semibold border backdrop-blur-md ${
        isSuccess
          ? 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
          : isError
          ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          : 'bg-indigo-50/95 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
      }`;

      const iconSvg = isSuccess
        ? `<svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
        : `<svg class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

      el.innerHTML = `${iconSvg}<span>${fmt.escape(message)}</span>`;
      container.appendChild(el);

      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => el.remove(), 250);
      }, 3200);
    }
  };

  // --- MODAL CONTROLLER ---
  const modals = {
    open(modalId) {
      const m = document.getElementById(modalId);
      if (m) {
        m.classList.remove('hidden');
        m.firstElementChild?.classList.add('modal-enter');
      }
    },
    close(modalId) {
      const m = document.getElementById(modalId);
      if (m) m.classList.add('hidden');
    },
    closeAll() {
      document.querySelectorAll('.modal-close-btn').forEach(btn => {
        const modal = btn.closest('.fixed');
        if (modal) modal.classList.add('hidden');
      });
      document.getElementById('product-modal')?.classList.add('hidden');
      document.getElementById('sale-modal')?.classList.add('hidden');
      document.getElementById('invoice-modal')?.classList.add('hidden');
      document.getElementById('expense-modal')?.classList.add('hidden');
      document.getElementById('customer-modal')?.classList.add('hidden');
      document.getElementById('confirm-modal')?.classList.add('hidden');
    },
    confirm(title, description, onConfirm) {
      const modal = document.getElementById('confirm-modal');
      const t = document.getElementById('confirm-modal-title');
      const d = document.getElementById('confirm-modal-desc');
      const btn = document.getElementById('confirm-modal-proceed');
      const cancel = document.getElementById('confirm-modal-cancel');

      if (t) t.textContent = title;
      if (d) d.textContent = description;

      const handleConfirm = () => {
        btn.removeEventListener('click', handleConfirm);
        cancel.removeEventListener('click', handleCancel);
        modal.classList.add('hidden');
        onConfirm();
      };

      const handleCancel = () => {
        btn.removeEventListener('click', handleConfirm);
        cancel.removeEventListener('click', handleCancel);
        modal.classList.add('hidden');
      };

      btn.addEventListener('click', handleConfirm);
      cancel.addEventListener('click', handleCancel);
      modal.classList.remove('hidden');
    }
  };

  // --- NAVIGATION CONTROLLER ---
  function navigate(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.add('hidden');
    });

    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) activeView.classList.remove('hidden');

    document.querySelectorAll('#nav-list .nav-item').forEach(btn => {
      if (btn.getAttribute('data-view') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const titleEl = document.getElementById('top-title');
    if (titleEl) {
      const formatted = viewName.charAt(0).toUpperCase() + viewName.slice(1);
      titleEl.textContent = formatted === 'Sales' ? 'Sales & Orders' : formatted;
    }

    // Refresh view specific render
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'products') renderProducts();
    if (viewName === 'sales') renderSales();
    if (viewName === 'expenses') renderExpenses();
    if (viewName === 'customers') renderCustomers();
    if (viewName === 'reports') renderReports();
    if (viewName === 'settings') renderSettings();

    // Close mobile menu if active
    closeSidebar();
  }

  function closeSidebar() {
    const sb = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sb) sb.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
  }

  function openSidebar() {
    const sb = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sb) sb.classList.remove('-translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
  }

  // --- THEME TOGGLE ---
  function initTheme() {
    const isDark = state.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    const sun = document.getElementById('theme-sun-icon');
    const moon = document.getElementById('theme-moon-icon');
    if (sun && moon) {
      sun.classList.toggle('hidden', !isDark);
      moon.classList.toggle('hidden', isDark);
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    storage.save('theme');
    initTheme();
  }

  // --- CORE VIEW: DASHBOARD ---
  function renderDashboard() {
    // 1. Calculations
    const totalRevenue = state.sales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const totalOrders = state.sales.length;
    const totalItemsSold = state.sales.reduce((acc, s) => acc + (s.items?.reduce((iSum, i) => iSum + (Number(i.qty) || 0), 0) || 0), 0);

    // Update KPI UI
    const revEl = document.getElementById('dash-revenue');
    const expEl = document.getElementById('dash-expenses');
    const profEl = document.getElementById('dash-profit');
    const margEl = document.getElementById('dash-profit-margin');
    const ordEl = document.getElementById('dash-orders');
    const soldEl = document.getElementById('dash-items-sold');

    if (revEl) revEl.textContent = fmt.currency(totalRevenue);
    if (expEl) expEl.textContent = fmt.currency(totalExpenses);
    if (profEl) {
      profEl.textContent = fmt.currency(netProfit);
      profEl.className = `text-2xl sm:text-3xl font-extrabold ${netProfit >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`;
    }
    if (margEl) margEl.textContent = `Operating Margin: ${profitMargin}%`;
    if (ordEl) ordEl.textContent = totalOrders.toString();
    if (soldEl) soldEl.textContent = totalItemsSold.toString();

    // 2. Weekly Bar Chart (Past 7 days)
    renderWeeklyChart();

    // 3. Low stock items
    const lowStockContainer = document.getElementById('low-stock-list');
    const lowBadge = document.getElementById('low-stock-count-badge');
    const lowProducts = state.products.filter(p => Number(p.stock) <= 5);

    if (lowBadge) lowBadge.textContent = `${lowProducts.length} Items Low`;
    if (lowStockContainer) {
      if (lowProducts.length === 0) {
        lowStockContainer.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">All stock levels healthy.</p>`;
      } else {
        lowStockContainer.innerHTML = lowProducts.map(p => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div class="truncate pr-2">
              <h5 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${fmt.escape(p.name)}</h5>
              <span class="text-[10px] text-slate-400 font-medium">SKU: ${fmt.escape(p.sku)}</span>
            </div>
            <div class="text-right shrink-0">
              <span class="px-2 py-0.5 rounded-full text-xs font-extrabold ${p.stock === 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}">
                ${p.stock} left
              </span>
            </div>
          </div>
        `).join('');
      }
    }

    // 4. Recent Sales Table
    const recentTbody = document.getElementById('dash-recent-sales-tbody');
    if (recentTbody) {
      const recent = [...state.sales].reverse().slice(0, 5);
      if (recent.length === 0) {
        recentTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-6 text-center text-xs text-slate-400 font-normal">No recorded sales yet. Click "+ New Sale" to start.</td></tr>`;
      } else {
        recentTbody.innerHTML = recent.map(s => `
          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">${fmt.escape(s.id)}</td>
            <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${fmt.escape(s.customer)}</td>
            <td class="px-6 py-4 text-xs text-slate-400">${fmt.date(s.date)}</td>
            <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">${fmt.currency(s.grandTotal)}</td>
            <td class="px-6 py-4">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                ${fmt.escape(s.paymentMethod || 'Cash')}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button onclick="app.showInvoice('${s.id}')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Invoice
              </button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  function renderWeeklyChart() {
    const barsContainer = document.getElementById('weekly-chart-bars');
    const labelsContainer = document.getElementById('weekly-chart-labels');
    if (!barsContainer || !labelsContainer) return;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const dayData = days.map(dayStr => {
      const rev = state.sales
        .filter(s => (s.date || '').startsWith(dayStr))
        .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
      const exp = state.expenses
        .filter(e => (e.date || '').startsWith(dayStr))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return { day: dayStr, rev, exp };
    });

    const maxVal = Math.max(...dayData.map(d => Math.max(d.rev, d.exp)), 100);

    barsContainer.innerHTML = dayData.map(d => {
      const revHeight = Math.max(4, Math.round((d.rev / maxVal) * 100));
      const expHeight = Math.max(4, Math.round((d.exp / maxVal) * 100));
      return `
        <div class="chart-bar-container" title="${d.day}\nRevenue: ${fmt.currency(d.rev)}\nExpense: ${fmt.currency(d.exp)}">
          <div class="chart-bar-pair">
            <div class="chart-bar-rev" style="height: ${revHeight}%;"></div>
            <div class="chart-bar-exp" style="height: ${expHeight}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    labelsContainer.innerHTML = dayData.map(d => {
      const dateObj = new Date(d.day + 'T00:00:00');
      const label = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
      return `<div class="flex-1 text-center font-bold">${label}</div>`;
    }).join('');
  }

  // --- CORE VIEW: PRODUCTS & INVENTORY ---
  function renderProducts() {
    const tbody = document.getElementById('products-table-tbody');
    const searchVal = (document.getElementById('product-search-input')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('product-category-filter')?.value || 'all';

    // Update categories filter options
    const catFilter = document.getElementById('product-category-filter');
    if (catFilter) {
      const uniqueCats = Array.from(new Set(state.products.map(p => p.category).filter(Boolean)));
      const currVal = catFilter.value;
      catFilter.innerHTML = `<option value="all">All Categories</option>` +
        uniqueCats.map(c => `<option value="${fmt.escape(c)}">${fmt.escape(c)}</option>`).join('');
      catFilter.value = uniqueCats.includes(currVal) ? currVal : 'all';
    }

    // Filter products
    const filtered = state.products.filter(p => {
      const matchSearch = (p.name || '').toLowerCase().includes(searchVal) || (p.sku || '').toLowerCase().includes(searchVal);
      const matchCat = catVal === 'all' || p.category === catVal;
      return matchSearch && matchCat;
    });

    // Stock Badge in sidebar
    const badge = document.getElementById('nav-stock-badge');
    if (badge) badge.textContent = state.products.length.toString();

    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-xs text-slate-400">No products matching your query.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const stockNum = Number(p.stock) || 0;
      let stockBadgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400';
      let stockLabel = 'In Stock';
      if (stockNum === 0) {
        stockBadgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400';
        stockLabel = 'Out of Stock';
      } else if (stockNum <= 5) {
        stockBadgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
        stockLabel = 'Low Stock';
      }

      return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
          <td class="px-6 py-4">
            <div class="font-bold text-slate-900 dark:text-white">${fmt.escape(p.name)}</div>
            <div class="text-xs text-slate-400 font-medium">SKU: ${fmt.escape(p.sku)}</div>
          </td>
          <td class="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">${fmt.escape(p.category)}</td>
          <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">${fmt.currency(p.price)}</td>
          <td class="px-6 py-4 text-xs font-medium text-slate-400">${fmt.currency(p.cost)}</td>
          <td class="px-6 py-4 font-extrabold text-slate-800 dark:text-slate-200">${stockNum}</td>
          <td class="px-6 py-4">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${stockBadgeClass}">
              ${stockLabel}
            </span>
          </td>
          <td class="px-6 py-4 text-right space-x-2">
            <button onclick="app.editProduct('${p.id}')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
            <button onclick="app.deleteProduct('${p.id}')" class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openProductModal(product = null) {
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    if (!form) return;

    form.reset();
    document.getElementById('product-form-id').value = product ? product.id : '';

    if (product) {
      if (title) title.textContent = "Edit Product";
      document.getElementById('prod-name').value = product.name || '';
      document.getElementById('prod-sku').value = product.sku || '';
      document.getElementById('prod-category').value = product.category || '';
      document.getElementById('prod-price').value = product.price || 0;
      document.getElementById('prod-cost').value = product.cost || 0;
      document.getElementById('prod-stock').value = product.stock || 0;
    } else {
      if (title) title.textContent = "Add Product";
      document.getElementById('prod-sku').value = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    modals.open('product-modal');
  }

  function handleSaveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-form-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const sku = document.getElementById('prod-sku').value.trim();
    const category = document.getElementById('prod-category').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const cost = parseFloat(document.getElementById('prod-cost').value);
    const stock = parseInt(document.getElementById('prod-stock').value, 10);

    if (!name || isNaN(price) || isNaN(stock)) {
      toast.show("Please enter valid product information", "error");
      return;
    }

    if (id) {
      const idx = state.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        state.products[idx] = { id, name, sku, category, price, cost, stock };
        toast.show("Product updated successfully");
      }
    } else {
      const newId = `PRD-${Date.now().toString().slice(-4)}`;
      state.products.push({ id: newId, name, sku, category, price, cost, stock });
      toast.show("New product added to catalog");
    }

    storage.save('products');
    modals.close('product-modal');
    renderProducts();
    renderDashboard();
  }

  function deleteProduct(id) {
    const item = state.products.find(p => p.id === id);
    if (!item) return;

    modals.confirm("Delete Product?", `Are you sure you want to delete "${item.name}" from your catalog?`, () => {
      state.products = state.products.filter(p => p.id !== id);
      storage.save('products');
      toast.show("Product removed");
      renderProducts();
      renderDashboard();
    });
  }

  // --- CORE VIEW: SALES & POS INVOICING ---
  function renderSales() {
    const tbody = document.getElementById('sales-table-tbody');
    const searchVal = (document.getElementById('sales-search-input')?.value || '').toLowerCase().trim();
    const badge = document.getElementById('sales-total-badge');

    if (badge) badge.textContent = `${state.sales.length} orders`;
    if (!tbody) return;

    const filtered = state.sales.filter(s => {
      return (s.id || '').toLowerCase().includes(searchVal) || (s.customer || '').toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-xs text-slate-400">No matching sales records.</td></tr>`;
      return;
    }

    tbody.innerHTML = [...filtered].reverse().map(s => {
      const itemCount = (s.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
          <td class="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">${fmt.escape(s.id)}</td>
          <td class="px-6 py-4 text-xs text-slate-500">${fmt.dateTime(s.date)}</td>
          <td class="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">${fmt.escape(s.customer)}</td>
          <td class="px-6 py-4 text-xs font-bold text-slate-500">${itemCount} items</td>
          <td class="px-6 py-4 text-xs font-medium text-slate-400">${fmt.currency(s.subtotal)}</td>
          <td class="px-6 py-4 font-black text-slate-900 dark:text-white">${fmt.currency(s.grandTotal)}</td>
          <td class="px-6 py-4">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              ${fmt.escape(s.paymentMethod || 'Cash')}
            </span>
          </td>
          <td class="px-6 py-4 text-right space-x-2">
            <button onclick="app.showInvoice('${s.id}')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View Invoice</button>
            <button onclick="app.deleteSale('${s.id}')" class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openSaleModal() {
    state.currentCart = [];
    const custSelect = document.getElementById('pos-customer-select');
    const prodPicker = document.getElementById('pos-product-picker');

    if (custSelect) {
      custSelect.innerHTML = `<option value="Walk-in Customer">Walk-in Customer</option>` +
        state.customers.map(c => `<option value="${fmt.escape(c.name)}">${fmt.escape(c.name)} (${fmt.escape(c.phone || '')})</option>`).join('');
    }

    if (prodPicker) {
      if (state.products.length === 0) {
        prodPicker.innerHTML = `<option disabled selected>No products in catalog</option>`;
      } else {
        prodPicker.innerHTML = state.products.map(p => {
          const disabled = p.stock <= 0 ? 'disabled' : '';
          return `<option value="${p.id}" ${disabled}>${fmt.escape(p.name)} - ${fmt.currency(p.price)} (${p.stock} in stock)</option>`;
        }).join('');
      }
    }

    const discountInput = document.getElementById('pos-discount-input');
    if (discountInput) discountInput.value = '0';

    updateCartUI();
    modals.open('sale-modal');
  }

  function addItemToCart() {
    const prodPicker = document.getElementById('pos-product-picker');
    const qtyInput = document.getElementById('pos-item-qty');
    const pId = prodPicker?.value;
    const qty = parseInt(qtyInput?.value || '1', 10);

    if (!pId || qty <= 0) {
      toast.show("Please select valid product & quantity", "error");
      return;
    }

    const prod = state.products.find(p => p.id === pId);
    if (!prod) return;

    if (qty > prod.stock) {
      toast.show(`Insufficient stock! Only ${prod.stock} available.`, "error");
      return;
    }

    const existingIndex = state.currentCart.findIndex(item => item.id === pId);
    if (existingIndex > -1) {
      const newQty = state.currentCart[existingIndex].qty + qty;
      if (newQty > prod.stock) {
        toast.show(`Cannot exceed available stock of ${prod.stock}`, "error");
        return;
      }
      state.currentCart[existingIndex].qty = newQty;
      state.currentCart[existingIndex].total = newQty * prod.price;
    } else {
      state.currentCart.push({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        qty: qty,
        total: prod.price * qty
      });
    }

    qtyInput.value = '1';
    updateCartUI();
  }

  function removeCartItem(index) {
    state.currentCart.splice(index, 1);
    updateCartUI();
  }

  function updateCartUI() {
    const tbody = document.getElementById('pos-cart-tbody');
    const subtotalEl = document.getElementById('pos-subtotal');
    const taxLabel = document.getElementById('pos-tax-label');
    const taxAmountEl = document.getElementById('pos-tax-amount');
    const grandTotalEl = document.getElementById('pos-grand-total');
    const discountInput = document.getElementById('pos-discount-input');

    if (!tbody) return;

    if (state.currentCart.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">No items selected for this transaction.</td></tr>`;
      if (subtotalEl) subtotalEl.textContent = fmt.currency(0);
      if (taxAmountEl) taxAmountEl.textContent = fmt.currency(0);
      if (grandTotalEl) grandTotalEl.textContent = fmt.currency(0);
      return;
    }

    tbody.innerHTML = state.currentCart.map((item, idx) => `
      <tr>
        <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">${fmt.escape(item.name)}</td>
        <td class="px-4 py-3 text-slate-500">${fmt.currency(item.price)}</td>
        <td class="px-4 py-3 font-bold">${item.qty}</td>
        <td class="px-4 py-3 font-bold text-slate-900 dark:text-white">${fmt.currency(item.total)}</td>
        <td class="px-4 py-3 text-right">
          <button type="button" onclick="app.removeCartItem(${idx})" class="text-rose-600 hover:text-rose-800 font-bold">×</button>
        </td>
      </tr>
    `).join('');

    const subtotal = state.currentCart.reduce((sum, i) => sum + i.total, 0);
    const discountPercent = parseFloat(discountInput?.value || 0) || 0;
    const discountedSubtotal = Math.max(0, subtotal * (1 - (discountPercent / 100)));
    const taxRate = parseFloat(state.settings.taxRate) || 0;
    const taxAmount = discountedSubtotal * (taxRate / 100);
    const grandTotal = discountedSubtotal + taxAmount;

    if (subtotalEl) subtotalEl.textContent = fmt.currency(subtotal);
    if (taxLabel) taxLabel.textContent = `${taxRate}%`;
    if (taxAmountEl) taxAmountEl.textContent = fmt.currency(taxAmount);
    if (grandTotalEl) grandTotalEl.textContent = fmt.currency(grandTotal);
  }

  function handleCompleteSale(e) {
    e.preventDefault();
    if (state.currentCart.length === 0) {
      toast.show("Please add at least one product to the invoice", "error");
      return;
    }

    const customer = document.getElementById('pos-customer-select')?.value || 'Walk-in Customer';
    const paymentMethod = document.getElementById('pos-payment-method')?.value || 'Cash';
    const discountPercent = parseFloat(document.getElementById('pos-discount-input')?.value || 0) || 0;

    const subtotal = state.currentCart.reduce((sum, i) => sum + i.total, 0);
    const discountedSubtotal = Math.max(0, subtotal * (1 - (discountPercent / 100)));
    const taxRate = parseFloat(state.settings.taxRate) || 0;
    const taxAmount = discountedSubtotal * (taxRate / 100);
    const grandTotal = discountedSubtotal + taxAmount;

    // 1. Deduct Stock Locally
    for (const item of state.currentCart) {
      const prod = state.products.find(p => p.id === item.id);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.qty);
      }
    }
    storage.save('products');

    // 2. Create Sale Record
    const newSale = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      customer,
      items: [...state.currentCart],
      subtotal,
      discountPercent,
      taxPercent: taxRate,
      taxAmount,
      grandTotal,
      paymentMethod
    };

    state.sales.push(newSale);
    storage.save('sales');

    modals.close('sale-modal');
    toast.show(`Sale #${newSale.id} completed successfully`);

    renderSales();
    renderProducts();
    renderDashboard();

    // Show printable receipt immediately
    showInvoice(newSale.id);
  }

  function deleteSale(id) {
    modals.confirm("Delete Sale Record?", `Are you sure you want to permanently remove sale #${id}?`, () => {
      state.sales = state.sales.filter(s => s.id !== id);
      storage.save('sales');
      toast.show("Sale record deleted");
      renderSales();
      renderDashboard();
    });
  }

  // --- PRINTABLE INVOICE GENERATOR ---
  function showInvoice(saleId) {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return;

    const area = document.getElementById('invoice-printable-area');
    if (!area) return;

    area.innerHTML = `
      <div class="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 class="text-2xl font-black text-indigo-600 dark:text-indigo-400">${fmt.escape(state.settings.businessName)}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Official Sales Receipt & Invoice</p>
        </div>
        <div class="text-right">
          <div class="text-lg font-black tracking-tight text-slate-900 dark:text-white">INVOICE: ${fmt.escape(sale.id)}</div>
          <div class="text-xs text-slate-400 font-medium mt-1">Date: ${fmt.dateTime(sale.date)}</div>
          <div class="text-xs font-bold text-emerald-600 mt-0.5">Paid via ${fmt.escape(sale.paymentMethod)}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 dark:border-slate-800 text-sm">
        <div>
          <span class="text-xs font-bold uppercase text-slate-400">Billed To</span>
          <h4 class="font-bold text-slate-900 dark:text-white mt-1">${fmt.escape(sale.customer)}</h4>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold uppercase text-slate-400">Payment Status</span>
          <h4 class="font-bold text-emerald-600 mt-1">Settled / Completed</h4>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="py-2.5">Item Description</th>
              <th class="py-2.5 text-center">Qty</th>
              <th class="py-2.5 text-right">Unit Price</th>
              <th class="py-2.5 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            ${(sale.items || []).map(item => `
              <tr>
                <td class="py-3 font-medium text-slate-800 dark:text-slate-200">${fmt.escape(item.name)}</td>
                <td class="py-3 text-center text-slate-500">${item.qty}</td>
                <td class="py-3 text-right text-slate-500">${fmt.currency(item.price)}</td>
                <td class="py-3 text-right font-bold text-slate-900 dark:text-white">${fmt.currency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1.5 text-sm max-w-xs ml-auto">
        <div class="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span>${fmt.currency(sale.subtotal)}</span>
        </div>
        ${sale.discountPercent > 0 ? `
          <div class="flex justify-between text-slate-500">
            <span>Discount (${sale.discountPercent}%)</span>
            <span>-${fmt.currency(sale.subtotal * (sale.discountPercent / 100))}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-slate-500">
          <span>Tax (${sale.taxPercent}%)</span>
          <span>${fmt.currency(sale.taxAmount)}</span>
        </div>
        <div class="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
          <span>Grand Total</span>
          <span class="text-indigo-600 dark:text-indigo-400">${fmt.currency(sale.grandTotal)}</span>
        </div>
      </div>

      <div class="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
        <p class="text-xs text-slate-400 italic font-medium">${fmt.escape(state.settings.invoiceNote || '')}</p>
      </div>
    `;

    modals.open('invoice-modal');
  }

  // --- CORE VIEW: EXPENSES ---
  function renderExpenses() {
    const tbody = document.getElementById('expenses-table-tbody');
    const searchVal = (document.getElementById('expense-search-input')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('expense-category-filter')?.value || 'all';

    if (!tbody) return;

    const filtered = state.expenses.filter(e => {
      const matchSearch = (e.title || '').toLowerCase().includes(searchVal);
      const matchCat = catVal === 'all' || e.category === catVal;
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-xs text-slate-400">No expense records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = [...filtered].reverse().map(e => `
      <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
        <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">${fmt.escape(e.title)}</td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
            ${fmt.escape(e.category)}
          </span>
        </td>
        <td class="px-6 py-4 text-xs text-slate-400">${fmt.date(e.date)}</td>
        <td class="px-6 py-4 text-xs font-medium text-slate-500">${fmt.escape(e.method || 'Cash')}</td>
        <td class="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">${fmt.currency(e.amount)}</td>
        <td class="px-6 py-4 text-right space-x-2">
          <button onclick="app.editExpense('${e.id}')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
          <button onclick="app.deleteExpense('${e.id}')" class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function openExpenseModal(expense = null) {
    const title = document.getElementById('expense-modal-title');
    const form = document.getElementById('expense-form');
    if (!form) return;

    form.reset();
    document.getElementById('expense-form-id').value = expense ? expense.id : '';

    if (expense) {
      if (title) title.textContent = "Edit Expense";
      document.getElementById('exp-title').value = expense.title || '';
      document.getElementById('exp-category').value = expense.category || 'Utilities';
      document.getElementById('exp-method').value = expense.method || 'Cash';
      document.getElementById('exp-amount').value = expense.amount || '';
      document.getElementById('exp-date').value = expense.date || new Date().toISOString().split('T')[0];
    } else {
      if (title) title.textContent = "Record Expense";
      document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
    }

    modals.open('expense-modal');
  }

  function handleSaveExpense(e) {
    e.preventDefault();
    const id = document.getElementById('expense-form-id').value;
    const title = document.getElementById('exp-title').value.trim();
    const category = document.getElementById('exp-category').value;
    const method = document.getElementById('exp-method').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const date = document.getElementById('exp-date').value;

    if (!title || isNaN(amount) || amount <= 0) {
      toast.show("Please enter a valid expense description and amount", "error");
      return;
    }

    if (id) {
      const idx = state.expenses.findIndex(x => x.id === id);
      if (idx !== -1) {
        state.expenses[idx] = { id, title, category, method, amount, date };
        toast.show("Expense record updated");
      }
    } else {
      const newId = `EXP-${Date.now().toString().slice(-4)}`;
      state.expenses.push({ id: newId, title, category, method, amount, date });
      toast.show("Expense recorded successfully");
    }

    storage.save('expenses');
    modals.close('expense-modal');
    renderExpenses();
    renderDashboard();
  }

  function deleteExpense(id) {
    modals.confirm("Delete Expense Record?", `Are you sure you want to remove this expense record?`, () => {
      state.expenses = state.expenses.filter(e => e.id !== id);
      storage.save('expenses');
      toast.show("Expense deleted");
      renderExpenses();
      renderDashboard();
    });
  }

  // --- CORE VIEW: CUSTOMERS ---
  function renderCustomers() {
    const grid = document.getElementById('customers-cards-grid');
    const searchVal = (document.getElementById('customer-search-input')?.value || '').toLowerCase().trim();

    if (!grid) return;

    const filtered = state.customers.filter(c => {
      return (c.name || '').toLowerCase().includes(searchVal) ||
             (c.email || '').toLowerCase().includes(searchVal) ||
             (c.phone || '').toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-full py-12 text-center text-xs text-slate-400">No customer profiles match your search.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(c => {
      // Calculate customer lifetime metrics locally
      const custSales = state.sales.filter(s => (s.customer || '').toLowerCase() === c.name.toLowerCase());
      const spent = custSales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

      return `
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                ${c.name.slice(0, 2).toUpperCase()}
              </div>
              <div class="flex items-center gap-2">
                <button onclick="app.editCustomer('${c.id}')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                <button onclick="app.deleteCustomer('${c.id}')" class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
              </div>
            </div>
            <h4 class="font-bold text-slate-900 dark:text-white text-base">${fmt.escape(c.name)}</h4>
            <div class="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <div class="flex items-center gap-1.5 truncate">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                <span class="truncate">${fmt.escape(c.email || 'No email')}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <span>${fmt.escape(c.phone || 'No phone')}</span>
              </div>
            </div>
          </div>
          <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400">${custSales.length} Invoices</span>
            <span class="font-extrabold text-slate-900 dark:text-white">Spent: ${fmt.currency(spent)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function openCustomerModal(cust = null) {
    const title = document.getElementById('customer-modal-title');
    const form = document.getElementById('customer-form');
    if (!form) return;

    form.reset();
    document.getElementById('customer-form-id').value = cust ? cust.id : '';

    if (cust) {
      if (title) title.textContent = "Edit Customer";
      document.getElementById('cust-name').value = cust.name || '';
      document.getElementById('cust-email').value = cust.email || '';
      document.getElementById('cust-phone').value = cust.phone || '';
      document.getElementById('cust-address').value = cust.address || '';
    } else {
      if (title) title.textContent = "Add Customer";
    }

    modals.open('customer-modal');
  }

  function handleSaveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('customer-form-id').value;
    const name = document.getElementById('cust-name').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();

    if (!name) {
      toast.show("Customer name is required", "error");
      return;
    }

    if (id) {
      const idx = state.customers.findIndex(c => c.id === id);
      if (idx !== -1) {
        state.customers[idx] = { id, name, email, phone, address };
        toast.show("Customer profile updated");
      }
    } else {
      const newId = `CST-${Date.now().toString().slice(-4)}`;
      state.customers.push({ id: newId, name, email, phone, address });
      toast.show("New customer registered");
    }

    storage.save('customers');
    modals.close('customer-modal');
    renderCustomers();
  }

  function deleteCustomer(id) {
    modals.confirm("Delete Customer?", "Are you sure you want to remove this customer record?", () => {
      state.customers = state.customers.filter(c => c.id !== id);
      storage.save('customers');
      toast.show("Customer removed");
      renderCustomers();
    });
  }

  // --- CORE VIEW: FINANCIAL REPORTS ---
  function renderReports() {
    const totalRev = state.sales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const totalExp = state.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const profit = totalRev - totalExp;
    const margin = totalRev > 0 ? ((profit / totalRev) * 100).toFixed(1) : 0;

    const repRev = document.getElementById('rep-total-sales');
    const repSalesCount = document.getElementById('rep-sales-count');
    const repExp = document.getElementById('rep-total-expenses');
    const repExpCount = document.getElementById('rep-expense-count');
    const repProf = document.getElementById('rep-net-profit');
    const repMarg = document.getElementById('rep-profit-margin');

    if (repRev) repRev.textContent = fmt.currency(totalRev);
    if (repSalesCount) repSalesCount.textContent = state.sales.length.toString();
    if (repExp) repExp.textContent = fmt.currency(totalExp);
    if (repExpCount) repExpCount.textContent = state.expenses.length.toString();
    if (repProf) {
      repProf.textContent = fmt.currency(profit);
      repProf.className = `text-2xl font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
    }
    if (repMarg) repMarg.textContent = `${margin}%`;

    // Stock inventory valuation
    const totalStock = state.products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const retailVal = state.products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
    const costVal = state.products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.cost) || 0)), 0);
    const projMargin = retailVal - costVal;

    const stockCountEl = document.getElementById('rep-total-stock-count');
    const retailValEl = document.getElementById('rep-stock-retail-val');
    const costValEl = document.getElementById('rep-stock-cost-val');
    const projMarginEl = document.getElementById('rep-stock-projected-margin');

    if (stockCountEl) stockCountEl.textContent = `${totalStock} units`;
    if (retailValEl) retailValEl.textContent = fmt.currency(retailVal);
    if (costValEl) costValEl.textContent = fmt.currency(costVal);
    if (projMarginEl) projMarginEl.textContent = fmt.currency(projMargin);

    // Top selling products aggregated
    const productRevenues = {};
    for (const sale of state.sales) {
      for (const item of sale.items || []) {
        productRevenues[item.name] = (productRevenues[item.name] || 0) + (Number(item.total) || 0);
      }
    }

    const sortedProducts = Object.entries(productRevenues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topListEl = document.getElementById('rep-top-products-list');
    if (topListEl) {
      if (sortedProducts.length === 0) {
        topListEl.innerHTML = `<p class="text-xs text-slate-400 py-3">No sales volume logged yet.</p>`;
      } else {
        topListEl.innerHTML = sortedProducts.map(([name, sumRev]) => `
          <div class="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
            <span class="font-medium text-slate-700 dark:text-slate-300 truncate pr-3">${fmt.escape(name)}</span>
            <span class="font-bold text-slate-900 dark:text-white shrink-0">${fmt.currency(sumRev)}</span>
          </div>
        `).join('');
      }
    }
  }

  // --- CORE VIEW: SETTINGS & BACKUP ---
  function renderSettings() {
    const bizNameInput = document.getElementById('setting-biz-name');
    const currInput = document.getElementById('setting-currency');
    const taxInput = document.getElementById('setting-tax-rate');
    const noteInput = document.getElementById('setting-invoice-note');

    if (bizNameInput) bizNameInput.value = state.settings.businessName || '';
    if (currInput) currInput.value = state.settings.currency || '$';
    if (taxInput) taxInput.value = state.settings.taxRate ?? 7.5;
    if (noteInput) noteInput.value = state.settings.invoiceNote || '';

    // Update branding
    const sideBrand = document.getElementById('sidebar-biz-name');
    if (sideBrand) sideBrand.textContent = state.settings.businessName || 'SmartBiz';
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    const name = document.getElementById('setting-biz-name').value.trim();
    const currency = document.getElementById('setting-currency').value.trim();
    const taxRate = parseFloat(document.getElementById('setting-tax-rate').value);
    const invoiceNote = document.getElementById('setting-invoice-note').value.trim();

    state.settings = {
      businessName: name || 'Smart Business',
      currency: currency || '$',
      taxRate: isNaN(taxRate) ? 0 : taxRate,
      invoiceNote
    };

    storage.save('settings');
    toast.show("Preferences saved successfully");
    renderSettings();
    renderDashboard();
  }

  // --- DATA EXPORT & IMPORT ---
  function exportFullJSON() {
    const dataBackup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: state.settings,
      products: state.products,
      sales: state.sales,
      expenses: state.expenses,
      customers: state.customers
    };

    const blob = new Blob([JSON.stringify(dataBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartBiz-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show("Database backup downloaded");
  }

  function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.products && parsed.sales) {
          state.settings = parsed.settings || { ...DEFAULT_SETTINGS };
          state.products = parsed.products || [];
          state.sales = parsed.sales || [];
          state.expenses = parsed.expenses || [];
          state.customers = parsed.customers || [];

          storage.save();
          toast.show("Database restored successfully!");
          renderDashboard();
          renderProducts();
          renderSales();
        } else {
          toast.show("Invalid backup file format", "error");
        }
      } catch (err) {
        toast.show("Could not parse JSON backup file", "error");
      }
    };
    reader.readAsText(file);
  }

  function exportProductsCSV() {
    if (state.products.length === 0) {
      toast.show("No products to export", "error");
      return;
    }
    const headers = ["ID", "Name", "SKU", "Category", "Price", "Cost", "Stock"];
    const rows = state.products.map(p => [
      `"${p.id}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      p.price,
      p.cost,
      p.stock
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `products-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }

  function exportFullSalesCSV() {
    if (state.sales.length === 0) {
      toast.show("No sales records to export", "error");
      return;
    }
    const headers = ["InvoiceID", "Date", "Customer", "Subtotal", "TaxAmount", "GrandTotal", "PaymentMethod"];
    const rows = state.sales.map(s => [
      `"${s.id}"`,
      `"${s.date}"`,
      `"${(s.customer || '').replace(/"/g, '""')}"`,
      s.subtotal,
      s.taxAmount,
      s.grandTotal,
      `"${s.paymentMethod}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `financial-sales-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- BIND EVENT LISTENERS ---
  function setupEvents() {
    // Top date label
    const topDate = document.getElementById('top-date-display');
    if (topDate) {
      topDate.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      });
    }

    // Sidebar navigation clicks
    document.querySelectorAll('#nav-list .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        if (targetView) navigate(targetView);
      });
    });

    // Mobile sidebar toggle
    document.getElementById('open-sidebar-btn')?.addEventListener('click', openSidebar);
    document.getElementById('close-sidebar-btn')?.addEventListener('click', closeSidebar);
    document.getElementById('mobile-overlay')?.addEventListener('click', closeSidebar);

    // Theme toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', modals.closeAll);
    });

    // Quick Action button in top header
    document.getElementById('quick-sale-btn')?.addEventListener('click', openSaleModal);
    document.getElementById('create-new-sale-modal-btn')?.addEventListener('click', openSaleModal);

    // Products events
    document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal());
    document.getElementById('product-form')?.addEventListener('submit', handleSaveProduct);
    document.getElementById('product-search-input')?.addEventListener('input', renderProducts);
    document.getElementById('product-category-filter')?.addEventListener('change', renderProducts);
    document.getElementById('export-products-csv')?.addEventListener('click', exportProductsCSV);

    // POS / Sale events
    document.getElementById('pos-add-item-btn')?.addEventListener('click', addItemToCart);
    document.getElementById('pos-discount-input')?.addEventListener('input', updateCartUI);
    document.getElementById('pos-sale-form')?.addEventListener('submit', handleCompleteSale);
    document.getElementById('sales-search-input')?.addEventListener('input', renderSales);

    // Print invoice button
    document.getElementById('invoice-print-btn')?.addEventListener('click', () => window.print());

    // Expense events
    document.getElementById('add-expense-btn')?.addEventListener('click', () => openExpenseModal());
    document.getElementById('expense-form')?.addEventListener('submit', handleSaveExpense);
    document.getElementById('expense-search-input')?.addEventListener('input', renderExpenses);
    document.getElementById('expense-category-filter')?.addEventListener('change', renderExpenses);

    // Customer events
    document.getElementById('add-customer-btn')?.addEventListener('click', () => openCustomerModal());
    document.getElementById('customer-form')?.addEventListener('submit', handleSaveCustomer);
    document.getElementById('customer-search-input')?.addEventListener('input', renderCustomers);

    // Reports export
    document.getElementById('print-reports-btn')?.addEventListener('click', () => window.print());
    document.getElementById('export-full-csv-btn')?.addEventListener('click', exportFullSalesCSV);

    // Settings & Backup
    document.getElementById('settings-form')?.addEventListener('submit', handleSaveSettings);
    document.getElementById('backup-export-btn')?.addEventListener('click', exportFullJSON);
    document.getElementById('backup-import-file')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importJSON(e.target.files[0]);
      }
    });

    document.getElementById('load-sample-data-btn')?.addEventListener('click', () => {
      modals.confirm("Reload Demo Data?", "This will populate realistic demo data into your manager.", () => {
        storage.seed();
        toast.show("Sample data loaded");
        renderSettings();
        renderDashboard();
      });
    });

    document.getElementById('wipe-data-btn')?.addEventListener('click', () => {
      modals.confirm("Erase All Data?", "Permanently delete all sales, inventory, and expense records?", () => {
        storage.wipe();
        toast.show("All database entries wiped");
        renderSettings();
        renderDashboard();
      });
    });
  }

  // --- INITIALIZATION ---
  function init() {
    storage.load();
    initTheme();
    setupEvents();
    renderSettings();
    navigate('dashboard');
  }

  // Expose global controller for inline onclick helpers
  window.app = {
    navigate,
    editProduct: (id) => openProductModal(state.products.find(p => p.id === id)),
    deleteProduct,
    showInvoice,
    deleteSale,
    removeCartItem,
    editExpense: (id) => openExpenseModal(state.expenses.find(e => e.id === id)),
    deleteExpense,
    editCustomer: (id) => openCustomerModal(state.customers.find(c => c.id === id)),
    deleteCustomer
  };

  document.addEventListener('DOMContentLoaded', init);
})();