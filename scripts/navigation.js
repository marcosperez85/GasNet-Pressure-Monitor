export function setupNavigation() {
    $('.navButton').on('click', function() {
        if ($(this).text().includes('Camu')) {
            EMBED.executeAction("onClickedCamuBotButton");
        }
    });
}