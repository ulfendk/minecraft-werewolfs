// Silver: the one thing a werewolf fears. A silver ingot (iron refined with an
// amethyst shard) and a silver sword that deals triple damage to werewolves.
import { PNG } from 'pngjs';
import { NS } from './lib/constants.mjs';
import { hex } from './lib/texture.mjs';

/** Draw a 16x16 icon from [x, y, color] pixels. */
function icon(pixels) {
  const png = new PNG({ width: 16, height: 16 });
  png.data.fill(0);
  for (const [x, y, c] of pixels) if (x >= 0 && y >= 0 && x < 16 && y < 16) png.data.set(hex(c), (y * 16 + x) * 4);
  return PNG.sync.write(png);
}

/** Pixels along the bottom-left to top-right diagonal, from step a to b. */
const diag = (a, b, color, offset = 0) => {
  const out = [];
  for (let k = a; k <= b; k++) out.push([k + offset, 15 - k, color]);
  return out;
};

const SILVER = '#d6dde3', SILVER_LIGHT = '#f4f8fb', SILVER_DARK = '#8e9aa6', OUTLINE = '#4a525a';
const WOOD = '#6b4a2a', WOOD_DARK = '#4a321c', GUARD = '#7a8692';

// Ingot: a trapezoid bar seen from the front-top, like the vanilla ingots.
const ingotPixels = [];
for (let y = 5; y <= 11; y++)
  for (let x = 1; x <= 14; x++) {
    const inset = Math.max(0, 7 - y); // the top face narrows towards the back
    if (x < 1 + inset || x > 14 - inset) continue;
    let c = SILVER;
    if (y === 5 || y === 11 || x === 1 + inset || x === 14 - inset) c = OUTLINE;
    else if (y <= 7) c = SILVER_LIGHT;
    else if (y >= 10 || x >= 12) c = SILVER_DARK;
    ingotPixels.push([x, y, c]);
  }

// Sword: handle bottom-left, blade to the top-right, with a light edge.
const swordPixels = [
  ...diag(1, 3, WOOD), ...diag(1, 3, WOOD_DARK, 1),
  [0, 15, OUTLINE],
  // Cross guard.
  [3, 10, GUARD], [4, 11, GUARD], [5, 12, GUARD], [2, 9, OUTLINE], [6, 13, OUTLINE],
  ...diag(4, 14, SILVER), ...diag(4, 13, SILVER_LIGHT, 1), ...diag(5, 14, SILVER_DARK, -1),
  [15, 0, OUTLINE],
];

export const items = [
  {
    id: 'silver_ingot',
    name: 'Silver Ingot',
    category: 'items',
    icon: icon(ingotPixels),
  },
  {
    id: 'silver_sword',
    name: 'Silver Sword',
    category: 'equipment',
    stack: 1,
    icon: icon(swordPixels),
    handheld: true,
    components: {
      'minecraft:damage': 6,
      'minecraft:durability': { max_durability: 300 },
      'minecraft:hand_equipped': true,
      'minecraft:enchantable': { slot: 'sword', value: 18 },
      'minecraft:repairable': { repair_items: [{ items: [`${NS}:silver_ingot`], repair_amount: 75 }] },
    },
  },
];

export const recipes = [
  {
    'minecraft:recipe_shapeless': {
      description: { identifier: `${NS}:silver_ingot` },
      tags: ['crafting_table'],
      ingredients: [{ item: 'minecraft:iron_ingot' }, { item: 'minecraft:amethyst_shard' }],
      result: { item: `${NS}:silver_ingot` },
      unlock: [{ item: 'minecraft:amethyst_shard' }],
    },
  },
  {
    'minecraft:recipe_shaped': {
      description: { identifier: `${NS}:silver_sword` },
      tags: ['crafting_table'],
      pattern: ['S', 'S', 'T'],
      key: { S: { item: `${NS}:silver_ingot` }, T: { item: 'minecraft:stick' } },
      result: { item: `${NS}:silver_sword` },
      unlock: [{ item: `${NS}:silver_ingot` }],
    },
  },
];

export function buildItem(item) {
  return {
    format_version: '1.21.90',
    'minecraft:item': {
      description: { identifier: `${NS}:${item.id}`, menu_category: { category: item.category ?? 'items' } },
      components: {
        'minecraft:icon': `${NS}_${item.id}`,
        'minecraft:display_name': { value: `item.${NS}:${item.id}.name` },
        'minecraft:max_stack_size': item.stack ?? 64,
        ...(item.components ?? {}),
      },
    },
  };
}
