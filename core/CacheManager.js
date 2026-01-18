const fs = require('fs'); // Require fs once at the top

class CacheManager {
    constructor(cacheFile = 'cache.json') {
        this.cacheFile = cacheFile;
        this.cache = this.loadCache();
    }

    loadCache() {
        try {
            if (!fs.existsSync(this.cacheFile)) {
                console.warn(`[CacheManager] Cache file not found, creating a new one.`);
                return { bots: [], farms: [] };
            }
            const data = fs.readFileSync(this.cacheFile, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error(`[CacheManager] Failed to load cache:`, err);
            return { bots: [], farms: [] };
        }
    }

    // UPDATED: Using fs.writeFileSync for atomic updates
    saveCache() {
        const data = JSON.stringify(this.cache, null, 2);
        try {
            fs.writeFileSync(this.cacheFile, data, 'utf8');
            // console.log(`[CacheManager] Cache saved successfully.`); // Commented out to reduce console spam
        } catch (err) {
            console.error(`[CacheManager] Failed to save cache synchronously:`, err);
        }
    }

    getBot(username) {
        return this.cache.bots.find(bot => bot.username === username);
    }

    addBot(botData) {
        if (this.getBot(botData.username)) {
            console.warn(`[CacheManager] Bot ${botData.username} already exists.`);
            // Only update the existing entry if necessary, don't just return
            // For now, based on your original logic, we just return.
            return; 
        }
        this.cache.bots.push(botData);
        this.saveCache();
    }

    updateBot(username, updateData) {
        const bot = this.cache.bots.find(bot => bot.username === username);
        if (bot && updateData && typeof updateData === 'object') {
            Object.assign(bot, updateData);
            this.saveCache();
        } else {
            console.warn(`[CacheManager] Bot ${username} not found or invalid update data.`);
        }
    }

    removeBot(username) {
        this.cache.bots = this.cache.bots.filter(bot => bot.username !== username);
        this.saveCache();
    }

    getFarm(id) {
        return this.cache.farms.find(farm => farm.id === id);
    }

    addFarm(farmData) {
        if (this.getFarm(farmData.id)) {
            console.warn(`[CacheManager] Farm ${farmData.id} already exists.`);
            return;
        }
        this.cache.farms.push(farmData);
        this.saveCache();
    }

    updateFarm(id, updateData) {
        const farm = this.getFarm(id);
        if (farm && updateData && typeof updateData === 'object') {
            Object.assign(farm, updateData);
            this.saveCache();
        } else {
            console.warn(`[CacheManager] Farm ${id} not found or invalid update data.`);
        }
    }

    removeFarm(id) {
        this.cache.farms = this.cache.farms.filter(farm => farm.id !== id);
        this.saveCache();
    }

    clearCache() {
        this.cache = { bots: [], farms: [] };
        this.saveCache();
        console.log(`[CacheManager] Cache cleared.`);
    }
}

module.exports = CacheManager;