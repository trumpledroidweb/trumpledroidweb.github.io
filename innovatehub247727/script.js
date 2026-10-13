/**
 * InnovateHub — Interactive Web Logic
 * Offline Deterministic Calculations, Mobile Menu, and Contact Form Simulation
 */

document.addEventListener('DOMContentLoaded', () => {
  initCopyrightYear();
  initMobileMenu();
  initProjectQuoteCalculator();
  initContactForm();
});

// 1. Update Copyright Year
function initCopyrightYear() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// 2. Responsive Mobile Drawer Toggle
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (toggleBtn && mobileMenu) {
    toggleBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    // Close menu when clicking internal anchor links
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }
}

// 3. Deterministic Project Quote Calculator (Browser-Side Calculation)
// Formula: (base_rate * estimated_hours * complexity_modifier) + addon_fees
function calculateProjectQuote(baseRate, estimatedHours, complexityModifier, addonFees) {
  const rate = Number(baseRate) || 0;
  const hours = Number(estimatedHours) || 0;
  const complexity = Number(complexityModifier) || 1.0;
  const addons = Number(addonFees) || 0;

  const laborCost = rate * hours * complexity;
  const total = laborCost + addons;
  
  return {
    laborCost,
    total,
    rate,
    hours,
    complexity,
    addons
  };
}

function initProjectQuoteCalculator() {
  const serviceTypeSelect = document.getElementById('service-type');
  const hoursSlider = document.getElementById('estimated-hours');
  const hoursDisplay = document.getElementById('hours-display');
  const complexitySelect = document.getElementById('complexity');
  const addonSupportCheckbox = document.getElementById('addon-support');
  const addonDataCheckbox = document.getElementById('addon-data');
  const calculatedTotalDisplay = document.getElementById('calculated-total');
  const breakdownDisplay = document.getElementById('calculation-breakdown');

  const inputs = [
    serviceTypeSelect,
    hoursSlider,
    complexitySelect,
    addonSupportCheckbox,
    addonDataCheckbox
  ];

  function updateQuote() {
    if (!serviceTypeSelect || !hoursSlider || !complexitySelect || !calculatedTotalDisplay) return;

    const baseRate = parseFloat(serviceTypeSelect.value) || 80;
    const estimatedHours = parseInt(hoursSlider.value, 10) || 40;
    const complexityModifier = parseFloat(complexitySelect.value) || 1.0;

    let addonFees = 0;
    if (addonSupportCheckbox && addonSupportCheckbox.checked) {
      addonFees += parseFloat(addonSupportCheckbox.value) || 0;
    }
    if (addonDataCheckbox && addonDataCheckbox.checked) {
      addonFees += parseFloat(addonDataCheckbox.value) || 0;
    }

    if (hoursDisplay) {
      hoursDisplay.textContent = `${estimatedHours} Hours`;
    }

    // Pure deterministic client-side calculation
    const result = calculateProjectQuote(baseRate, estimatedHours, complexityModifier, addonFees);

    // Format output
    calculatedTotalDisplay.textContent = `$${result.total.toFixed(2)}`;
    if (breakdownDisplay) {
      breakdownDisplay.textContent = `${result.hours}h × $${result.rate}/hr × ${result.complexity} factor + $${result.addons} add-ons`;
    }
  }

  inputs.forEach(input => {
    if (input) {
      input.addEventListener(input.type === 'range' ? 'input' : 'change', updateQuote);
    }
  });

  // Run initial calculation on page load
  updateQuote();
}

// 4. Contact / Inquiry Form Simulation
function initContactForm() {
  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('contact-name')?.value.trim();
      const email = document.getElementById('contact-email')?.value.trim();
      const projectType = document.getElementById('project-type')?.value;
      const details = document.getElementById('project-details')?.value.trim();

      if (!name || !email || !details) {
        alert('Please complete all required fields.');
        return;
      }

      // Simulate API call and display friendly success notice
      if (feedback) {
        feedback.textContent = `Thank you, ${name}! Your inquiry for a ${projectType} project has been received. We'll contact you at ${email} shortly.`;
        feedback.classList.remove('hidden');
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Reset form fields
      form.reset();
    });
  }
}