document.addEventListener('DOMContentLoaded', () => {
    let counter = 0;

    const counterDisplay = document.getElementById('counter-display');
    const incrementButton = document.getElementById('increment-button');
    const decrementButton = document.getElementById('decrement-button');
    const resetButton = document.getElementById('reset-button');

    // Function to update the counter display
    function updateDisplay() {
        counterDisplay.textContent = counter;
    }

    // Increment logic
    function incrementCounter() {
        counter++;
        updateDisplay();
    }

    // Decrement logic
    function decrementCounter() {
        counter--;
        updateDisplay();
    }

    // Reset logic
    function resetCounter() {
        counter = 0;
        updateDisplay();
    }

    // Attach event listeners
    if (incrementButton) {
        incrementButton.addEventListener('click', incrementCounter);
    }
    if (decrementButton) {
        decrementButton.addEventListener('click', decrementCounter);
    }
    if (resetButton) {
        resetButton.addEventListener('click', resetCounter);
    }

    // Initial display update
    updateDisplay();
});