// Static checks for build/. The dedicated server validates the behavior pack;
// this mostly covers the resource pack, which only clients load.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const BP = 'build/behavior_pack';
const RP = 'build/resource_pack';
const errors = [];
const err = (msg) => errors.push(msg);

async function files(dir, ext) {
  const out = [];
  async function walk(d) {
    let names;
    try { names = await readdir(d); } catch { return; }
    for (const n of names) {
      const p = join(d, n);
      if ((await stat(p)).isDirectory()) await walk(p);
      else if (!ext || n.endsWith(ext)) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

async function json(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    err(`${path}: invalid JSON (${e.message})`);
    return null;
  }
}

const exists = (p) => stat(p).then(() => true, () => false);

// ------------------------------------------------------------ load everything
const bpEntities = new Map();
for (const f of await files(join(BP, 'entities'), '.json')) {
  const j = await json(f);
  if (j) bpEntities.set(j['minecraft:entity'].description.identifier, { file: f, json: j });
}

const geometries = new Map();
for (const f of await files(join(RP, 'models'), '.json')) {
  const j = await json(f);
  for (const g of j?.['minecraft:geometry'] ?? []) geometries.set(g.description.identifier, { file: f, g });
}

const animations = new Map();
for (const f of await files(join(RP, 'animations'), '.json')) {
  const j = await json(f);
  for (const [k, v] of Object.entries(j?.animations ?? {})) animations.set(k, v);
}

const controllers = new Map();
for (const f of await files(join(RP, 'animation_controllers'), '.json')) {
  const j = await json(f);
  for (const [k, v] of Object.entries(j?.animation_controllers ?? {})) controllers.set(k, v);
}

const renderControllers = new Map();
for (const f of await files(join(RP, 'render_controllers'), '.json')) {
  const j = await json(f);
  for (const [k, v] of Object.entries(j?.render_controllers ?? {})) renderControllers.set(k, v);
}

const lang = new Map(
  (await readFile(join(RP, 'texts', 'en_US.lang'), 'utf8'))
    .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

const customItems = new Map();
for (const f of await files(join(BP, 'items'), '.json')) {
  const j = await json(f);
  if (j) customItems.set(j['minecraft:item'].description.identifier, j);
}

// ------------------------------------------------------------ checks
function balanced(expr, where) {
  if (typeof expr !== 'string') return;
  let depth = 0;
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) err(`${where}: unbalanced parentheses in Molang "${expr}"`);
}

async function checkTexture(path, where, size) {
  const file = `${join(RP, path)}.png`;
  if (!(await exists(file))) return err(`${where}: missing texture ${file}`);
  const png = PNG.sync.read(await readFile(file));
  if (size && (png.width !== size[0] || png.height !== size[1])) {
    err(`${where}: texture ${file} is ${png.width}x${png.height}, geometry expects ${size[0]}x${size[1]}`);
  }
}

const clientIds = new Set();
for (const f of await files(join(RP, 'entity'), '.json')) {
  const j = await json(f);
  if (!j) continue;
  const d = j['minecraft:client_entity'].description;
  const where = `${f} (${d.identifier})`;
  clientIds.add(d.identifier);
  if (!bpEntities.has(d.identifier)) err(`${where}: no behavior entity with this identifier`);

  // One entity may have several geometries (one per form); a texture with the
  // same short name as a geometry must match that geometry's texture size.
  const geos = {};
  for (const [key, id] of Object.entries(d.geometry)) {
    if (geometries.has(id)) geos[key] = geometries.get(id).g;
    else err(`${where}: unknown geometry ${id}`);
  }
  const boneSet = (g) => new Set(g?.bones.map((b) => b.name) ?? []);
  const texSize = (g) => (g ? [g.description.texture_width, g.description.texture_height] : null);
  const allBones = new Set(Object.values(geos).flatMap((g) => [...boneSet(g)]));
  const first = Object.values(geos)[0];

  for (const [key, t] of Object.entries(d.textures)) await checkTexture(t, where, texSize(geos[key] ?? first));

  // Geometry sanity
  for (const [key, g] of Object.entries(geos)) {
    const bones = boneSet(g);
    const [tw, th] = texSize(g);
    for (const b of g.bones) {
      if (b.parent && !bones.has(b.parent)) err(`${where}: ${key} bone ${b.name} has unknown parent ${b.parent}`);
      for (const c of b.cubes ?? []) {
        const [w, h, dd] = c.size;
        const [u, v] = c.uv;
        if (u + 2 * (w + dd) > tw || v + dd + h > th) err(`${where}: ${key} cube in bone ${b.name} has UVs outside the texture`);
      }
    }
  }
  // Animations named animation.<ns>.<form>.<name> must fit that form's geometry.
  const bonesFor = (animId) => {
    const key = Object.keys(geos).find((k) => animId.split('.').slice(2, -1).includes(k));
    return key ? boneSet(geos[key]) : allBones;
  };

  // Animations and controllers
  const shortNames = new Set(Object.keys(d.animations ?? {}));
  for (const [short, full] of Object.entries(d.animations ?? {})) {
    if (full.startsWith('controller.')) {
      const ctrl = controllers.get(full);
      if (!ctrl) { err(`${where}: unknown animation controller ${full}`); continue; }
      if (!ctrl.states?.[ctrl.initial_state ?? 'default']) err(`${where}: controller ${full} has no initial state`);
      for (const [stateName, state] of Object.entries(ctrl.states)) {
        for (const a of state.animations ?? []) {
          const n = typeof a === 'string' ? a : Object.keys(a)[0];
          if (!shortNames.has(n)) err(`${where}: controller ${full} state ${stateName} plays unknown animation "${n}"`);
        }
        for (const t of state.transitions ?? []) {
          const [target, cond] = Object.entries(t)[0];
          if (!ctrl.states[target]) err(`${where}: controller ${full} transitions to unknown state ${target}`);
          balanced(cond, `${where}: ${full}.${stateName}`);
        }
      }
    } else {
      const anim = animations.get(full);
      if (!anim) { err(`${where}: unknown animation ${full}`); continue; }
      const bones = bonesFor(full);
      for (const bone of Object.keys(anim.bones ?? {})) {
        if (!bones.has(bone)) err(`${where}: animation ${full} moves bone "${bone}" that the model does not have`);
      }
    }
  }
  for (const a of d.scripts?.animate ?? []) {
    const n = typeof a === 'string' ? a : Object.keys(a)[0];
    if (!shortNames.has(n)) err(`${where}: scripts.animate uses unknown animation "${n}"`);
    if (typeof a !== 'string') balanced(Object.values(a)[0], where);
  }

  for (const rcName of d.render_controllers ?? []) {
    const name = typeof rcName === 'string' ? rcName : Object.keys(rcName)[0];
    const rc = renderControllers.get(name);
    if (!rc) { err(`${where}: unknown render controller ${name}`); continue; }
    for (const entry of rc.part_visibility ?? []) {
      const [bone, cond] = Object.entries(entry)[0];
      if (bone !== '*' && !allBones.has(bone)) err(`${where}: render controller ${name} toggles unknown bone "${bone}"`);
      balanced(cond, `${where}: ${name}`);
    }
    for (const expr of [rc.geometry, ...(rc.textures ?? [])]) {
      balanced(expr, `${where}: ${name}`);
      for (const [, kind, key] of String(expr).matchAll(/(Geometry|Texture)\.(\w+)/g)) {
        if (!(kind === 'Geometry' ? d.geometry : d.textures)[key]) err(`${where}: render controller ${name} references undefined ${kind.toLowerCase()} "${key}"`);
      }
    }
    for (const t of Object.values(rc.arrays?.textures ?? {}).flat()) {
      const key = t.replace('Texture.', '');
      if (!d.textures[key]) err(`${where}: render controller ${name} references undefined texture "${key}"`);
    }
  }

  const props = bpEntities.get(d.identifier)?.json['minecraft:entity'].description.properties ?? {};
  for (const [, prop] of JSON.stringify([...controllers.values(), ...renderControllers.values(), d]).matchAll(/query\.property\('([^']+)'\)/g)) {
    if (!props[prop]?.client_sync) err(`${where}: client uses property ${prop}, which the entity does not declare with client_sync`);
  }

  if (!lang.has(`entity.${d.identifier}.name`)) err(`${where}: missing lang key entity.${d.identifier}.name`);
  if (!lang.has(`item.spawn_egg.entity.${d.identifier}.name`)) err(`${where}: missing spawn egg name`);
}

for (const id of bpEntities.keys()) {
  if (!clientIds.has(id)) err(`${id}: behavior entity has no client entity`);
}

// Loot tables and the items they drop
for (const [id, { json: j }] of bpEntities) {
  const tables = new Set();
  JSON.stringify(j, (k, v) => { if (k === 'table') tables.add(v); return v; });
  for (const t of tables) {
    const lt = (await exists(join(BP, t))) ? await json(join(BP, t)) : null;
    if (!lt) { err(`${id}: missing loot table ${t}`); continue; }
    for (const pool of lt.pools ?? []) {
      for (const e of pool.entries ?? []) {
        if (e.type === 'item' && !e.name.startsWith('minecraft:') && !customItems.has(e.name)) {
          err(`${t}: drops unknown item ${e.name}`);
        }
      }
    }
  }
}

// Items: icon textures and names
const itemAtlas = (await json(join(RP, 'textures', 'item_texture.json')))?.texture_data ?? {};
for (const [id, j] of customItems) {
  const icon = j['minecraft:item'].components['minecraft:icon'];
  const key = typeof icon === 'string' ? icon : icon?.textures?.default;
  if (!itemAtlas[key]) err(`${id}: icon "${key}" is not in item_texture.json`);
  else await checkTexture(itemAtlas[key].textures, id);
  if (!lang.has(`item.${id}.name`)) err(`${id}: missing lang key item.${id}.name`);
}

// Every werewolf: item referenced in an item field must exist.
const ITEM_KEYS = new Set(['item', 'spawn_item', 'input', 'output', 'items', 'breed_items', 'name']);
function itemRefs(node, key, out) {
  if (typeof node === 'string') {
    if (ITEM_KEYS.has(key) && node.startsWith('werewolf:')) out.push(node);
  } else if (Array.isArray(node)) {
    for (const v of node) itemRefs(v, key, out);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) itemRefs(v, k, out);
  }
}
for (const f of await files(BP, '.json')) {
  const refs = [];
  itemRefs(await json(f), '', refs);
  for (const id of refs) if (!customItems.has(id)) err(`${f}: references unknown item ${id}`);
}

// Sounds must exist in vanilla sound definitions.
const vanillaSounds = new Set(JSON.parse(await readFile('tools/data/vanilla_sounds.json', 'utf8')));
const sounds = await json(join(RP, 'sounds.json'));
for (const [entity, def] of Object.entries(sounds?.entity_sounds?.entities ?? {})) {
  for (const [event, value] of Object.entries(def.events ?? {})) {
    const name = typeof value === 'string' ? value : value.sound;
    if (!vanillaSounds.has(name)) err(`${entity}: sound event ${event} uses unknown sound "${name}"`);
  }
}

// Languages: every locale has exactly the keys English has, all non-empty.
const readLang = async (file) => new Map(
  (await readFile(file, 'utf8')).split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const locales = await json(join(RP, 'texts', 'languages.json')) ?? [];
const english = await readLang(join(RP, 'texts', 'en_US.lang'));
for (const locale of locales) {
  for (const pack of [BP, RP]) {
    const file = join(pack, 'texts', `${locale}.lang`);
    if (!(await exists(file))) { err(`${file}: missing`); continue; }
    const l = await readLang(file);
    for (const k of english.keys()) if (!l.get(k)) err(`${file}: missing or empty "${k}"`);
    for (const k of l.keys()) if (!english.has(k)) err(`${file}: "${k}" is not in en_US.lang`);
  }
}

// Entity events: every event the entity fires exists, and every component group it adds or removes exists.
for (const [id, { json: j }] of bpEntities) {
  const e = j['minecraft:entity'];
  const groups = new Set(Object.keys(e.component_groups ?? {}));
  const events = new Set(Object.keys(e.events ?? {}));
  JSON.stringify(e, (k, v) => {
    if ((k === 'event' || k === 'trigger') && typeof v === 'string' && !events.has(v)) err(`${id}: fires unknown event ${v}`);
    if (k === 'component_groups' && Array.isArray(v)) for (const g of v) if (!groups.has(g)) err(`${id}: unknown component group ${g}`);
    return v;
  });
}

// Manifests
for (const pack of [BP, RP]) {
  const m = await json(join(pack, 'manifest.json'));
  if (m && (!m.header?.uuid || !Array.isArray(m.header.version))) err(`${pack}/manifest.json: bad header`);
}

if (errors.length) {
  console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK: ${bpEntities.size} entities, ${geometries.size} models, ${animations.size} animations, ${customItems.size} items`);
