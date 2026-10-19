// Parametric body plans.
import { frontEyes, legs4 } from './parts.mjs';

/**
 * Dogs and cats (the wolf form). All sizes in pixels; widths should be even.
 * Returns a model spec with bones: root, body, head, (mane), ear_l, ear_r, tail, tail2, legs.
 * Materials used: fur, muzzle, paw, ear, tail, tuft, mane, and with options: jaw, fang, brow.
 * mane: true for a head mane, 'full' to continue it down the chest.
 * jaw: a separate, slightly open lower jaw with fangs (a snarl).
 */
export function felid({
  bodyW = 8, bodyH = 8, bodyL = 18, legH = 11, legW = 3,
  headW = 8, headH = 7, headD = 6, muzzleW, muzzleH, muzzleD = 2,
  tailL = 12, tuft = false, mane = false, earH = 2, earW = 2,
  eyeColor = '#c8a23a', hump = 0, slope = 0, jaw = false, jawOpen = 15, brow = false,
} = {}) {
  const bottom = legH - 1;
  const top = bottom + bodyH;
  const zf = -bodyL / 2;
  const zb = bodyL / 2;
  const mw = muzzleW ?? Math.max(2, Math.round(headW / 4) * 2 - 2);
  const mh = muzzleH ?? Math.max(2, Math.floor(headH / 2));
  const hy = top - headH + 2 + hump; // head bottom
  const hzf = zf - headD + 1; // head front
  const bones = [
    { name: 'root', pivot: [0, 0, 0] },
    {
      name: 'body', parent: 'root', pivot: [0, top - 2, 0],
      cubes: [
        { origin: [-bodyW / 2, bottom, zf], size: [bodyW, bodyH, bodyL / 2], mat: 'fur' },
        { origin: [-bodyW / 2, bottom, 0], size: [bodyW, bodyH - slope, bodyL / 2], mat: 'fur' },
        ...(hump ? [{ origin: [-bodyW / 2 + 1, top, zf + 1], size: [bodyW - 2, hump, Math.round(bodyL / 3)], mat: 'fur' }] : []),
      ],
    },
    {
      name: 'head', parent: 'body', pivot: [0, top - 1, zf],
      cubes: [
        {
          origin: [-headW / 2, hy, hzf], size: [headW, headH, headD], mat: 'fur',
          marks: frontEyes(headW, { gap: Math.max(2, headW - 6), down: brow ? 2 : Math.max(1, headH - mh - 2), color: eyeColor, pupil: '#111111' }),
        },
        {
          origin: [-mw / 2, hy + (jaw ? 1 : 0), hzf - muzzleD], size: [mw, mh - (jaw ? 1 : 0), muzzleD], mat: 'muzzle',
          marks: [{ face: 'front', x: mw / 2 - 1, y: 0, w: 2, h: 1, color: '#3b2620' }],
        },
        ...(brow ? [{ origin: [-headW / 2, hy + headH - 2, hzf - 1], size: [headW, 1, 1], mat: 'brow' }] : []),
      ],
    },
  ];
  if (jaw) {
    bones[2].cubes.push(
      { origin: [-mw / 2, hy, hzf - muzzleD], size: [1, 1, 1], mat: 'fang' },
      { origin: [mw / 2 - 1, hy, hzf - muzzleD], size: [1, 1, 1], mat: 'fang' },
    );
    bones.push({
      name: 'jaw', parent: 'head', pivot: [0, hy + 1, hzf + 1], rotation: [jawOpen, 0, 0],
      cubes: [{ origin: [-mw / 2, hy, hzf - muzzleD], size: [mw, 1, muzzleD + 1], mat: 'jaw' }],
    });
  }
  if (mane) {
    bones.push({
      name: 'mane', parent: 'head', pivot: [0, top - 1, zf],
      cubes: [
        { origin: [-headW / 2 - 2, hy - 3, hzf + 2], size: [headW + 4, headH + 5, 5], mat: 'mane' },
        { origin: [-headW / 2 - 1, hy - 4, hzf + 6], size: [headW + 2, headH + 4, 4], mat: 'mane' },
        ...(mane === 'full' ? [{ origin: [-headW / 2, hy - 7, hzf + 3], size: [headW, 5, 7], mat: 'mane' }] : []),
      ],
    });
  }
  const earZ = hzf + Math.floor(headD / 2);
  bones.push(
    { name: 'ear_l', parent: 'head', pivot: [headW / 2 - 1, hy + headH, earZ + 0.5], cubes: [{ origin: [headW / 2 - earW, hy + headH, earZ], size: [earW, earH, 1], mat: 'ear' }] },
    { name: 'ear_r', parent: 'head', pivot: [-headW / 2 + 1, hy + headH, earZ + 0.5], cubes: [{ origin: [-headW / 2, hy + headH, earZ], size: [earW, earH, 1], mat: 'ear' }] },
  );
  const half = Math.ceil(tailL / 2);
  const ty = top - 1 - slope;
  bones.push(
    { name: 'tail', parent: 'body', pivot: [0, ty, zb], rotation: [40, 0, 0], cubes: [{ origin: [-1, ty - half, zb], size: [2, half, 2], mat: 'fur' }] },
    {
      name: 'tail2', parent: 'tail', pivot: [0, ty - half, zb + 1], rotation: [-20, 0, 0],
      cubes: [
        { origin: [-1, ty - half - (tailL - half), zb], size: [2, tailL - half, 2], mat: 'tail' },
        ...(tuft ? [{ origin: [-1, ty - tailL - 2, zb], size: [2, 2, 2], mat: 'tuft', inflate: 0.25 }] : []),
      ],
    },
  );
  bones.push(...legs4({ x: bodyW / 2, front: zf + 1, back: zb - 1 - legW, w: legW, h: legH, foot: 1, mat: 'fur', footMat: 'paw' }));
  return { bones };
}
