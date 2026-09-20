import { BRAND_PATHS } from '../lib/brand.js';
import { storyAnchor } from './model.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const mix = (a, b, amount) => a + (b - a) * amount;
const round = (value) => Math.round(value * 100) / 100;
const point = (x, y) => ({ x, y });
const pointText = (value) => `${round(value.x)} ${round(value.y)}`;
const ease = (value) => value * value * (3 - 2 * value);

const PART_POSES = [
  { name: 'shell', center: [626, 610] },
  { name: 'leaf', center: [815, 230] },
  { name: 'pulp', center: [622, 748] },
  { name: 'seed', center: [650, 818] },
];

// Each focus defines a complete arrangement: x, y, rotation, projected depth.
const FOCUS_POSES = [
  [[-18, 0, -3, 35], [114, -108, 14, 75], [116, 48, 10, 120], [-130, 125, -8, 165]],
  [[-60, 75, -8, 25], [66, -182, 18, 230], [-50, 90, -5, 75], [112, 139, 10, 115]],
  [[-147, -26, -13, 15], [108, -98, 17, 60], [86, 18, 6, 235], [-84, 127, -11, 90]],
  [[-115, -42, -12, 12], [95, -150, 15, 42], [108, -15, 11, 90], [-20, 104, -3, 260]],
];

function cubicAt(curve, t) {
  const inverse = 1 - t;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * t;
  const c = 3 * inverse * t * t;
  const d = t * t * t;
  return point(
    curve[0].x * a + curve[1].x * b + curve[2].x * c + curve[3].x * d,
    curve[0].y * a + curve[1].y * b + curve[2].y * c + curve[3].y * d,
  );
}

function curvePath(curves) {
  if (!curves.length) return 'M0 0';
  return `M${pointText(curves[0][0])}${curves.map((curve) => `C${pointText(curve[1])} ${pointText(curve[2])} ${pointText(curve[3])}`).join('')}`;
}

function sampleCurves(curves, resolution = 36) {
  const samples = [];
  let distance = 0;
  for (const curve of curves) {
    for (let index = samples.length ? 1 : 0; index <= resolution; index += 1) {
      const value = cubicAt(curve, index / resolution);
      const previous = samples.at(-1);
      if (previous) distance += Math.hypot(value.x - previous.x, value.y - previous.y);
      samples.push({ ...value, distance });
    }
  }
  return { samples, length: distance };
}

function alongPath(samples, length, progress) {
  if (!samples.length) return point(0, 0);
  const target = clamp(progress) * length;
  let low = 0;
  let high = samples.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].distance < target) low = middle + 1;
    else high = middle;
  }
  const next = samples[low];
  const previous = samples[Math.max(0, low - 1)];
  const interval = next.distance - previous.distance;
  const amount = interval ? (target - previous.distance) / interval : 0;
  return point(mix(previous.x, next.x, amount), mix(previous.y, next.y, amount));
}

function progressAtY(samples, length, targetY) {
  if (!samples.length || !length || targetY <= samples[0].y) return 0;
  if (targetY >= samples.at(-1).y) return 1;
  let low = 0;
  let high = samples.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].y < targetY) low = middle + 1;
    else high = middle;
  }
  const next = samples[low];
  const previous = samples[Math.max(0, low - 1)];
  const span = next.y - previous.y;
  const amount = span ? clamp((targetY - previous.y) / span) : 0;
  return clamp(mix(previous.distance, next.distance, amount) / length);
}

function brandContour() {
  const tokens = BRAND_PATHS.shell.split('Z')[0].match(/[MCL]|-?\d*\.?\d+/g) || [];
  let current = point(0, 0);
  let start = current;
  const curves = [];
  let cursor = 0;
  while (cursor < tokens.length) {
    const command = tokens[cursor++];
    if (command === 'M') {
      current = point(Number(tokens[cursor++]), Number(tokens[cursor++]));
      start = current;
    } else if (command === 'C') {
      const controlA = point(Number(tokens[cursor++]), Number(tokens[cursor++]));
      const controlB = point(Number(tokens[cursor++]), Number(tokens[cursor++]));
      const end = point(Number(tokens[cursor++]), Number(tokens[cursor++]));
      curves.push([current, controlA, controlB, end]);
      current = end;
    } else if (command === 'L') {
      const end = point(Number(tokens[cursor++]), Number(tokens[cursor++]));
      curves.push([current, point(mix(current.x, end.x, 1 / 3), mix(current.y, end.y, 1 / 3)), point(mix(current.x, end.x, 2 / 3), mix(current.y, end.y, 2 / 3)), end]);
      current = end;
    }
  }
  if (current.x !== start.x || current.y !== start.y) {
    curves.push([current, current, start, start]);
  }
  const sampled = sampleCurves(curves, 12);
  return Array.from({ length: 36 }, (_, index) => alongPath(sampled.samples, sampled.length, index / 36));
}

const CONTOUR_POINTS = brandContour();

function smoothClosedPath(points) {
  if (!points.length) return 'M0 0';
  const length = points.length;
  let path = `M${pointText(points[0])}`;
  for (let index = 0; index < length; index += 1) {
    const previous = points[(index + length - 1) % length];
    const current = points[index];
    const next = points[(index + 1) % length];
    const following = points[(index + 2) % length];
    const controlA = point(current.x + (next.x - previous.x) / 6, current.y + (next.y - previous.y) / 6);
    const controlB = point(next.x - (following.x - current.x) / 6, next.y - (following.y - current.y) / 6);
    path += `C${pointText(controlA)} ${pointText(controlB)} ${pointText(next)}`;
  }
  return `${path}Z`;
}

function getSvg(holder, selector) {
  if (!holder) return null;
  return holder.matches?.(selector) ? holder : holder.querySelector(selector);
}

/**
 * All geometry reads belong to measure(). The caller owns scheduling, resize,
 * visibility, reduced-motion changes, and the single frame loop.
 */
export function createVectorNarrative({ main, world, journey }) {
  const worldSvg = getSvg(world, '[data-world-mark]');
  const journeySvg = getSvg(journey, '[data-journey-svg]');
  const parts = PART_POSES.map((pose) => {
    const group = worldSvg?.querySelector(`[data-world-part="${pose.name}"]`);
    return {
      ...pose,
      group,
      fill: group?.querySelector('[data-world-fill]'),
      outline: group?.querySelector('[data-world-outline]'),
      depthPath: group?.querySelector('[data-world-depth]'),
    };
  });
  const nodes = {
    guide: journeySvg?.querySelector('[data-journey-guide]'),
    main: journeySvg?.querySelector('[data-journey-main]'),
    drawMask: journeySvg?.querySelector('[data-journey-mask-draw]'),
    safeRegion: journeySvg?.querySelector('[data-journey-safe-mask]'),
    drawRegion: journeySvg?.querySelector('[data-journey-draw-region]'),
    maskBase: journeySvg?.querySelector('[data-journey-mask-base]'),
    avoid: journeySvg?.querySelector('[data-journey-avoid]'),
    front: journeySvg?.querySelector('[data-journey-front]'),
    return: journeySvg?.querySelector('[data-journey-return]'),
    branches: [0, 1].map((index) => ({
      guide: journeySvg?.querySelector(`[data-journey-branch-guide="${index}"]`),
      path: journeySvg?.querySelector(`[data-journey-branch="${index}"]`),
      terminal: journeySvg?.querySelector(`[data-journey-terminal="${index}"]`),
    })),
  };
  const originalAttributes = [];
  const written = new WeakMap();
  const createdMasks = [];
  let disposed = false;
  let viewport = { width: 0, height: 0, top: 0 };
  let geometry = { width: 0, height: 0, documentTop: 0, samples: [], length: 0, contour: [], unfolded: [], anchors: {}, sticky: null, serviceRange: null, measured: false };
  const stats = { measureCount: 0, renderCount: 0, domWrites: 0, anchorCount: 0, protectedRegions: 0, tier: 'desktop' };

  function remember(element, names) {
    if (!element) return;
    for (const name of names) originalAttributes.push([element, name, element.getAttribute(name)]);
  }
  function attr(element, name, value) {
    if (!element) return;
    const serialized = String(value);
    let values = written.get(element);
    if (!values) { values = new Map(); written.set(element, values); }
    if (values.get(name) === serialized) return;
    values.set(name, serialized);
    element.setAttribute(name, serialized);
    stats.domWrites += 1;
  }

  function cropToViewport(width, height, top) {
    viewport = { width: round(width), height: round(height), top: round(top) };
    attr(journeySvg, 'viewBox', `0 ${viewport.top} ${viewport.width} ${viewport.height}`);
    attr(journeySvg, 'height', viewport.height);
    for (const region of [nodes.safeRegion, nodes.drawRegion]) {
      attr(region, 'x', '0');
      attr(region, 'y', viewport.top);
      attr(region, 'width', viewport.width);
      attr(region, 'height', viewport.height);
    }
  }

  remember(worldSvg, ['data-vector-scene', 'data-vector-reduced']);
  remember(journeySvg, ['viewBox', 'height', 'data-measured', 'data-vector-reduced']);
  for (const part of parts) {
    remember(part.group, ['transform']);
    remember(part.fill, ['opacity']);
    remember(part.outline, ['stroke-dasharray', 'stroke-dashoffset', 'opacity']);
    remember(part.depthPath, ['transform', 'opacity']);
  }
  for (const element of [nodes.guide, nodes.main, nodes.drawMask, nodes.return, ...nodes.branches.flatMap((branch) => [branch.guide, branch.path])]) {
    remember(element, ['d', 'stroke-dasharray', 'stroke-dashoffset', 'opacity']);
  }
  remember(nodes.maskBase, ['width', 'height']);
  for (const region of [nodes.safeRegion, nodes.drawRegion]) remember(region, ['x', 'y', 'width', 'height']);
  remember(nodes.front, ['transform', 'opacity']);
  for (const branch of nodes.branches) remember(branch.terminal, ['cx', 'cy', 'opacity', 'r']);

  function measure() {
    if (disposed || !main || !journeySvg) return;
    const mainBounds = main.getBoundingClientRect();
    const width = Math.max(1, mainBounds.width);
    const height = Math.max(mainBounds.height, main.scrollHeight);
    const ownerWindow = main.ownerDocument.defaultView;
    const scrollTop = ownerWindow?.scrollY || 0;
    const documentTop = mainBounds.top + scrollTop;
    const viewportWidth = Math.max(1, ownerWindow?.innerWidth || width);
    const viewportHeight = Math.max(1, ownerWindow?.innerHeight || viewport.height || Math.min(height, 900));
    const mobile = width < 768;
    const tablet = width >= 768 && width < 1100;
    const cache = new Map();
    function box(element) {
      if (!element) return null;
      if (cache.has(element)) return cache.get(element);
      const bounds = element.getBoundingClientRect();
      const value = { x: bounds.left - mainBounds.left, y: bounds.top - mainBounds.top, width: bounds.width, height: bounds.height };
      value.right = value.x + value.width;
      value.bottom = value.y + value.height;
      cache.set(element, value);
      return value;
    }
    const hero = box(main.querySelector('.hero-art'));
    const heroPort = box(main.querySelector('[data-motion-anchor="hero"]'));
    const scene = box(main.querySelector('.brand-scene'));
    const sceneGrid = box(main.querySelector('.approach-grid'));
    const sceneHostElement = main.querySelector('.approach-art');
    const sceneInnerElement = main.querySelector('.approach-art-inner');
    const sceneHost = box(sceneHostElement);
    const sceneSticky = box(sceneInnerElement);
    const activePin = mobile ? sceneHost : sceneSticky;
    const activePinElement = mobile ? sceneHostElement : sceneInnerElement;
    const pinStyle = activePinElement ? main.ownerDocument.defaultView?.getComputedStyle?.(activePinElement) : null;
    const measuredInset = Number.parseFloat(pinStyle?.top);
    const sticky = sceneGrid && activePin ? {
      naturalTop: sceneGrid.y,
      maxTop: Math.max(sceneGrid.y, sceneGrid.bottom - activePin.height),
      inset: Number.isFinite(measuredInset) ? measuredInset : mobile ? 74 : 106,
      enabled: pinStyle ? pinStyle.position === 'sticky' : true,
      regions: [],
    } : null;
    if (scene && sceneGrid && activePin) {
      const correction = sceneGrid.y - activePin.y;
      scene.y += correction;
      scene.bottom += correction;
    }
    const story = box(main.querySelector('#sobre .story-art'));
    const cards = [...main.querySelectorAll('#atendimentos .service-card')].slice(0, 2).map((card) => ({ box: box(card), symbol: box(card.querySelector('.service-card__symbol')) }));
    const servicePort = box(main.querySelector('[data-motion-anchor="services"]'));
    const contact = box(main.querySelector('.contact-band'));
    const contactSymbol = box(main.querySelector('.contact-band__symbol'));
    const contactPort = box(main.querySelector('[data-motion-anchor="contact"]'));
    const protectedElements = [...main.querySelectorAll('.hero-copy, .approach-copy, .story-copy, #atendimentos .section-heading, .faq-grid, .contact-band h2, .contact-band__actions, #atendimentos .service-card h2, #atendimentos .service-card h3, #atendimentos .service-card p, #atendimentos .service-card .text-link')];
    const protectedBoxes = protectedElements.map(box).filter(Boolean);
    if (sticky) {
      for (const selector of ['.approach-art h2', '.approach-caption']) {
        const bounds = box(main.querySelector(selector));
        if (!bounds) continue;
        const maskIndex = protectedBoxes.length;
        const paddingY = 30;
        protectedBoxes.push({ ...bounds, paddingY });
        sticky.regions.push({ maskIndex, offsetY: bounds.y - activePin.y - paddingY });
      }
    }
    for (const selector of ['.hero-art .portrait img', '#sobre .story-art .portrait img']) {
      const image = box(main.querySelector(selector));
      if (!image) continue;
      protectedBoxes.push({
        x: image.x + image.width * 0.47,
        y: image.y + image.height * 0.04,
        width: image.width * 0.39,
        height: image.height * 0.38,
        paddingY: 36,
        radius: image.width * 0.2,
      });
    }
    const gutter = mobile ? 11 : tablet ? 20 : Math.max(24, (width - 1440) / 2 + 20);
    const leftRail = gutter;
    const rightRail = width - gutter;
    const safeX = (value) => clamp(value, gutter, width - gutter);
    const anchors = {};
    if (hero) anchors.hero = heroPort
      ? point(heroPort.x + heroPort.width * 0.5, heroPort.y + heroPort.height * 0.5)
      : point(safeX(hero.x + hero.width * (mobile ? 0.13 : 0.06)), hero.y + hero.height * 0.18);
    if (scene) anchors.approach = point(scene.x + scene.width * 0.5, scene.y + scene.height * 0.54);
    if (story) {
      const port = storyAnchor({ ...story, left: story.x, top: story.y }, width);
      anchors.story = point(port.x, port.y);
    }
    if (cards.length) {
      const first = cards[0].box;
      const last = cards.at(-1).box;
      anchors.services = servicePort
        ? point(servicePort.x + servicePort.width * 0.5, servicePort.y + servicePort.height * 0.5)
        : point(mobile ? width * 0.5 : (first.right + last.x) / 2, first.y - (mobile ? 30 : 42));
      anchors.serviceExit = point(mobile ? rightRail : width * 0.72, Math.max(...cards.map((card) => card.box.bottom)) + (mobile ? 28 : 42));
    }
    if (contact) {
      anchors.contact = contactPort
        ? point(contactPort.x + contactPort.width * 0.5, contactPort.y + contactPort.height * 0.5)
        : contactSymbol
          ? point(clamp(contactSymbol.x + contactSymbol.width * 0.5, gutter + 48, width - gutter - 48), contactSymbol.y + contactSymbol.height * 0.55)
          : point(mobile ? rightRail - 48 : width * 0.86, contact.y + contact.height * 0.55);
    }
    const ports = [anchors.hero, anchors.approach, anchors.story, anchors.services, anchors.serviceExit, anchors.contact].filter(Boolean);
    const curves = [];
    for (let index = 0; index < ports.length - 1; index += 1) {
      const from = ports[index];
      const to = ports[index + 1];
      const span = Math.max(80, to.y - from.y);
      let controlA;
      let controlB;
      if (to === anchors.approach) {
        controlA = point(safeX(from.x + (mobile ? 74 : 210)), from.y + span * 0.4);
        controlB = point(mobile ? rightRail : safeX(to.x - 190), to.y - span * 0.32);
      } else if (to === anchors.story) {
        controlA = point(leftRail, from.y + span * 0.48);
        controlB = point(leftRail, to.y - span * 0.36);
      } else if (to === anchors.services) {
        controlA = point(rightRail, from.y + span * 0.35);
        controlB = point(rightRail, to.y - span * 0.25);
      } else if (to === anchors.serviceExit) {
        controlA = point(mobile ? leftRail : from.x, from.y + span * 0.3);
        controlB = point(mobile ? leftRail : rightRail, to.y - span * 0.22);
      } else {
        controlA = point(rightRail, from.y + span * 0.34);
        controlB = point(rightRail, to.y - span * 0.24);
      }
      curves.push([from, controlA, controlB, to]);
    }
    const sampled = sampleCurves(curves);
    const mainPath = curvePath(curves);
    const finalPort = anchors.contact || ports.at(-1) || point(width * 0.85, height - 60);
    const contourHeight = mobile ? 126 : tablet ? 176 : 228;
    const scale = contourHeight / 1060;
    const contour = CONTOUR_POINTS.map((value) => point(finalPort.x + (value.x - 635) * scale, finalPort.y + (value.y - 650) * scale));
    const unfolded = contour.map((value, index) => {
      const phase = index / contour.length;
      return point(
        safeX(finalPort.x + (value.x - finalPort.x) * (mobile ? 1.4 : 2.5) - Math.sin(phase * Math.PI * 2) * (mobile ? 22 : 64)),
        finalPort.y + (value.y - finalPort.y) * 0.2 - Math.sin(phase * Math.PI) * contourHeight * 0.5,
      );
    });
    const branchGeometry = cards.map(({ box: card, symbol }, index) => {
      const destination = symbol
        ? point(symbol.x + symbol.width * 0.5, symbol.y + symbol.height * 0.53)
        : point(card.right - Math.min(70, card.width * 0.2), card.y + Math.min(75, card.height * 0.17));
      const origin = anchors.services;
      const span = destination.y - origin.y;
      const rail = mobile ? (index === 0 ? leftRail : rightRail) : destination.x;
      return {
        destination,
        d: curvePath([[origin, point(rail, origin.y + Math.max(28, span * 0.25)), point(rail, destination.y - Math.max(20, span * 0.22)), destination]]),
      };
    });

    const serviceRange = cards.length ? {
      top: Math.min(...cards.map((card) => card.box.y)),
      bottom: Math.max(...cards.map((card) => card.box.bottom)),
    } : null;
    geometry = { width, height, documentTop, ...sampled, contour, unfolded, anchors, sticky, serviceRange, measured: ports.length >= 2 };
    stats.measureCount += 1;
    stats.anchorCount = Object.keys(anchors).length;
    stats.protectedRegions = protectedBoxes.length;
    stats.tier = mobile ? 'mobile' : tablet ? 'tablet' : 'desktop';

    cropToViewport(viewportWidth, viewportHeight, scrollTop - documentTop);
    attr(journeySvg, 'data-measured', geometry.measured ? 'true' : 'false');
    attr(nodes.maskBase, 'width', width);
    attr(nodes.maskBase, 'height', height);
    for (const element of [nodes.guide, nodes.main, nodes.drawMask]) attr(element, 'd', mainPath);
    nodes.branches.forEach((branch, index) => {
      const measured = branchGeometry[index];
      attr(branch.guide, 'd', measured?.d || 'M0 0');
      attr(branch.path, 'd', measured?.d || 'M0 0');
      attr(branch.terminal, 'cx', measured?.destination.x || 0);
      attr(branch.terminal, 'cy', measured?.destination.y || 0);
    });
    while (createdMasks.length > protectedBoxes.length) createdMasks.pop().remove();
    protectedBoxes.forEach((bounds, index) => {
      if (!nodes.avoid) return;
      let rectangle = createdMasks[index];
      if (!rectangle) {
        rectangle = main.ownerDocument.createElementNS(SVG_NS, 'rect');
        nodes.avoid.append(rectangle);
        createdMasks.push(rectangle);
      }
      const padding = mobile ? 7 : 12;
      const paddingY = bounds.paddingY ?? padding;
      attr(rectangle, 'x', bounds.x - padding);
      attr(rectangle, 'y', bounds.y - paddingY);
      attr(rectangle, 'width', bounds.width + padding * 2);
      attr(rectangle, 'height', bounds.height + paddingY * 2);
      attr(rectangle, 'rx', bounds.radius ?? 10);
    });
    return getStats();
  }

  function render(frame = {}) {
    if (disposed) return;
    const reduced = Boolean(frame.reduced);
    const assembly = reduced ? 1 : clamp(frame.assembly ?? 1);
    const opening = reduced ? 0 : clamp(frame.opening ?? 0);
    const recomposition = reduced ? 1 : clamp(frame.recompose ?? 0);
    const branch = reduced ? 1 : clamp(frame.branch ?? 0);
    const focus = reduced ? -1 : clamp(frame.focus ?? 0, 0, 3);
    const energy = reduced ? 0 : clamp(frame.energy ?? 0);
    const progress = clamp(frame.progress ?? 0);
    const spread = opening * (1 - recomposition) * (0.76 + (1 - assembly) * 0.24);
    const amplitude = (frame.viewport?.width || geometry.width) < 768 ? 0.58 : (frame.viewport?.width || geometry.width) < 1100 ? 0.8 : 1;
    const focusFrom = Math.max(0, Math.floor(focus));
    const focusTo = Math.min(3, focusFrom + 1);
    const focusBlend = focus < 0 ? 0 : ease(focus - focusFrom);
    attr(worldSvg, 'data-vector-scene', frame.scene ?? 'rest');
    attr(worldSvg, 'data-vector-reduced', String(reduced));

    parts.forEach((part, index) => {
      const selected = focus < 0 ? 0 : Math.max(0, 1 - Math.abs(index - focus));
      const pose = FOCUS_POSES[focusFrom][index].map((value, axis) => mix(value, FOCUS_POSES[focusTo][index][axis], focusBlend));
      const phase = progress * Math.PI * 2 + index * 0.91;
      const leftGroup = index < 2;
      const branchX = leftGroup ? -184 : 184;
      const branchY = leftGroup ? -14 : 28;
      const x = (mix(pose[0], branchX, branch) + Math.sin(phase) * energy * (1 - branch) * 8) * spread * amplitude;
      const y = (mix(pose[1], branchY, branch) + Math.cos(phase) * energy * (1 - branch) * 6) * spread * amplitude;
      const depth = mix(pose[3], leftGroup ? 70 : 155, branch) * spread * amplitude;
      const projection = 1250 / (1250 - depth);
      const rotation = mix(pose[2], leftGroup ? -5 : 6, branch) * spread * amplitude;
      const tilt = spread * amplitude * mix(pose[2] * 0.32, leftGroup ? -4 : 4, branch);
      const scaleY = projection * Math.cos(tilt * Math.PI / 180);
      const [centerX, centerY] = part.center;
      const transform = spread < 0.0001
        ? 'translate(0 0)'
        : `translate(${round(x)} ${round(y)}) translate(${centerX} ${centerY}) rotate(${round(rotation)}) scale(${projection.toFixed(4)} ${scaleY.toFixed(4)}) skewX(${round(tilt)}) translate(${-centerX} ${-centerY})`;
      attr(part.group, 'transform', transform);
      attr(part.fill, 'opacity', clamp(0.5 + assembly * 0.5 + selected * spread * 0.1).toFixed(3));
      attr(part.outline, 'stroke-dasharray', '1');
      attr(part.outline, 'stroke-dashoffset', (1 - clamp(assembly * 1.3 - index * 0.07 + selected * spread * 0.35)).toFixed(4));
      attr(part.outline, 'opacity', clamp(0.12 + spread * 0.46 + selected * spread * 0.25).toFixed(3));
      attr(part.depthPath, 'transform', `translate(${round(depth * 0.025)} ${round(depth * 0.065)})`);
      attr(part.depthPath, 'opacity', (spread * 0.11).toFixed(3));
    });

    if (geometry.measured) {
      const followsViewport = Number.isFinite(frame.scrollY) && frame.viewport?.height > 0;
      const viewTop = followsViewport ? frame.scrollY - geometry.documentTop : viewport.top;
      const viewportWidth = frame.viewport?.width > 0 ? frame.viewport.width : viewport.width;
      const viewportHeight = frame.viewport?.height > 0 ? frame.viewport.height : viewport.height;
      cropToViewport(viewportWidth, viewportHeight, viewTop);
      const targetY = followsViewport ? frame.scrollY + frame.viewport.height * 0.58 - geometry.documentTop : 0;
      const journeyProgress = reduced ? 1 : followsViewport
        ? progressAtY(geometry.samples, geometry.length, targetY)
        : clamp(frame.journeyProgress ?? 0);
      const tail = reduced ? 1 : Number.isFinite(frame.recompose) ? recomposition : clamp((journeyProgress - 0.8) / 0.2);
      const front = alongPath(geometry.samples, geometry.length, journeyProgress);
      const morph = ease(tail);
      const returnPoints = geometry.contour.map((value, index) => point(mix(geometry.unfolded[index].x, value.x, morph), mix(geometry.unfolded[index].y, value.y, morph)));
      attr(journeySvg, 'data-vector-reduced', String(reduced));
      attr(nodes.drawMask, 'stroke-dasharray', '1');
      attr(nodes.drawMask, 'stroke-dashoffset', (1 - journeyProgress).toFixed(5));
      attr(nodes.front, 'transform', `translate(${round(front.x)} ${round(front.y)})`);
      attr(nodes.front, 'opacity', reduced || journeyProgress < 0.006 || journeyProgress > 0.997 ? '0' : '1');
      attr(nodes.return, 'd', smoothClosedPath(returnPoints));
      attr(nodes.return, 'stroke-dasharray', '1');
      attr(nodes.return, 'stroke-dashoffset', (1 - tail).toFixed(5));
      attr(nodes.return, 'opacity', (tail * 0.8).toFixed(3));
      stats.journeyProgress = Math.round(journeyProgress * 10000) / 10000;
      stats.frontY = round(front.y);
      stats.frontViewportY = followsViewport ? round(front.y + geometry.documentTop - frame.scrollY) : null;
      stats.recompose = tail;
      if (geometry.sticky) {
        const pin = geometry.sticky;
        const pinTop = !reduced && pin.enabled && followsViewport
          ? clamp(viewTop + pin.inset, pin.naturalTop, pin.maxTop)
          : pin.naturalTop;
        for (const region of pin.regions) attr(createdMasks[region.maskIndex], 'y', round(pinTop + region.offsetY));
        stats.stickyTop = round(pinTop);
        stats.stickyRegions = pin.regions.length;
      }
      let branchDraw = branch;
      if (!reduced && followsViewport && geometry.serviceRange) {
        const { top, bottom } = geometry.serviceRange;
        const viewportHeight = frame.viewport.height;
        const entering = clamp((viewTop + viewportHeight * 0.82 - top) / Math.max(100, viewportHeight * 0.35));
        const leaving = 1 - clamp((viewTop - bottom) / Math.max(100, viewportHeight * 0.25));
        branchDraw = Math.max(branch, entering * leaving);
      }
      stats.branchDraw = Math.round(branchDraw * 10000) / 10000;
      nodes.branches.forEach((node, index) => {
        const amount = clamp(branchDraw * 1.18 - index * 0.18);
        attr(node.path, 'stroke-dasharray', '1');
        attr(node.path, 'stroke-dashoffset', (1 - amount).toFixed(5));
        attr(node.guide, 'opacity', (branchDraw * 0.18).toFixed(3));
        attr(node.terminal, 'opacity', clamp((amount - 0.85) / 0.15).toFixed(3));
        attr(node.terminal, 'r', 3.2 + energy * amount * 1.1);
      });
    }
    stats.renderCount += 1;
  }

  function getStats() {
    return {
      ...stats,
      measured: geometry.measured,
      width: geometry.width,
      height: geometry.height,
      documentTop: geometry.documentTop,
      viewport: { ...viewport },
      maskArea: viewport.width * viewport.height,
      pathLength: Math.round(geometry.length),
      anchors: Object.fromEntries(Object.entries(geometry.anchors).map(([key, value]) => [key, { x: round(value.x), y: round(value.y) }])),
      ownRaf: 0,
      ownListeners: 0,
      disposed,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const [element, name, value] of originalAttributes) {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }
    for (const rectangle of createdMasks) rectangle.remove();
    createdMasks.length = 0;
    originalAttributes.length = 0;
    viewport = { width: 0, height: 0, top: 0 };
    geometry = { width: 0, height: 0, documentTop: 0, samples: [], length: 0, contour: [], unfolded: [], anchors: {}, sticky: null, serviceRange: null, measured: false };
  }

  return { measure, render, dispose, getStats };
}
