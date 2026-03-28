const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const FormData = require('form-data');
const ConnectionManager = require('./core/ConnectionManager');
const FarmManager = require('./modules/FarmManager');
const { mineflayer: viewer } = require('prismarine-viewer');

const configFile = './config.json';
const WEBHOOK_URL = "https://discord.com/api/webhooks/1459835277362200618/NtC3mcmXXZmsZOVQZFyTC3-_EeG-w_fl3ZuOy-yDXefpILZinX57tdESvuIzS0KgBq2H";

const COLORS = { GREEN: 5763719, RED: 15548997, YELLOW: 16776960, PURPLE: 10181046, BLUE: 3447003, ORANGE: 15105570 };

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
    let lastHealthAlert = 0;

    manager.on('connected', (bot) => {
        console.log(`✅ [${username}] Online!`);
        sendLog("Bot Online ✅", `**User:** \`${username}\` server-il keri.`, COLORS.GREEN);

        // --- 1. LOW HEALTH & TOTEM ALERT ---
        bot.on('health', () => {
            const now = Date.now();
            if (bot.health < 10 && now - lastHealthAlert > 30000) {
                sendLog("🆘 LOW HEALTH ALERT", `**Bot:** \`${username}\` danger-il aanu!\n**Health:** ${Math.round(bot.health)}/20`, COLORS.RED);
                lastHealthAlert = now;
            }
        });

        bot.on('entityStatus', (entity, status) => {
            if (entity === bot.entity && status === 35) {
                sendLog("✨ TOTEM POPPED!", `**Bot:** \`${username}\` oru Totem use cheythu!`, COLORS.ORANGE);
            }
        });

        // --- 2. INVENTORY ALERT (Rare Items) ---
        bot.on('playerCollect', (collector, item) => {
            if (collector.username === bot.username) {
                const itemName = item.name || "item";
                const rareItems = ['diamond', 'netherite', 'totem', 'debris', 'golden_apple'];
                if (rareItems.some(i => itemName.toLowerCase().includes(i))) {
                    sendLog("💎 ITEM COLLECTED", `**Bot:** \`${username}\` collected: **${itemName}**`, COLORS.PURPLE);
                }
            }
        });

        // --- 3. REMOTE COMMANDS (Status & SS) ---
        bot.on('message', async (jsonMsg) => {
            const msg = jsonMsg.toString().trim();
            if (!msg) return;

            const whisperFormats = [/(\w+) whispers to you: (.+)/i, /\[(\w+) -> me\] (.+)/i, /From (\w+): (.+)/i, /(\w+) >> (.+)/i];
            let isWhisper = false;
            let sender = "";
            let content = "";

            for (const regex of whisperFormats) {
                const match = msg.match(regex);
                if (match) {
                    sender = match[1];
                    content = match[2].toLowerCase();
                    isWhisper = true;
                    break;
                }
            }

            if (isWhisper) {
                sendLog("💬 PM Received", `**From:** \`${sender}\`\n**To:** \`${username}\`\n**Msg:** ${content}`, COLORS.PURPLE);
                
                // Command: status
                if (content.includes(config.commandPassword + " status")) {
                    bot.chat(`/msg ${sender} ❤️ HP: ${Math.round(bot.health)}, 🍖 Food: ${Math.round(bot.food)}, 📍 Pos: ${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.z)}`);
                }

                // Command: ss (Screenshot)
                if (content.includes(config.commandPassword + " ss")) {
                    bot.chat(`/msg ${sender} Screenshot edukkukayanu, wait...`);
                    viewer(bot, { port: 3000, firstPerson: true });
                    setTimeout(async () => {
                        try {
                            const canvas = bot.viewer.canvas;
                            if (canvas) {
                                const buffer = canvas.toBuffer('image/png');
                                const form = new FormData();
                                form.append('file', buffer, { filename: 'ss.png' });
                                form.append('payload_json', JSON.stringify({ embeds: [{ title: `📸 View from ${username}`, color: COLORS.BLUE }] }));
                                await axios.post(WEBHOOK_URL, form, { headers: form.getHeaders() });
                            }
                            bot.viewer.close();
                        } catch (e) { console.log("SS Error: " + e); }
                    }, 3000);
                }
            } else {
                console.log(`[${username} CHAT] ${msg}`);
            }
        });

        // --- 4. PLAYER TRACKING ---
        setInterval(() => {
            if (bot && bot.entities && bot.entity) {
                const currentNearby = Object.values(bot.entities)
                    .filter(e => e.type === 'player' && e.username !== bot.username)
                    .filter(e => bot.entity.position.distanceTo(e.position) < 20);
                const names = currentNearby.map(p => p.username);
                currentNearby.forEach(p => {
                    if (!trackedPlayers.has(p.username)) {
                        trackedPlayers.add(p.username);
                        sendLog("⚠️ PLAYER ENTERED", `**Bot:** \`${username}\`\n**Player:** \`${p.username}\`\n**Dist:** ${Math.round(bot.entity.position.distanceTo(p.position))}m`, COLORS.YELLOW);
                    }
                });
                trackedPlayers.forEach(n => {
                    if (!names.includes(n)) {
                        trackedPlayers.delete(n);
                        sendLog("✅ PLAYER LEFT", `**Player:** \`${n}\` moved away from **${username}**.`, COLORS.GREEN);
                    }
                });
            }
        }, 5000);

        // --- 5. AUTO STATUS (3 Mins) ---
        setInterval(() => {
            if (bot && bot.entity) {
                const status = `❤️ **HP:** ${Math.round(bot.health)} | 🍖 **Food:** ${Math.round(bot.food)}\n📍 **Pos:** ${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.y)}, ${Math.round(bot.entity.position.z)}`;
                sendLog(`📊 Status: ${username}`, status, COLORS.BLUE);
            }
        }, 180000);

        bot.on('death', () => sendLog("💀 Bot Died", `**${username}** marichu!`, COLORS.RED));

        setTimeout(() => {
            const farmManager = new FarmManager(config, config.farms);
            farmManager.assignDuties(bot);
        }, 5000);
    });

    manager.on('bot_end', (reason) => {
        sendLog("Bot Offline 🔌", `**User:** \`${username}\` offline aayi.\n**Reason:** ${reason}`, COLORS.RED);
    });

    manager.connect();
}

async function mainMenu() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!fs.existsSync(configFile)) process.exit();
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

    console.log('\n====================================');
    console.log('      🤖 ABU_05 BOT MANAGER V5      ');
    console.log('====================================');
    console.log('1. Start Farm\n2. Custom Bot\n3. Exit');
    
    const opt = await new Promise(r => rl.question('\nSelect Option: ', r));
    if (opt === '1') {
        config.farms.forEach((f, i) => console.log(`${i + 1}. ${f.name}`));
        const fOpt = await new Promise(r => rl.question('\nFarm Numbers: ', r));
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

process.on('SIGINT', async () => {
    await sendLog("Manager Offline 🔴", "Bot Manager manual ayi stop cheythu.", COLORS.RED);
    setTimeout(() => process.exit(0), 1000);
});

mainMenu();