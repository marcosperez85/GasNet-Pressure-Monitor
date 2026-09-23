function setupNavigation() {
    document.querySelectorAll('.navButton').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.textContent.includes('Tecbot')) {
                openChatbot();
            }
        });
    });
}
