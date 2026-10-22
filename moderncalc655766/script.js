/**
 * ModernCalc - Advanced Web Calculator Engine
 * Resilient, Zero-Hang Startup with Complete Offline Calculation & Conversion Logic
 */

(function () {
  'use strict';

  // --- IMMEDIATE FAST LOADER DISMISSAL (Guarantees Page Shows Promptly) ---
  function dismissAppLoader() {
    const loader = document.getElementById('appLoader');
    if (!loader) return;
    loader.classList.add('loader-dismissed');
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.style.display = 'none';
      }
    }, 300);
  }

  // Bind immediate manual click-to-dismiss on loader
  const initialLoader = document.getElementById('appLoader');
  if (initialLoader) {
    initialLoader.addEventListener('click', dismissAppLoader);
  }

  // Dismiss automatically within 250ms to prevent stuck screens
  setTimeout(dismissAppLoader, 250);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(dismissAppLoader, 100);
  } else {
    window.addEventListener('DOMContentLoaded', dismissAppLoader);
    window.addEventListener('load', dismissAppLoader);
  }

  // --- STATE MANAGEMENT ---
  const state = {
    currentInput: '0',
    previousExpression: '',
    storedResult: null,
    isEvaluated: false,
    angleMode: 'DEG', // 'DEG' or 'RAD'
    memory: 0,
    hasMemory: false,
    soundEnabled: true,
    history: [],
    theme: 'light'
  };

  // --- DOM ELEMENTS ---
  const mainDisplay = document.getElementById('mainDisplay');
  const expressionDisplay = document.getElementById('expressionDisplay');
  const memIndicator = document.getElementById('memIndicator');
  const angleModeToggle = document.getElementById('angleModeToggle');
  const soundToggle = document.getElementById('soundToggle');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  const sciToggle = document.getElementById('sciToggle');
  const sciDrawer = document.getElementById('sciDrawer');
  const convertToggle = document.getElementById('convertToggle');
  const converterDrawer = document.getElementById('converterDrawer');
  const closeConverterBtn = document.getElementById('closeConverterBtn');
  const historyToggle = document.getElementById('historyToggle');
  const historyDrawer = document.getElementById('historyDrawer');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const historyBadge = document.getElementById('historyBadge');
  const themeToggle = document.getElementById('themeToggle');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  const copyResultBtn = document.getElementById('copyResultBtn');
  const copyToast = document.getElementById('copyToast');

  // --- AUDIO SYNTHESIS FEEDBACK (Safe Web Audio API) ---
  let audioCtx = null;
  function playClickSound(freq = 600, type = 'sine') {
    if (!state.soundEnabled) return;
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      if (audioCtx) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.045);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.045);
      }
    } catch (e) {
      // Audio playback safely bypassed if restricted
    }
  }

  // --- THEME INITIALIZER (LIGHT DEFAULT) ---
  function applyTheme(theme) {
    state.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      if (themeIconSun) themeIconSun.classList.add('hidden');
      if (themeIconMoon) themeIconMoon.classList.remove('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      if (themeIconSun) themeIconSun.classList.remove('hidden');
      if (themeIconMoon) themeIconMoon.classList.add('hidden');
    }
    try {
      localStorage.setItem('moderncalc_theme', theme);
    } catch (e) {}
  }

  const savedTheme = (function () {
    try {
      return localStorage.getItem('moderncalc_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  })();
  applyTheme(savedTheme);

  // --- DISPLAY RENDERER ---
  function updateDisplay() {
    if (!mainDisplay || !expressionDisplay) return;
    mainDisplay.textContent = state.currentInput;
    expressionDisplay.textContent = state.previousExpression;

    const len = state.currentInput.length;
    if (len > 15) {
      mainDisplay.style.fontSize = '1.75rem';
    } else if (len > 10) {
      mainDisplay.style.fontSize = '2.25rem';
    } else {
      mainDisplay.style.fontSize = '';
    }

    mainDisplay.scrollLeft = mainDisplay.scrollWidth;
    expressionDisplay.scrollLeft = expressionDisplay.scrollWidth;

    if (memIndicator) {
      if (state.hasMemory) {
        memIndicator.classList.remove('hidden');
      } else {
        memIndicator.classList.add('hidden');
      }
    }
  }

  // --- INPUT HANDLERS ---
  function inputDigit(digit) {
    playClickSound(700);
    if (state.isEvaluated) {
      state.currentInput = digit;
      state.previousExpression = '';
      state.isEvaluated = false;
    } else {
      if (state.currentInput === '0') {
        state.currentInput = digit;
      } else {
        state.currentInput += digit;
      }
    }
    updateDisplay();
  }

  function inputDecimal() {
    playClickSound(650);
    if (state.isEvaluated) {
      state.currentInput = '0.';
      state.previousExpression = '';
      state.isEvaluated = false;
      updateDisplay();
      return;
    }

    const tokens = state.currentInput.split(/[\+\-\×\÷\^]/);
    const lastToken = tokens[tokens.length - 1];
    if (!lastToken.includes('.')) {
      state.currentInput += '.';
    }
    updateDisplay();
  }

  function inputOperator(op) {
    playClickSound(520);
    if (state.isEvaluated) {
      state.previousExpression = state.currentInput + ' ' + op + ' ';
      state.isEvaluated = false;
      state.currentInput = '0';
      updateDisplay();
      return;
    }

    const trimmed = state.currentInput.trim();
    const lastChar = trimmed.slice(-1);

    if (['+', '-', '×', '÷', '^'].includes(lastChar)) {
      state.currentInput = trimmed.slice(0, -1) + op;
    } else {
      state.currentInput += op;
    }
    updateDisplay();
  }

  function inputParentheses() {
    playClickSound(680);
    if (state.isEvaluated) {
      state.currentInput = '(';
      state.isEvaluated = false;
      updateDisplay();
      return;
    }

    const openBrackets = (state.currentInput.match(/\(/g) || []).length;
    const closeBrackets = (state.currentInput.match(/\)/g) || []).length;
    const lastChar = state.currentInput.slice(-1);

    if (state.currentInput === '0') {
      state.currentInput = '(';
    } else if (['+', '-', '×', '÷', '^', '('].includes(lastChar)) {
      state.currentInput += '(';
    } else if (openBrackets > closeBrackets) {
      state.currentInput += ')';
    } else {
      state.currentInput += '×(';
    }
    updateDisplay();
  }

  function negateValue() {
    playClickSound(580);
    if (state.currentInput === '0' || state.currentInput === 'Error') return;

    if (state.isEvaluated || !/[\+\-\×\÷\^]/.test(state.currentInput)) {
      if (state.currentInput.startsWith('-')) {
        state.currentInput = state.currentInput.slice(1);
      } else {
        state.currentInput = '-' + state.currentInput;
      }
      updateDisplay();
      return;
    }

    const match = state.currentInput.match(/(-?[\d.]+)$/);
    if (match) {
      const lastNum = match[0];
      const prefix = state.currentInput.slice(0, -lastNum.length);
      const inverted = lastNum.startsWith('-') ? lastNum.slice(1) : '-' + lastNum;
      state.currentInput = prefix + inverted;
      updateDisplay();
    }
  }

  function backspace() {
    playClickSound(480);
    if (state.isEvaluated || state.currentInput === 'Error') {
      clearAll();
      return;
    }
    if (state.currentInput.length > 1) {
      state.currentInput = state.currentInput.slice(0, -1);
    } else {
      state.currentInput = '0';
    }
    updateDisplay();
  }

  function clearAll() {
    playClickSound(380);
    state.currentInput = '0';
    state.previousExpression = '';
    state.isEvaluated = false;
    updateDisplay();
  }

  // --- SCIENTIFIC COMPUTATIONS ---
  function applySciFunction(funcName) {
    playClickSound(800);
    try {
      let val = evaluateRawExpression(state.currentInput);
      let result;

      const toRad = deg => (deg * Math.PI) / 180;
      const toDeg = rad => (rad * 180) / Math.PI;

      switch (funcName) {
        case 'sin':
          result = Math.sin(state.angleMode === 'DEG' ? toRad(val) : val);
          break;
        case 'cos':
          result = Math.cos(state.angleMode === 'DEG' ? toRad(val) : val);
          break;
        case 'tan':
          result = Math.tan(state.angleMode === 'DEG' ? toRad(val) : val);
          break;
        case 'asin':
          result = state.angleMode === 'DEG' ? toDeg(Math.asin(val)) : Math.asin(val);
          break;
        case 'acos':
          result = state.angleMode === 'DEG' ? toDeg(Math.acos(val)) : Math.acos(val);
          break;
        case 'atan':
          result = state.angleMode === 'DEG' ? toDeg(Math.atan(val)) : Math.atan(val);
          break;
        case 'ln':
          if (val <= 0) throw new Error('Invalid input');
          result = Math.log(val);
          break;
        case 'log':
          if (val <= 0) throw new Error('Invalid input');
          result = Math.log10(val);
          break;
        case 'sqrt':
          if (val < 0) throw new Error('Invalid input');
          result = Math.sqrt(val);
          break;
        case 'sq':
          result = Math.pow(val, 2);
          break;
        case 'inv':
          if (val === 0) throw new Error('Divide by zero');
          result = 1 / val;
          break;
        case 'fact':
          result = factorial(val);
          break;
        default:
          return;
      }

      state.previousExpression = `${funcName}(${formatNumber(val)})`;
      state.currentInput = formatNumber(result);
      state.isEvaluated = true;
      recordHistory(state.previousExpression, state.currentInput);
      updateDisplay();
    } catch (e) {
      state.currentInput = 'Error';
      state.isEvaluated = true;
      updateDisplay();
    }
  }

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error('Invalid factorial');
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  function insertConstant(constVal) {
    playClickSound(750);
    const valueStr = constVal === 'π' ? Math.PI.toString() : Math.E.toString();
    if (state.isEvaluated || state.currentInput === '0') {
      state.currentInput = valueStr;
      state.isEvaluated = false;
    } else {
      const last = state.currentInput.slice(-1);
      if (['+', '-', '×', '÷', '^', '('].includes(last)) {
        state.currentInput += valueStr;
      } else {
        state.currentInput += '×' + valueStr;
      }
    }
    updateDisplay();
  }

  // --- PARSER & OFFLINE EVALUATION ENGINE ---
  function evaluateRawExpression(expr) {
    if (!expr || expr === 'Error') return 0;

    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, Math.PI.toString())
      .replace(/e/g, Math.E.toString());

    const openCount = (sanitized.match(/\(/g) || []).length;
    const closeCount = (sanitized.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      sanitized += ')'.repeat(openCount - closeCount);
    }

    const tokens = tokenize(sanitized);
    const rpn = shuntingYard(tokens);
    return computeRPN(rpn);
  }

  function tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      const char = str[i];
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (/\d|\./.test(char)) {
        let numStr = '';
        while (i < str.length && /[\d.]/.test(str[i])) {
          numStr += str[i];
          i++;
        }
        tokens.push({ type: 'number', val: parseFloat(numStr) });
        continue;
      }

      if (char === '-') {
        const prev = tokens[tokens.length - 1];
        if (!prev || prev.type === 'operator' || prev.val === '(') {
          i++;
          let numStr = '-';
          while (i < str.length && /[\d.]/.test(str[i])) {
            numStr += str[i];
            i++;
          }
          if (numStr === '-') {
            tokens.push({ type: 'operator', val: 'neg' });
          } else {
            tokens.push({ type: 'number', val: parseFloat(numStr) });
          }
          continue;
        }
      }

      if (['+', '-', '*', '/', '^'].includes(char)) {
        tokens.push({ type: 'operator', val: char });
        i++;
        continue;
      }

      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', val: char });
        i++;
        continue;
      }

      i++;
    }
    return tokens;
  }

  function shuntingYard(tokens) {
    const outputQueue = [];
    const operatorStack = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, 'neg': 4 };

    for (const token of tokens) {
      if (token.type === 'number') {
        outputQueue.push(token);
      } else if (token.type === 'operator') {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1].val !== '(' &&
          precedence[operatorStack[operatorStack.length - 1].val] >= precedence[token.val]
        ) {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.push(token);
      } else if (token.val === '(') {
        operatorStack.push(token);
      } else if (token.val === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].val !== '(') {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.pop();
      }
    }

    while (operatorStack.length > 0) {
      outputQueue.push(operatorStack.pop());
    }

    return outputQueue;
  }

  function computeRPN(rpnQueue) {
    const stack = [];
    for (const token of rpnQueue) {
      if (token.type === 'number') {
        stack.push(token.val);
      } else if (token.type === 'operator') {
        if (token.val === 'neg') {
          const a = stack.pop() || 0;
          stack.push(-a);
        } else {
          const b = stack.pop();
          const a = stack.pop();
          if (a === undefined || b === undefined) throw new Error('Malformed Expression');
          switch (token.val) {
            case '+': stack.push(a + b); break;
            case '-': stack.push(a - b); break;
            case '*': stack.push(a * b); break;
            case '/':
              if (b === 0) throw new Error('Divide by zero');
              stack.push(a / b);
              break;
            case '^': stack.push(Math.pow(a, b)); break;
          }
        }
      }
    }
    if (stack.length !== 1) throw new Error('Evaluation error');
    return stack[0];
  }

  function formatNumber(num) {
    if (Number.isNaN(num) || !Number.isFinite(num)) return 'Error';
    const rounded = parseFloat(num.toFixed(10));
    return rounded.toString();
  }

  function executeEquals() {
    playClickSound(880, 'triangle');
    if (state.isEvaluated) return;

    try {
      const expressionToSave = state.currentInput;
      const result = evaluateRawExpression(state.currentInput);
      const formattedResult = formatNumber(result);

      state.previousExpression = expressionToSave + ' =';
      state.currentInput = formattedResult;
      state.isEvaluated = true;
      recordHistory(expressionToSave, formattedResult);
      updateDisplay();
    } catch (err) {
      state.currentInput = 'Error';
      state.isEvaluated = true;
      updateDisplay();
    }
  }

  // --- MEMORY FUNCTIONS ---
  function handleMemory(action) {
    playClickSound(640);
    const currentVal = parseFloat(state.currentInput) || 0;

    switch (action) {
      case 'MC':
        state.memory = 0;
        state.hasMemory = false;
        break;
      case 'MR':
        if (state.hasMemory) {
          state.currentInput = state.memory.toString();
          state.isEvaluated = false;
        }
        break;
      case 'M+':
        state.memory += currentVal;
        state.hasMemory = true;
        break;
      case 'M-':
        state.memory -= currentVal;
        state.hasMemory = true;
        break;
      case 'MS':
        state.memory = currentVal;
        state.hasMemory = true;
        break;
    }
    updateDisplay();
  }

  // --- HISTORY MANAGEMENT ---
  function recordHistory(expr, result) {
    if (!expr || result === 'Error') return;
    state.history.unshift({ expr, result, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    if (state.history.length > 25) state.history.pop();
    renderHistory();
    if (historyBadge) historyBadge.classList.remove('hidden');
  }

  function renderHistory() {
    if (!historyList) return;
    if (state.history.length === 0) {
      historyList.innerHTML = `<div class="text-center py-12 text-slate-400 text-xs">No previous calculations in this session.</div>`;
      return;
    }

    historyList.innerHTML = state.history.map((item, idx) => `
      <div class="history-card p-3 rounded-xl cursor-pointer transition flex flex-col items-end group shadow-2xs" data-history-index="${idx}">
        <div class="w-full flex justify-between text-[10px] text-slate-400 mb-0.5">
          <span>${item.time}</span>
          <span class="opacity-0 group-hover:opacity-100 text-indigo-600 font-semibold">Click to recall</span>
        </div>
        <div class="text-xs text-slate-500 font-mono">${item.expr}</div>
        <div class="text-base font-bold text-indigo-600 font-mono tracking-tight">= ${item.result}</div>
      </div>
    `).join('');

    historyList.querySelectorAll('[data-history-index]').forEach(el => {
      el.addEventListener('click', () => {
        const item = state.history[parseInt(el.getAttribute('data-history-index'))];
        if (item) {
          state.currentInput = item.result;
          state.previousExpression = item.expr;
          state.isEvaluated = false;
          updateDisplay();
          toggleHistoryDrawer(false);
          playClickSound(600);
        }
      });
    });
  }

  function toggleHistoryDrawer(show) {
    if (!historyDrawer) return;
    if (show) {
      historyDrawer.classList.remove('translate-x-full');
      if (historyBadge) historyBadge.classList.add('hidden');
    } else {
      historyDrawer.classList.add('translate-x-full');
    }
  }

  // --- UNIT CONVERTER ENGINE ---
  const unitData = {
    length: {
      meters: 1,
      kilometers: 1000,
      centimeters: 0.01,
      millimeters: 0.001,
      miles: 1609.344,
      yards: 0.9144,
      feet: 0.3048,
      inches: 0.0254
    },
    mass: {
      kilograms: 1,
      grams: 0.001,
      milligrams: 0.000001,
      pounds: 0.45359237,
      ounces: 0.02834952
    },
    data: {
      bytes: 1,
      kilobytes: 1024,
      megabytes: 1048576,
      gigabytes: 1073741824,
      terabytes: 1099511627776
    },
    temp: {
      celsius: 'c',
      fahrenheit: 'f',
      kelvin: 'k'
    }
  };

  const convCategory = document.getElementById('convCategory');
  const convInputValue = document.getElementById('convInputValue');
  const convFromUnit = document.getElementById('convFromUnit');
  const convToUnit = document.getElementById('convToUnit');
  const convOutputValue = document.getElementById('convOutputValue');

  function populateUnitDropdowns() {
    if (!convCategory || !convFromUnit || !convToUnit) return;
    const category = convCategory.value;
    const units = Object.keys(unitData[category] || {});
    
    convFromUnit.innerHTML = units.map(u => `<option value="${u}">${capitalize(u)}</option>`).join('');
    convToUnit.innerHTML = units.map((u, i) => `<option value="${u}" ${i === 1 ? 'selected' : ''}>${capitalize(u)}</option>`).join('');
    calculateUnitConversion();
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function calculateUnitConversion() {
    if (!convCategory || !convInputValue || !convFromUnit || !convToUnit || !convOutputValue) return;
    const category = convCategory.value;
    const inputVal = parseFloat(convInputValue.value) || 0;
    const from = convFromUnit.value;
    const to = convToUnit.value;

    let output = 0;

    if (category === 'temp') {
      output = convertTemperature(inputVal, from, to);
    } else {
      const fromFactor = (unitData[category] && unitData[category][from]) || 1;
      const toFactor = (unitData[category] && unitData[category][to]) || 1;
      const baseValue = inputVal * fromFactor;
      output = baseValue / toFactor;
    }

    convOutputValue.textContent = parseFloat(output.toFixed(6)).toString();
  }

  function convertTemperature(val, from, to) {
    if (from === to) return val;
    let celsius = val;
    if (from === 'fahrenheit') celsius = (val - 32) * (5 / 9);
    if (from === 'kelvin') celsius = val - 273.15;

    if (to === 'celsius') return celsius;
    if (to === 'fahrenheit') return (celsius * (9 / 5)) + 32;
    if (to === 'kelvin') return celsius + 273.15;
    return val;
  }

  // Populate converter initially
  populateUnitDropdowns();

  // --- BUTTON CLICKS WITH RIPPLE EFFECT ---
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('ripple');

      const existingRipple = this.querySelector('.ripple');
      if (existingRipple) existingRipple.remove();

      this.appendChild(circle);
      setTimeout(() => circle.remove(), 450);
    });
  });

  // --- KEYPAD EVENT DELEGATION ---
  const calcApp = document.getElementById('calcApp');
  if (calcApp) {
    calcApp.addEventListener('click', function (e) {
      const target = e.target.closest('button');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const val = target.getAttribute('data-val');

      if (!action) return;

      switch (action) {
        case 'num':
          inputDigit(val);
          break;
        case 'decimal':
          inputDecimal();
          break;
        case 'op':
          inputOperator(val);
          break;
        case 'equals':
          executeEquals();
          break;
        case 'clear-all':
          clearAll();
          break;
        case 'backspace':
          backspace();
          break;
        case 'negate':
          negateValue();
          break;
        case 'bracket':
          inputParentheses();
          break;
        case 'sci':
          applySciFunction(val);
          break;
        case 'insert':
          if (val === '^') inputOperator('^');
          else insertConstant(val);
          break;
        case 'mem':
          handleMemory(val);
          break;
      }
    });
  }

  // --- KEYBOARD SHORTCUTS ---
  window.addEventListener('keydown', function (e) {
    if (['input', 'select', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      inputDigit(e.key);
    } else if (e.key === '.') {
      inputDecimal();
    } else if (e.key === '+' || e.key === '-') {
      inputOperator(e.key);
    } else if (e.key === '*') {
      inputOperator('×');
    } else if (e.key === '/') {
      e.preventDefault();
      inputOperator('÷');
    } else if (e.key === '^') {
      inputOperator('^');
    } else if (e.key === '(' || e.key === ')') {
      inputParentheses();
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      executeEquals();
    } else if (e.key === 'Backspace') {
      backspace();
    } else if (e.key === 'Escape') {
      clearAll();
    } else if (e.key.toLowerCase() === 'm') {
      if (soundToggle) soundToggle.click();
    } else if (e.key.toLowerCase() === 's') {
      if (sciToggle) sciToggle.click();
    } else if (e.key.toLowerCase() === 'h') {
      toggleHistoryDrawer(true);
    }
  });

  // --- UI TOGGLE LISTENERS ---
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      if (soundIconOn) soundIconOn.classList.toggle('hidden', !state.soundEnabled);
      if (soundIconOff) soundIconOff.classList.toggle('hidden', state.soundEnabled);
      if (state.soundEnabled) playClickSound(700);
    });
  }

  if (sciToggle && sciDrawer) {
    sciToggle.addEventListener('click', () => {
      playClickSound(600);
      sciDrawer.classList.toggle('hidden');
      sciToggle.classList.toggle('bg-indigo-50');
      sciToggle.classList.toggle('text-indigo-600');
      sciToggle.classList.toggle('border-indigo-300');
    });
  }

  if (convertToggle && converterDrawer) {
    convertToggle.addEventListener('click', () => {
      playClickSound(600);
      converterDrawer.classList.toggle('hidden');
      if (!converterDrawer.classList.contains('hidden')) {
        populateUnitDropdowns();
      }
    });
  }

  if (closeConverterBtn && converterDrawer) {
    closeConverterBtn.addEventListener('click', () => {
      converterDrawer.classList.add('hidden');
    });
  }

  if (convCategory) convCategory.addEventListener('change', populateUnitDropdowns);
  if (convInputValue) convInputValue.addEventListener('input', calculateUnitConversion);
  if (convFromUnit) convFromUnit.addEventListener('change', calculateUnitConversion);
  if (convToUnit) convToUnit.addEventListener('change', calculateUnitConversion);

  if (historyToggle) {
    historyToggle.addEventListener('click', () => {
      playClickSound(600);
      toggleHistoryDrawer(true);
    });
  }

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
      toggleHistoryDrawer(false);
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      state.history = [];
      renderHistory();
      if (historyBadge) historyBadge.classList.add('hidden');
      playClickSound(400);
    });
  }

  if (angleModeToggle) {
    angleModeToggle.addEventListener('click', () => {
      state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
      angleModeToggle.textContent = state.angleMode;
      playClickSound(700);
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      playClickSound(650);
    });
  }

  // --- COPY RESULT ---
  if (copyResultBtn) {
    copyResultBtn.addEventListener('click', () => {
      const textToCopy = state.currentInput;
      if (!textToCopy || textToCopy === 'Error') return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => showToast()).catch(() => fallbackCopy(textToCopy));
      } else {
        fallbackCopy(textToCopy);
      }
    });
  }

  function fallbackCopy(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      showToast();
    } catch (e) {}
  }

  function showToast() {
    if (!copyToast) return;
    copyToast.classList.remove('opacity-0');
    playClickSound(900);
    setTimeout(() => copyToast.classList.add('opacity-0'), 1500);
  }

  // Render initial display
  updateDisplay();
})();