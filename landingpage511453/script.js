/**
 * NexusStack Landing Page
 * Interactive Logic, Offline Calculators & UI Orchestration
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
     1. NAVIGATION & MOBILE DRAWER
     ========================================================== */
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const hamburgerIcon = document.getElementById('hamburger-icon');
  const closeIcon = document.getElementById('close-icon');

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const isExpanded = !mobileMenu.classList.contains('hidden');
      if (isExpanded) {
        mobileMenu.classList.add('hidden');
        hamburgerIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
      } else {
        mobileMenu.classList.remove('hidden');
        hamburgerIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');
      }
    });

    // Close menu when a link is clicked
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        hamburgerIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
      });
    });
  }


  /* ==========================================================
     2. INTERACTIVE FEATURE TAB SWITCHER
     ========================================================== */
  const featureTabs = [
    {
      id: 'ai',
      title: 'Distributed Edge Compute Engine',
      badge: 'Zero Cold Starts',
      description: 'Execute reactive routines across 300+ edge locations with guaranteed &lt;14ms tail latency. Eliminates traditional server management overhead.',
      bullets: [
        'Automatic regional routing based on nearest IP hop',
        'Built-in WebSocket synchronization for real-time collaboration',
        'Deterministic execution sandboxes with memory isolation'
      ],
      codeSnippet: `// Instant Edge Pipeline\nexport default {\n  async fetch(req) {\n    const payload = await req.json();\n    return Response.json({ success: true, processed: payload });\n  }\n};`
    },
    {
      id: 'analytics',
      title: 'State Replicas & Deterministic Storage',
      badge: 'Instant Consistency',
      description: 'Synchronize localized user data across tabs, sessions, and edge servers with zero serialization loss or schema drifts.',
      bullets: [
        'Conflict-free CRDT state reconciliation',
        'Automatic client-side calculation caching',
        'Optimistic updates with zero interface freeze'
      ],
      codeSnippet: `// Local Deterministic State\nconst state = ReactiveStore.create({\n  teamSeats: 12,\n  tier: 'pro',\n  discount: 0.20\n});\nstate.subscribe(recalculateMetrics);`
    },
    {
      id: 'security',
      title: 'Enterprise Shield & Access Verification',
      badge: 'Zero-Trust Architecture',
      description: 'Enforce stringent role boundaries and token verification across all operations without complex third-party identity sprawl.',
      bullets: [
        'Cryptographically signed session tokens',
        'Local permission matrix evaluation',
        'Automated rate-limiting and DDoS mitigations at the edge'
      ],
      codeSnippet: `// Security Validation Pipeline\nconst verifySession = (token) => {\n  if (!token || token.length < 24) throw new Error("Unauthorized");\n  return TokenEngine.decode(token);\n};`
    }
  ];

  const tabButtons = document.querySelectorAll('.feature-tab-btn');
  const featureContentContainer = document.getElementById('feature-display-content');

  function renderFeatureTab(tabId) {
    const data = featureTabs.find(t => t.id === tabId) || featureTabs[0];
    if (!featureContentContainer) return;

    featureContentContainer.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
        <div class="lg:col-span-7">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-4">
            ${data.badge}
          </div>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-white mb-4">${data.title}</h3>
          <p class="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">${data.description}</p>
          <ul class="space-y-3">
            ${data.bullets.map(b => `
              <li class="flex items-start gap-3 text-sm text-slate-300">
                <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>${b}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner text-indigo-300">
          <div class="flex items-center gap-1.5 pb-3 border-b border-slate-800 mb-3 text-slate-600">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
            <span class="text-[10px] ml-2 text-slate-500">runtime.ts</span>
          </div>
          <pre class="leading-relaxed whitespace-pre-wrap">${data.codeSnippet}</pre>
        </div>
      </div>
    `;
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('active-tab-btn');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('active-tab-btn');
      btn.classList.remove('text-slate-400');
      renderFeatureTab(btn.getAttribute('data-tab'));
    });
  });

  // Initial tab render
  renderFeatureTab('ai');


  /* ==========================================================
     3. MANDATORY OFFLINE CALCULATION ENGINE
     Deterministic Logic for ROI & Platform Pricing
     ========================================================== */
  const teamSlider = document.getElementById('team-slider');
  const teamSizeDisplay = document.getElementById('team-size-display');
  const annualToggle = document.getElementById('annual-billing-toggle');
  const supportToggle = document.getElementById('support-addon-toggle');
  const calculatedCostDisplay = document.getElementById('calculated-cost-display');
  const originalCostDisplay = document.getElementById('original-cost-display');
  const savingsBadge = document.getElementById('savings-badge');
  const hoursSavedDisplay = document.getElementById('hours-saved-display');
  const dollarSavedDisplay = document.getElementById('dollar-saved-display');
  const discountAmountDisplay = document.getElementById('discount-amount-display');
  const billingCycleLabel = document.getElementById('billing-cycle-label');

  const tierBaseRates = {
    starter: 20,
    pro: 45,
    enterprise: 85
  };

  /**
   * Deterministic local calculation helper
   * Performs formula operations strictly in the browser
   */
  function calculatePricingMetrics() {
    if (!teamSlider) return;

    const teamSize = parseInt(teamSlider.value, 10) || 1;
    const selectedTierRadio = document.querySelector('input[name="tier"]:checked');
    const selectedTier = selectedTierRadio ? selectedTierRadio.value : 'pro';
    const isAnnual = annualToggle ? annualToggle.checked : true;
    const hasSupport = supportToggle ? supportToggle.checked : false;

    const baseRatePerSeat = tierBaseRates[selectedTier] || 45;
    const discountRate = isAnnual ? 0.20 : 0.0; // 20% discount if annual

    // Core Seat Costs
    const grossCost = teamSize * baseRatePerSeat;
    const discountSavings = Math.round(grossCost * discountRate);
    const supportFlatFee = hasSupport ? 150 : 0;
    const netMonthlyCost = (grossCost - discountSavings) + supportFlatFee;

    // Derived Productivity Calculations
    // 15 hours saved per engineer per month by automating builds & layout pipelines
    const hoursSavedPerMember = 15;
    const totalHoursSaved = teamSize * hoursSavedPerMember;
    // Estimated engineering value at standard $60/hr
    const estimatedDollarSaved = totalHoursSaved * 60;

    // Update UI elements
    if (teamSizeDisplay) {
      teamSizeDisplay.textContent = `${teamSize} ${teamSize === 1 ? 'Seat' : 'Seats'}`;
    }

    if (calculatedCostDisplay) {
      calculatedCostDisplay.textContent = `$${netMonthlyCost.toLocaleString()}`;
    }

    if (originalCostDisplay) {
      if (isAnnual) {
        originalCostDisplay.style.display = 'block';
        originalCostDisplay.textContent = `$${(grossCost + supportFlatFee).toLocaleString()}/month standard`;
      } else {
        originalCostDisplay.style.display = 'none';
      }
    }

    if (billingCycleLabel) {
      billingCycleLabel.textContent = isAnnual ? '/ month billed annually' : '/ month billed monthly';
    }

    if (savingsBadge) {
      if (isAnnual) {
        savingsBadge.style.display = 'inline-block';
        savingsBadge.textContent = '20% DISCOUNT APPLIED';
      } else {
        savingsBadge.style.display = 'none';
      }
    }

    if (hoursSavedDisplay) {
      hoursSavedDisplay.textContent = `${totalHoursSaved.toLocaleString()} hrs`;
    }

    if (dollarSavedDisplay) {
      dollarSavedDisplay.textContent = `$${estimatedDollarSaved.toLocaleString()}`;
    }

    if (discountAmountDisplay) {
      discountAmountDisplay.textContent = isAnnual ? `-$${discountSavings.toLocaleString()}/mo` : '$0';
    }
  }

  // Bind change and input listeners for reactive calculation
  if (teamSlider) {
    teamSlider.addEventListener('input', calculatePricingMetrics);
  }

  document.querySelectorAll('input[name="tier"]').forEach(radio => {
    radio.addEventListener('change', calculatePricingMetrics);
  });

  if (annualToggle) {
    annualToggle.addEventListener('change', calculatePricingMetrics);
  }

  if (supportToggle) {
    supportToggle.addEventListener('change', calculatePricingMetrics);
  }

  // Trigger initial calculation
  calculatePricingMetrics();


  /* ==========================================================
     4. TESTIMONIALS CATEGORY FILTER
     ========================================================== */
  const filterButtons = document.querySelectorAll('.testimonial-filter-btn');
  const testimonialCards = document.querySelectorAll('.testimonial-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      // Update button visual states
      filterButtons.forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white');
        b.classList.add('bg-slate-900', 'text-slate-400');
      });
      btn.classList.add('bg-indigo-600', 'text-white');
      btn.classList.remove('bg-slate-900', 'text-slate-400');

      // Filter cards
      testimonialCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.classList.add('animate-fade-in');
        } else {
          card.style.display = 'none';
        }
      });
    });
  });


  /* ==========================================================
     5. ACCORDION FAQ
     ========================================================== */
  const faqToggles = document.querySelectorAll('.faq-toggle');

  faqToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const content = toggle.nextElementSibling;
      const icon = toggle.querySelector('.faq-icon');
      const isHidden = content.classList.contains('hidden');

      // Close other opened FAQs
      document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('.faq-icon').forEach(i => i.classList.remove('rotate-180'));

      if (isHidden) {
        content.classList.remove('hidden');
        if (icon) icon.classList.add('rotate-180');
      }
    });
  });


  /* ==========================================================
     6. DEMO MODAL & TOAST NOTIFICATION
     ========================================================== */
  const demoModal = document.getElementById('demo-modal');
  const bookDemoBtn = document.getElementById('book-demo-btn');
  const mobileBookDemoBtn = document.getElementById('mobile-book-demo-btn');
  const ctaDemoBtn = document.getElementById('cta-demo-button');
  const calcCtaBtn = document.getElementById('calc-cta-btn');
  const openInteractiveTour = document.getElementById('open-interactive-preview');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const leadForm = document.getElementById('lead-form');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  function showToast(message) {
    if (!toast) return;
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }

  function openModal() {
    if (demoModal) {
      demoModal.classList.remove('hidden');
    }
  }

  function closeModal() {
    if (demoModal) {
      demoModal.classList.add('hidden');
    }
  }

  [bookDemoBtn, mobileBookDemoBtn, ctaDemoBtn, calcCtaBtn, openInteractiveTour].forEach(btn => {
    if (btn) btn.addEventListener('click', openModal);
  });

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  if (demoModal) {
    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) closeModal();
    });
  }

  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-name')?.value || 'Developer';
      closeModal();
      leadForm.reset();
      showToast(`Thank you, ${name}! Your demo request has been dispatched.`);
    });
  }

  // Newsletter Subscription Form Handler
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletter-email');
      if (emailInput && emailInput.value) {
        newsletterForm.reset();
        showToast("Subscribed! You'll receive the latest architecture notes.");
      }
    });
  }

});