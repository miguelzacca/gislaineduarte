import { clamp, ease, mix, range } from '../motion/model.js';

export const INTRO_TIMING = Object.freeze({
  draw: 500, depth: 1250, form: 2400, handoff: 2800, duration: 3600,
  assetHold: 800, holdAt: 2000, skip: 280, skipAvailable: 500,
  guard: 5000, bootstrapTimeout: 7000,
});

const interpolate = (from, to, amount) => Object.fromEntries(
  Object.keys(to).map(key => [key, mix(from[key] ?? to[key], to[key], amount)]),
);

/** The final sample is the actual hero frame, not an approximation of its camera. */
export function sampleIntro(elapsed, hero, stage, { mobile = false, skipFrom, skipProgress = 0 } = {}) {
  const t = clamp(elapsed, 0, INTRO_TIMING.duration);
  const build = ease(range(90, 1540, t));
  const assembly = ease(range(560, INTRO_TIMING.form, t));
  const handoff = ease(range(INTRO_TIMING.handoff, INTRO_TIMING.duration, t));
  const depth = ease(range(INTRO_TIMING.depth, 1840, t));
  const close = ease(range(1760, INTRO_TIMING.form, t));
  const breathe = Math.sin(range(INTRO_TIMING.form, INTRO_TIMING.handoff, t) * Math.PI) * .024;
  const retreat = ease(range(INTRO_TIMING.draw, 1650, t));
  const camera = {
    azimuth: mix(mobile ? -.55 : -1.2, mobile ? .22 : .8, retreat),
    elevation: mix(.36, .16, retreat),
    distance: mix(7.8, mobile ? 14.8 : 14, retreat),
  };
  const result = {
    ...hero, scene: 'intro', progress: t / INTRO_TIMING.duration,
    opening: mix(1, 0, close), focus: mix(2.8, 0, close),
    assembly: mix(.12, 1, ease(range(1125, 2250, t))), branch: 0,
    energy: Math.sin(range(900, INTRO_TIMING.handoff, t) * Math.PI) * .85,
    pointer: { x: .5, y: .5 },
    camera: interpolate(camera, hero.camera, close),
    world: interpolate({ ...stage, size: stage.size * (1 + breathe), opacity: depth }, hero.world, handoff),
    intro: { build, assembly, handoff, progress: t / INTRO_TIMING.duration,
      phase: t < INTRO_TIMING.draw ? 'fragments' : t < INTRO_TIMING.depth ? 'drawing' : t < INTRO_TIMING.form ? 'depth' : t < INTRO_TIMING.handoff ? 'assembled' : 'handoff' },
  };
  if (mobile) {
    // Move to the portrait's outside edge before revealing its face.
    result.world.x = mix(stage.x, hero.world.x, ease(range(INTRO_TIMING.handoff, 3300, t)));
    result.world.size = mix(stage.size * (1 + breathe), hero.world.size, ease(range(INTRO_TIMING.handoff, 3450, t)));
  }
  if (skipFrom) {
    const amount = ease(skipProgress);
    for (const key of ['opening', 'focus', 'assembly', 'branch', 'energy']) result[key] = mix(skipFrom[key], hero[key], amount);
    result.world = interpolate(skipFrom.world, hero.world, amount);
    result.camera = interpolate(skipFrom.camera, hero.camera, amount);
    result.intro = { build: 1, assembly: mix(skipFrom.intro.assembly, 1, amount), handoff: mix(skipFrom.intro.handoff, 1, amount), progress: 1, phase: 'handoff' };
  }
  if (t === INTRO_TIMING.duration && !skipFrom || skipFrom && skipProgress >= 1) {
    return { ...hero, pointer: { x: .5, y: .5 }, intro: { build: 1, assembly: 1, handoff: 1, progress: 1, phase: 'handoff' } };
  }
  return result;
}

/** Absorb slow real assets at the assembly, bounded by 0.8 extra seconds. */
export function introClock(elapsed, ready, previousHold = 0) {
  const hold = ready ? previousHold : Math.max(previousHold, clamp(elapsed - INTRO_TIMING.holdAt, 0, INTRO_TIMING.assetHold));
  return { elapsed: Math.max(0, elapsed - hold), hold };
}
