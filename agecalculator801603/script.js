document.addEventListener('DOMContentLoaded', () => {
    const birthDateInput = document.getElementById('birthDate');
    const calculateAgeBtn = document.getElementById('calculateAgeBtn');
    const resultDiv = document.getElementById('result');
    const ageDisplay = document.getElementById('ageDisplay');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');

    // Function to hide error and result messages
    const hideMessages = () => {
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
    };

    // Function to show error message
    const showError = (message) => {
        hideMessages();
        errorMessage.textContent = message;
        errorDiv.classList.remove('hidden');
    };

    // Function to calculate age
    const calculateAge = () => {
        hideMessages();

        const birthDateString = birthDateInput.value;

        if (!birthDateString) {
            showError('Please enter your birth date.');
            return;
        }

        const birthDate = new Date(birthDateString);
        const today = new Date();

        if (birthDate > today) {
            showError('Birth date cannot be in the future.');
            return;
        }

        let ageYears = today.getFullYear() - birthDate.getFullYear();
        let ageMonths = today.getMonth() - birthDate.getMonth();
        let ageDays = today.getDate() - birthDate.getDate();

        // Adjust for negative days
        if (ageDays < 0) {
            ageMonths--;
            const daysInLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            ageDays = daysInLastMonth + ageDays;
        }

        // Adjust for negative months
        if (ageMonths < 0) {
            ageYears--;
            ageMonths = 12 + ageMonths;
        }

        ageDisplay.textContent = `${ageYears} years, ${ageMonths} months, and ${ageDays} days old.`;
        resultDiv.classList.remove('hidden');
    };

    // Event listener for the calculate button
    calculateAgeBtn.addEventListener('click', calculateAge);

    // Optional: Recalculate if date changes
    // birthDateInput.addEventListener('change', hideMessages); // Can uncomment if you want to clear results on date change
});