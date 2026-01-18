const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const supabase = require('../supabase'); // for future database use
const mineflayerViewer = require('prismarine-viewer').mineflayer;

const bot = mineflayer.createBot({
  host: 'arjunmpanarchy.in',
  port: 25565,
  username: '__Lnzz__', // Replace with your bot's username
  version: '1.20.1',
});

bot.loadPlugin(pathfinder);

// Check for 'login' or 'register' after logging in
bot.on('login', () => {
  console.log(`Logged in as ${bot.username}`);
  bot.on('message', (message) => {
    const msg = message.toString();
    if (msg.includes('login')) {
      bot.chat('/login yourPassword');
    } else if (msg.includes('register')) {
      bot.chat('/register yourPassword yourPassword');
    }
  });
});

bot.on('spawn', async () => {
  console.log('Bot spawned');
  
  try {
    // Prismarine viewer setup (optional)
    mineflayerViewer(bot, { port: 3007, firstPerson: false });

    // If bot is in lobby, go to the portal
    if (isInLobby()) {
      console.log('Navigating to anarchy portal...');
      walkToCoordinates(-71, 38, -5);  // Example portal coordinates
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Log bot's position periodically
  logPosition();
});

// Function to determine if the bot is in the lobby
function isInLobby() {
  // Implement your logic here, e.g., checking coordinates or messages
  // This example assumes checking a known lobby position
  const { x, y, z } = bot.entity.position;
  return (x === -71 && y === 38 && z === -5); // Example lobby check
}

// Function to walk to specific coordinates
function walkToCoordinates(x, y, z) {
  console.log(`Walking to: (${x}, ${y}, ${z})`);
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);

  const goal = new goals.GoalBlock(x, y, z);
  bot.pathfinder.setGoal(goal);

  bot.once('goal_reached', () => {
    console.log(`Reached target coordinates: (${x}, ${y}, ${z})`);
  });

  bot.once('path_update', (results) => {
    if (results.status === 'noPath') {
      console.log('No path found.');
    }
  });
}

// Periodically log the bot's position
function logPosition() {
  setInterval(() => {
    const { x, y, z } = bot.entity.position;
    console.log(`Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
  }, 1000);
}