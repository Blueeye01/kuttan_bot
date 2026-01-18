const { Movements } = require('mineflayer-pathfinder'); // Import Movements
const { goals } = require('mineflayer-pathfinder'); // Import goals

class Utils {
    constructor(bot) {
        this.bot = bot; // Store the bot instance
    }

    async walkToCoordinates(x, y, z) {
        const { bot } = this;
        console.log(`Goal set for: (${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)})`);
        const mcData = require('minecraft-data')(bot.version);
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);

        const goal = new goals.GoalBlock(x, y, z);
        bot.pathfinder.setGoal(goal);

        bot.once('goal_reached', () => {
            console.log(`Bot has reached the target coordinates: (${x}, ${y}, ${z})`);
        });

        bot.once('path_update', (results) => {
            if (results.status === 'noPath') {
                console.log('No path to the target coordinates found.');
            }
        });
    }
}

module.exports = Utils;
