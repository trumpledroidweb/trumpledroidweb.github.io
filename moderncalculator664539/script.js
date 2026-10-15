/* Modern Calculator Logic */
const display = document.getElementById('display');
const buttons = document.querySelectorAll('.calc-btn');

let expression = '';

function updateDisplay() {
  display.value = expression || '0';
}

function appendSymbol(symbol) {
  // Prevent multiple operators in a row
  const operators = ['+', '-', '*', '/', '%'];
  const lastChar = expression.slice(-1);
  if (operators.includes(symbol) && operators.includes(lastChar)) {
    expression = expression.slice(0, -1) + symbol;
  } else {
    expression += symbol;
  }
  updateDisplay();
}

function calculate() {
  try {
    // Replace % with /100 for percentage calculations
    const sanitized = expression.replace(/%/g, '/100');
    // Evaluate safely
    const result = Function(`'use strict'; return (${sanitized})`)();
    expression = String(result);
  } catch (e) {
    expression = 'Error';
  }
  updateDisplay();
}

function clearAll() {
  expression = '';
  updateDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  updateDisplay();
}

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    switch (action) {
      case 'number':
        appendSymbol(value);
        break;
      case 'operator':
        appendSymbol(value);
        break;
      case 'decimal':
        if (!expression.endsWith('.')) appendSymbol('.');
        break;
      case 'clear':
        clearAll();
        break;
      case 'backspace':
        backspace();
        break;
      case 'percent':
        appendSymbol('%');
        break;
      case 'equals':
        calculate();
        break;
      default:
        break;
    }
  });
});

/* Keyboard support */
document.addEventListener('keydown', (e) => {
  const key = e.key;
  if (/\d/.test(key)) {
    appendSymbol(key);
  } else if (['+', '-', '*', '/', '%'].includes(key)) {
    appendSymbol(key);
  } else if (key === 'Enter' || key === '=') {
    e.preventDefault();
    calculate();
  } else if (key === 'Backspace') {
    backspace();
  } else if (key === 'Escape') {
    clearAll();
  } else if (key === '.') {
    if (!expression.endsWith('.')) appendSymbol('.');
  }
});