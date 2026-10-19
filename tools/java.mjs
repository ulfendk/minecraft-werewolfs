// Generates the Java edition's resources (java/src/generated/resources) from the
// same spec as the Bedrock packs. GeckoLib reads the Bedrock geometry and
// animation formats directly, so models and animations are shared as-is.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NS } from '../src/lib/constants.mjs';
import { eggIcon } from '../src/lib/texture.mjs';

const BEDROCK_TO_JAVA_SOUNDS = {
  'mob.wolf.growl': 'entity.wolf.growl',
  'mob.wolf.bark': 'entity.wolf.ambient',
  'mob.wolf.hurt': 'entity.wolf.hurt',
  'mob.wolf.death': 'entity.wolf.death',
};

const javaItem = (id) => (id.includes(':') ? id : `minecraft:${id}`);
const javaSound = (s) => {
  const j = BEDROCK_TO_JAVA_SOUNDS[s];
  if (!j) throw new Error(`No Java sound mapped for Bedrock sound "${s}" (tools/java.mjs)`);
  return `minecraft:${j}`;
};

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

/** Stats read by the Java mod at startup (dk.ulfen.werewolf.WerewolfData). */
function statsRecord(w, forms) {
  const form = (name) => {
    const f = w.forms[name];
    return {
      width: f.size[0], height: f.size[1], speed: f.speed, attack: f.attack,
      knockbackResistance: f.knockbackResistance ?? 0, followRange: f.followRange ?? 16,
      animations: Object.keys(f.anims),
    };
  };
  return {
    health: w.health,
    xp: w.xp,
    silverMultiplier: w.silverMultiplier,
    beastArmor: w.beastArmor,
    wolf: form('wolf'),
    beast: form('beast'),
    sounds: {
      ambient: javaSound(w.sounds.ambient), hurt: javaSound(w.sounds.hurt), death: javaSound(w.sounds.death),
      pitchMin: w.sounds.pitch[0], pitchMax: w.sounds.pitch[1], interval: w.sounds.interval,
    },
    spawn: { biomes: w.spawn.biomes, weight: w.spawn.weight, min: w.spawn.group[0], max: w.spawn.group[1] },
    formNames: Object.keys(forms),
  };
}

function lootTable(w) {
  return {
    type: 'minecraft:entity',
    pools: w.loot.map((l) => ({
      rolls: 1,
      entries: [{
        type: 'minecraft:item',
        name: javaItem(l.item),
        functions: [
          { function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: l.min, max: l.max } },
          { function: 'minecraft:enchanted_count_increase', enchantment: 'minecraft:looting', count: { type: 'minecraft:uniform', min: 0, max: 1 } },
        ],
      }],
    })),
  };
}

/** Bedrock recipe -> Java recipe. */
function javaRecipe(recipe) {
  const [type, body] = Object.entries(recipe)[0];
  const name = body.description.identifier.split(':')[1];
  const result = { id: javaItem(body.result.item), count: body.result.count ?? 1 };
  if (type === 'minecraft:recipe_shaped') {
    return [name, {
      type: 'minecraft:crafting_shaped', category: 'equipment', pattern: body.pattern,
      key: Object.fromEntries(Object.entries(body.key).map(([k, v]) => [k, javaItem(v.item)])),
      result,
    }];
  }
  if (type === 'minecraft:recipe_shapeless') {
    return [name, { type: 'minecraft:crafting_shapeless', category: 'misc', ingredients: body.ingredients.map((i) => javaItem(i.item)), result }];
  }
  throw new Error(`Unknown recipe type ${type}`);
}

async function itemModel(A, id, parent) {
  await write(join(A, 'models', 'item', `${id}.json`), { parent, textures: { layer0: `${NS}:item/${id}` } });
  await write(join(A, 'items', `${id}.json`), { model: { type: 'minecraft:model', model: `${NS}:item/${id}` } });
}

export async function buildJava({ werewolf: w, forms, items, recipes, langs, icon, OUT }) {
  await rm(OUT, { recursive: true, force: true });
  const A = join(OUT, 'assets', NS);
  const D = join(OUT, 'data', NS);

  for (const [form, { geo, texture, animations }] of Object.entries(forms)) {
    await write(join(A, 'geckolib', 'models', 'entity', `${form}.geo.json`), geo.geometry);
    await write(join(A, 'geckolib', 'animations', 'entity', `${form}.animation.json`), animations);
    await write(join(A, 'textures', 'entity', `${form}.png`), texture);
  }
  await write(join(A, 'textures', 'item', `${w.id}_spawn_egg.png`), eggIcon(w.egg[0], w.egg[1], 7));
  await itemModel(A, `${w.id}_spawn_egg`, 'minecraft:item/generated');
  for (const item of items) {
    await write(join(A, 'textures', 'item', `${item.id}.png`), item.icon);
    await itemModel(A, item.id, item.handheld ? 'minecraft:item/handheld' : 'minecraft:item/generated');
  }

  await write(join(D, 'werewolf.json'), statsRecord(w, forms));
  await write(join(D, 'loot_table', 'entities', `${w.id}.json`), lootTable(w));
  for (const recipe of recipes) {
    const [name, body] = javaRecipe(recipe);
    await write(join(D, 'recipe', `${name}.json`), body);
  }

  // Language files: Bedrock keys -> Java keys.
  for (const [locale, entries] of Object.entries(langs)) {
    const out = {};
    for (const [k, v] of entries) {
      let m;
      if ((m = k.match(new RegExp(`^entity\\.${NS}:(.+)\\.name$`)))) out[`entity.${NS}.${m[1]}`] = v;
      else if ((m = k.match(new RegExp(`^item\\.spawn_egg\\.entity\\.${NS}:(.+)\\.name$`)))) out[`item.${NS}.${m[1]}_spawn_egg`] = v;
      else if ((m = k.match(new RegExp(`^item\\.${NS}:(.+)\\.name$`)))) out[`item.${NS}.${m[1]}`] = v;
      else if (k.startsWith(`${NS}.`) || k.startsWith('itemGroup.')) out[k] = v;
    }
    await write(join(A, 'lang', `${locale.toLowerCase()}.json`), out);
  }

  await write(join(A, 'icon.png'), icon);
}
