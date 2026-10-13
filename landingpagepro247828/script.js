document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    // Close mobile menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // Pricing Monthly/Annual Toggle
  const billingToggle = document.getElementById('billing-toggle');
  const toggleBall = document.getElementById('toggle-ball');
  const monthlyLabel = document.getElementById('monthly-label');
  const annualLabel = document.getElementById('annual-label');
  const priceElements = document.querySelectorAll('.price-val');

  let isAnnual = true;

  if (billingToggle) {
    billingToggle.addEventListener('click', () => {
      isAnnual = !isAnnual;
      if (isAnnual) {
        toggleBall.classList.add('translate-x-6');
        annualLabel.classList.remove('text-slate-400');
        annualLabel.classList.add('text-white', 'font-bold');
        monthlyLabel.classList.remove('text-white', 'font-bold');
        monthlyLabel.classList.add('text-slate-400', 'font-medium');
      } else {
        toggleBall.classList.remove('translate-x-6');
        monthlyLabel.classList.remove('text-slate-400');
        monthlyLabel.classList.add('text-white', 'font-bold');
        annualLabel.classList.remove('text-white', 'font-bold');
        annualLabel.classList.add('text-slate-400', 'font-medium');
      }

      priceElements.forEach(el => {
        const monthlyPrice = el.getAttribute('data-monthly');
        const annualPrice = el.getAttribute('data-annual');
        el.textContent = isAnnual ? annualPrice : monthlyPrice;
      });
    });
  }

  // FAQ Accordion
  const faqToggles = document.querySelectorAll('.faq-toggle');
  faqToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const content = toggle.nextElementSibling;
      const icon = toggle.querySelector('.faq-icon');
      
      // Close others
      faqToggles.forEach(other => {
        if (other !== toggle) {
          other.nextElementSibling.classList.add('hidden');
          other.querySelector('.faq-icon').textContent = '+';
          other.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
        }
      });

      content.classList.toggle('hidden');
      if (content.classList.contains('hidden')) {
        icon.textContent = '+';
        icon.style.transform = 'rotate(0deg)';
      } else {
        icon.textContent = '-';
        icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  // Contact Form Submission Handling
  const contactForm = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Simulate successful submission
      contactForm.reset();
      if (formSuccess) {
        formSuccess.classList.remove('hidden');
        setTimeout(() => {
          formSuccess.classList.add('hidden');
        }, 5000);
      }
    });
  }
});