// App metadata and API config
let APP_META = { app_id: "barberlanding" };
let API_BASE = "https://trumpledroid-api.cloudbeta28624.workers.dev";
let authToken = localStorage.getItem("regal_token") || null;

document.addEventListener("DOMContentLoaded", async () => {
  // Load app meta if possible
  try {
    const res = await fetch("app-meta.json");
    const data = await res.json();
    if (data && data.app_name) {
      APP_META.app_id = data.app_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    }
  } catch (e) {
    console.log("Using default app_id");
  }

  initNavbar();
  initMap();
  initServiceFilters();
  initGalleryFilters();
  initQuickBooking();
  initMainBooking();
  initAuthForms();
  updateAuthNav();

  // Set default date to today
  const todayStr = new Date().toISOString().split("T")[0];
  const dateInput1 = document.getElementById("booking-date");
  const dateInput2 = document.getElementById("quick-date");
  if (dateInput1) dateInput1.value = todayStr;
  if (dateInput2) dateInput2.value = todayStr;

  calculateBookingTotal();
});

/* --- NAVBAR & MOBILE MENU --- */
function initNavbar() {
  const btn = document.getElementById("mobile-menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    btn.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });
  }
}

/* --- LEAFLET MAP --- */
function initMap() {
  const mapEl = document.getElementById("map");
  if (mapEl) {
    // Coordinates for sample barbershop location
    const lat = 40.7128;
    const lng = -74.0060;
    const map = L.map("map").setView([lat, lng], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    L.marker([lat, lng]).addTo(map)
      .bindPopup("<b>Regal Edge Barbershop</b><br>742 Evergreen Terrace, Suite 100")
      .openPopup();
  }
}

/* --- SERVICE FILTER --- */
function filterServices(category) {
  const tabs = document.querySelectorAll(".service-tab");
  tabs.forEach(t => {
    t.classList.remove("bg-[#d4af37]", "text-black");
    t.classList.add("text-gray-300");
  });
  const activeTab = document.getElementById(`tab-${category}`);
  if (activeTab) {
    activeTab.classList.remove("text-gray-300");
    activeTab.classList.add("bg-[#d4af37]", "text-black");
  }

  const items = document.querySelectorAll(".service-item");
  items.forEach(item => {
    if (category === "all" || item.getAttribute("data-category") === category) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

/* --- GALLERY FILTER --- */
function filterGallery(category) {
  const tabs = document.querySelectorAll(".gallery-tab");
  tabs.forEach(t => {
    t.classList.remove("bg-[#d4af37]", "text-black");
    t.classList.add("text-gray-300");
  });
  const activeTab = document.getElementById(`gallery-tab-${category}`);
  if (activeTab) {
    activeTab.classList.remove("text-gray-300");
    activeTab.classList.add("bg-[#d4af37]", "text-black");
  }

  const cards = document.querySelectorAll(".gallery-card");
  cards.forEach(card => {
    if (category === "all" || card.getAttribute("data-category") === category) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

/* --- QUICK BOOKING & PROMPTS --- */
function selectServicePrompt(serviceName, price) {
  const select = document.getElementById("booking-service");
  if (select) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === serviceName) {
        select.selectedIndex = i;
        break;
      }
    }
    calculateBookingTotal();
  }
  document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
}

function selectBarberPrompt(barberName) {
  const select = document.getElementById("booking-barber");
  if (select) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === barberName) {
        select.selectedIndex = i;
        break;
      }
    }
  }
  document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
}

function initQuickBooking() {
  const form = document.getElementById("hero-quick-book");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const service = document.getElementById("quick-service").value;
      const barber = document.getElementById("quick-barber").value;
      const date = document.getElementById("quick-date").value;
      const time = document.getElementById("quick-time").value;

      selectServicePrompt(service, 45);
      const barberSelect = document.getElementById("booking-barber");
      if (barberSelect) barberSelect.value = barber;
      const dateSelect = document.getElementById("booking-date");
      if (dateSelect) dateSelect.value = date;
      const timeSelect = document.getElementById("booking-time");
      if (timeSelect) timeSelect.value = time;
    });
  }
}

/* --- LOCAL CALCULATION & MAIN BOOKING --- */
function calculateBookingTotal() {
  const serviceSelect = document.getElementById("booking-service");
  if (!serviceSelect) return;
  const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
  const serviceName = selectedOption.value;
  
  // Find price from options or map
  let price = 45;
  const prices = {
    "Executive Haircut": 45,
    "Beard Sculpting & Trim": 35,
    "Signature Royal Shave": 50,
    "The Regal Full Package": 115,
    "Father & Son Combo": 75,
    "The Groom's Party Package": 350
  };
  price = prices[serviceName] || 45;

  document.getElementById("summary-service-name").innerText = serviceName;
  document.getElementById("summary-total-price").innerText = `$${price.toFixed(2)}`;
}

function initMainBooking() {
  const form = document.getElementById("main-booking-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const service = document.getElementById("booking-service").value;
      const barber = document.getElementById("booking-barber").value;
      const date = document.getElementById("booking-date").value;
      const time = document.getElementById("booking-time").value;
      const name = document.getElementById("booking-name").value;
      const phone = document.getElementById("booking-phone").value;
      const notes = document.getElementById("booking-notes").value;

      const appointmentData = {
        service,
        barber,
        date,
        time,
        name,
        phone,
        notes,
        status: "Confirmed"
      };

      if (!authToken) {
        // If not logged in, prompt login or save locally
        alert("Appointment prepared! Please log in or sign up to save your appointment to your client portal.");
        openModal("login-modal");
        return;
      }

      const btn = document.getElementById("submit-booking-btn");
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving Appointment...`;

      try {
        const res = await fetch(`${API_BASE}/data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            collection: "appointments",
            data: appointmentData
          })
        });

        const result = await res.json();
        if (result.success && result.record) {
          alert(`Success! Your appointment for ${service} with ${barber} on ${date} at ${time} has been confirmed.`);
          form.reset();
          loadUserAppointments();
        } else {
          alert("Failed to save appointment: " + (result.error || "Unknown error"));
        }
      } catch (err) {
        console.error(err);
        alert("Network error while booking. Please try again.");
      } finally {
        btn.innerHTML = `<i class="fa-solid fa-check-to-slot"></i> Confirm & Book Appointment`;
      }
    });
  }
}

/* --- AUTHENTICATION & CLIENT PORTAL --- */
function updateAuthNav() {
  const container = document.getElementById("auth-nav-container");
  const mobileContainer = document.getElementById("mobile-auth-container");
  const portalSection = document.getElementById("portal-section");
  const guard = document.getElementById("booking-auth-guard");

  if (authToken) {
    if (portalSection) portalSection.classList.remove("hidden");
    if (guard) guard.classList.add("hidden");
    loadUserAppointments();

    const html = `
      <div class="flex items-center gap-3">
        <a href="#portal-section" class="text-xs font-bold text-[#d4af37] bg-[#d4af37]/10 px-3 py-2 rounded-lg border border-[#d4af37]/30 hover:bg-[#d4af37]/20 transition flex items-center gap-1.5">
          <i class="fa-solid fa-user-shield"></i> Client Portal
        </a>
        <button onclick="logout()" class="text-xs font-semibold text-gray-400 hover:text-white px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
    `;
    if (container) container.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;
  } else {
    if (portalSection) portalSection.classList.add("hidden");
    if (guard) guard.classList.remove("hidden");

    const html = `
      <button onclick="openModal('login-modal')" class="text-xs font-semibold text-gray-300 hover:text-[#d4af37] px-4 py-2 transition">Log In</button>
      <button onclick="openModal('signup-modal')" class="gold-bg text-black text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition">Sign Up</button>
    `;
    if (container) container.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;
  }
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove("hidden");
    m.classList.add("flex");
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove("flex");
    m.classList.add("hidden");
  }
}

function switchModal(fromId, toId) {
  closeModal(fromId);
  openModal(toId);
}

function initAuthForms() {
  // Login Form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: APP_META.app_id, email, password })
        });
        const data = await res.json();
        if (data.token) {
          authToken = data.token;
          localStorage.setItem("regal_token", authToken);
          closeModal("login-modal");
          updateAuthNav();
          alert("Login successful!");
        } else {
          alert("Login failed: " + (data.error || "Invalid credentials"));
        }
      } catch (err) {
        console.error(err);
        alert("Network error during login.");
      }
    });
  }

  // Signup Form
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;

      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: APP_META.app_id, email, password })
        });
        const data = await res.json();
        if (data.success !== false) {
          // Automatic login after registration
          const loginRes = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ app_id: APP_META.app_id, email, password })
          });
          const loginData = await loginRes.json();
          if (loginData.token) {
            authToken = loginData.token;
            localStorage.setItem("regal_token", authToken);
            closeModal("signup-modal");
            updateAuthNav();
            alert("Account created and logged in successfully!");
          } else {
            alert("Registration successful! Please log in.");
            switchModal("signup-modal", "login-modal");
          }
        } else {
          alert("Registration failed: " + (data.error || "Could not register"));
        }
      } catch (err) {
        console.error(err);
        alert("Network error during registration.");
      }
    });
  }

  // Forgot Password Form
  const forgotForm = document.getElementById("forgot-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgot-email").value;
      const otp = document.getElementById("forgot-otp").value;
      const new_password = document.getElementById("forgot-new-password").value;

      try {
        // Step 1 request OTP
        await fetch(`${API_BASE}/request-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: APP_META.app_id, email })
        });

        // Step 2 reset password
        const res = await fetch(`${API_BASE}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: APP_META.app_id, email, otp, new_password })
        });
        const data = await res.json();
        if (data.success) {
          alert("Password successfully reset! Please log in.");
          switchModal("forgot-modal", "login-modal");
        } else {
          alert("Password reset failed: " + (data.error || "Invalid OTP"));
        }
      } catch (err) {
        console.error(err);
        alert("Network error during password reset.");
      }
    });
  }
}

function logout() {
  if (authToken) {
    fetch(`${API_BASE}/logout`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` }
    }).catch(() => {});
  }
  authToken = null;
  localStorage.removeItem("regal_token");
  updateAuthNav();
  alert("Logged out successfully.");
}

async function loadUserAppointments() {
  if (!authToken) return;
  const container = document.getElementById("appointments-container");
  if (!container) return;

  container.innerHTML = `<p class="text-gray-400 text-sm col-span-full text-center py-8"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading your appointments...</p>`;

  try {
    const res = await fetch(`${API_BASE}/data?collection=appointments`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.success && data.records) {
      if (data.records.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-sm col-span-full text-center py-8">You have no active appointments booked yet.</p>`;
        return;
      }

      container.innerHTML = "";
      data.records.forEach(rec => {
        const item = rec.data;
        const card = document.createElement("div");
        card.className = "bg-[#161920] p-6 rounded-2xl border border-gray-800 relative flex flex-col justify-between card-hover";
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold px-3 py-1 rounded bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30">${item.status || 'Confirmed'}</span>
              <span class="text-xs text-gray-400"><i class="fa-regular fa-calendar mr-1"></i> ${item.date || 'Today'}</span>
            </div>
            <h3 class="text-lg font-heading font-bold text-white mb-1">${item.service}</h3>
            <p class="text-xs text-[#d4af37] font-semibold uppercase tracking-wider mb-4"><i class="fa-solid fa-scissors mr-1"></i> ${item.barber}</p>
            <div class="space-y-1.5 text-xs text-gray-300 mb-6">
              <p><i class="fa-regular fa-clock w-5 text-gray-500"></i> Time: ${item.time}</p>
              <p><i class="fa-regular fa-user w-5 text-gray-500"></i> Client: ${item.name}</p>
              <p><i class="fa-solid fa-phone w-5 text-gray-500"></i> Phone: ${item.phone}</p>
              ${item.notes ? `<p><i class="fa-regular fa-note-sticky w-5 text-gray-500"></i> Notes: ${item.notes}</p>` : ''}
            </div>
          </div>
          <button onclick="cancelAppointment('${rec.id}')" class="w-full bg-red-950/40 hover:bg-red-900/60 text-red-300 font-semibold py-2.5 rounded-xl border border-red-800/50 transition text-xs flex items-center justify-center gap-2">
            <i class="fa-solid fa-trash-can"></i> Cancel Appointment
          </button>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `<p class="text-gray-400 text-sm col-span-full text-center py-8">Failed to load appointments.</p>`;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="text-gray-400 text-sm col-span-full text-center py-8">Error loading appointments.</p>`;
  }
}

async function cancelAppointment(id) {
  if (!confirm("Are you sure you want to cancel this appointment?")) return;
  try {
    const res = await fetch(`${API_BASE}/data?id=${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      alert("Appointment cancelled successfully.");
      loadUserAppointments();
    } else {
      alert("Failed to cancel appointment.");
    }
  } catch (err) {
    console.error(err);
    alert("Network error while cancelling appointment.");
  }
}