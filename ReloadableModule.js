// reloadableModule.js

module.exports = {

  executeTask: function(bot) {
    // // Simple task that can be modified and reloaded
    // console.log('Executing a task from the reloadable module.');
    // let previousHealth = null;
    // let previousHunger = null;
    // bot.on('health', () => {
    //   if (previousHealth !== null && bot.health < previousHealth) {
    //     console.error(`🔪❤️‍🩹 Bot is taking damage! Health decreased from ${previousHealth} to ${bot.health}.`);
    //   }
    //   if(previousHunger !== null && bot.food < previousHunger){
    //     console.log(`❤️‍🩹Bot's current health: ${bot.health}`);
    //     console.log(`🍗Bot's current hunger: ${bot.food}`);
    //   }
    //   console.log(`❤️‍🩹Bot's current health: ${bot.health}`);
    //   console.log(`🍗Bot's current hunger: ${bot.food}`);
    //   previousHealth = bot.health;
    //   previousHunger = bot.food;
    
    
    
    //   if (bot.health < 10) {
    //     console.warn('🔪❤️‍🩹 Warning: Bot health is low!');
    //   }
    //   if (bot.food < 10) {
    //     console.warn('🔪❤️‍🩹 Warning: Bot hunger is low!');
    //   }
    // });
  }
};
