// NetherTravel.js
const { goals } = require('mineflayer-pathfinder');

class NetherTravel {
  constructor(bot) {
    this.bot = bot;
  }

  async goToNether() {
    if (this.bot.game.dimension === 'minecraft:the_nether') {
      console.log('Bot is already in the Nether.');
      return;
    }

    console.log('Bot is in the Overworld. Looking for a Nether portal.');

    const portal = this.findNearbyPortal();

    if (portal) {
      console.log('Found a nearby lit Nether portal. Moving towards it.');
      await this.moveToPosition(portal.position);
    } else {
      console.log('No nearby portal found. Walking around to find one.');
      await this.exploreForPortal();

      if (!this.findNearbyPortal()) {
        console.log('Still no portal found. Moving towards (0, 0) to check for a portal.');
        await this.moveToPosition({ x: 0, y: 64, z: 0 });
      }
    }

    const finalPortal = this.findNearbyPortal();

    if (finalPortal) {
      console.log('Entering the Nether portal.');
      await this.moveToPosition(finalPortal.position);
      this.bot.chat('Going to the Nether...');
      await this.enterPortal();
    } else {
      console.log('No portal found at (0, 0) either.');
    }

    this.bot.on('changeDimension', async (dimension) => {
      if (dimension === 'minecraft:the_nether') {
        console.log('Bot has entered the Nether. Ascending to find bedrock.');
        await this.ascendToBedrock();
      }
    });
  }

  findNearbyPortal() {
    const portals = this.bot.findBlocks({
      matching: block => block.name === 'nether_portal',
      maxDistance: 100,
      count: 1,
    });

    return portals.length > 0 ? this.bot.blockAt(portals[0]) : null;
  }

  async moveToPosition(position) {
    const goal = new goals.GoalBlock(position.x, position.y, position.z);
    this.bot.pathfinder.setGoal(goal);
    console.log(`Goal set...🚶(${position.x}, ${position.y}, ${position.z}).`);
    return new Promise((resolve) => {
      this.bot.once('goal_reached', () => {
        console.log(`Bot has reached (${position.x}, ${position.y}, ${position.z}).`);
        resolve();
      });
    });
  }

  async exploreForPortal() {
    const randomX = this.bot.entity.position.x + Math.floor(Math.random() * 100) - 50;
    const randomZ = this.bot.entity.position.z + Math.floor(Math.random() * 100) - 50;
    await this.moveToPosition({ x: randomX, y: 64, z: randomZ });
  }

  async enterPortal() {
    this.bot.chat('Waiting to enter the Nether...');
    return new Promise((resolve) => {
      this.bot.once('changeDimension', () => {
        console.log('Bot has changed dimension to the Nether.');
        resolve();
      });
    });
  }

  async ascendToBedrock() {
    const bedrockHeight = 127;
    let { x, y, z } = this.bot.entity.position;

    while (y < bedrockHeight - 3) {
      y += 1;
      await this.moveToPosition({ x: x, y: y, z: z });
    }

    console.log('Bot has reached a height near bedrock.');
  }
}

module.exports = NetherTravel;
