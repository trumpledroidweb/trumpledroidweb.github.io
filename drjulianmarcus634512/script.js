/**
 * Dr. Julian Marcus, MD - Medical Landing Page & Consultation System
 * Includes offline health calculators, fee estimators, and generic backend API integration.
 */

(function () {
  'use strict';

  let config = {
    appId: '',
    apiBaseUrl: 'https://trumpledroid-api.cloudbeta28624.workers.dev'
  };

  // State Management
  const state = {
    token: localStorage.getItem('dr_marcus_token') || null,
    userEmail: localStorage.getItem('dr_marcus_user_email') || null,
    authMode: 'login', // 'login' or 'signup'
    appointments: [],
    currentEstimate: {
      base: 250,
      diag: 65,
      gross: 315,
      coveragePct: 75,
      total: 78.75
    }
  };

  // 1. Initializer & Meta Loader
  async function initApp() {
    try {
      const metaResp = await fetch('app-meta.json');
      if (metaResp.ok) {
        const meta = await metaResp.json();
        config.appId = meta.app_id || meta.app_name || 'drjulianmarcus';
      }
    } catch (err) {
      config.appId = 'app_drjulianmarcus_49201';
    }

    try {
      const schemaResp = await fetch('api_schema.json');
      if (schemaResp.ok) {
        const schema = await schemaResp.json();
        if (schema.api_base_url) {
          config.apiBaseUrl = schema.api_base_url;
        }
      }
    } catch (err) {
      // Fallback intact
    }

    // Set Copyright Year
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Default booking date to tomorrow
    const bookDateInput = document.getElementById('bookDate');
    if (bookDateInput) {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      bookDateInput.value = tmrw.toISOString().split('T')[0];
      bookDateInput.min = new Date().toISOString().split('T')[0];
    }

    setupEventListeners();
    updateAuthUI();
    recalculateHealthMetrics();
    recalculateFeeEstimate();
  }

  // 2. Setup Event Listeners
  function setupEventListeners() {
    // Mobile navigation drawer
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
      document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
      });
    }

    // Booking Triggers
    const navOpenBookBtn = document.getElementById('navOpenBookBtn');
    if (navOpenBookBtn) {
      navOpenBookBtn.addEventListener('click', () => openBookingModal());
    }
    const mobileBookBtn = document.getElementById('mobileBookBtn');
    if (mobileBookBtn) {
      mobileBookBtn.addEventListener('click', () => {
        if (mobileMenu) mobileMenu.classList.add('hidden');
        openBookingModal();
      });
    }

    // Interactive Health Calculator Listeners
    const recalcBtn = document.getElementById('recalcBtn');
    if (recalcBtn) recalcBtn.addEventListener('click', recalculateHealthMetrics);

    const calcInputs = ['calcAge', 'calcGender', 'calcHeight', 'calcWeight', 'calcSystolic', 'calcSmoker'];
    calcInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', recalculateHealthMetrics);
    });

    const restingHrSlider = document.getElementById('calcRestingHr');
    if (restingHrSlider) {
      restingHrSlider.addEventListener('input', (e) => {
        const disp = document.getElementById('rhrDisplay');
        if (disp) disp.textContent = `${e.target.value} bpm`;
        recalculateHealthMetrics();
      });
    }

    // Fee Estimator Listeners
    const feeBase = document.getElementById('feeBaseService');
    const copayEl = document.getElementById('insuranceCopay');
    if (feeBase) feeBase.addEventListener('change', recalculateFeeEstimate);
    if (copayEl) copayEl.addEventListener('change', recalculateFeeEstimate);
    document.querySelectorAll('.fee-diag-check').forEach(cb => {
      cb.addEventListener('change', recalculateFeeEstimate);
    });

    // Booking service change updates estimate fee inside modal
    const bookServiceSelect = document.getElementById('bookService');
    if (bookServiceSelect) {
      bookServiceSelect.addEventListener('change', () => {
        updateBookingModalFee(bookServiceSelect.value);
      });
    }

    // Booking Form Submit
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
      appointmentForm.addEventListener('submit', handleAppointmentSubmit);
    }

    // Inquiry Form Submit
    const inquiryForm = document.getElementById('inquiryForm');
    if (inquiryForm) {
      inquiryForm.addEventListener('submit', handleInquirySubmit);
    }

    // Auth Switchers
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabSignup = document.getElementById('tabSignupBtn');
    if (tabLogin && tabSignup) {
      tabLogin.addEventListener('click', () => setAuthMode('login'));
      tabSignup.addEventListener('click', () => setAuthMode('signup'));
    }

    // Auth Form
    const authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // Forgot Password OTP flow
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    const cancelOtpBtn = document.getElementById('cancelOtpBtn');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const submitResetOtpBtn = document.getElementById('submitResetOtpBtn');

    if (forgotBtn) forgotBtn.addEventListener('click', () => toggleOtpFlow(true));
    if (cancelOtpBtn) cancelOtpBtn.addEventListener('click', () => toggleOtpFlow(false));
    if (sendOtpBtn) sendOtpBtn.addEventListener('click', handleRequestOtp);
    if (submitResetOtpBtn) submitResetOtpBtn.addEventListener('click', handleResetPassword);

    // FAQ Accordion
    document.querySelectorAll('.faq-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const content = btn.nextElementSibling;
        const icon = btn.querySelector('.faq-icon');
        const isOpen = !content.classList.contains('hidden');
        
        // Close others
        document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.faq-icon').forEach(i => i.textContent = '+');

        if (!isOpen) {
          content.classList.remove('hidden');
          if (icon) icon.textContent = '−';
        }
      });
    });
  }

  // 3. Mandatory Offline JavaScript Calculation Logic
  // Formula: BMI = weight_kg / (height_m^2)
  // Risk Score: (weight_kg / ((height_cm / 100) * (height_cm / 100))) + (systolic_bp > 130 ? 3 : 0)
  function recalculateHealthMetrics() {
    const age = parseInt(document.getElementById('calcAge')?.value) || 45;
    const heightCm = parseFloat(document.getElementById('calcHeight')?.value) || 175;
    const weightKg = parseFloat(document.getElementById('calcWeight')?.value) || 75;
    const systolic = parseInt(document.getElementById('calcSystolic')?.value) || 120;
    const smoker = document.getElementById('calcSmoker')?.value || 'no';
    const restingHr = parseInt(document.getElementById('calcRestingHr')?.value) || 68;

    // Height in meters
    const heightM = heightCm / 100;
    let bmi = 0;
    if (heightM > 0) {
      bmi = weightKg / (heightM * heightM);
    }
    bmi = Math.round(bmi * 10) / 10;

    // Risk Score formula matching api_schema.json logic
    let riskScore = bmi + (systolic > 130 ? 3 : 0);
    if (smoker === 'yes') riskScore += 4;
    else if (smoker === 'former') riskScore += 1;
    if (age > 55) riskScore += 2;
    riskScore = Math.round(riskScore * 10) / 10;

    // Max Heart Rate (Fox formula: 220 - age)
    const maxHr = Math.max(120, 220 - age);
    // Zone 2 (60% to 70% of Max HR)
    const z2Low = Math.round(maxHr * 0.60);
    const z2High = Math.round(maxHr * 0.70);
    // Zone 4 (80% to 90% of Max HR)
    const z4Low = Math.round(maxHr * 0.80);
    const z4High = Math.round(maxHr * 0.90);

    // Update UI elements
    const outputBmi = document.getElementById('outputBmi');
    const outputBmiCat = document.getElementById('outputBmiCategory');
    if (outputBmi) outputBmi.textContent = bmi.toFixed(1);

    if (outputBmiCat) {
      if (bmi < 18.5) {
        outputBmiCat.textContent = 'Underweight';
        outputBmiCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300';
      } else if (bmi <= 24.9) {
        outputBmiCat.textContent = 'Optimal Weight';
        outputBmiCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300';
      } else if (bmi <= 29.9) {
        outputBmiCat.textContent = 'Overweight';
        outputBmiCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300';
      } else {
        outputBmiCat.textContent = 'Obese Class';
        outputBmiCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300';
      }
    }

    const outputRisk = document.getElementById('outputRiskScore');
    const outputRiskCat = document.getElementById('outputRiskCategory');
    if (outputRisk) outputRisk.textContent = riskScore.toFixed(1);

    if (outputRiskCat) {
      if (riskScore < 24) {
        outputRiskCat.textContent = 'Low Risk';
        outputRiskCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300';
      } else if (riskScore < 30) {
        outputRiskCat.textContent = 'Moderate';
        outputRiskCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300';
      } else if (riskScore < 36) {
        outputRiskCat.textContent = 'Elevated';
        outputRiskCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300';
      } else {
        outputRiskCat.textContent = 'High Alert';
        outputRiskCat.className = 'text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300';
      }
    }

    // Cardiac zones
    const z2Disp = document.getElementById('zoneTwoDisplay');
    const z4Disp = document.getElementById('zoneFourDisplay');
    const maxDisp = document.getElementById('maxHrDisplay');
    if (z2Disp) z2Disp.textContent = `${z2Low} - ${z2High} bpm`;
    if (z4Disp) z4Disp.textContent = `${z4Low} - ${z4High} bpm`;
    if (maxDisp) maxDisp.textContent = `${maxHr} bpm`;

    // Dynamic Doctor Advice
    const adviceEl = document.getElementById('doctorCalcAdvice');
    if (adviceEl) {
      if (systolic >= 140 || riskScore >= 34) {
        adviceEl.textContent = `Your blood pressure reading (${systolic} mmHg) flags Stage 2 Hypertension. We recommend prompt clinical assessment and 24-hr ambulatory monitoring to prevent arterial remodeling.`;
      } else if (bmi >= 28 || smoker === 'yes') {
        adviceEl.textContent = `Cardiovascular stress is amplified by metabolic factors. Introducing 40 minutes of Zone 2 training (${z2Low}-${z2High} bpm) 3x/week significantly improves endothelial elasticity.`;
      } else {
        adviceEl.textContent = `Your current baseline metrics reflect strong heart health. Continue regular aerobic maintenance in Zone 2 and schedule your routine annual lipid subfraction screening.`;
      }
    }
  }

  // 4. Consultation Fee Calculation (Offline Deterministic Logic)
  // Formula: (base_fee + diagnostic_fee) * (1 - (insurance_coverage_pct / 100))
  function recalculateFeeEstimate() {
    const baseFee = parseFloat(document.getElementById('feeBaseService')?.value) || 250;
    
    let diagFee = 0;
    document.querySelectorAll('.fee-diag-check:checked').forEach(cb => {
      diagFee += parseFloat(cb.value) || 0;
    });

    const coveragePct = parseFloat(document.getElementById('insuranceCopay')?.value) || 0;
    const grossTotal = baseFee + diagFee;
    const discountAmount = grossTotal * (coveragePct / 100);
    const finalEstimatedFee = Math.max(0, grossTotal - discountAmount);

    state.currentEstimate = {
      base: baseFee,
      diag: diagFee,
      gross: grossTotal,
      coveragePct: coveragePct,
      total: Math.round(finalEstimatedFee * 100) / 100
    };

    // Update UI elements
    const baseDisp = document.getElementById('feeSummaryBase');
    const diagDisp = document.getElementById('feeSummaryDiag');
    const grossDisp = document.getElementById('feeSummaryGross');
    const discDisp = document.getElementById('feeSummaryDiscount');
    const totalDisp = document.getElementById('feeEstimatedTotal');

    if (baseDisp) baseDisp.textContent = `$${baseFee.toFixed(2)}`;
    if (diagDisp) diagDisp.textContent = `$${diagFee.toFixed(2)}`;
    if (grossDisp) grossDisp.textContent = `$${grossTotal.toFixed(2)}`;
    if (discDisp) discDisp.textContent = `-$${discountAmount.toFixed(2)} (${coveragePct}%)`;
    if (totalDisp) totalDisp.textContent = `$${state.currentEstimate.total.toFixed(2)}`;
  }

  function updateBookingModalFee(serviceName) {
    const feeLabel = document.getElementById('bookingModalFee');
    if (!feeLabel) return;

    let fee = 250;
    if (serviceName.includes('Preventative')) fee = 250;
    else if (serviceName.includes('Hypertension')) fee = 220;
    else if (serviceName.includes('Arrhythmia')) fee = 280;
    else if (serviceName.includes('Echo')) fee = 310;
    else if (serviceName.includes('Heart Failure')) fee = 270;
    else if (serviceName.includes('Telehealth')) fee = 190;

    feeLabel.textContent = `$${fee.toFixed(2)}`;
  }

  // 5. Modal Operations
  function openBookingModal(preselectedService = null) {
    const modal = document.getElementById('bookingModal');
    if (!modal) return;

    if (preselectedService) {
      const select = document.getElementById('bookService');
      if (select) {
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value.toLowerCase().includes(preselectedService.toLowerCase())) {
            select.selectedIndex = i;
            break;
          }
        }
        updateBookingModalFee(select.value);
      }
    }

    // Prefill patient email if logged in
    if (state.userEmail) {
      const emailInput = document.getElementById('bookEmail');
      if (emailInput && !emailInput.value) emailInput.value = state.userEmail;
    }

    modal.classList.remove('hidden');
    document.body.classList.add('modal-active');
  }

  function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-active');
    const status = document.getElementById('bookingModalStatus');
    if (status) status.classList.add('hidden');
  }

  function openAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    setAuthMode(mode);
    toggleOtpFlow(false);
    modal.classList.remove('hidden');
    document.body.classList.add('modal-active');
  }

  function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-active');
    const status = document.getElementById('authStatus');
    if (status) status.classList.add('hidden');
  }

  function openPortalModal() {
    const modal = document.getElementById('portalModal');
    if (!modal) return;

    const emailDisp = document.getElementById('portalUserEmailDisplay');
    if (emailDisp) emailDisp.textContent = `Patient: ${state.userEmail || 'Guest'}`;

    modal.classList.remove('hidden');
    document.body.classList.add('modal-active');
    fetchPatientAppointments();
  }

  function closePortalModal() {
    const modal = document.getElementById('portalModal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-active');
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabSignup = document.getElementById('tabSignupBtn');
    const submitBtn = document.getElementById('authSubmitBtn');
    const status = document.getElementById('authStatus');
    if (status) status.classList.add('hidden');

    if (mode === 'login') {
      tabLogin.className = 'flex-1 pb-3 text-sm font-bold text-teal-400 border-b-2 border-teal-400';
      tabSignup.className = 'flex-1 pb-3 text-sm font-medium text-slate-400 hover:text-white';
      submitBtn.textContent = 'Sign In to Portal';
    } else {
      tabSignup.className = 'flex-1 pb-3 text-sm font-bold text-teal-400 border-b-2 border-teal-400';
      tabLogin.className = 'flex-1 pb-3 text-sm font-medium text-slate-400 hover:text-white';
      submitBtn.textContent = 'Create Patient Account';
    }
  }

  function toggleOtpFlow(show) {
    const form = document.getElementById('authForm');
    const tabs = document.getElementById('authTabs');
    const otpSection = document.getElementById('otpSection');
    const step1 = document.getElementById('otpStep1');
    const step2 = document.getElementById('otpStep2');
    const otpStatus = document.getElementById('otpStatus');

    if (show) {
      if (form) form.classList.add('hidden');
      if (tabs) tabs.classList.add('hidden');
      if (otpSection) otpSection.classList.remove('hidden');
      if (step1) step1.classList.remove('hidden');
      if (step2) step2.classList.add('hidden');
    } else {
      if (form) form.classList.remove('hidden');
      if (tabs) tabs.classList.remove('hidden');
      if (otpSection) otpSection.classList.add('hidden');
    }
    if (otpStatus) otpStatus.classList.add('hidden');
  }

  // 6. TrumpleDroid Backend API: Register, Login, Logout & Data Operations
  async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value;
    const status = document.getElementById('authStatus');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!email || !password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';
    status.className = 'text-xs py-2 px-3 rounded-lg bg-slate-800 text-slate-300';
    status.textContent = 'Processing request...';
    status.classList.remove('hidden');

    try {
      if (state.authMode === 'signup') {
        // Step 1: POST /register
        const regResp = await fetch(`${config.apiBaseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_id: config.appId,
            email: email,
            password: password
          })
        });

        const regData = await regResp.json();
        if (!regResp.ok || !regData.success) {
          throw new Error(regData.error || regData.message || 'Registration failed.');
        }

        // Automatic login workflow: POST /login directly after registration
        status.textContent = 'Account created. Authenticating session...';
      }

      // POST /login
      const loginResp = await fetch(`${config.apiBaseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: config.appId,
          email: email,
          password: password
        })
      });

      const loginData = await loginResp.json();
      if (!loginResp.ok || !loginData.success || !loginData.token) {
        throw new Error(loginData.error || loginData.message || 'Login credentials invalid.');
      }

      // Store token
      state.token = loginData.token;
      state.userEmail = email;
      localStorage.setItem('dr_marcus_token', state.token);
      localStorage.setItem('dr_marcus_user_email', email);

      status.className = 'text-xs py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-300';
      status.textContent = 'Authentication successful! Welcome to the portal.';

      setTimeout(() => {
        closeAuthModal();
        updateAuthUI();
        showToast('Session Active', `Welcome back, ${email}`);
      }, 700);

    } catch (err) {
      status.className = 'text-xs py-2 px-3 rounded-lg bg-rose-500/20 text-rose-300';
      status.textContent = err.message || 'An error occurred during authentication.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = state.authMode === 'login' ? 'Sign In to Portal' : 'Create Patient Account';
    }
  }

  function handleLogout() {
    if (state.token) {
      fetch(`${config.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        }
      }).catch(() => {});
    }

    state.token = null;
    state.userEmail = null;
    localStorage.removeItem('dr_marcus_token');
    localStorage.removeItem('dr_marcus_user_email');
    closePortalModal();
    updateAuthUI();
    showToast('Signed Out', 'You have been safely disconnected.');
  }

  // Request OTP for Password Reset
  async function handleRequestOtp() {
    const email = document.getElementById('authEmail')?.value.trim();
    const otpStatus = document.getElementById('otpStatus');
    const sendBtn = document.getElementById('sendOtpBtn');

    if (!email) {
      otpStatus.className = 'text-xs py-2 px-3 rounded-lg bg-rose-500/20 text-rose-300';
      otpStatus.textContent = 'Please provide your email address above first.';
      otpStatus.classList.remove('hidden');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Transmitting OTP...';

    try {
      const resp = await fetch(`${config.apiBaseUrl}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: config.appId,
          email: email
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Could not send verification code.');
      }

      otpStatus.className = 'text-xs py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-300';
      otpStatus.textContent = 'OTP sent to your email! Please enter the code below.';
      otpStatus.classList.remove('hidden');

      document.getElementById('otpStep1').classList.add('hidden');
      document.getElementById('otpStep2').classList.remove('hidden');
    } catch (err) {
      otpStatus.className = 'text-xs py-2 px-3 rounded-lg bg-rose-500/20 text-rose-300';
      otpStatus.textContent = err.message || 'Failed to dispatch OTP code.';
      otpStatus.classList.remove('hidden');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Request OTP Code';
    }
  }

  // Reset Password with OTP
  async function handleResetPassword() {
    const email = document.getElementById('authEmail')?.value.trim();
    const otp = document.getElementById('otpCodeInput')?.value.trim();
    const newPass = document.getElementById('otpNewPassInput')?.value;
    const otpStatus = document.getElementById('otpStatus');
    const resetBtn = document.getElementById('submitResetOtpBtn');

    if (!otp || !newPass) {
      otpStatus.className = 'text-xs py-2 px-3 rounded-lg bg-rose-500/20 text-rose-300';
      otpStatus.textContent = 'Enter both the 6-digit OTP and your new password.';
      otpStatus.classList.remove('hidden');
      return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';

    try {
      const resp = await fetch(`${config.apiBaseUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: config.appId,
          email: email,
          otp: otp,
          new_password: newPass
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Password reset failed. Invalid or expired OTP.');
      }

      otpStatus.className = 'text-xs py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-300';
      otpStatus.textContent = 'Password reset succeeded! Please login with your new password.';
      otpStatus.classList.remove('hidden');

      setTimeout(() => {
        toggleOtpFlow(false);
        setAuthMode('login');
      }, 1500);

    } catch (err) {
      otpStatus.className = 'text-xs py-2 px-3 rounded-lg bg-rose-500/20 text-rose-300';
      otpStatus.textContent = err.message || 'Failed to reset password.';
      otpStatus.classList.remove('hidden');
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = 'Confirm New Password';
    }
  }

  // 7. Appointment Booking (POST /data & local fallback)
  async function handleAppointmentSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('bookingModalStatus');
    const submitBtn = document.getElementById('confirmBookingBtn');

    const serviceName = document.getElementById('bookService')?.value;
    const apptDate = document.getElementById('bookDate')?.value;
    const timeSlot = document.getElementById('bookSlot')?.value;
    const patientName = document.getElementById('bookName')?.value.trim();
    const patientPhone = document.getElementById('bookPhone')?.value.trim();
    const patientEmail = document.getElementById('bookEmail')?.value.trim();
    const insurance = document.getElementById('bookInsurance')?.value;
    const reason = document.getElementById('bookReason')?.value.trim();

    // Calculate fee dynamically
    let base = 250;
    if (serviceName.includes('Preventative')) base = 250;
    else if (serviceName.includes('Hypertension')) base = 220;
    else if (serviceName.includes('Arrhythmia')) base = 280;
    else if (serviceName.includes('Echo')) base = 310;
    else if (serviceName.includes('Heart Failure')) base = 270;
    else if (serviceName.includes('Telehealth')) base = 190;

    const payload = {
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      service_name: serviceName,
      appointment_date: apptDate,
      time_slot: timeSlot,
      reason_visit: reason || 'Routine cardiovascular consultation',
      estimated_fee: base,
      insurance_provider: insurance,
      status: 'Confirmed'
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Reserving Slot...';
    status.className = 'text-xs py-2.5 px-3.5 rounded-xl bg-slate-800 text-slate-300';
    status.textContent = 'Registering appointment in practice schedule...';
    status.classList.remove('hidden');

    try {
      if (state.token) {
        // Authenticated CREATE: POST /data
        const resp = await fetch(`${config.apiBaseUrl}/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({
            collection: 'appointments',
            data: payload
          })
        });

        const json = await resp.json();
        if (!resp.ok || !json.success || !json.record) {
          throw new Error(json.error || 'Could not store appointment on practice database.');
        }

        // Cache created record locally
        state.appointments.unshift({
          id: json.record.id,
          data: json.record.data
        });

      } else {
        // Guest mode booking: store in guest local queue
        const localId = 'guest_' + Date.now();
        const guestItem = { id: localId, data: payload };
        state.appointments.unshift(guestItem);
        const stored = JSON.parse(localStorage.getItem('dr_marcus_guest_appts') || '[]');
        stored.unshift(guestItem);
        localStorage.setItem('dr_marcus_guest_appts', JSON.stringify(stored));
      }

      status.className = 'text-xs py-2.5 px-3.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-medium';
      status.textContent = `Consultation scheduled with Dr. Marcus for ${apptDate} at ${timeSlot}! A confirmation summary has been logged.`;

      showToast('Appointment Reserved', `${serviceName} on ${apptDate} (${timeSlot})`);

      setTimeout(() => {
        closeBookingModal();
        form.reset();
        // Prompt guest to create an account to view and manage bookings
        if (!state.token) {
          showToast('Patient Portal Access', 'Create a password anytime to manage records online.');
        }
      }, 2000);

    } catch (err) {
      status.className = 'text-xs py-2.5 px-3.5 rounded-xl bg-rose-500/20 text-rose-300';
      status.textContent = err.message || 'Scheduling failed. Please reach clinic reception at (800) 555-0198.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Appointment Request';
    }
  }

  // 8. Fetch Appointments (GET /data)
  async function fetchPatientAppointments() {
    const listEl = document.getElementById('portalAppointmentsList');
    if (!listEl) return;

    listEl.innerHTML = `
      <div class="text-center py-8 text-slate-400 text-xs">
        <div class="inline-block w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p>Loading clinic calendar...</p>
      </div>
    `;

    try {
      let combinedRecords = [];

      if (state.token) {
        // GET /data?collection=appointments
        const resp = await fetch(`${config.apiBaseUrl}/data?collection=appointments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${state.token}`
          }
        });

        const json = await resp.json();
        if (resp.ok && json.success && Array.isArray(json.records)) {
          combinedRecords = json.records.map(r => ({
            id: r.id,
            data: r.data
          }));
        }
      }

      // Merge with any guest local appointments
      const guestRecords = JSON.parse(localStorage.getItem('dr_marcus_guest_appts') || '[]');
      if (guestRecords.length > 0) {
        combinedRecords = [...combinedRecords, ...guestRecords];
      }

      state.appointments = combinedRecords;
      renderAppointmentsList(combinedRecords);

    } catch (err) {
      listEl.innerHTML = `
        <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
          Failed to fetch appointments. Ensure network connection is active.
        </div>
      `;
    }
  }

  // Render appointments list with cancellation (DELETE /data)
  function renderAppointmentsList(records) {
    const listEl = document.getElementById('portalAppointmentsList');
    if (!listEl) return;

    if (!records || records.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <svg class="w-10 h-10 mx-auto text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <p class="text-slate-300 font-semibold text-sm">No scheduled visits on record</p>
          <p class="text-slate-500 text-xs mt-1">Book your comprehensive cardiovascular evaluation with Dr. Julian Marcus today.</p>
        </div>
      `;
      return;
    }

    // Local deterministic total consultation cost calculation over fetched records
    let totalConsultationFees = 0;
    records.forEach(r => {
      const fee = Number(r.data?.estimated_fee) || 0;
      totalConsultationFees += fee;
    });

    let html = `
      <div class="mb-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
        <span class="text-slate-300">Total Consultations: <strong>${records.length}</strong></span>
        <span class="text-teal-400 font-semibold">Total Estimated Sum: <strong>$${totalConsultationFees.toFixed(2)}</strong></span>
      </div>
    `;

    html += records.map(item => {
      const d = item.data || {};
      const isGuest = String(item.id).startsWith('guest_');

      return `
        <div class="p-4 rounded-xl bg-slate-850 border border-slate-700/80 hover:border-slate-600 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm">${escapeHtml(d.service_name || 'Consultation')}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">${escapeHtml(d.status || 'Confirmed')}</span>
            </div>
            <div class="text-xs text-slate-400 flex items-center gap-3">
              <span>📅 ${escapeHtml(d.appointment_date || 'TBD')}</span>
              <span>⏰ ${escapeHtml(d.time_slot || 'Morning')}</span>
              <span>💵 $${Number(d.estimated_fee || 0).toFixed(2)}</span>
            </div>
            <div class="text-[11px] text-slate-500">
              Patient: <span class="text-slate-300">${escapeHtml(d.patient_name || 'Anonymous')}</span> (${escapeHtml(d.patient_phone || 'No Phone')})
            </div>
          </div>
          <button onclick="window.doctorApp.deleteAppointment('${item.id}', ${isGuest})" class="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold shrink-0">
            Cancel Visit
          </button>
        </div>
      `;
    }).join('');

    listEl.innerHTML = html;
  }

  // DELETE /data for Appointments
  async function deleteAppointment(recordId, isGuest) {
    if (!confirm('Are you sure you wish to cancel this scheduled appointment?')) return;

    try {
      if (isGuest) {
        let stored = JSON.parse(localStorage.getItem('dr_marcus_guest_appts') || '[]');
        stored = stored.filter(x => x.id !== recordId);
        localStorage.setItem('dr_marcus_guest_appts', JSON.stringify(stored));
        showToast('Visit Cancelled', 'Appointment removed from schedule.');
        fetchPatientAppointments();
        return;
      }

      if (state.token) {
        // DELETE /data?id=<id>
        const resp = await fetch(`${config.apiBaseUrl}/data?id=${recordId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${state.token}`
          }
        });

        const json = await resp.json();
        if (!resp.ok || !json.success) {
          throw new Error(json.error || 'Failed to cancel appointment.');
        }

        showToast('Visit Cancelled', 'Appointment deleted from clinic calendar.');
        fetchPatientAppointments();
      }
    } catch (err) {
      alert(err.message || 'Could not cancel appointment.');
    }
  }

  // 9. Quick Inquiry Form
  async function handleInquirySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('inqName')?.value.trim();
    const email = document.getElementById('inqEmail')?.value.trim();
    const phone = document.getElementById('inqPhone')?.value.trim();
    const msg = document.getElementById('inqMsg')?.value.trim();
    const status = document.getElementById('inquiryStatus');
    const submitBtn = document.getElementById('inquirySubmitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Transmitting...';
    status.className = 'text-xs py-2 px-3 rounded-lg bg-slate-800 text-slate-300';
    status.textContent = 'Routing message to clinical desk...';
    status.classList.remove('hidden');

    try {
      if (state.token) {
        await fetch(`${config.apiBaseUrl}/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({
            collection: 'inquiries',
            data: { full_name: name, email: email, phone: phone, message: msg }
          })
        });
      }

      status.className = 'text-xs py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-300';
      status.textContent = 'Inquiry transmitted securely. Nurse triage will follow up shortly.';
      showToast('Inquiry Transmitted', 'Dr. Marcus’s triage desk has received your message.');
      e.target.reset();

      setTimeout(() => status.classList.add('hidden'), 5000);

    } catch (err) {
      status.className = 'text-xs py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-300';
      status.textContent = 'Message noted. We will contact you at your provided telephone number.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Transmit Clinical Inquiry';
    }
  }

  // 10. Header Auth UI State
  function updateAuthUI() {
    const container = document.getElementById('authNavContainer');
    if (!container) return;

    if (state.token && state.userEmail) {
      const shortEmail = state.userEmail.split('@')[0];
      container.innerHTML = `
        <button onclick="window.doctorApp.openPortalModal()" class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:border-teal-400 transition-colors">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Portal: ${escapeHtml(shortEmail)}</span>
        </button>
      `;
    } else {
      container.innerHTML = `
        <button onclick="window.doctorApp.openAuthModal('login')" class="text-slate-300 hover:text-white transition-colors">
          Patient Login
        </button>
        <span class="text-teal-700">|</span>
        <button onclick="window.doctorApp.openAuthModal('signup')" class="text-teal-400 hover:text-teal-300 font-semibold transition-colors">
          Sign Up
        </button>
      `;
    }
  }

  // Toast Notification
  function showToast(title, message) {
    const toast = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast) return;

    if (toastTitle) toastTitle.textContent = title;
    if (toastMsg) toastMsg.textContent = message;

    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0');
    }, 4000);
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Bridging methods to global window for HTML inline access
  window.doctorApp = {
    openBookingModal: openBookingModal,
    closeBookingModal: closeBookingModal,
    openAuthModal: openAuthModal,
    closeAuthModal: closeAuthModal,
    openPortalModal: openPortalModal,
    closePortalModal: closePortalModal,
    deleteAppointment: deleteAppointment,
    openBookingWithAssessment: function () {
      openBookingModal('Preventative Cardiology');
      const reasonInput = document.getElementById('bookReason');
      const bmi = document.getElementById('outputBmi')?.textContent;
      const risk = document.getElementById('outputRiskScore')?.textContent;
      if (reasonInput && !reasonInput.value) {
        reasonInput.value = `Discuss Heart Risk Tool Assessment (BMI: ${bmi}, Calculated Risk Index: ${risk}).`;
      }
    },
    bookWithCalculatedEstimate: function () {
      const select = document.getElementById('feeBaseService');
      const serviceName = select ? select.options[select.selectedIndex].text.split('(')[0].trim() : 'Cardiology Consultation';
      openBookingModal(serviceName);
    }
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();