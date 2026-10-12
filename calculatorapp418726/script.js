document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const buttons = document.querySelectorAll('.calculator-button');

    let currentInput = '0';
    let firstOperand = null;
    let operator = null;
    let waitForSecondOperand = false;

    function updateDisplay() {
        display.value = currentInput;
    }

    function resetCalculator() {
        currentInput = '0';
        firstOperand = null;
        operator = null;
        waitForSecondOperand = false;
        updateDisplay();
    }

    function inputDigit(digit) {
        if (waitForSecondOperand) {
            currentInput = digit;
            waitForSecondOperand = false;
        } else {
            currentInput = currentInput === '0' ? digit : currentInput + digit;
        }
        updateDisplay();
    }

    function inputDecimal() {
        if (waitForSecondOperand) {
            currentInput = '0.';
            waitForSecondOperand = false;
            updateDisplay();
            return;
        }

        if (!currentInput.includes('.')) {
            currentInput += '.';
        }
        updateDisplay();
    }

    function handleOperator(nextOperator) {
        const inputValue = parseFloat(currentInput);

        if (operator && waitForSecondOperand) {
            operator = nextOperator;
            return;
        }

        if (firstOperand === null) {
            firstOperand = inputValue;
        } else if (operator) {
            const result = performCalculation[operator](firstOperand, inputValue);

            currentInput = String(result);
            firstOperand = result;
        }

        waitForSecondOperand = true;
        operator = nextOperator;
        updateDisplay();
    }

    const performCalculation = {
        '/': (first, second) => {
            if (second === 0) {
                return 'Error: Div by 0';
            }
            return first / second;
        },
        '*': (first, second) => first * second,
        '+': (first, second) => first + second,
        '-': (first, second) => first - second,
        '=': (first, second) => second // The equals operator just returns the second operand if no operator was pending
    };

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const { value } = button.dataset;
            const { action } = button.dataset;

            if (action) {
                switch (action) {
                    case 'add':
                    case 'subtract':
                    case 'multiply':
                    case 'divide':
                        handleOperator(action === 'add' ? '+' : action === 'subtract' ? '-' : action === 'multiply' ? '*' : '/');
                        break;
                    case 'equals':
                        if (firstOperand === null || operator === null) {
                            return; // Do nothing if there's no complete expression
                        }
                        const inputValue = parseFloat(currentInput);
                        const result = performCalculation[operator](firstOperand, inputValue);
                        if (String(result) === 'Error: Div by 0') {
                            currentInput = String(result);
                        } else {
                            currentInput = String(parseFloat(result.toFixed(10))); // Limit decimal places for display
                        }
                        firstOperand = null;
                        operator = null;
                        waitForSecondOperand = true; // Ready for a new calculation
                        updateDisplay();
                        break;
                    case 'clear':
                        resetCalculator();
                        break;
                    case 'decimal':
                        inputDecimal();
                        break;
                }
            } else if (value) {
                inputDigit(value);
            }
        });
    });

    // Initialize display
    updateDisplay();
});