// The werewolf: an ordinary-looking grey wolf by day, a hunched two-legged
// beast four blocks tall by night. One entity, two forms; each form has its own
// model, texture and animations.
import { biped, quadruped } from './lib/anim.mjs';
import { felid } from './lib/bodies.mjs';
import { all, bone, face, frontEyes, LEGS, notFace } from './lib/parts.mjs';
import { fur, gradient, mottle, region, underside } from './lib/texture.mjs';

const pick = (anims, ...names) => Object.fromEntries(names.map((n) => [n, anims[n]]));

const GREY = '#8f8a84';
const PALE = '#d9d4cb';

/** A thick ruff of fur over the wolf's shoulders, like the vanilla wolf. */
function withRuff(model) {
  const body = model.bones.find((b) => b.name === 'body');
  body.cubes.push({ origin: [-4, 8, -7], size: [8, 7, 6], mat: 'ruff' });
  return model;
}

const wolf = {
  size: [0.6, 0.85],
  model: withRuff(felid({
    bodyW: 6, bodyH: 6, bodyL: 14, legH: 8, legW: 2,
    headW: 6, headH: 6, headD: 4, muzzleW: 4, muzzleH: 3, muzzleD: 3,
    tailL: 9, earH: 3, earW: 2, eyeColor: '#c98a1a',
  })),
  materials: {
    fur: {
      base: GREY,
      layers: [
        gradient('#5f5a55', { axis: 1, from: 10, to: 14, where: all(bone('body'), notFace('bottom')) }),
        underside(PALE, { y: 10, soft: 2, where: bone('body', 'head') }),
        region(PALE, all(bone(...LEGS), face('front'))),
        mottle(0.06),
        fur(0.1),
      ],
    },
    ruff: { base: '#a39d96', layers: [underside(PALE, { y: 11, soft: 2 }), fur(0.14)] },
    muzzle: { base: PALE, layers: [fur(0.05)] },
    ear: '#5f5a55',
    tail: { base: GREY, layers: [gradient('#4a4540', { axis: 1, from: 6, to: 2 }), fur(0.1)] },
    tuft: '#3a3632',
    paw: '#cfc9bf',
  },
  anims: pick(quadruped({ tail: ['tail', 'tail2'], ears: ['ear_l', 'ear_r'], swing: 32, walkLength: 0.8, runLength: 0.4 }), 'idle', 'walk', 'run', 'attack'),
};

/** One digitigrade leg: thigh angled forward, shin back, a long flat foot. */
function leg(side) {
  const s = side > 0 ? 'l' : 'r';
  const x = side * 5;
  return [
    { name: `leg_${s}`, parent: 'body', pivot: [x, 28, 1], rotation: [-25, 0, 0], cubes: [{ origin: [x - 3, 16, -2], size: [6, 13, 7], mat: 'fur' }] },
    { name: `shin_${s}`, parent: `leg_${s}`, pivot: [x, 17, 1], rotation: [45, 0, 0], cubes: [{ origin: [x - 2, 2, -1], size: [4, 16, 4], mat: 'fur' }] },
    {
      name: `foot_${s}`, parent: `shin_${s}`, pivot: [x, 3, 1], rotation: [-20, 0, 0],
      cubes: [
        { origin: [x - 2.5, 0, -6], size: [5, 3, 8], mat: 'skin' },
        { origin: [x - 2.5, 0, -8], size: [1, 1, 2], mat: 'claw' },
        { origin: [x - 0.5, 0, -8], size: [1, 1, 2], mat: 'claw' },
        { origin: [x + 1.5, 0, -8], size: [1, 1, 2], mat: 'claw' },
      ],
    },
  ];
}

/** A long arm that hangs to the knee, ending in a clawed hand. */
function arm(side) {
  const s = side > 0 ? 'l' : 'r';
  const x = side * 11;
  return [
    // The chest leans forward, so the arms are turned back to hang straight down.
    { name: `arm_${s}`, parent: 'chest', pivot: [x, 48, 0], rotation: [-25, 0, side * -8], cubes: [{ origin: [x - 3, 35, -3], size: [6, 15, 6], mat: 'fur' }] },
    {
      name: `forearm_${s}`, parent: `arm_${s}`, pivot: [x, 36, 0], rotation: [-15, 0, 0],
      cubes: [
        { origin: [x - 2.5, 21, -2.5], size: [5, 16, 5], mat: 'fur' },
        { origin: [x - 3, 16, -3], size: [6, 5, 6], mat: 'skin' },
        { origin: [x - 3, 13, -3], size: [1, 3, 1], mat: 'claw' },
        { origin: [x - 0.5, 13, -3], size: [1, 3, 1], mat: 'claw' },
        { origin: [x + 2, 13, -3], size: [1, 3, 1], mat: 'claw' },
      ],
    },
  ];
}

const beast = {
  size: [1.3, 3.9],
  model: {
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      { name: 'body', parent: 'root', pivot: [0, 28, 0], cubes: [{ origin: [-7, 26, -3], size: [14, 9, 9], mat: 'fur' }] },
      {
        // Hunched: the chest leans forward from the waist.
        name: 'chest', parent: 'body', pivot: [0, 33, 1], rotation: [25, 0, 0],
        cubes: [
          { origin: [-9, 33, -5], size: [18, 17, 11], mat: 'fur' },
          // Shaggy mane over the shoulders and down the back.
          { origin: [-10, 44, -6], size: [20, 7, 10], mat: 'mane', inflate: 0.5 },
          { origin: [-5, 36, 5], size: [10, 12, 2], mat: 'mane' },
        ],
      },
      // The neck undoes the lean so the head looks straight ahead.
      { name: 'neck', parent: 'chest', pivot: [0, 49, -2], rotation: [-25, 0, 0] },
      {
        name: 'head', parent: 'neck', pivot: [0, 53, -3],
        cubes: [
          {
            origin: [-5, 50, -10], size: [10, 9, 8], mat: 'fur',
            marks: [
              ...frontEyes(10, { gap: 4, down: 3, color: '#ffd23a', pupil: '#8a1a00' }),
              // Heavy brow.
              { face: 'front', x: 1, y: 2, w: 8, h: 1, color: '#24201c' },
            ],
          },
          {
            origin: [-3, 52, -17], size: [6, 4, 7], mat: 'snout',
            marks: [{ face: 'front', x: 2, y: 0, w: 2, h: 1, color: '#0e0c0b' }],
          },
          // Upper fangs.
          { origin: [-3, 51, -17], size: [1, 1, 1], mat: 'fang' },
          { origin: [2, 51, -17], size: [1, 1, 1], mat: 'fang' },
          // Cheek fur.
          { origin: [-6, 49, -8], size: [12, 5, 5], mat: 'mane' },
        ],
      },
      {
        name: 'jaw', parent: 'head', pivot: [0, 52, -9], rotation: [12, 0, 0],
        cubes: [
          { origin: [-3, 50, -16], size: [6, 2, 7], mat: 'jaw' },
          { origin: [-3, 52, -16], size: [1, 1, 1], mat: 'fang' },
          { origin: [2, 52, -16], size: [1, 1, 1], mat: 'fang' },
        ],
      },
      { name: 'ear_l', parent: 'head', pivot: [4, 59, -5], rotation: [-10, 0, -10], cubes: [{ origin: [2, 59, -6], size: [3, 6, 2], mat: 'ear' }] },
      { name: 'ear_r', parent: 'head', pivot: [-4, 59, -5], rotation: [-10, 0, 10], cubes: [{ origin: [-5, 59, -6], size: [3, 6, 2], mat: 'ear' }] },
      ...arm(1),
      ...arm(-1),
      ...leg(1),
      ...leg(-1),
      { name: 'tail', parent: 'body', pivot: [0, 32, 6], rotation: [40, 0, 0], cubes: [{ origin: [-2, 22, 5], size: [4, 10, 4], mat: 'fur' }] },
      { name: 'tail2', parent: 'tail', pivot: [0, 23, 7], rotation: [-15, 0, 0], cubes: [{ origin: [-2.5, 14, 4.5], size: [5, 9, 5], mat: 'mane' }] },
    ],
  },
  materials: {
    fur: {
      base: '#4d4640',
      layers: [
        underside('#6e655c', { y: 40, soft: 6, where: bone('chest') }),
        mottle(0.1),
        fur(0.16),
      ],
    },
    mane: { base: '#2f2a26', layers: [mottle(0.12, { scale: 3 }), fur(0.22)] },
    snout: { base: '#3e3833', layers: [fur(0.08)] },
    jaw: { base: '#3e3833', layers: [region('#7a2a2a', face('top'))] },
    ear: { base: '#2f2a26', layers: [region('#6a4a44', all(face('front'), ({ i, j, fw }) => i > 0 && i < fw - 1 && j > 0))] },
    skin: { base: '#2e2a28', layers: [fur(0.06)] },
    claw: '#d8d0bc',
    fang: '#f2eee2',
  },
  anims: biped(),
};

export default {
  id: 'werewolf',
  name: 'Werewolf',
  health: 40,
  xp: 10,
  egg: ['#8f8a84', '#2f2a26'],
  sounds: { ambient: 'mob.wolf.growl', hurt: 'mob.wolf.hurt', death: 'mob.wolf.death', pitch: [0.7, 0.9], interval: 14 },
  // Wolf by day (neutral: it only bites back), beast by night (hunts players and villagers).
  forms: {
    wolf: { ...wolf, speed: 0.3, attack: 4 },
    beast: { ...beast, speed: 0.34, attack: 10, knockbackResistance: 0.6, followRange: 32 },
  },
  // Damage multipliers in beast form: silver hurts, everything else barely does.
  silverMultiplier: 3,
  beastArmor: 0.5,
  spawn: { biomes: ['forest', 'taiga'], weight: 4, group: [1, 2] },
  loot: [{ item: 'bone', min: 0, max: 2 }, { item: 'leather', min: 0, max: 2 }],
};
