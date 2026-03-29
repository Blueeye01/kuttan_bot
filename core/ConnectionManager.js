const mineflayer = require('mineflayer');
const EventEmitter = require('events');
const mineflayerPathfinder = require('mineflayer-pathfinder');
const fs = require('fs');

const pathfinder = mineflayerPathfinder.pathfinder;
const Movements = mineflayerPathfinder.Movements;
const goals = mineflayerPathfinder.goals;

class ConnectionManager extends EventEmitter {
    constructor(options) {
        super();
        this.options = options;
        this.bot = null;
        this.watchdogInterval = null;
        this.reconnectDelay = 15000; 

        try {
            const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            this.whitelist = config.whitelist || [];
        } catch (e) {
            this.whitelist = [];
        }
    }

    connect() {
        const botOptions = {
            host: this.options.host,
            port: this.options.port,
            username: this.options.username,
            password: this.options.password,
            version: this.options.version || false,
            connectTimeout: 60000,
            keepAlive: true,
            hideErrors: true, 
            skipValidation: true, // PartialReadError ഒഴിവാക്കാൻ ഇത് സഹായിക്കും
            checkTimeoutInterval: 60000 
        };

        console.log(`[${this.options.username}] Attempting connection...`);
        this.bot = mineflayer.createBot(botOptions);

        this.bot.loadPlugin(pathfinder);

        this.bot.once('spawn', () => {
            console.log(`✅ [${this.options.username}] Spawned in world.`);
            this.startWatchdog();
            this.setupAutoEat(); 
            this.emit('connected', this.bot);

            if (this.options.password) {
                setTimeout(() => {
                    this.bot.chat(`/login ${this.options.password}`);
                }, 2000);
            }
        });

        this.bot.on('chat', (username, message) => {
            if (username === this.bot.username) return;
            if (message.toLowerCase().startsWith('abu')) {
                this.handleCommand(username, message.substring(3).trim());
            }
        });

        this.bot.on('message', (jsonMsg) => {
            const msg = jsonMsg.toString();
            this.emit('bot_message', msg);
        });

        this.bot.on('error', (err) => {
            if (err.code === 'ECONNRESET') {
                console.log(`⚠️ [${this.options.username}] Connection Reset by Server.`);
            } else {
                console.log(`❌ [${this.options.username}] Error: ${err.message}`);
            }
            this.emit('bot_error', err);
        });

        this.bot.on('kicked', (reason) => {
            console.log(`⚠️ [${this.options.username}] Kicked: ${reason}`);
        });

        this.bot.on('end', (reason) => {
            this.cleanup();
            console.log(`🔌 [${this.options.username}] Disconnected: ${reason}. Reconnecting in 15s...`);
            this.emit('bot_end', reason);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        });
    }

    // Smart Auto-Eat Function
    setupAutoEat() {
        this.bot.on('health', async () => {
            // വിശപ്പ് 14-ൽ താഴെയാണെങ്കിൽ ഭക്ഷണം കഴിക്കാൻ നോക്കും
            if (this.bot.food < 14 && !this.bot.foodPantry) {
                const foodItems = ['cooked_beef', 'cooked_chicken', 'golden_apple', 'bread', 'apple', 'cooked_porkchop', 'melon_slice', 'cooked_mutton', 'cooked_porkchop'];
                const food = this.bot.inventory.items().find(item => foodItems.includes(item.name));
                
                if (food) {
                    try {
                        this.bot.foodPantry = true; // ഭക്ഷണം കഴിക്കുമ്പോൾ അറ്റാക്ക് ലോജിക് തടയാൻ
                        await this.bot.equip(food, 'hand');
                        await this.bot.consume();
                    } catch (e) {
                        // Error handling
                    } finally {
                        this.bot.foodPantry = false;
                    }
                }
            }
        });
    }

    handleCommand(username, fullCommand) {
        if (!this.whitelist.includes(username)) return;

        const args = fullCommand.split(' ');
        const command = args.shift().toLowerCase();
        
        const mcData = require('minecraft-data')(this.bot.version || '1.20.1'); 
        const movements = new Movements(this.bot, mcData);

        switch (command) {
            case 'say':
                this.bot.chat(args.join(' '));
                break;
            case 'tphere':
                this.bot.chat(`/tpa ${username}`);
                break;
            case 'goto':
                const x = parseInt(args[0]), y = parseInt(args[1]), z = parseInt(args[2]);
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    this.bot.pathfinder.setMovements(movements);
                    this.bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
                }
                break;
            case 'stop':
                this.bot.pathfinder.setGoal(null);
                this.bot.whisper(username, "Stopped moving.");
                break;
            case 'status':
                this.bot.chat(`❤️ HP: ${Math.round(this.bot.health)} | 🍖 Food: ${Math.round(this.bot.food)} | 📍 Pos: ${Math.round(this.bot.entity.position.x)}, ${Math.round(this.bot.entity.position.z)}`);
                break;
        }
    }

    startWatchdog() {
        this.cleanup();
        this.watchdogInterval = setInterval(() => {
            if (this.bot && !this.bot.entity) {
                this.bot.end('Watchdog Timeout');
            }
        }, 30000);
    }

    cleanup() {
        if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    }
}

module.exports = ConnectionManager;