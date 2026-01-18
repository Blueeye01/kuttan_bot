const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const ConnectionManager = require('./core/ConnectionManager');
const FarmManager = require('./modules/FarmManager');

const configFile = './config.json';
const WEBHOOK_URL = "https://discord.com/api/webhooks/1459835277362200618/NtC3mcmXXZmsZOVQZFyTC3-_EeG-w_fl3ZuOy-yDXefpILZinX57tdESvuIzS0KgBq2H";

const COLORS = { GREEN: 5763719, RED: 15548997, YELLOW: 16776960, PURPLE: 10181046, BLUE: 3447003 };

// ഡിസ്‌കോർഡ് ലോഗ് ഫംഗ്ഷൻ
async function sendLog(title, description, color = COLORS.GREEN) {
    try {
        await axios.post(WEBHOOK_URL, {
            username: "BOSS MANAGER",
            embeds: [{ title, description, color, timestamp: new Date() }]
        });
    } catch (err) {}
}

async function startBot(username, password, config) {
    const manager = new ConnectionManager({
        host: config.serverAddress,
        port: config.port,
        version: config.version,
        username: username,
        password: password
    });

    let trackedPlayers = new Set();

    manager.on('connected', (bot) => {
        console.log(`✅ [${username}] Online!`);
        sendLog("Bot Online ✅", `**User:** \`${username}\` server-il keri.`, COLORS.GREEN);
        
        // --- 1. /msg DETECTION (Personal Message) ---
        bot.on('message', (jsonMsg) => {
            const msg = jsonMsg.toString().trim();
            if (!msg) return;

            const whisperFormats = [
                /(\w+) whispers to you: (.+)/i,
                /\[(\w+) -> me\] (.+)/i,
                /From (\w+): (.+)/i,
                /(\w+) >> (.+)/i  // ചില സെർവറുകളിലെ ഫോർമാറ്റ്
            ];

            let isWhisper = false;
            for (const regex of whisperFormats) {
                const match = msg.match(regex);
                if (match) {
                    const sender = match[1];
                    const content = match[2];
                    sendLog("💬 Personal Message", `**From:** \`${sender}\`\n**To:** \`${username}\`\n**Msg:** ${content}`, COLORS.PURPLE);
                    console.log(`[${username} PM] ${sender}: ${content}`);
                    isWhisper = true;
                    break;
                }
            }
            if (!isWhisper) console.log(`[${username} CHAT] ${msg}`);
        });

        // --- 2. NEARBY PLAYER (Entry/Exit) ---
        setInterval(() => {
            if (bot && bot.entities && bot.entity) {
                const currentNearby = Object.values(bot.entities)
                    .filter(e => e.type === 'player' && e.username !== bot.username)
                    .filter(e => bot.entity.position.distanceTo(e.position) < 20);

                const currentNearbyNames = currentNearby.map(p => p.username);

                currentNearby.forEach(player => {
                    if (!trackedPlayers.has(player.username)) {
                        trackedPlayers.add(player.username);
                        const dist = Math.round(bot.entity.position.distanceTo(player.position));
                        sendLog("⚠️ PLAYER ENTERED", `**Bot:** \`${username}\`\n**Player:** \`${player.username}\`\n**Distance:** ${dist} blocks`, COLORS.YELLOW);
                    }
                });

                trackedPlayers.forEach(trackedName => {
                    if (!currentNearbyNames.includes(trackedName)) {
                        trackedPlayers.delete(trackedName);
                        sendLog("✅ PLAYER LEFT", `**Player:** \`${trackedName}\` moved away from **${username}**.`, COLORS.GREEN);
                    }
                });
            }
        }, 5000);

        // --- 3. STATUS TRACKER (3 Minutes) ---
        setInterval(() => {
            if (bot && bot.entity) {
                const statusMessage = `❤️ **Health:** ${Math.round(bot.health)}/20\n` +
                                     `🍖 **Hunger:** ${Math.round(bot.food)}/20\n` +
                                     `📦 **Inventory:** ${bot.inventory.items().length} items\n` +
                                     `📍 **Loc:** ${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.y)}, ${Math.round(bot.entity.position.z)}`;
                sendLog(`📊 Status Update: ${username}`, statusMessage, COLORS.BLUE);
            }
        }, 180000);

        bot.on('death', () => sendLog("💀 Bot Died", `**${username}** മരിച്ചു!`, COLORS.RED));

        setTimeout(() => {
            const farmManager = new FarmManager(config, config.farms);
            farmManager.assignDuties(bot);
        }, 5000);
    });

    manager.on('bot_end', (reason) => {
        sendLog("Bot Offline 🔌", `**User:** \`${username}\` offline ആയി.\n**Reason:** ${reason}`, COLORS.RED);
    });

    manager.connect();
}

async function mainMenu() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!fs.existsSync(configFile)) {
        console.log("❌ config.json kandilla!");
        process.exit();
    }
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

    console.log('\n====================================');
    console.log('      🤖 ABU_05 BOT MANAGER        ');
    console.log('====================================');
    console.log('1. Start Farm\n2. Custom Bot\n3. Exit');
    
    const opt = await new Promise(r => rl.question('\nSelect Option: ', r));

    if (opt === '1') {
        config.farms.forEach((f, i) => console.log(`${i + 1}. ${f.name}`));
        const fOpt = await new Promise(r => rl.question('\nFarm Numbers (eg: 1,2): ', r));
        const selectedIndices = fOpt.split(',').map(x => parseInt(x.trim()) - 1);

        for (const index of selectedIndices) {
            const farm = config.farms[index];
            if (farm) {
                for (const botName of farm.bots) {
                    const acc = config.accounts.find(a => a.username === botName);
                    if (acc) { 
                        await startBot(acc.username, acc.password, config);
                        await new Promise(r => setTimeout(r, 8000)); 
                    }
                }
            }
        }
        rl.close(); mainMenu();
    } else if (opt === '2') {
        const u = await new Promise(r => rl.question('Username: ', r));
        const p = await new Promise(r => rl.question('Password: ', r));
        await startBot(u, p, config);
        rl.close(); mainMenu();
    } else { process.exit(); }
}

// CTRL+C അടിക്കുമ്പോൾ
process.on('SIGINT', async () => {
    console.log('\n⚠️ Stopping manager...');
    await sendLog("Manager Offline 🔴", "Bot Manager manual ayi stop cheythu.", COLORS.RED);
    setTimeout(() => process.exit(0), 1500);
});

mainMenu();