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
        this.reconnectDelay = 10000; // 10 Seconds

        // Whitelist ഉം കമാൻഡ് പാസ്‌വേഡും ലോഡ് ചെയ്യുന്നു
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
            version: this.options.version || false, // config-ൽ ഉള്ള വേർഷൻ അല്ലെങ്കിൽ ഓട്ടോമാറ്റിക്
            connectTimeout: 30000,
            keepAlive: true
        };

        console.log(`[${this.options.username}] Attempting connection...`);
        this.bot = mineflayer.createBot(botOptions);

        // Pathfinder പ്ലഗിൻ ലോഡ് ചെയ്യുന്നു
        this.bot.loadPlugin(pathfinder);

        this.bot.once('spawn', () => {
            console.log(`✅ [${this.options.username}] Spawned in world.`);
            this.startWatchdog();
            this.emit('connected', this.bot);

            // സെർവറിൽ ലോഗിൻ ചെയ്യാനുള്ള കമാൻഡ്
            if (this.options.password) {
                this.bot.chat(`/login ${this.options.password}`);
            }
        });

        // ചാറ്റ് ലിസണർ (കമാൻഡുകൾക്കായി)
        this.bot.on('chat', (username, message) => {
            if (username === this.bot.username) return;
            // 'abu' എന്ന് തുടങ്ങുന്ന മെസ്സേജുകൾ കമാൻഡ് ആയി എടുക്കും
            if (message.toLowerCase().startsWith('abu')) {
                this.handleCommand(username, message.substring(3).trim());
            }
        });

        // ജനറൽ മെസ്സേജ് ഹാൻഡ്‌ലർ
        this.bot.on('message', (jsonMsg) => {
            const msg = jsonMsg.toString();
            this.emit('bot_message', msg);
        });

        this.bot.on('error', (err) => {
            console.log(`❌ [${this.options.username}] Error: ${err.message}`);
            this.emit('bot_error', err);
        });

        this.bot.on('kicked', (reason) => {
            console.log(`⚠️ [${this.options.username}] Kicked: ${reason}`);
        });

        this.bot.on('end', (reason) => {
            this.cleanup();
            console.log(`🔌 [${this.options.username}] Disconnected: ${reason}. Reconnecting in 10s...`);
            this.emit('bot_end', reason);
            
            // കൃത്യം 10 സെക്കൻഡിൽ റീകണക്ട് ചെയ്യുന്നു
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        });
    }

    // കമാൻഡുകൾ കൈകാര്യം ചെയ്യുന്നു (Whitelist ഉള്ളവർക്ക് മാത്രം)
    handleCommand(username, fullCommand) {
        if (!this.whitelist.includes(username)) return;

        const args = fullCommand.split(' ');
        const command = args.shift().toLowerCase();
        
        // മൈൻക്രാഫ്റ്റ് ഡാറ്റയും മൂവ്‌മെന്റ്സും
        const mcData = require('minecraft-data')(this.bot.version);
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
        }
    }

    // ബോട്ട് ഒരേ സ്ഥലത്ത് സ്റ്റക്ക് ആയാൽ റീസ്റ്റാർട്ട് ചെയ്യാൻ
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