document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const buttons = document.querySelectorAll('.calculator-button');
    const historyList = document.getElementById('history-list'); // New
    const clearHistoryButton = document.getElementById('clear-history'); // New

    let currentInput = '0';
    let firstOperand = null;
    let operator = null;
    let waitForSecondOperand = false;
    let calculationHistory = []; // New - Stores history entries as strings like "1 + 2 = 3"

    // New - Click sound effect
    // A very short, subtle base64 encoded WAV file for a click sound.
    // This embeds the sound directly into the JavaScript file, avoiding external asset dependencies.
    const clickSound = new Audio('data:audio/wav;base64,UklGRlIKAAAAVmF2ZUhtIBAAAQAgAAAAgQAEAABpZgAAACwAAAAAABwAAAAFAAEAAAUxAAAHBwIAAA4BAAABAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAB3AAAgQAAAAAIAAEAAAEAAAAAAAAAAAAAAAAAAAAABQAAAARDAAAIBAAAAEAAAAAAAAAAAAAAAFAAAABoDAAAIBAAAAEAAAAAAAAAAAAAAAFAAAABoDAAAIBAAAAEAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAQAAA');

    function playClickSound() {
        if (clickSound) {
            clickSound.currentTime = 0; // Rewind to start for quick successive clicks
            clickSound.play().catch(e => console.error("Error playing sound:", e));
        }
    }

    function updateDisplay() {
        display.value = currentInput;
    }

    // New - Function to render history
    function renderHistory() {
        historyList.innerHTML = ''; // Clear existing history
        // Display last 10 entries, newest first (by reversing the slice)
        calculationHistory.slice(-10).reverse().forEach(entry => {
            const listItem = document.createElement('li');
            listItem.textContent = entry;
            listItem.className = 'py-1 border-b border-gray-700 last:border-b-0 text-gray-300 text-sm break-all'; // break-all for long expressions
            historyList.appendChild(listItem);
        });
    }

    function resetCalculator() {
        currentInput = '0';
        firstOperand = null;
        operator = null;
        waitForSecondOperand = false;
        // Do not clear history on 'C' press, only reset current calculation state
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

            // Handle potential 'Error' result from division by zero
            if (String(result).startsWith('Error')) {
                currentInput = String(result);
                firstOperand = null; // Reset for error state
                operator = null;
                waitForSecondOperand = true;
                updateDisplay();
                return; // Stop further processing
            }

            currentInput = String(parseFloat(result.toFixed(10))); // Limit decimal places for internal consistency
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
    };

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            playClickSound(); // Play sound on every button click

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
                        let result;
                        let expression;

                        // Construct the expression for history before calculation
                        // Ensure firstOperand is not null for expression formation
                        if (firstOperand !== null) {
                            expression = `${firstOperand} ${operator} ${inputValue}`;
                        } else {
                            // This case should ideally not happen if checks are correct, but as a fallback
                            expression = `${currentInput} =`; // Simple expression if only one number
                        }

                        // Perform the calculation based on the stored operator
                        if (operator === '/') { // Handle division by zero specifically
                            if (inputValue === 0) {
                                result = 'Error: Div by 0';
                            } else {
                                result = performCalculation[operator](firstOperand, inputValue);
                            }
                        } else {
                            result = performCalculation[operator](firstOperand, inputValue);
                        }

                        if (String(result).startsWith('Error')) { // Handle error state result
                            currentInput = String(result);
                            calculationHistory.push(`${expression} ${currentInput}`); // Add error to history
                        } else {
                            currentInput = String(parseFloat(result.toFixed(10))); // Limit decimal places for display
                            calculationHistory.push(`${expression} = ${currentInput}`); // Add successful calculation to history
                        }
                        renderHistory(); // Update history display

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

    // New - Event listener for clearing history
    clearHistoryButton.addEventListener('click', () => {
        calculationHistory = []; // Clear the history array
        renderHistory(); // Update the display
        playClickSound(); // Play sound on clear history
    });

    // Initialize display and history
    updateDisplay();
    renderHistory(); // Render history even if empty on load
});