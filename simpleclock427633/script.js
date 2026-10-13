document.addEventListener('DOMContentLoaded', () => {
    const clockDisplay = document.getElementById('clock-display');

    // Function to get and format the current time
    function getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    // Function to update the clock display
    function updateClock() {
        clockDisplay.textContent = getCurrentTime();
    }

    // Update the clock every second
    setInterval(updateClock, 1000);

    // Initial call to display the time immediately
    updateClock();

    // --- Backend API related functions (placeholder as no backend needed for clock) ---
    // In a real app, app_id would be crucial for authentication and data operations.
    let appMeta = {};
    let app_id = 'unknown_app_id'; // Default, will be updated from app-meta.json

    async function loadAppMeta() {
        try {
            const response = await fetch('app-meta.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            appMeta = await response.json();
            app_id = appMeta.app_name || 'simpleclock'; // Using app_name as app_id for this basic setup
            console.log('App metadata loaded:', appMeta);
            console.log('App ID:', app_id);
        } catch (error) {
            console.error('Failed to load app-meta.json:', error);
        }
    }

    // Load app metadata when the script runs
    loadAppMeta();
});