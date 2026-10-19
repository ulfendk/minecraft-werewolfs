// Renders both forms of the werewolf (rest pose from several sides, walking,
// attacking, howling) into build/preview/, plus build/preview/sheet.png with
// the wolf and the beast side by side at the same scale.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from './build.mjs';
import { render, sheet } from './render.mjs';

const OUT = 'build/preview';
const { forms, werewolf } = await build({ quiet: true });
await mkdir(OUT, { recursive: true });

for (const [form, { geo, texture, animations }] of Object.entries(forms)) {
  const get = (n) => animations.animations[`animation.werewolf.${form}.${n}`];
  const views = [
    render(geo.geometry, texture, { yaw: 35 }),
    render(geo.geometry, texture, { yaw: 325 }),
    render(geo.geometry, texture, { yaw: 90, pitch: 5 }),
    render(geo.geometry, texture, { yaw: 35, anim: get('walk'), time: 0.25 }),
    render(geo.geometry, texture, { yaw: 35, anim: get('attack'), time: 0.2 }),
    render(geo.geometry, texture, { yaw: 0, pitch: 10, anim: get('howl'), time: 1.5 }),
  ];
  await writeFile(join(OUT, `${form}.png`), sheet(views, { cols: 3 }));
}

// Same scale for both forms, so the size difference shows: 4 screen pixels per model pixel.
const scale = 4;
const height = Math.ceil(werewolf.forms.beast.size[1] * 16 * scale * 1.15);
const side = (form, opts = {}) => render(forms[form].geo.geometry, forms[form].texture, { size: height, scale, floor: true, yaw: 35, ...opts });
await writeFile(join(OUT, 'sheet.png'), sheet([side('wolf'), side('beast')], { cols: 2, cell: height }));
console.log(`Wrote previews to ${OUT}/`);
