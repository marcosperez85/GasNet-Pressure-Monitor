export function setupNavigation() {
    $('.navButton').on('click', function() {
        if ($(this).text().includes('Camu')) {
            window.location.href = './chatbot/index.html';
        }
    });
}