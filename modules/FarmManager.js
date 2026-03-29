const CacheManager = require('../core/CacheManager');

class FarmManager {
    constructor(config, selectedFarms) {
        this.cacheManager = new CacheManager();
        this.config = config;
        this.selectedFarms = selectedFarms;
        this.dutyIntervals = new Map();
        this.isDrinking = new Map(); 
    }

    assignDuties(bot) {
        this.clearDuties(bot.username);
        
        // Auto-Armor: ഓരോ 10 സെക്കൻഡിലും മികച്ച ആർമർ ഉണ്ടോ എന്ന് നോക്കി ധരിക്കും
        this.startAutoArmor(bot);

        for (const selectedFarm of this.selectedFarms) {
            if (!selectedFarm || !selectedFarm.duties || !selectedFarm.duties[bot.username]) continue;
            const duties = selectedFarm.duties[bot.username];
            console.log(`🚀 [${bot.username}] Duty Start: ${duties.join(', ')}`);
            this.performDuties(bot, duties);
        }
    }

    clearDuties(username) {
        const intervalIds = this.dutyIntervals.get(username);
        if (intervalIds) {
            intervalIds.forEach(clearInterval);
            this.dutyIntervals.delete(username);
        }
    }

    // --- AUTO ARMOR ---
    startAutoArmor(bot) {
        const interval = setInterval(async () => {
            const armorParts = ['helmet', 'chestplate', 'leggings', 'boots'];
            for (const part of armorParts) {
                // നിലവിൽ ആ ഭാഗത്ത് ആർമർ ഇല്ലെങ്കിൽ മാത്രം പുതിയത് ധരിക്കാൻ നോക്കും
                if (!bot.inventory.slots[bot.getEquipmentDestSlot(part)]) {
                    const armor = bot.inventory.items().find(item => item.name.includes(part));
                    if (armor) {
                        await bot.equip(armor, part).catch(() => {});
                    }
                }
            }
        }, 10000);
        this.addInterval(bot.username, interval);
    }

    performDuties(bot, duties) {
        duties.forEach(duty => {
            const d = duty.toLowerCase();
            if (d === 'raidfarm') {
                this.startRaidAttackLoop(bot);
                this.startOminousPotionLoop(bot);
            } else if (d === 'hitwitherskeleton') {
                this.killMobLoop(bot, 'wither_skeleton', 4.5, 2.2);
            } else if (d === 'hitpiglin' || d === 'hitzombifiedpiglin') {
                this.killMobLoop(bot, 'zombified_piglin', 4.5, 1.6);
            } else if (d === 'hitenderman') {
                this.killMobLoop(bot, 'enderman', 4.5, 2.5);
            } else if (d === 'hitdrowned') {
                this.killMobLoop(bot, 'drowned', 4.5, 1.8);
            } else if (d === 'hitghast') {
                this.killMobLoop(bot, 'ghast', 20, 3.0);
            } else if (d === 'sweepingedgeattack') {
                this.killMobLoop(bot, 'blaze', 4.5, 1.8);
            }
        });
    }

    // --- RAID FARM ---
    startRaidAttackLoop(bot) {
        const interval = setInterval(async () => {
            if (this.isDrinking.get(bot.username)) return;
            const armorStand = bot.nearestEntity(e => e && e.name === 'armor_stand' && bot.entity.position.distanceTo(e.position) < 5);
            if (armorStand) {
                const sword = bot.inventory.items().find(i => i.name.includes('sword'));
                if (sword) await bot.equip(sword, 'hand').catch(() => {});
                await bot.lookAt(armorStand.position.offset(0, 1.6, 0), true);
                bot.attack(armorStand);
            }
        }, 1000);
        this.addInterval(bot.username, interval);
    }

    startOminousPotionLoop(bot) {
        setTimeout(async () => {
            await this.drinkFromOffhand(bot);
            const interval = setInterval(() => this.drinkFromOffhand(bot), 35000);
            this.addInterval(bot.username, interval);
        }, 5000);
    }

    async drinkFromOffhand(bot) {
        const potionNames = ['potion', 'bottle', 'ominous_bottle'];
        let offhandItem = bot.inventory.slots[45];
        const inventoryPotion = bot.inventory.items().find(i => 
            i && i.name && potionNames.some(name => i.name.toLowerCase().includes(name))
        );

        if (!inventoryPotion && (!offhandItem || !offhandItem.name || !potionNames.some(name => offhandItem.name.toLowerCase().includes(name)))) {
            return;
        }

        this.isDrinking.set(bot.username, true);
        try {
            if (!offhandItem || !offhandItem.name || !potionNames.some(name => offhandItem.name.toLowerCase().includes(name))) {
                await bot.equip(inventoryPotion, 'off-hand');
                await bot.waitForTicks(10);
            }
            bot.activateItem(true);
            await bot.waitForTicks(65);
            bot.deactivateItem();
        } catch (e) {} finally {
            this.isDrinking.set(bot.username, false);
        }
    }

    // --- UNIVERSAL KILL LOOP ---
    killMobLoop(bot, mobName, maxDistance, eyeHeight) {
        const interval = setInterval(async () => {
            if (this.isDrinking.get(bot.username)) return;

            // ഫിക്സ്: target ഉണ്ടോ എന്നും അതിന് name ഉണ്ടോ എന്നും കൃത്യമായി നോക്കുന്നു
            const target = bot.nearestEntity(e => 
                e && 
                e.type === 'mob' && 
                e.name && 
                typeof e.name === 'string' &&
                e.name.toLowerCase().includes(mobName.toLowerCase()) &&
                bot.entity.position.distanceTo(e.position) <= maxDistance
            );

            if (target) {
                const sword = bot.inventory.items().find(i => i.name.includes('sword'));
                if (sword) await bot.equip(sword, 'hand').catch(() => {});
                
                await bot.lookAt(target.position.offset(0, eyeHeight, 0), true);
                bot.attack(target);
            }
        }, 1200);
        this.addInterval(bot.username, interval);
    }

    addInterval(username, intervalId) {
        let currentIntervals = this.dutyIntervals.get(username) || [];
        currentIntervals.push(intervalId);
        this.dutyIntervals.set(username, currentIntervals);
    }
}

module.exports = FarmManager;