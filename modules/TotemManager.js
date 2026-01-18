function setupTotemSwitching(bot) {
    function switchTotem() {
        const offHand = bot.inventory.slots[45];
        const totem = bot.inventory.items().find(item => item.name.includes('totem'));

        if ((!offHand || offHand.name !== 'totem') && totem) {
            const totemSlot = bot.inventory.slots.indexOf(totem);
            if (totemSlot !== -1) {
                bot._client.write('set_slot', {
                    windowId: 0,
                    slot: 45,
                    item: totem
                });
                console.log(`[${bot.username}] Switched to totem.`);
            }
        }
    }

    // Check regularly (every 500ms)
    const interval = setInterval(() => {
        if (bot.health > 0) {
            switchTotem();
        }
    }, 500);

    // Stop checking if the bot dies or quits
    bot.on('death', () => clearInterval(interval));
    bot.on('end', () => clearInterval(interval));
}

module.exports = { setupTotemSwitching };
