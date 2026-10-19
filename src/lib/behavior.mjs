// Werewolf spec -> Bedrock behavior-pack files (entity, spawn rules, loot table).
//
// The two forms are component groups swapped by day/night events. The bool
// property werewolf:beast tells the client which model to draw;
// werewolf:howling is true for the few seconds after a transformation.
import { NS } from './constants.mjs';

/** Prefix vanilla items with minecraft: and our own with the namespace. */
export const itemId = (name) => (name.includes(':') ? name : `minecraft:${name}`);

const BEAST = `${NS}:beast`;
const HOWLING = `${NS}:howling`;
const fam = (value) => ({ test: 'is_family', subject: 'other', value });

function formGroup(w, form) {
  const f = w.forms[form];
  return {
    'minecraft:collision_box': { width: f.size[0], height: f.size[1] },
    'minecraft:movement': { value: f.speed },
    'minecraft:attack': { damage: f.attack },
    'minecraft:knockback_resistance': { value: f.knockbackResistance ?? 0 },
    'minecraft:follow_range': { value: f.followRange ?? 16, max: f.followRange ?? 16 },
  };
}

function wolfForm(w) {
  return {
    ...formGroup(w, 'wolf'),
    'minecraft:type_family': { family: [w.id, NS, 'mob'] },
    // Like a wild wolf: hunts sheep and rabbits, leaves players alone unless hurt.
    'minecraft:behavior.nearest_attackable_target': {
      priority: 5,
      must_see: true,
      reselect_targets: true,
      within_radius: 16,
      entity_types: [{ filters: { any_of: [fam('sheep'), fam('rabbit')] }, max_dist: 12 }],
    },
  };
}

function beastForm(w) {
  return {
    ...formGroup(w, 'beast'),
    // "monster" makes iron golems fight it.
    'minecraft:type_family': { family: [w.id, NS, 'monster', 'mob'] },
    'minecraft:behavior.nearest_attackable_target': {
      priority: 2,
      must_see: false,
      reselect_targets: true,
      within_radius: w.forms.beast.followRange,
      entity_types: [
        { filters: { all_of: [fam('player'), { test: 'is_difficulty', operator: '!=', value: 'peaceful' }] }, max_dist: 32 },
        { filters: { any_of: [fam('villager'), fam('wandering_trader')] }, max_dist: 24 },
      ],
    },
    // Silver cuts deep; everything else barely scratches it. The first matching trigger wins.
    'minecraft:damage_sensor': {
      triggers: [
        {
          on_damage: { filters: { test: 'has_equipment', subject: 'other', domain: 'hand', value: `${NS}:silver_sword` } },
          cause: 'entity_attack',
          damage_multiplier: w.silverMultiplier,
        },
        { cause: 'fall', deals_damage: 'no' },
        { cause: 'all', damage_multiplier: w.beastArmor },
      ],
    },
  };
}

export function buildEntity(w) {
  const toBeast = {
    remove: { component_groups: [`${NS}:wolf_form`] },
    add: { component_groups: [`${NS}:beast_form`, `${NS}:howling`] },
    set_property: { [BEAST]: true, [HOWLING]: true },
  };
  const toWolf = {
    remove: { component_groups: [`${NS}:beast_form`, `${NS}:howling`] },
    add: { component_groups: [`${NS}:wolf_form`] },
    set_property: { [BEAST]: false, [HOWLING]: false },
  };
  const isBeast = (value) => ({ test: 'bool_property', domain: BEAST, value });
  const isDay = (value) => ({ test: 'is_daytime', value });

  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: {
        identifier: `${NS}:${w.id}`,
        spawn_category: 'creature',
        is_spawnable: true,
        is_summonable: true,
        properties: {
          [BEAST]: { type: 'bool', default: false, client_sync: true },
          [HOWLING]: { type: 'bool', default: false, client_sync: true },
        },
      },
      component_groups: {
        [`${NS}:wolf_form`]: wolfForm(w),
        [`${NS}:beast_form`]: beastForm(w),
        // Stands still and howls for a moment after changing.
        [`${NS}:howling`]: {
          'minecraft:timer': { time: 3, looping: false, time_down_event: { event: `${NS}:stop_howling` } },
          'minecraft:behavior.random_look_around': { priority: 0 },
        },
      },
      components: {
        'minecraft:is_hidden_when_invisible': {},
        'minecraft:health': { value: w.health, max: w.health },
        'minecraft:experience_reward': { on_death: `query.last_hit_by_player ? ${w.xp} : 0` },
        'minecraft:loot': { table: `loot_tables/entities/${NS}_${w.id}.json` },
        'minecraft:nameable': {},
        'minecraft:physics': {},
        'minecraft:jump.static': {},
        'minecraft:movement.basic': {},
        'minecraft:navigation.walk': { can_path_over_water: true, avoid_water: true, avoid_damage_blocks: true, can_open_doors: false },
        'minecraft:breathable': { total_supply: 15, suffocate_time: 0 },
        'minecraft:pushable': { is_pushable: true, is_pushable_by_piston: true },
        'minecraft:leashable': {},
        'minecraft:despawn': { despawn_from_distance: {} },
        'minecraft:conditional_bandwidth_optimization': {},
        'minecraft:hurt_on_condition': {
          damage_conditions: [{ filters: { test: 'in_lava', subject: 'self' }, cause: 'lava', damage_per_tick: 4 }],
        },
        'minecraft:ambient_sound_interval': { event_name: 'ambient', range: 16, value: w.sounds.interval },
        'minecraft:behavior.float': { priority: 0 },
        'minecraft:behavior.melee_box_attack': { priority: 3, speed_multiplier: 1.3, track_target: true },
        'minecraft:behavior.hurt_by_target': { priority: 1, alert_same_type: true },
        'minecraft:behavior.random_stroll': { priority: 8, speed_multiplier: 0.9 },
        'minecraft:behavior.look_at_player': { priority: 9, look_distance: 8, probability: 0.02 },
        'minecraft:behavior.random_look_around': { priority: 10 },
        // Change at dusk and dawn.
        'minecraft:environment_sensor': {
          triggers: [
            { filters: { all_of: [isDay(false), isBeast(false)] }, event: `${NS}:become_beast` },
            { filters: { all_of: [isDay(true), isBeast(true)] }, event: `${NS}:become_wolf` },
          ],
        },
      },
      events: {
        'minecraft:entity_spawned': {
          sequence: [
            { filters: isDay(true), ...toWolf },
            // Spawned at night: already a beast, no howl.
            { filters: isDay(false), add: { component_groups: [`${NS}:beast_form`] }, set_property: { [BEAST]: true } },
          ],
        },
        [`${NS}:become_beast`]: toBeast,
        [`${NS}:become_wolf`]: toWolf,
        [`${NS}:stop_howling`]: { remove: { component_groups: [`${NS}:howling`] }, set_property: { [HOWLING]: false } },
      },
    },
  };
}

export function buildSpawnRules(w) {
  const biomes = w.spawn.biomes.map((b) => ({ test: 'has_biome_tag', operator: '==', value: b }));
  return {
    format_version: '1.8.0',
    'minecraft:spawn_rules': {
      description: { identifier: `${NS}:${w.id}`, population_control: 'animal' },
      conditions: [{
        'minecraft:spawns_on_surface': {},
        'minecraft:spawns_on_block_filter': ['minecraft:grass_block', 'minecraft:podzol', 'minecraft:coarse_dirt', 'minecraft:snow'],
        'minecraft:brightness_filter': { min: 0, max: 15, adjust_for_weather: false },
        'minecraft:weight': { default: w.spawn.weight },
        'minecraft:herd': { min_size: w.spawn.group[0], max_size: w.spawn.group[1] },
        'minecraft:density_limit': { surface: 3 },
        'minecraft:biome_filter': biomes.length === 1 ? biomes[0] : { any_of: biomes },
      }],
    },
  };
}

export function buildLoot(w) {
  return {
    pools: w.loot.map((l) => ({
      rolls: 1,
      entries: [{
        type: 'item', name: itemId(l.item), weight: 1,
        functions: [{ function: 'set_count', count: { min: l.min, max: l.max } }, { function: 'looting_enchant', count: { min: 0, max: 1 } }],
      }],
    })),
  };
}
