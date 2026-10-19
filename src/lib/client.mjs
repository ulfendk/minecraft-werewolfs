// Werewolf spec -> Bedrock resource-pack files (client entity, render controller,
// animation controllers, sound mappings). Each form has its own geometry,
// texture and animation set; the synced werewolf:beast property picks between them.
import { NS } from './constants.mjs';

export const FORMS = ['wolf', 'beast'];
const IS_BEAST = `query.property('${NS}:beast')`;
const IS_HOWLING = `query.property('${NS}:howling')`;

/** Short animation name used in the client entity, e.g. beast_walk. */
const key = (form, name) => `${form}_${name}`;

/** Locomotion state machine for one form. States are listed by priority. */
function moveController(form, names, runSpeed) {
  const has = (n) => names.includes(n);
  const candidates = [
    ...(form === 'beast' ? [{ name: 'howling', anim: 'howl', cond: IS_HOWLING }] : []),
    { name: 'running', anim: 'run', cond: `query.ground_speed > ${runSpeed}` },
    { name: 'walking', anim: 'walk', cond: 'query.ground_speed > 0.4' },
  ].filter((s) => has(s.anim));
  const states = {
    default: {
      animations: has('idle') ? [key(form, 'idle')] : [],
      transitions: candidates.map((s) => ({ [s.name]: s.cond })),
      blend_transition: 0.2,
    },
  };
  candidates.forEach((s, i) => {
    states[s.name] = {
      animations: [key(form, s.anim)],
      transitions: [...candidates.slice(0, i).map((o) => ({ [o.name]: o.cond })), { default: `!(${s.cond})` }],
      blend_transition: 0.2,
    };
  });
  return { initial_state: 'default', states };
}

function attackController(form) {
  return {
    initial_state: 'default',
    states: {
      default: { transitions: [{ attacking: 'variable.attack_time > 0' }] },
      attacking: { animations: [key(form, 'attack')], transitions: [{ default: 'query.all_animations_finished' }] },
    },
  };
}

export function buildAnimationControllers(w) {
  const controllers = {};
  for (const form of FORMS) {
    const names = Object.keys(w.forms[form].anims);
    controllers[`controller.animation.${NS}.${form}.move`] = moveController(form, names, form === 'beast' ? 4 : 5);
    controllers[`controller.animation.${NS}.${form}.attack`] = attackController(form);
  }
  return { format_version: '1.10.0', animation_controllers: controllers };
}

export function buildClientEntity(w) {
  const animations = { look_at_target: `animation.${NS}.common.look_at_target` };
  const animate = [];
  for (const form of FORMS) {
    for (const name of Object.keys(w.forms[form].anims)) animations[key(form, name)] = `animation.${NS}.${form}.${name}`;
    animations[`${form}_move_controller`] = `controller.animation.${NS}.${form}.move`;
    animations[`${form}_attack_controller`] = `controller.animation.${NS}.${form}.attack`;
    const when = form === 'beast' ? IS_BEAST : `!${IS_BEAST}`;
    animate.push({ [`${form}_move_controller`]: when }, { [`${form}_attack_controller`]: when });
  }
  animate.push({ look_at_target: `!${IS_HOWLING}` });

  return {
    format_version: '1.10.0',
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:${w.id}`,
        materials: { default: 'entity_alphatest' },
        textures: Object.fromEntries(FORMS.map((f) => [f, `textures/entity/${NS}/${f}`])),
        geometry: Object.fromEntries(FORMS.map((f) => [f, `geometry.${NS}.${f}`])),
        animations,
        scripts: { animate },
        render_controllers: [`controller.render.${NS}.${w.id}`],
        spawn_egg: { base_color: w.egg[0], overlay_color: w.egg[1] },
        enable_attachables: false,
      },
    },
  };
}

export function buildRenderController(w) {
  return {
    format_version: '1.8.0',
    render_controllers: {
      [`controller.render.${NS}.${w.id}`]: {
        geometry: `${IS_BEAST} ? Geometry.beast : Geometry.wolf`,
        materials: [{ '*': 'Material.default' }],
        textures: [`${IS_BEAST} ? Texture.beast : Texture.wolf`],
      },
    },
  };
}

/** Entity sound events mapped onto vanilla sounds. */
export function buildEntitySounds(w) {
  const s = w.sounds;
  return {
    volume: 1.0,
    pitch: s.pitch,
    events: { ambient: s.ambient, hurt: s.hurt, death: s.death, step: 'mob.wolf.step' },
  };
}
