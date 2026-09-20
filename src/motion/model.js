export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
export const mix = (start, end, progress) => start + (end - start) * clamp(progress);
export const range = (start, end, value) => clamp((value - start) / Math.max(.000001, end - start));
export const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function selectQuality({ width = 1440, dpr = 1, reducedMotion = false, saveData = false, effectiveType = '4g', memory, cores } = {}) {
  if (reducedMotion) return { mode: 'reduced', webgl: false, dpr: 1, segments: 0, particles: 0 };
  if (saveData || ['2g', 'slow-2g'].includes(effectiveType) || memory < 4 || cores < 4) return { mode: 'lite', webgl: false, dpr: 1, segments: 0, particles: 0 };
  const mobile = width < 768;
  const cautiousMobile = mobile && (!Number.isFinite(memory) || !Number.isFinite(cores) || memory <= 4 || cores <= 4);
  return { mode: mobile ? 'mobile' : 'full', webgl: true, dpr: Math.min(dpr, mobile ? cautiousMobile ? 1 : 1.25 : 1.5), segments: mobile ? cautiousMobile ? 6 : 8 : 16, particles: mobile ? cautiousMobile ? 24 : 48 : 120 };
}

export function sampleRenderBudget(previous, { sample, mainMs = 0, cpuMs = 0, gpuMs = 0 }) {
  if (sample <= previous.lastSample) return previous;
  const cost = Math.max(mainMs, cpuMs, gpuMs);
  const heavyFrames = cost > 28 ? previous.heavyFrames + 1 : Math.max(0, previous.heavyFrames - 1);
  const reduce = heavyFrames >= 4 && previous.dpr > .8;
  return {
    dpr: reduce ? Math.max(.8, previous.dpr * .8) : previous.dpr,
    heavyFrames: reduce ? 0 : heavyFrames,
    lastSample: sample,
  };
}

function point(rect, x = .5, y = .5, size = 1) {
  return { x: rect.left + rect.width * x, y: rect.top + rect.height * y, size: Math.min(rect.width, rect.height) * size, opacity: 1 };
}
export function storyAnchor(rect, width) {
  const mobile = width < 768;
  const port = point(rect, mobile ? .18 : .9, .7, mobile ? .72 : .78);
  port.size = Math.min(port.size, width - 16);
  port.x = clamp(port.x, port.size / 2 + 8, width - port.size / 2 - 8);
  return port;
}
function blendPoint(a, b, progress) {
  const t = ease(progress);
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), size: mix(a.size, b.size, t), opacity: mix(a.opacity, b.opacity, t) };
}

/** One deterministic timeline, sampled from actual document geometry, not wheel deltas. */
export function sampleMotion(layout, scrollY, viewport, reduced = false) {
  const { height: vh, width: vw } = viewport;
  const mobile = vw < 768;
  const frame = { scrollY, viewport, scene: 'hero', progress: 0, opening: 0, assembly: 1, focus: 0, branch: 0, energy: 0, heroExit: 0, storyProgress: 0, servicesProgress: 0, recompose: 0, journeyProgress: range(0, layout.end - vh, scrollY), reduced, camera: { azimuth: -.32, elevation: .12, distance: 10.8 } };
  if (!layout.hero || !layout.pin) {
    const rect = layout.detail ?? layout.contact;
    if (!rect) return { ...frame, world: { x: 0, y: -1000, size: 1, opacity: 0 } };
    frame.scene = 'service-detail';
    frame.progress = range(rect.top - vh * .6, rect.top + rect.height, scrollY);
    frame.opening = reduced ? 0 : Math.sin(frame.progress * Math.PI) * .82;
    frame.energy = reduced ? 0 : frame.progress;
    frame.camera.azimuth = reduced ? -.32 : mix(-.32, 1, frame.progress);
    frame.camera.distance = 11.8 + frame.opening * 3;
    frame.world = { ...point(rect, .5, .5, 1.1), y: rect.top + rect.height * .5 - scrollY };
    return frame;
  }
  const { hero, pin, story, services, contact } = layout;
  const heroPoint = point(hero, .5, .5, 1);
  heroPoint.y -= scrollY;
  const pinnedTop = pin.enabled === false ? pin.top - scrollY : Math.min(Math.max(pin.top - scrollY, pin.inset), pin.bottom - scrollY - pin.height);
  const pinPoint = { x: pin.x, y: pinnedTop + pin.centerY, size: pin.size, opacity: 1 };
  const pinStart = pin.top - pin.inset;
  const pinEnd = Math.max(pinStart + 1, pin.bottom - pin.height - pin.inset);
  const enterStart = Math.max(0, layout.heroBottom - vh * .78);
  frame.heroExit = range(0, Math.max(1, layout.heroBottom - vh * .18), scrollY);
  const enter = range(enterStart, pinStart, scrollY);
  frame.world = blendPoint(heroPoint, pinPoint, enter);
  if (scrollY < pinStart) {
    frame.scene = enter > .02 ? 'unfold' : 'hero';
    frame.progress = enter;
    frame.opening = ease(enter) * .65;
    frame.energy = enter;
    frame.camera = { azimuth: mix(-.32, -.85, enter), elevation: mix(.12, .28, enter), distance: mix(10.8, 14, enter) };
  } else if (scrollY <= pinEnd) {
    const progress = range(pinStart, pinEnd, scrollY);
    frame.scene = 'approach';
    frame.progress = progress;
    frame.focus = progress * 3;
    frame.opening = .65 + Math.sin(progress * Math.PI) * .35;
    frame.energy = progress;
    frame.world = pinPoint;
    frame.camera = { azimuth: mix(-.85, .6, progress), elevation: .28 + Math.sin(progress * Math.PI) * .12, distance: 14 - Math.sin(progress * Math.PI) * .8 };
  } else {
    const storyAt = Math.max(pinEnd + 1, story.top - vh * .12);
    const servicesAt = Math.max(storyAt + 1, services.top - vh * .28);
    const contactAt = Math.max(servicesAt + 1, contact.top - vh * .52);
    const storyPoint = storyAnchor(story, vw);
    storyPoint.y -= scrollY;
    const servicePoint = point(services, .5, .5, mobile ? .86 : 1.45);
    servicePoint.y -= scrollY;
    const finalPoint = point(contact, .5, .5, 1.05);
    finalPoint.y -= scrollY;
    frame.storyProgress = range(pinEnd, servicesAt, scrollY);
    frame.servicesProgress = range(servicesAt - vh * .4, contactAt, scrollY);
    if (scrollY < storyAt) {
      frame.scene = 'story'; frame.progress = range(pinEnd, storyAt, scrollY);
      frame.world = blendPoint(pinPoint, storyPoint, frame.progress);
      frame.focus = 3;
      frame.opening = mix(.65, .9, frame.progress);
      frame.camera = { azimuth: mix(.6, -.8, frame.progress), elevation: mix(.28, .15, frame.progress), distance: mix(14, 14.5, frame.progress) };
    } else if (scrollY < servicesAt) {
      frame.scene = 'story'; frame.progress = range(storyAt, servicesAt, scrollY);
      frame.world = blendPoint(storyPoint, servicePoint, frame.progress);
      frame.focus = mix(3, 0, frame.progress);
      frame.opening = mix(.9, .35, frame.progress);
      frame.branch = frame.progress;
      frame.camera = { azimuth: mix(-.8, .2, frame.progress), elevation: .15, distance: 14.5 };
    } else if (scrollY < contactAt) {
      frame.scene = 'services'; frame.progress = range(servicesAt, contactAt, scrollY);
      frame.world = blendPoint(servicePoint, finalPoint, range(.6, 1, frame.progress));
      frame.opening = .35;
      frame.branch = 1 - range(.55, 1, frame.progress);
      frame.energy = frame.progress;
      frame.camera = { azimuth: mix(.2, -.38, frame.progress), elevation: mix(.15, .08, frame.progress), distance: mix(14.5, 14, frame.progress) };
    } else {
      frame.scene = 'recompose'; frame.progress = range(contactAt, contact.top - vh * .05, scrollY);
      frame.recompose = frame.progress;
      frame.world = finalPoint;
      frame.opening = .35 * (1 - ease(frame.progress));
      frame.camera = { azimuth: mix(-.38, -.18, frame.progress), elevation: .08, distance: mix(14, 10.8, frame.progress) };
    }
    frame.energy = frame.progress;
  }
  if (reduced) {
    frame.opening = 0; frame.assembly = 1; frame.branch = 0; frame.energy = 0;
    frame.camera = { azimuth: -.2, elevation: .1, distance: 10.8 };
  }
  frame.world.size = Math.min(frame.world.size, vw - 16);
  frame.world.x = clamp(frame.world.x, frame.world.size / 2 + 8, vw - frame.world.size / 2 - 8);
  return frame;
}
