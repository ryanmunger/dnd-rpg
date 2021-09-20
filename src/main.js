import kaboom from 'kaboom';
import dungeonSprites from './dungeon.json';

const k = kaboom({
  clearColor: [0, 0, 0],
  scale: 3,
  stretch: true
});

k.loadSpriteAtlas('sprites/dungeon.png', dungeonSprites);

const weapons = {
  shortSword: {
    baseDamage: Math.ceil(rand(1, 6))
  },
  longSword: {
    baseDamage: Math.ceil(rand(1, 8))
  }
}

const playerProperties = {
  stats: {
    ac: 18,
    dexBonus: 3,
    attackBonus: 5,
    damageBonus: 3
  },
  weapon: weapons.longSword
}

const goblinProperties = {
  stats: {
    ac: 15,
    dexBonus: 4,
    attackBonus: 4,
    damageBonus: 2
  },
  weapon: weapons.shortSword
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
    add() {
      statusText.text = `HP:${this.hp()}`;
      statusText.pos = { x: this.pos.x + 2, y: this.pos.y + 36 };
    },
    attack(target) {
      const attackRoll = Math.ceil(rand(1, 20) + this.stats.attackBonus);
      const knife = k.add([
        pos(),
        sprite('knife'),
        follow(this, 0),
        rotate(90),
        z(1),
      ]);

      if (this.is('enemy')) {
        knife.flipY(true);
        knife.follow = { obj: this, offset: vec2(this.width - knife.width * 2 + 2, this.height / 2) };
      } else {
        knife.follow = { obj: this, offset: vec2(this.width + knife.width, this.height / 2) };
      }

      if (attackRoll >= target.stats.ac) {
        target.color = rgb(255, 0, 0);
        const damageRoll = Math.ceil(rand(1, 6) + this.stats.damageBonus);
        const hitText = add([
          pos(),
          origin('center'),
          follow(target, vec2(target.width / 2, -2)),
          text(`Hit for: ${damageRoll}!`, { size: 6 })
        ]);
        const attackAnimation = wait(1, () => {
          target.hurt(damageRoll);
          this.trigger('takeDamage', target, knife, hitText)
        });
        attackAnimation.then(() => {
          this.trigger('turnEnd', this);
        });
      } else {
        const missText = add([
          pos(),
          origin('center'),
          follow(target, vec2(target.width / 2, -2)),
          text('Miss!', { size: 8 })
        ]);
        const attackAnimation = wait(1, () => {
          knife.destroy();
          missText.destroy();
          target.color = null;
        })
        attackAnimation.then(() => {
          this.trigger('turnEnd', this);
        });
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
    pos(map.getPos(2, 4)),
    sprite("hero", { anim: "idle" }),
    area(),
    color(),
    health(12),
    battler(),
    z(2),
    'player',
    playerProperties
  ]);

  const goblin = k.add([
    color(),
    pos(map.getPos(4, 4)),
    sprite("ogre", { anim: "idle" }),
    area(),
    health(7),
    battler(),
    'enemy',
    goblinProperties
  ]);

  goblin.flipX(true);

  const initialAttack = wait(2);

  initialAttack.then(() => {
    player.attack(goblin)
  });

  player.on('turnEnd', () => {
    if (goblin.exists()) {
      const goblinAttack = wait(2);
      goblinAttack.then(() => {
        goblin.attack(player);
      })
    }
  });

  goblin.on('turnEnd', () => {
    if (player.exists()) {
      const playerAttack = wait(2);
      playerAttack.then(() => {
        player.attack(goblin);
      })
    }
  });

  // TODO: Remove. Lots of code duplication.
  player.on('takeDamage', (target, knife, hitText) => {
    knife.destroy();
    hitText.destroy();
    if (target.hp() <= 0) {
      target.statusText.destroy();
    }
    target.statusText.text = `HP:${target.hp()}`;
    target.color = null;
  });

  goblin.on('takeDamage', (target, knife, hitText) => {
    knife.destroy();
    hitText.destroy();
    if (target.hp() <= 0) {
      target.statusText.destroy();
    }
    target.statusText.text = `HP:${target.hp()}`;
    target.color = null;
  });

  player.on('death', () => {
    addKaboom(player.pos);
    player.destroy()
  })

  goblin.on('death', () => {
    addKaboom(goblin.pos);
    goblin.destroy()
  })
});

go('battle');