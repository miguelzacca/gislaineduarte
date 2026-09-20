import { BRAND_COLORS, BRAND_PARTS, BRAND_VIEWBOX } from '../lib/brand.js';

const sceneCleanups = new WeakMap();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

async function createSculpture(
  root,
  canvas,
  context,
  isCurrent,
  onFailure,
) {
  const [THREE, { SVGLoader }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/SVGLoader.js'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]);

  if (!isCurrent()) {
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }

  const host = root.querySelector('[data-scene-canvas]');
  if (!host) {
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }

  const geometries = [];
  const materials = [];
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  });

  const device = navigator;
  const dprCap = (device.deviceMemory ?? 8) <= 4 ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  const scene = new THREE.Scene();
  const sculpture = new THREE.Group();
  scene.add(sculpture);

  const camera = new THREE.OrthographicCamera(-4.5, 4.5, 4.5, -4.5, 0.1, 40);
  camera.position.set(0, 0, 16);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(BRAND_COLORS.ivory, BRAND_COLORS.forest, 1.1));
  const keyLight = new THREE.DirectionalLight(0xffedcc, 2.4);
  keyLight.position.set(-3, 5, 7);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xc5ddc0, 1.7);
  rimLight.position.set(4, -1, 4);
  scene.add(rimLight);

  const partGroups = new Map();
  let frame = 0;
  let active = true;
  let disposed = false;
  let pointerX = 0;
  let pointerY = 0;
  let sizeChanged = true;
  let resizeObserver = null;
  let environmentTarget = null;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver?.disconnect();
    window.removeEventListener('scroll', requestFrame);
    window.removeEventListener('resize', onResize);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    scene.environment = null;
    environmentTarget?.dispose();
    scene.clear();
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    delete root.dataset.sceneReady;
  };

  function onContextLost(event) {
    event.preventDefault();
    dispose();
    onFailure();
  }

  function onResize() {
    sizeChanged = true;
    requestFrame();
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    const box = root.getBoundingClientRect();
    pointerX = clamp(((event.clientX - box.left) / box.width - 0.5) * 2, -1, 1);
    pointerY = clamp(((event.clientY - box.top) / box.height - 0.5) * 2, -1, 1);
    requestFrame();
  }

  function onPointerLeave() {
    pointerX = 0;
    pointerY = 0;
    requestFrame();
  }

  function requestFrame() {
    if (!active || disposed || frame || document.hidden) return;
    frame = requestAnimationFrame(draw);
  }

  function draw() {
    frame = 0;
    if (!active || disposed || document.hidden) return;

    const bounds = root.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0 || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

    if (sizeChanged) {
      const halfHeight = 4.45;
      const halfWidth = halfHeight * (bounds.width / bounds.height);
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(Math.round(bounds.width), Math.round(bounds.height), false);
      sizeChanged = false;
    }

    const progress = clamp((window.innerHeight - bounds.top) / (window.innerHeight + bounds.height), 0, 1);
    const opening = Math.sin(progress * Math.PI);
    sculpture.rotation.set(0.12 + pointerY * 0.065, -0.58 + progress * 0.46 + pointerX * 0.11, -0.055);
    sculpture.position.y = (progress - 0.5) * 0.2;

    const leaf = partGroups.get('leaf');
    const pulp = partGroups.get('pulp');
    const seed = partGroups.get('seed');
    if (leaf) leaf.position.set(opening * 0.08, opening * 0.09, opening * 0.1);
    if (pulp) pulp.position.set(-opening * 0.035, 0, 0.03 + opening * 0.3);
    if (seed) seed.position.set(opening * 0.035, 0, 0.08 + opening * 0.64);

    try {
      renderer.render(scene, camera);
      root.dataset.sceneReady = 'true';
    } catch {
      dispose();
      onFailure();
    }
  }

  try {
    const environment = new RoomEnvironment();
    const environmentGenerator = new THREE.PMREMGenerator(renderer);
    try {
      environmentTarget = environmentGenerator.fromScene(environment, 0.06, 0.1, 100, { size: 128 });
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 0.8;
    } finally {
      environment.dispose();
      environmentGenerator.dispose();
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_VIEWBOX}">${BRAND_PARTS.map(
      (part) => `<path fill="${part.color}" fill-rule="evenodd" d="${part.path}"/>`,
    ).join('')}</svg>`;
    const parsed = new SVGLoader().parse(svg);

    parsed.paths.forEach((path, index) => {
      const part = BRAND_PARTS[index];
      if (!part) return;
      const group = new THREE.Group();
      const color = part.name === 'pulp' ? BRAND_COLORS.sage : part.name === 'seed' ? '#d2b36f' : BRAND_COLORS.gold;
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: part.name === 'pulp' ? 0.08 : 0.72,
        roughness: part.name === 'pulp' ? 0.62 : 0.29,
      });
      materials.push(material);

      // Three r185+ moved SVG fill-rule handling to ShapePath.toShapes().
      for (const shape of path.toShapes()) {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: part.name === 'seed' ? 56 : 44,
          bevelEnabled: true,
          bevelSegments: 4,
          steps: 1,
          bevelSize: 4,
          bevelThickness: 6,
          curveSegments: 16,
        });
        geometry.translate(-650, -612, -16);
        geometry.scale(0.006, -0.006, -0.006);
        geometry.computeVertexNormals();
        geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
      }

      partGroups.set(part.name, group);
      sculpture.add(group);
    });

    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave, { passive: true });
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(root);
    requestFrame();
  } catch {
    dispose();
    throw new Error('Brand sculpture unavailable');
  }

  return {
    setActive(value) {
      active = value;
      if (value) requestFrame();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    dispose,
  };
}

/** A static, server-rendered SVG remains available until the first successful WebGL frame. */
export function initBrandScene(root) {
  const existingCleanup = sceneCleanups.get(root);
  if (existingCleanup) return existingCleanup;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const width = window.matchMedia('(min-width: 768px)');
  const reducedData = window.matchMedia('(prefers-reduced-data: reduce)');
  const device = navigator;
  let inView = false;
  let loading = false;
  let disposed = false;
  let failed = false;
  let generation = 0;
  let runtime = null;

  const canEnhance = () =>
    width.matches &&
    !motion.matches &&
    !reducedData.matches &&
    !device.connection?.saveData &&
    !['slow-2g', '2g'].includes(device.connection?.effectiveType ?? '') &&
    (device.deviceMemory ?? 4) >= 4 &&
    (device.hardwareConcurrency || 4) >= 4;

  const fail = () => {
    failed = true;
    runtime = null;
    root.dataset.sceneState = 'fallback';
    delete root.dataset.sceneReady;
  };

  async function enhance() {
    if (disposed || failed || loading || runtime || !inView || document.hidden || !canEnhance()) return;
    loading = true;
    const currentGeneration = generation;
    const canvas = document.createElement('canvas');
    let context = null;

    try {
      context = canvas.getContext('webgl2', {
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
      });
      if (!context || context.getParameter(context.MAX_RENDERBUFFER_SIZE) < 4096) {
        context?.getExtension('WEBGL_lose_context')?.loseContext();
        fail();
        return;
      }

      const isCurrent = () => !disposed && currentGeneration === generation && canEnhance();
      const nextRuntime = await createSculpture(root, canvas, context, isCurrent, fail);
      if (!isCurrent()) {
        nextRuntime?.dispose();
        return;
      }
      runtime = nextRuntime;
      runtime?.setActive(inView && !document.hidden);
      if (runtime) root.dataset.sceneState = 'enhanced';
    } catch {
      context?.getExtension('WEBGL_lose_context')?.loseContext();
      fail();
    } finally {
      loading = false;
    }
  }

  function update() {
    if (disposed) return;
    if (!canEnhance()) {
      generation += 1;
      runtime?.dispose();
      runtime = null;
      root.dataset.sceneState = 'fallback';
      return;
    }
    runtime?.setActive(inView && !document.hidden);
    void enhance();
  }

  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      update();
    },
    { rootMargin: '80px 0px', threshold: 0 },
  );
  observer.observe(root);
  motion.addEventListener('change', update);
  width.addEventListener('change', update);
  reducedData.addEventListener('change', update);
  device.connection?.addEventListener?.('change', update);
  document.addEventListener('visibilitychange', update);
  root.dataset.sceneState = 'fallback';

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    generation += 1;
    observer.disconnect();
    motion.removeEventListener('change', update);
    width.removeEventListener('change', update);
    reducedData.removeEventListener('change', update);
    device.connection?.removeEventListener?.('change', update);
    document.removeEventListener('visibilitychange', update);
    runtime?.dispose();
    runtime = null;
    sceneCleanups.delete(root);
  };

  sceneCleanups.set(root, cleanup);
  return cleanup;
}

export function initBrandScenes() {
  const cleanups = Array.from(document.querySelectorAll('[data-brand-scene]'), initBrandScene);
  return () => cleanups.forEach((cleanup) => cleanup());
}
