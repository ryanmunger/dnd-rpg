import kaboom from 'kaboom';
import dungeonSprites from './dungeon.json';
import once from 'lodash.once';
import remove from 'lodash.remove';

const k = kaboom({
  clearColor: [0, 0, 0],
  scale: 3,
  stretch: true
});

k.loadSpriteAtlas('sprites/dungeon.png', dungeonSprites);

const weapons = {
  dagger: {
    damage: {
      min: 1,
      max: 4
    }
  },
  longSword: {
    damage: {
      min: 1,
      max: 8
    }
  }
}

const playerProperties = {
  stats: {
    ac: 17,
    hp: 12,
    dexBonus: 4,
    attackBonus: 5,
    damageBonus: 3
  },
  weapon: weapons.longSword
}

const goblinProperties = {
  stats: {
    ac: 13,
    hp: 7,
    dexBonus: 3,
    attackBonus: 3,
    damageBonus: 1
  },
  weapon: weapons.dagger
}

function battler() {
  const statusText = add([
    pos(),
    text('', { size: 6 }),
  ])
  return {
    id: 'battler',
    require: ['color', 'pos', 'health'],
    statusText: statusText,
    isActive: false,
    add() {
      statusText.text = `HP:${this.stats.hp}/${this.hp()}`;
      statusText.pos = { x: this.pos.x + 2, y: this.pos.y + 36 };
    },
    async attack(target) {
      this.trigger('attackStart', this);

      const attackRoll = Math.ceil(rand(1, 20) + this.stats.attackBonus);

      if (attackRoll >= target.stats.ac) {
        const damageRoll = Math.ceil(rand(this.weapon.damage.min, this.weapon.damage.max) + this.stats.damageBonus);
        target.hurt(damageRoll);
        const hitText = add([
          pos(),
          origin('center'),
          follow(target, vec2(target.width / 2, -2)),
          text(damageRoll, { size: 6 })
        ]);
        this.trigger('dealDamage', target, hitText)
      } else {
        const missText = add([
          pos(),
          origin('center'),
          follow(target, vec2(target.width / 2, -2)),
          text('Miss!', { size: 8 })
        ]);
        await wait(1);
        missText.destroy();
        target.color = null;
      }
    }
  }
}

k.scene('battle', () => {
  const map = k.addLevel([
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
    "         ",
  ], {
    width: 16,
    height: 16,
    " ": () => [
      k.sprite('floor', { frame: ~~rand(0, 8) }),
    ],
  });

  const player = k.add([
    pos(map.getPos(1, 5 * 1.1)),
    sprite("hero", { anim: "idle" }),
    area(),
    color(),
    health(playerProperties.stats.hp),
    battler(),
    z(2),
    'player',
    { ...playerProperties, initiative: Math.ceil(rand(1, 20) + playerProperties.stats.dexBonus) }
  ]);

  let goblins = [];

  for (let i = 0; i <= 2; i++) {
    goblins.push(k.add([
      color(),
      pos(map.getPos(5, 1 + i * 4.5)),
      sprite("ogre", { anim: "idle" }),
      area(),
      health(goblinProperties.stats.hp),
      battler(),
      'enemy',
      { ...goblinProperties, initiative: Math.ceil(rand(1, 20)) + goblinProperties.stats.dexBonus }
    ]))
    goblins[i].flipX(true);
  }

  const goblin = goblins[0];

  goblin.flipX(true);

  const battlers = [player, ...goblins];

  const sortedBattlers = battlers.sort((a, b) => a.initiative < b.initiative);
  console.log(sortedBattlers);

  async function dealDamage(target, hitText) {
    if (target.hp() <= 0) {
      target.statusText.destroy();
      addKaboom({ x: target.pos.x + target.width / 2, y: target.pos.y + target.height / 2 });
      hitText.destroy();
      target.destroy();
      remove(sortedBattlers, {
        _id: target._id
      })
    }
    target.color = rgb(255, 0, 0);
    target.statusText.text = `HP:${target.hp()}/${target.stats.hp}`;
    await wait(1);
    target.color = null;
    hitText.destroy();
  }

  async function attackLoop() {
    sortedBattlers[0].color = rgb(0, 150, 100);
    sortedBattlers[0].on('attackStart', async (obj) => {
      let knifePosX = obj.pos.x + obj.width * 1.75;
      let knifePosY = obj.pos.y + obj.height / 2
      if (obj.is('enemy')) {
        knifePosX = obj.pos.x + obj.width - 22;
      }
      const knife = k.add([
        pos(knifePosX, knifePosY),
        sprite('knife', {
          flipY: obj.is('enemy') ? true : false,
        }),
        rotate(90),
        z(1),
      ]);
      await wait(1);
      knife.destroy();
    });
    sortedBattlers[0].on('dealDamage', (target, hitText) => {
      dealDamage(target, hitText);
    });
    // Player is attacking
    if (sortedBattlers[0].is('player')) {
      async function clickEnemy(obj) {
        sortedBattlers[0].attack(obj);
        await wait(1);
        sortedBattlers[0].color = null;
        sortedBattlers.push(sortedBattlers.shift());
        attackLoop();
      };

      const clickEnemyOnce = once(clickEnemy);
      clicks('enemy', async (obj) => {
        clickEnemyOnce(obj);
      })
    }

    // Enemy is attacking
    if (sortedBattlers[0].is('enemy') && player.exists()) {
      await wait(2.5);
      sortedBattlers[0].attack(player);
      await wait(1);
      sortedBattlers[0].color = null;
      sortedBattlers.push(sortedBattlers.shift());
      attackLoop();
    }
  }

  attackLoop();

});

ready(() => {
  go('battle');
})