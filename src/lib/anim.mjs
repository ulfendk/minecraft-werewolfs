// Keyframed animation templates. Everything is plain keyframes (no Molang), so
// GeckoLib on the Java edition reads the same files.
//
// Rotation convention (Bedrock): +x pitches a bone's front (-z) downwards and
// swings a hanging leg backwards; +z rolls towards the animal's right.

const r = (n) => Math.round(n * 100) / 100;
const TAU = Math.PI * 2;

/** Sample f(phase in [0,1)) into n keyframes over `length` seconds (looping). */
function cycle(length, n, f) {
  const out = {};
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * length;
    out[r(t).toFixed(2)] = f((k % n) / n).map(r);
  }
  return out;
}

const sin = (phase, offset = 0) => Math.sin((phase + offset) * TAU);

/** Merge bone channels (later wins per channel). */
function bones(...parts) {
  const out = {};
  for (const p of parts) {
    for (const [bone, channels] of Object.entries(p)) {
      if (!bone || bone === 'undefined') continue;
      out[bone] = { ...(out[bone] ?? {}), ...channels };
    }
  }
  return out;
}

const loop = (length, b) => ({ loop: true, animation_length: length, bones: b });
const once = (length, b) => ({ animation_length: length, bones: b });
const hold = (b) => ({ loop: true, bones: b });

// ---------------------------------------------------------------- body plans

/**
 * Four-legged walkers (the wolf form).
 * opts: legs {fl,fr,bl,br}, head, neck, tail[], ears[], body, swing, walkLength, runLength,
 *       pace, sleepDrop (how far the body sinks when lying down), legFold.
 * Legs must be children of `root` (not `body`) so the body can sink without them.
 */
export function quadruped(o) {
  const L = { fl: 'leg_fl', fr: 'leg_fr', bl: 'leg_bl', br: 'leg_br', ...(o.legs ?? {}) };
  const head = o.head ?? 'head';
  const neck = o.neck;
  const body = o.body ?? 'body';
  const tails = o.tail ?? [];
  const ears = o.ears ?? [];
  const swing = o.swing ?? 30;
  const n = 8;

  const legs = (len, amp, pace) => {
    // Walk: diagonal pairs; pace (camel/giraffe): same-side pairs.
    const off = { fl: 0, br: pace ? 0.5 : 0, fr: 0.5, bl: pace ? 0 : 0.5 };
    return Object.fromEntries(
      Object.entries(L).map(([k, bone]) => [bone, { rotation: cycle(len, n, (p) => [amp * sin(p, off[k]), 0, 0]) }]),
    );
  };
  const tailSway = (len, amp) =>
    Object.fromEntries(tails.map((t, i) => [t, { rotation: cycle(len, n, (p) => [0, amp * sin(p, -i * 0.15), 0]) }]));

  const walkLen = o.walkLength ?? 1.0;
  const runLen = o.runLength ?? 0.5;
  const drop = o.sleepDrop ?? 6;
  const fold = o.legFold ?? 80;

  return {
    walk: loop(walkLen, bones(
      legs(walkLen, swing, o.pace),
      { [neck ?? head]: { rotation: cycle(walkLen, n, (p) => [2 * sin(p * 2), 0, 0]) } },
      tailSway(walkLen, 8),
    )),
    run: loop(runLen, bones(
      legs(runLen, swing * 1.5, false),
      { [body]: { rotation: cycle(runLen, n, (p) => [3 * sin(p * 2), 0, 0]), position: cycle(runLen, n, (p) => [0, 0.6 * Math.abs(sin(p)), 0]) } },
      { [neck ?? head]: { rotation: cycle(runLen, n, (p) => [4 * sin(p * 2, 0.25), 0, 0]) } },
      Object.fromEntries(tails.map((t) => [t, { rotation: cycle(runLen, n, (p) => [-25 + 5 * sin(p * 2), 0, 0]) }])),
    )),
    idle: loop(4, bones(
      tailSway(4, 12),
      Object.fromEntries(ears.map((e, i) => [e, { rotation: cycle(4, n, (p) => [0, 0, (i % 2 ? -1 : 1) * 6 * Math.max(0, sin(p * 2, 0.1))]) }])),
      { [head]: { rotation: cycle(4, n, (p) => [1.5 * sin(p), 3 * sin(p, 0.3), 0]) } },
    )),
    eat: loop(2, bones({
      [neck ?? head]: { rotation: cycle(2, n, (p) => [(neck ? 55 : 40) + 5 * sin(p * 4), 0, 0]) },
      ...(neck ? { [head]: { rotation: cycle(2, n, (p) => [10 + 4 * sin(p * 4), 0, 0]) } } : {}),
    })),
    attack: once(0.5, bones({
      [neck ?? head]: { rotation: { '0.0': [0, 0, 0], '0.15': [-20, 0, 0], '0.3': [25, 0, 0], '0.5': [0, 0, 0] } },
      [body]: { position: { '0.0': [0, 0, 0], '0.15': [0, 0, 1], '0.3': [0, 0, -2], '0.5': [0, 0, 0] } },
    })),
    sleep: hold(bones(
      { [body]: { position: [0, -drop, 0] } },
      { [L.fl]: { rotation: [-fold, 0, 0], position: [0, -drop, 0] }, [L.fr]: { rotation: [-fold, 0, 0], position: [0, -drop, 0] } },
      { [L.bl]: { rotation: [fold, 0, 0], position: [0, -drop, 0] }, [L.br]: { rotation: [fold, 0, 0], position: [0, -drop, 0] } },
      { [neck ?? head]: { rotation: [neck ? 35 : 15, 25, 0] } },
      Object.fromEntries(tails.slice(0, 1).map((t) => [t, { rotation: [20, 50, 0] }])),
    )),
    sit: hold(bones(
      { [body]: { rotation: [-25, 0, 0], position: [0, -drop / 2, 0] } },
      { [L.bl]: { rotation: [-60, 0, 0], position: [0, -drop / 2, 2] }, [L.br]: { rotation: [-60, 0, 0], position: [0, -drop / 2, 2] } },
      { [L.fl]: { rotation: [25, 0, 0] }, [L.fr]: { rotation: [25, 0, 0] } },
      { [neck ?? head]: { rotation: [20, 0, 0] } },
    )),
    // A short sprint lunge used by charging and pouncing animals.
    pounce: once(0.6, bones({
      [body]: { rotation: { '0.0': [0, 0, 0], '0.2': [-15, 0, 0], '0.45': [10, 0, 0], '0.6': [0, 0, 0] } },
      [L.fl]: { rotation: { '0.0': [0, 0, 0], '0.2': [-60, 0, 0], '0.6': [0, 0, 0] } },
      [L.fr]: { rotation: { '0.0': [0, 0, 0], '0.2': [-60, 0, 0], '0.6': [0, 0, 0] } },
    })),
  };
}

/**
 * Upright, hunched two-legged walkers (the werewolf form): digitigrade legs
 * (leg -> shin -> foot), long arms (arm -> forearm), a leaning chest, head, jaw and tail.
 * Arms swing opposite to the leg on the same side. Angles add to the model's rest pose.
 */
export function biped(o = {}) {
  const B = {
    body: 'body', chest: 'chest', head: 'head', jaw: 'jaw',
    legL: 'leg_l', legR: 'leg_r', shinL: 'shin_l', shinR: 'shin_r', footL: 'foot_l', footR: 'foot_r',
    armL: 'arm_l', armR: 'arm_r', foreL: 'forearm_l', foreR: 'forearm_r',
    tail: 'tail', tail2: 'tail2', earL: 'ear_l', earR: 'ear_r',
    ...(o.bones ?? {}),
  };
  const n = 8;
  const swing = o.swing ?? 28;

  const stride = (len, amp, lean = 0) => bones(
    { [B.legL]: { rotation: cycle(len, n, (p) => [amp * sin(p), 0, 0]) } },
    { [B.legR]: { rotation: cycle(len, n, (p) => [amp * sin(p, 0.5), 0, 0]) } },
    // The knee bends while the leg comes forward, and the foot stays flat-ish.
    { [B.shinL]: { rotation: cycle(len, n, (p) => [amp * 0.9 * Math.max(0, sin(p, 0.25)), 0, 0]) } },
    { [B.shinR]: { rotation: cycle(len, n, (p) => [amp * 0.9 * Math.max(0, sin(p, 0.75)), 0, 0]) } },
    { [B.footL]: { rotation: cycle(len, n, (p) => [-amp * 0.5 * sin(p), 0, 0]) } },
    { [B.footR]: { rotation: cycle(len, n, (p) => [-amp * 0.5 * sin(p, 0.5), 0, 0]) } },
    { [B.armL]: { rotation: cycle(len, n, (p) => [-amp * 0.8 * sin(p), 0, 0]) } },
    { [B.armR]: { rotation: cycle(len, n, (p) => [-amp * 0.8 * sin(p, 0.5), 0, 0]) } },
    { [B.foreL]: { rotation: cycle(len, n, (p) => [-10 - 10 * Math.max(0, -sin(p)), 0, 0]) } },
    { [B.foreR]: { rotation: cycle(len, n, (p) => [-10 - 10 * Math.max(0, -sin(p, 0.5)), 0, 0]) } },
    { [B.body]: { position: cycle(len, n, (p) => [0, -0.8 * Math.abs(sin(p)), 0]), rotation: cycle(len, n, (p) => [0, 4 * sin(p), 0]) } },
    { [B.chest]: { rotation: cycle(len, n, (p) => [lean + 2 * sin(p * 2), -3 * sin(p), 0]) } },
    { [B.tail]: { rotation: cycle(len, n, (p) => [0, 10 * sin(p), 0]) } },
  );

  const walkLen = o.walkLength ?? 1.1;
  const runLen = o.runLength ?? 0.6;
  return {
    walk: loop(walkLen, stride(walkLen, swing)),
    run: loop(runLen, stride(runLen, swing * 1.5, 12)),
    idle: loop(3, bones(
      // Heavy breathing and a slow sway of the arms and tail.
      { [B.chest]: { rotation: cycle(3, n, (p) => [2 * sin(p), 0, 0]), scale: cycle(3, n, (p) => [1 + 0.02 * sin(p), 1, 1 + 0.03 * sin(p)]) } },
      { [B.armL]: { rotation: cycle(3, n, (p) => [3 * sin(p, 0.2), 0, -2 - 2 * sin(p)]) } },
      { [B.armR]: { rotation: cycle(3, n, (p) => [3 * sin(p, 0.7), 0, 2 + 2 * sin(p)]) } },
      { [B.tail]: { rotation: cycle(3, n, (p) => [0, 12 * sin(p), 0]) } },
      { [B.tail2]: { rotation: cycle(3, n, (p) => [0, 10 * sin(p, -0.2), 0]) } },
      { [B.earL]: { rotation: cycle(3, n, (p) => [0, 0, 6 * Math.max(0, sin(p * 2, 0.1))]) } },
      { [B.jaw]: { rotation: cycle(3, n, (p) => [4 + 4 * Math.max(0, sin(p)), 0, 0]) } },
    )),
    // Raise both clawed arms, then rake them down.
    attack: once(0.6, bones({
      [B.armL]: { rotation: { '0.0': [0, 0, 0], '0.2': [-120, 0, -15], '0.35': [10, 0, 0], '0.6': [0, 0, 0] } },
      [B.armR]: { rotation: { '0.0': [0, 0, 0], '0.25': [-120, 0, 15], '0.4': [10, 0, 0], '0.6': [0, 0, 0] } },
      [B.chest]: { rotation: { '0.0': [0, 0, 0], '0.2': [-10, 0, 0], '0.38': [15, 0, 0], '0.6': [0, 0, 0] } },
      [B.jaw]: { rotation: { '0.0': [0, 0, 0], '0.2': [30, 0, 0], '0.45': [30, 0, 0], '0.6': [0, 0, 0] } },
    })),
    // Straighten up, throw the head back and howl at the moon.
    howl: once(3.0, bones({
      [B.chest]: { rotation: { '0.0': [0, 0, 0], '0.5': [-25, 0, 0], '2.5': [-25, 0, 0], '3.0': [0, 0, 0] } },
      [B.head]: { rotation: { '0.0': [0, 0, 0], '0.5': [-45, 0, 0], '2.5': [-50, 0, 0], '3.0': [0, 0, 0] } },
      [B.jaw]: { rotation: { '0.0': [0, 0, 0], '0.5': [35, 0, 0], '2.5': [35, 0, 0], '3.0': [0, 0, 0] } },
      [B.armL]: { rotation: { '0.0': [0, 0, 0], '0.5': [10, 0, -25], '2.5': [10, 0, -25], '3.0': [0, 0, 0] } },
      [B.armR]: { rotation: { '0.0': [0, 0, 0], '0.5': [10, 0, 25], '2.5': [10, 0, 25], '3.0': [0, 0, 0] } },
    })),
  };
}
/** Wrap one form's animations into a Bedrock animation file. */
export function animationFile(form, anims) {
  const out = {};
  for (const [name, a] of Object.entries(anims)) out[`animation.werewolf.${form}.${name}`] = a;
  return { format_version: '1.8.0', animations: out };
}
