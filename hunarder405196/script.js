/**
 * hunarDer — Interactive Web Logic
 * Offline Deterministic Calculations, Gallery Filtering & Commission Inquiries
 */

document.addEventListener('DOMContentLoaded', () => {
  initCopyrightYear();
  initMobileMenu();
  initGalleryFilters();
  initEstimatorCalculator();
  initContactForm();
});

// 1. Current Year
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

// 3. Interactive Gallery Category Filtering
function initGalleryFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedFilter = btn.getAttribute('data-filter');

      // Update button active state classes
      filterButtons.forEach(b => {
        b.classList.remove('active-filter', 'bg-stone-900', 'text-white');
        b.classList.add('border-stone-300', 'text-stone-600');
      });
      btn.classList.add('active-filter');
      btn.classList.remove('border-stone-300', 'text-stone-600');

      // Filter grid items
      galleryItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (selectedFilter === 'all' || itemCategory === selectedFilter) {
          item.classList.remove('hidden-item');
        } else {
          item.classList.add('hidden-item');
        }
      });
    });
  });
}

// 4. Deterministic Workshop Commission Calculator (Browser-Side Calculation)
// Formula: (base_hours * hourly_rate) + materials_fee + expedited_fee
function calculateWorkshopEstimate(baseHours, hourlyRate, materialsFee, expeditedFee) {
  const hours = Number(baseHours) || 0;
  const rate = Number(hourlyRate) || 0;
  const materials = Number(materialsFee) || 0;
  const expedited = Number(expeditedFee) || 0;

  const laborTotal = hours * rate;
  const total = laborTotal + materials + expedited;
  
  return {
    laborTotal,
    total,
    hours,
    rate,
    materials,
    expedited
  };
}

function initEstimatorCalculator() {
  const tierSelect = document.getElementById('artisan-tier');
  const hoursSlider = document.getElementById('craft-hours');
  const hoursDisplay = document.getElementById('hours-display');
  const materialSelect = document.getElementById('material-type');
  const totalDisplay = document.getElementById('calculated-total');
  const breakdownDisplay = document.getElementById('calculation-breakdown');
  const turnaroundRadios = document.querySelectorAll('input[name="turnaround"]');

  function updateEstimate() {
    if (!tierSelect || !hoursSlider || !materialSelect || !totalDisplay) return;

    const rate = parseFloat(tierSelect.value) || 55;
    const hours = parseInt(hoursSlider.value, 10) || 12;
    const materialCost = parseFloat(materialSelect.value) || 160;

    let expeditedCost = 0;
    turnaroundRadios.forEach(radio => {
      if (radio.checked) {
        expeditedCost = parseFloat(radio.value) || 0;
      }
    });

    if (hoursDisplay) {
      hoursDisplay.textContent = `${hours} Hours`;
    }

    // Pure deterministic client-side calculation
    const result = calculateWorkshopEstimate(hours, rate, materialCost, expeditedCost);

    // Format output
    totalDisplay.textContent = `$${result.total.toFixed(2)}`;
    if (breakdownDisplay) {
      breakdownDisplay.textContent = `${result.hours}h × $${result.rate}/hr ($${result.laborTotal}) + $${result.materials} materials + $${result.expedited} expedited`;
    }

    // Synchronize to target budget input in contact form for user convenience
    const targetBudgetInput = document.getElementById('target-budget');
    if (targetBudgetInput && !targetBudgetInput.dataset.manualEdit) {
      targetBudgetInput.value = Math.round(result.total);
    }
  }

  if (tierSelect) tierSelect.addEventListener('change', updateEstimate);
  if (hoursSlider) hoursSlider.addEventListener('input', updateEstimate);
  if (materialSelect) materialSelect.addEventListener('change', updateEstimate);
  turnaroundRadios.forEach(radio => radio.addEventListener('change', updateEstimate));

  // Run initial calculation on page load
  updateEstimate();
}

// 5. Contact / Commission Inquiry Simulation
function initContactForm() {
  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  const targetBudgetInput = document.getElementById('target-budget');

  if (targetBudgetInput) {
    targetBudgetInput.addEventListener('input', () => {
      targetBudgetInput.dataset.manualEdit = "true";
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('contact-name')?.value.trim();
      const email = document.getElementById('contact-email')?.value.trim();
      const craft = document.getElementById('craft-interest')?.value;
      const budget = document.getElementById('target-budget')?.value;
      const details = document.getElementById('project-details')?.value.trim();

      if (!name || !email || !details) {
        alert('Please complete all required fields.');
        return;
      }

      // Display friendly success notice
      if (feedback) {
        feedback.textContent = `Thank you, ${name}! Your commission request for ${craft} ($${budget || 'Custom'}) has been cataloged. Our guild director will reach out to ${email} within 24 hours.`;
        feedback.classList.remove('hidden');
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Reset form fields
      form.reset();

      // Recalculate estimator defaults
      const hoursSlider = document.getElementById('craft-hours');
      if (hoursSlider) {
        hoursSlider.value = 12;
        hoursSlider.dispatchEvent(new Event('input'));
      }
    });
  }
}