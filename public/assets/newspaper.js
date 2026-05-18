/* Newspaper claim specific logic */

function updateYear() {
    const yearInput = document.getElementById('yearInput');
    if (yearInput && !yearInput.value) {
        const y = String(new Date().getFullYear()).slice(2);
        yearInput.value = y;
    }
}

// Ensure updateYear is available globally for the onchange attribute
window.updateYear = updateYear;
