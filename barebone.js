const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
let reloadableModule = require('./reloadableModule'); // Initial load of the hot-reload module
const Utils = require('./utils');

const bot = mineflayer.createBot({
    host: 'arjunmpanarchy.in',
    port: 25565,
    username: 'naru',
    version: '1.20.1',
});

bot.loadPlugin(pathfinder);

bot.on('login', () => {
    console.log(`Bot has logged in as ${bot.username}`);
});

let isInLobby = true;
bot.on('spawn', () => {
    console.log('Bot has spawned in the world');
    bot.chat('/login poocha');
    
    if (isInLobby) {
        console.log('In Lobby, going to world');
        const utils = new Utils(bot); // Pass the bot instance to Utils
        utils.walkToCoordinates(-71, 38, -5).catch(console.error);
    } else {
        console.log('Assuming not in Lobby');
        reloadableModule.executeTask(bot); // Execute the task from the reloadable module
    }

    isInLobby = false;

    // Set up interval to reload the module every 60 seconds
    setInterval(() => {
        console.log('Checking for module updates...');
        delete require.cache[require.resolve('./reloadableModule')];
        reloadableModule = require('./reloadableModule');
        console.log('Module reloaded.');
    }, 60000); // Adjust interval as needed
});

bot.on('error', (err) => {
    console.error(`An error occurred: ${err}`);
});

bot.on('end', () => {
    console.log('Bot has been disconnected');
});
