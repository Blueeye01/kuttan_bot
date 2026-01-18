const readline = require('readline');
const fs = require('fs');
const ConnectionManager = require('./core/ConnectionManager');

let rl; // Define readline interface globally

// Initialize readline ONCE
function initReadline() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false // Prevent echoing on certain terminals
    });
  }
}

// Promise wrapper for readline question with trimmed input
function question(query) {
  return new Promise((resolve) => {
    initReadline(); // Ensure readline is only initialized once
    rl.question(query, (answer) => {
      resolve(answer.trim()); // Trim input to avoid whitespace issues
    });
  });
}

async function spawnBots(config) {
  try {
    const numBotsInput = await question('Enter the number of bots to spawn: ');
    let numBots = parseInt(numBotsInput, 10);

    if (numBotsInput.toLowerCase() === 'all' || numBots === 0) {
      numBots = 0; // 0 indicates "all farms"
    } else if (!Number.isInteger(numBots) || numBots < 0) {
      console.error('❌ Invalid number of bots.');
      rl.close();
      return;
    }

    const botDetails = [];
    for (let i = 0; i < numBots; i++) {
      console.log(`\n=== Bot ${i + 1} Configuration ===`);
      const username = await question('Enter bot username: ');
      const password = await question('Enter bot password: ');
      botDetails.push({ 
        username: username.trim(), 
        password: password.trim() 
      });
    }

    let farms = [];
    if (numBots === 0) {
      // Read farms from config.json
      const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
      farms = configData.farms || [];
    }

    console.log('\n=== Starting Bots ===');
    for (const botDetail of botDetails) {
      console.log(`\n🚀 Starting bot ${botDetail.username}...`);

      const connectionManager = new ConnectionManager({
        host: 'mallulifesteal.in',
        port: process.env.PORT,
        version: process.env.VERSION,
        username: botDetail.username,
        password: botDetail.password,
        farms: farms
      });

      // Connect the bot
      connectionManager.connect();

      // Wait 5 seconds before starting the next bot
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

  } catch (error) {
    console.error('⚠️ Error:', error);
  } finally {
    if (rl) rl.close(); // Ensure readline is properly closed
    process.stdin.setRawMode && process.stdin.setRawMode(false); // Disable raw mode if enabled
  }
}

module.exports = { spawnBots };
