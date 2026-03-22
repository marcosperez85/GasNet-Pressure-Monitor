function setupNavigation() {
    document.querySelectorAll('.navButton').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.textContent.includes('Camu')) {
                window.location.href = './chatbot/index.html';
            }
        });
    });
}