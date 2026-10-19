import { ItemStack, system, world } from '@minecraft/server';
import { ITEMS } from './data.js';

const TYPE = 'werewolf:werewolf';

/** Smoke, a howl and a warning for nearby players when a werewolf changes form. */
function transform(entity, toBeast) {
  const { dimension, location: at } = entity;
  try {
    for (let y = 0; y < (toBeast ? 4 : 1.5); y += 0.75) {
      dimension.spawnParticle('minecraft:large_explosion', { x: at.x, y: at.y + y, z: at.z });
    }
    if (toBeast) {
      dimension.playSound('mob.wolf.whine', at, { pitch: 0.5, volume: 4 });
      dimension.playSound('mob.wolf.growl', at, { pitch: 0.6, volume: 2 });
      for (const player of dimension.getPlayers({ location: at, maxDistance: 48 })) {
        player.onScreenDisplay.setActionBar({ translate: 'werewolf.howl' });
      }
    } else {
      dimension.playSound('mob.wolf.whine', at, { pitch: 1.2 });
    }
  } catch {
    // The chunk may have unloaded in the meantime.
  }
}

world.afterEvents.dataDrivenEntityTrigger.subscribe(
  (event) => {
    if (event.entity.isValid) transform(event.entity, event.eventId === 'werewolf:become_beast');
  },
  { entityTypes: [TYPE], eventTypes: ['werewolf:become_beast', 'werewolf:become_wolf'] },
);

/**
 * Used by tools/bds-test.sh: `scriptevent werewolf:selftest beast` checks that
 * werewolves exist, that every one of them is in the expected form, and that
 * the custom items exist.
 */
function selfTest(expected) {
  const problems = [];
  const werewolves = world.getDimension('overworld').getEntities({ type: TYPE });
  if (!werewolves.length) problems.push('no werewolves');
  const forms = werewolves.map((e) => (e.getProperty('werewolf:beast') ? 'beast' : 'wolf'));
  if (expected && forms.some((f) => f !== expected)) problems.push(`expected every werewolf to be a ${expected}, got ${forms.join(',')}`);
  // The beast shrugs off half the damage from anything that isn't silver.
  if (expected === 'beast' && werewolves.length) {
    const health = werewolves[0].getComponent('minecraft:health');
    const before = health.currentValue;
    werewolves[0].applyDamage(4, { cause: 'magic' });
    const lost = before - health.currentValue;
    if (lost !== 2) problems.push(`beast lost ${lost} health from 4 damage, expected 2`);
  }
  for (const id of ITEMS) {
    try {
      new ItemStack(id, 1);
    } catch {
      problems.push(`missing item ${id}`);
    }
  }
  console.log(`[Werewolves] selftest found ${werewolves.length} werewolves: ${forms.join(', ')}`);
  console.log(problems.length ? `[Werewolves] selftest FAIL: ${problems.join('; ')}` : '[Werewolves] selftest PASS');
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'werewolf:selftest') selfTest(event.message.trim());
});

world.afterEvents.worldLoad.subscribe(() => console.log('[Werewolves] loaded'));
