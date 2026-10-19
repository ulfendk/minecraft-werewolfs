// Generates the behavior pack and resource pack into build/, and the Java
// edition's resources into java/src/generated/resources.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import werewolf from '../src/werewolf.mjs';
import { animationFile } from '../src/lib/anim.mjs';
import { buildEntity, buildLoot, buildSpawnRules } from '../src/lib/behavior.mjs';
import { buildAnimationControllers, buildClientEntity, buildEntitySounds, buildRenderController, FORMS } from '../src/lib/client.mjs';
import { MIN_ENGINE, NS, PACK_NAME, SCRIPT_SERVER_VERSION } from '../src/lib/constants.mjs';
import { packIcon } from '../src/lib/icon.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { paintTexture } from '../src/lib/texture.mjs';
import { buildItem, items, recipes } from '../src/items.mjs';
import { langEntries, LOCALES } from '../src/i18n.mjs';
import { buildJava } from './java.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'build');
const BP = join(OUT, 'behavior_pack');
const RP = join(OUT, 'resource_pack');

const UUID = {
  bpHeader: 'ffc885d7-62fe-4469-a57b-3a705c0e6bac',
  bpData: '3fb6cc4e-fcd0-49f0-b2e3-66ec82857788',
  bpScript: '223fba53-2351-43d9-8d38-a1f7186d0f09',
  rpHeader: '4b3cb35e-d7a2-4bea-adb3-846eb6f7b0a1',
  rpResources: 'aadd1841-3146-451c-9e65-1e96822d2b0c',
};

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

function manifests(version) {
  const v = version.split('.').map(Number);
  const metadata = { authors: ['Werewolves contributors'], license: 'MIT' };
  const bp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Behavior)`, description: 'pack.description', uuid: UUID.bpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [
      { type: 'data', uuid: UUID.bpData, version: v },
      { type: 'script', language: 'javascript', uuid: UUID.bpScript, version: v, entry: 'scripts/main.js' },
    ],
    dependencies: [
      { uuid: UUID.rpHeader, version: v },
      { module_name: '@minecraft/server', version: SCRIPT_SERVER_VERSION },
    ],
    metadata,
  };
  const rp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Resources)`, description: 'pack.description', uuid: UUID.rpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [{ type: 'resources', uuid: UUID.rpResources, version: v }],
    dependencies: [{ uuid: UUID.bpHeader, version: v }],
    metadata,
  };
  return { bp, rp };
}

/** Geometry, texture and animation file for each form. */
export function buildForms(w = werewolf) {
  return Object.fromEntries(FORMS.map((form) => {
    const f = w.forms[form];
    const geo = buildGeometry(`geometry.${NS}.${form}`, f.model);
    return [form, { geo, texture: paintTexture(geo, f.materials), animations: animationFile(form, f.anims) }];
  }));
}

export async function build({ quiet = false } = {}) {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const w = werewolf;
  await rm(BP, { recursive: true, force: true });
  await rm(RP, { recursive: true, force: true });

  // Hand-written files first; generated files may add to the same folders.
  await cp(join(ROOT, 'src', 'packs', 'behavior_pack'), BP, { recursive: true });
  await cp(join(ROOT, 'src', 'packs', 'resource_pack'), RP, { recursive: true });

  const { bp, rp } = manifests(pkg.version);
  await write(join(BP, 'manifest.json'), bp);
  await write(join(RP, 'manifest.json'), rp);
  const icon = packIcon();
  await write(join(BP, 'pack_icon.png'), icon);
  await write(join(RP, 'pack_icon.png'), icon);

  // The werewolf: behaviour
  await write(join(BP, 'entities', `${w.id}.json`), buildEntity(w));
  await write(join(BP, 'spawn_rules', `${w.id}.json`), buildSpawnRules(w));
  await write(join(BP, 'loot_tables', 'entities', `${NS}_${w.id}.json`), buildLoot(w));

  // ... and its two forms
  const forms = buildForms(w);
  for (const [form, { geo, texture, animations }] of Object.entries(forms)) {
    await write(join(RP, 'models', 'entity', `${form}.geo.json`), geo.geometry);
    await write(join(RP, 'textures', 'entity', NS, `${form}.png`), texture);
    await write(join(RP, 'animations', `${form}.animation.json`), animations);
  }
  await write(join(RP, 'animation_controllers', `${w.id}.animation_controllers.json`), buildAnimationControllers(w));
  await write(join(RP, 'entity', `${w.id}.entity.json`), buildClientEntity(w));
  await write(join(RP, 'render_controllers', `${w.id}.render_controllers.json`), buildRenderController(w));
  await write(join(RP, 'sounds.json'), { entity_sounds: { entities: { [`${NS}:${w.id}`]: buildEntitySounds(w) } } });

  // Items
  const itemIds = items.map((i) => `${NS}:${i.id}`);
  await write(join(BP, 'scripts', 'data.js'), `// Generated by tools/build.mjs\nexport const ITEMS = ${JSON.stringify(itemIds)};\n`);
  const itemTextures = {};
  for (const item of items) {
    await write(join(BP, 'items', `${item.id}.json`), buildItem(item));
    await write(join(RP, 'textures', 'items', NS, `${item.id}.png`), item.icon);
    itemTextures[`${NS}_${item.id}`] = { textures: `textures/items/${NS}/${item.id}` };
  }
  await write(join(RP, 'textures', 'item_texture.json'), { resource_pack_name: NS, texture_name: 'atlas.items', texture_data: itemTextures });
  for (const recipe of recipes) {
    const body = Object.values(recipe)[0];
    const name = body.description.identifier.split(':')[1];
    await write(join(BP, 'recipes', `${name}.json`), { format_version: '1.12', ...recipe });
  }

  // Language
  const langs = {};
  for (const locale of LOCALES) {
    const entries = langEntries(locale, { werewolf: w, items, version: pkg.version });
    langs[locale] = entries;
    const text = entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    for (const pack of [BP, RP]) await write(join(pack, 'texts', `${locale}.lang`), text);
  }
  for (const pack of [BP, RP]) await write(join(pack, 'texts', 'languages.json'), LOCALES);

  // Java edition resources
  await buildJava({ werewolf: w, forms, items, recipes, langs, icon, OUT: join(ROOT, 'java', 'src', 'generated', 'resources') });

  if (!quiet) {
    const sizes = Object.entries(forms).map(([f, { geo }]) => `${f} ${geo.width}x${geo.height}`).join(', ');
    console.log(`Built ${PACK_NAME} ${pkg.version}: werewolf (${sizes}); items ${items.map((i) => i.id).join(', ')}; Java resources in java/src/generated/resources`);
  }
  return { werewolf: w, forms, version: pkg.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
