document.addEventListener('DOMContentLoaded', () => {
    const timeDisplay = document.getElementById('time');
    const dateDisplay = document.getElementById('date');

    function updateClock() {
        const now = new Date();

        // Time formatting
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;

        // Date formatting
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-US', options);
    }

    // Update the clock immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);
});