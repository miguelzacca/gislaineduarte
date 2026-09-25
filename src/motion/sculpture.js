import { BRAND_COLORS, BRAND_PARTS } from '../lib/brand.js';
import { parseBrandPaths } from './brand-shapes.js';
import { attachNarrativeSurface, contourParticleFragment, contourParticleVertex } from './shaders.js';

const TAU = Math.PI * 2;
const SOURCE_SCALE = 0.006;
const INITIALIZATION_BUDGET_MS = 5500;
const clamp = (number, minimum, maximum) => Math.max(minimum, Math.min(maximum, number));
const numberOr = (value, fallback) => Number.isFinite(value) ? value : fallback;
const unit = (value, fallback = 0) => clamp(numberOr(value, fallback), 0, 1);
const lerp = (from, to, amount) => from + (to - from) * amount;
const smooth = (value) => value * value * (3 - 2 * value);

const PART_DIRECTION = [
  { rotation: [0.13, -0.44, -0.08], branch: [-2.55, -0.12, -0.45], scale: 0.72 },
  { rotation: [0.38, 0.72, -0.23], branch: [-1.55, 2.18, 0.22], scale: 0.82 },
  { rotation: [-0.18, 0.52, 0.09], branch: [2.25, 0.08, 0.3], scale: 0.96 },
  { rotation: [0.24, -0.4, 0.16], branch: [2.40, -0.26, 1.55], scale: 1.08 },
];

// Stage identity comes from the arrangement itself, including with a fixed camera.
const APPROACH_POSES = [
  {
    name: 'contorno',
    parts: [
      { position: [-1.45, -0.1, -0.9], rotation: [0.12, -0.24, -0.09], scale: 1.03 },
      { position: [1.75, 2.65, 0.45], rotation: [0.24, 0.35, -0.24], scale: 0.95 },
      { position: [1.1, -0.65, 0.75], rotation: [-0.15, 0.32, 0.09], scale: 0.9 },
      { position: [2.65, -1.75, 2.25], rotation: [0.23, -0.3, 0.14], scale: 1.08 },
    ],
  },
  {
    name: 'copa',
    parts: [
      { position: [-2.6, -0.8, -0.7], rotation: [0.1, -0.18, -0.2], scale: 0.7 },
      { position: [-0.2, 2.35, 1.1], rotation: [-0.16, 0.15, 0.44], scale: 1.4 },
      { position: [0.15, -1.05, 0.35], rotation: [0.15, 0.1, -0.08], scale: 0.8 },
      { position: [2.7, -0.85, 1.85], rotation: [-0.22, -0.28, 0.15], scale: 1.03 },
    ],
  },
  {
    name: 'equilibrio',
    parts: [
      { position: [2.15, -0.1, -0.75], rotation: [-0.09, 0.33, 0.22], scale: 0.82 },
      { position: [-2.25, 2.45, 0.75], rotation: [0.24, -0.28, -0.32], scale: 1.02 },
      { position: [-1.3, -0.85, 1.05], rotation: [-0.13, -0.3, -0.13], scale: 1.11 },
      { position: [0.15, 1.25, 2.15], rotation: [0.17, 0.18, -0.1], scale: 1.2 },
    ],
  },
  {
    name: 'nucleo',
    parts: [
      { position: [0.15, -0.2, -1.2], rotation: [0.06, -0.2, 0.06], scale: 1 },
      { position: [-2.05, 2.45, 0.65], rotation: [-0.12, 0.24, -0.36], scale: 0.82 },
      { position: [1.65, -0.65, 0.75], rotation: [0.13, 0.28, 0.24], scale: 0.76 },
      { position: [-0.75, -0.5, 3.0], rotation: [0.08, -0.12, -0.03], scale: 1.8 },
    ],
  },
];

/**
 * One renderer, owned by the caller. No RAF, scroll, resize or pointer listeners.
 * Angles are radians, distance is in scene units, pointer is 0..1 (neutral .5).
 * opening controls separation; assembly independently reveals 0..1 of surfaces.
 * focus 0..3 interpolates four distinct part arrangements, not just their light.
 * opening=0 and branch=0 restore the exact original positions at every focus.
 * Recommended distances at 42deg FOV: assembled 9.5–11; open 14–17; branched 13–15.
 * Call resize(size, dpr), then render(frame). Keep this instance across sections.
 * An optional signal cancels initialization, not the returned instance's lifetime.
 */
export async function createSculpture({ canvas, quality = {}, onContextLost = () => {}, signal } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas is required for the brand sculpture.');
  if (signal?.aborted) throw new DOMException('Sculpture initialization was cancelled.', 'AbortError');

  const initializationStarted = performance.now();
  const mode = quality.mode === 'mobile' ? 'mobile' : 'full';
  const mobile = mode === 'mobile';
  const segments = Math.round(clamp(numberOr(quality.segments, mobile ? 9 : 20), 6, mobile ? 14 : 28));
  const particleCount = Math.round(clamp(numberOr(quality.particles, mobile ? 56 : 192), 0, mobile ? 96 : 384));
  const economical = mobile && segments <= 6;
  const dprLimit = mobile ? 1.25 : 1.5;
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: !economical,
    powerPreference: mobile ? 'low-power' : 'high-performance',
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,
  });
  if (!context) {
    onContextLost({ reason: 'unavailable' });
    throw new Error('WebGL2 is unavailable; retain the SVG composition.');
  }

  let THREE;
  let RoomEnvironment;
  const geometries = new Set();
  const materials = new Set();
  const parts = [];
  const particles = [];
  const pendingGpuWaits = new Set();
  const shaderDiagnostics = { compilations: 0, parts: new Set(), errors: [] };
  let renderer;
  let environmentTarget;
  let scene;
  let camera;
  let points;
  let particlePositions;
  let particleMaterial;
  let contourMaterial;
  let disposed = false;
  let contextLost = false;
  let notified = false;
  let frames = 0;
  let renderCalls = 0;
  let lastFrameCpuMs = 0;
  let firstFrameCpuMs = 0;
  let lastDrawCalls = 0;
  let lastTriangles = 0;
  let lastPointCount = 0;
  let lastFrame = null;
  let lastPose = null;
  let cssSize = { width: mobile ? 440 : 720, height: mobile ? 440 : 720 };
  let pixelRatio = clamp(numberOr(quality.dpr, 1), 0.75, dprLimit);
  let keyLight;
  let rimLight;
  let initializationDeadline;
  let rejectInitialization;
  let initializationError;
  let initializing = true;
  const initialization = {
    contextMs: performance.now() - initializationStarted,
    importsMs: 0,
    rendererMs: 0,
    environmentCompileMs: 0,
    environmentMs: 0,
    geometryMs: 0,
    geometryPartsMs: [],
    resizeMs: 0,
    compileMs: 0,
    compileSubmitMs: 0,
    gpuReadyMs: 0,
    warmupMs: 0,
    warmupGpuMs: 0,
    warmupDrawCalls: 0,
    totalMs: 0,
    yields: 0,
    yieldMs: 0,
    parallelCompile: Boolean(context.getExtension('KHR_parallel_shader_compile')),
  };
  const initializationCancelled = new Promise((_, reject) => { rejectInitialization = reject; });
  // Abort can occur between two awaited stages; a rejection is still observed.
  void initializationCancelled.catch(() => {});

  const uniforms = {
    uBrandAssembly: { value: 1 },
    uBrandOpening: { value: 0 },
    uBrandEnergy: { value: 0.2 },
    uBrandProgress: { value: 0 },
    uBrandFocus: { value: 2 },
    uBrandGold: { value: null },
  };

  const notifyFailure = (reason, error) => {
    if (notified) return;
    notified = true;
    if (error && initializing) error.initialization = { ...initialization, totalMs: performance.now() - initializationStarted };
    onContextLost({ reason, error });
  };

  function disposeResources(loseContext) {
    if (disposed) return;
    disposed = true;
    clearTimeout(initializationDeadline);
    signal?.removeEventListener('abort', handleInitializationAbort);
    for (const cancel of pendingGpuWaits) cancel();
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    geometries.clear();
    materials.clear();
    if (scene) {
      scene.environment = null;
      scene.clear();
    }
    environmentTarget?.dispose();
    environmentTarget = null;
    if (renderer) {
      renderer.renderLists.dispose();
      renderer.dispose();
      if (loseContext && !contextLost) renderer.forceContextLoss();
    } else if (loseContext) {
      context.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  function handleContextLost(event) {
    event.preventDefault();
    contextLost = true;
    if (initializing) {
      initializationError = new Error('WebGL context was lost during initialization.');
    }
    disposeResources(false);
    if (initializing) rejectInitialization(initializationError);
    notifyFailure('context-lost');
  }

  function handleInitializationAbort() {
    initializationError = new DOMException('Sculpture initialization was cancelled.', 'AbortError');
    disposeResources(true);
    rejectInitialization(initializationError);
  }

  function assertInitializing() {
    if (performance.now() - initializationStarted >= INITIALIZATION_BUDGET_MS && !initializationError) {
      initializationError = new Error('Sculpture initialization timed out; retain the SVG composition.');
      initializationError.name = 'TimeoutError';
    }
    if (initializationError) throw initializationError;
    if (disposed || contextLost || signal?.aborted) {
      throw new DOMException('Sculpture initialization was cancelled.', 'AbortError');
    }
  }

  async function awaitStage(promise) {
    await Promise.race([promise, initializationCancelled]);
    assertInitializing();
  }

  async function yieldInitialization() {
    const started = performance.now();
    initialization.yields += 1;
    await awaitStage(globalThis.scheduler?.yield
      ? globalThis.scheduler.yield()
      : new Promise(resolve => setTimeout(resolve, 0)));
    initialization.yieldMs += performance.now() - started;
  }

  async function waitForGpu() {
    assertInitializing();
    const fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!fence) throw new Error('The sculpture GPU queue could not be prepared.');
    context.flush();
    await awaitStage(new Promise((resolve, reject) => {
      let timer;
      const finish = error => {
        clearTimeout(timer);
        pendingGpuWaits.delete(cancel);
        if (!contextLost) context.deleteSync(fence);
        if (error) reject(error); else resolve();
      };
      const cancel = () => finish(initializationError ?? new DOMException('Sculpture initialization was cancelled.', 'AbortError'));
      const check = () => {
        if (disposed || contextLost) return cancel();
        const state = context.clientWaitSync(fence, 0, 0);
        if (state === context.ALREADY_SIGNALED || state === context.CONDITION_SATISFIED) return finish();
        if (state === context.WAIT_FAILED) return finish(new Error('The sculpture GPU queue could not be completed.'));
        timer = setTimeout(check, 8);
      };
      pendingGpuWaits.add(cancel);
      timer = setTimeout(check, 0);
    }));
  }

  function resize(size, dpr = pixelRatio) {
    if (disposed) return;
    const width = typeof size === 'number' ? size : size?.width;
    const height = typeof size === 'number' ? size : size?.height;
    cssSize = {
      width: Math.round(clamp(numberOr(width, cssSize.width), 16, 2048)),
      height: Math.round(clamp(numberOr(height, cssSize.height), 16, 2048)),
    };
    pixelRatio = clamp(numberOr(dpr, pixelRatio), 0.75, dprLimit);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(cssSize.width, cssSize.height, false);
    camera.aspect = cssSize.width / cssSize.height;
    camera.updateProjectionMatrix();
    if (particleMaterial) particleMaterial.uniforms.uPixelRatio.value = pixelRatio;
  }

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  signal?.addEventListener('abort', handleInitializationAbort, { once: true });
  initializationDeadline = setTimeout(() => {
    initializationError = new Error('Sculpture initialization timed out; retain the SVG composition.');
    initializationError.name = 'TimeoutError';
    disposeResources(true);
    rejectInitialization(initializationError);
  }, INITIALIZATION_BUDGET_MS);

  try {
    let stageStarted = performance.now();
    const imports = Promise.all([
      import('three'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
    await awaitStage(imports);
    [THREE, { RoomEnvironment }] = await imports;
    initialization.importsMs = performance.now() - stageStarted;
    uniforms.uBrandGold.value = new THREE.Color('#e3c27c');
    await yieldInitialization();
    stageStarted = performance.now();
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: !economical });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      shaderDiagnostics.errors.push({
        program: gl.getProgramInfoLog(program),
        vertex: gl.getShaderInfoLog(vertexShader),
        fragment: gl.getShaderInfoLog(fragmentShader),
      });
    };

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0, 0, 10.8);
    scene.add(new THREE.HemisphereLight(BRAND_COLORS.ivory, '#173c31', 1.2));
    keyLight = new THREE.DirectionalLight('#fff0d2', 3.25);
    keyLight.position.set(-4, 6, 8);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#c5ddc0', 1.2);
    fillLight.position.set(-5, -2, 4);
    scene.add(fillLight);
    rimLight = new THREE.DirectionalLight('#fff5dc', 3.5);
    rimLight.position.set(5, 3, -2);
    scene.add(rimLight);
    initialization.rendererMs = performance.now() - stageStarted;
    stageStarted = performance.now();
    resize(cssSize, pixelRatio);
    initialization.resizeMs = performance.now() - stageStarted;
    await yieldInitialization();

    const environment = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    const environmentCompileTarget = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace });
    const savedToneMapping = renderer.toneMapping;
    try {
      // Match PMREM's linear, untonemapped capture before its synchronous draw.
      stageStarted = performance.now();
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setRenderTarget(environmentCompileTarget);
      await awaitStage(renderer.compileAsync(environment, camera));
      initialization.environmentCompileMs = performance.now() - stageStarted;
      renderer.setRenderTarget(null);
      renderer.toneMapping = savedToneMapping;
      await yieldInitialization();
      stageStarted = performance.now();
      environmentTarget = generator.fromScene(environment, 0.04, 0.1, 100, { size: economical ? 32 : mobile ? 64 : 128 });
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = 1.12;
      scene.environmentRotation.set(0, 0.28, 0);
      initialization.environmentMs = performance.now() - stageStarted;
    } finally {
      if (!disposed) {
        renderer.setRenderTarget(null);
        renderer.toneMapping = savedToneMapping;
      }
      environmentCompileTarget.dispose();
      environment.dispose();
      generator.dispose();
    }
    await yieldInitialization();

    const geometryStarted = performance.now();
    const paths = parseBrandPaths(THREE);
    const partColors = ['#b69a58', '#bfa66e', '#94aa89', '#c2a052'];
    contourMaterial = new THREE.LineBasicMaterial({
      color: '#d9bd81',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    materials.add(contourMaterial);

    for (const [index, path] of paths.entries()) {
      const partStarted = performance.now();
      const definition = BRAND_PARTS[index];
      if (!definition) continue;
      const depth = index === 3 ? 108 : index === 1 ? 60 : 78;
      const geometry = new THREE.ExtrudeGeometry(path.toShapes(), {
        depth,
        steps: 1,
        curveSegments: segments,
        bevelEnabled: true,
        bevelSegments: mobile ? 3 : 5,
        bevelSize: index === 3 ? 9 : 5.5,
        bevelThickness: index === 3 ? 13 : 8,
      });
      geometry.translate(-650, -612, -depth / 2);
      geometry.scale(SOURCE_SCALE, -SOURCE_SCALE, -SOURCE_SCALE);
      geometry.computeBoundingBox();
      const pivot = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-pivot.x, -pivot.y, -pivot.z);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometries.add(geometry);

      const material = new THREE.MeshPhysicalMaterial({
        color: partColors[index],
        metalness: index === 2 ? 0.08 : index === 3 ? 0.88 : 0.76,
        roughness: index === 2 ? 0.46 : index === 3 ? 0.22 : 0.29,
        clearcoat: mobile ? 0 : index === 2 ? 0.16 : 0.35,
        clearcoatRoughness: 0.25,
      });
      attachNarrativeSurface(material, { uniforms, origin: pivot.clone(), part: index, diagnostics: shaderDiagnostics });
      materials.add(material);

      const group = new THREE.Group();
      group.name = `brand-${definition.name}`;
      group.position.copy(pivot);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = definition.name;
      group.add(mesh);

      const contours = [];
      const samples = [];
      for (const subpath of path.subPaths) {
        const pathPoints = subpath.getSpacedPoints(mobile ? 68 : 128);
        for (let pointIndex = 0; pointIndex < pathPoints.length - 1; pointIndex += 1) {
          const first = pathPoints[pointIndex];
          const second = pathPoints[pointIndex + 1];
          const front = depth * SOURCE_SCALE / 2 + 0.028;
          contours.push(
            (first.x - 650) * SOURCE_SCALE - pivot.x, -(first.y - 612) * SOURCE_SCALE - pivot.y, front,
            (second.x - 650) * SOURCE_SCALE - pivot.x, -(second.y - 612) * SOURCE_SCALE - pivot.y, front,
          );
          samples.push(new THREE.Vector3((first.x - 650) * SOURCE_SCALE - pivot.x, -(first.y - 612) * SOURCE_SCALE - pivot.y, front));
        }
      }
      const contourGeometry = new THREE.BufferGeometry();
      contourGeometry.setAttribute('position', new THREE.Float32BufferAttribute(contours, 3));
      geometries.add(contourGeometry);
      const contour = new THREE.LineSegments(contourGeometry, contourMaterial);
      group.add(contour);
      scene.add(group);
      parts.push({ name: definition.name, group, mesh, contour, pivot, geometry, material, samples, direction: PART_DIRECTION[index] });
      initialization.geometryPartsMs.push(performance.now() - partStarted);
      await yieldInitialization();
    }

    if (particleCount > 0) {
      particlePositions = new Float32Array(particleCount * 3);
      const partAttribute = new Float32Array(particleCount);
      const phaseAttribute = new Float32Array(particleCount);
      for (let index = 0; index < particleCount; index += 1) {
        const partIndex = index % parts.length;
        const part = parts[partIndex];
        const sampleIndex = Math.floor((index * 0.61803398875 % 1) * part.samples.length);
        const origin = part.samples[sampleIndex].clone();
        const phase = (index * 0.38196601125) % 1;
        particles.push({ partIndex, origin, phase, position: new THREE.Vector3() });
        partAttribute[index] = partIndex;
        phaseAttribute[index] = phase;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage));
      particleGeometry.setAttribute('aBrandPart', new THREE.BufferAttribute(partAttribute, 1));
      particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phaseAttribute, 1));
      geometries.add(particleGeometry);
      particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uPixelRatio: { value: pixelRatio },
          uPointSize: { value: mobile ? 2.4 : 3.0 },
          uOpacity: { value: 0 },
          uGold: { value: new THREE.Color('#d4b56f') },
          uSage: { value: new THREE.Color('#b6c7a4') },
          uBrandEnergy: uniforms.uBrandEnergy,
          uBrandFocus: uniforms.uBrandFocus,
        },
        vertexShader: contourParticleVertex,
        fragmentShader: contourParticleFragment,
        transparent: true,
        depthWrite: false,
      });
      materials.add(particleMaterial);
      points = new THREE.Points(particleGeometry, particleMaterial);
      points.frustumCulled = false;
      points.name = 'contour-constellation';
      scene.add(points);
    }
    initialization.geometryMs = performance.now() - geometryStarted;
    await yieldInitialization();
    // All variants (including initially transparent contours/points) compile
    // before the caller's first visible frame. No extra animation loop is used.
    stageStarted = performance.now();
    const compilation = renderer.compileAsync(scene, camera);
    initialization.compileSubmitMs = performance.now() - stageStarted;
    await awaitStage(compilation);
    initialization.compileMs = performance.now() - stageStarted;
    // PMREM's queued convolution must finish without a blocking gl.finish().
    stageStarted = performance.now();
    await waitForGpu();
    initialization.gpuReadyMs = performance.now() - stageStarted;
    stageStarted = performance.now();
    renderer.setScissor(0, 0, 1, 1);
    renderer.setScissorTest(true);
    renderer.info.reset();
    try {
      renderer.render(scene, camera);
      initialization.warmupDrawCalls = renderer.info.render.calls;
      if (shaderDiagnostics.errors.length > 0) throw new Error('The narrative material could not be compiled.');
      // Three can submit draw calls without throwing on a driver/GL error.
      // Never promote that canvas over the intact SVG fallback.
      if (context.isContextLost() || context.getError() !== context.NO_ERROR) {
        throw new Error('The sculpture GPU could not draw the brand surfaces.');
      }
    } finally {
      renderer.setScissorTest(false);
    }
    renderer.clear();
    initialization.warmupMs = performance.now() - stageStarted;
    stageStarted = performance.now();
    await waitForGpu();
    initialization.warmupGpuMs = performance.now() - stageStarted;
    initialization.totalMs = performance.now() - initializationStarted;
    initializing = false;
    clearTimeout(initializationDeadline);
    signal?.removeEventListener('abort', handleInitializationAbort);
  } catch (error) {
    disposeResources(true);
    if (error.name !== 'AbortError') notifyFailure(error.name === 'TimeoutError' ? 'initialization-timeout' : 'initialization', error);
    initializing = false;
    throw error;
  }

  function render(frame = {}) {
    if (disposed || contextLost) return false;
    const start = performance.now();
    const progress = unit(frame.progress);
    const opening = unit(frame.opening);
    const assembly = unit(frame.assembly, 1);
    const branch = unit(frame.branch);
    const energy = unit(frame.energy, 0.2);
    const focus = clamp(numberOr(frame.focus, 2), 0, 3);
    const poseFrom = Math.floor(focus);
    const poseTo = Math.min(poseFrom + 1, APPROACH_POSES.length - 1);
    const poseBlend = smooth(focus - poseFrom);
    const pointer = { x: unit(frame.pointer?.x, 0.5), y: unit(frame.pointer?.y, 0.5) };
    const cameraFrame = {
      azimuth: clamp(numberOr(frame.camera?.azimuth, -0.28), -1.45, 1.45),
      elevation: clamp(numberOr(frame.camera?.elevation, 0.12), -0.85, 0.85),
      distance: clamp(numberOr(frame.camera?.distance, 10.8 + opening * 4.2 + branch * 1.4), 7.5, 28),
    };
    uniforms.uBrandAssembly.value = assembly;
    uniforms.uBrandOpening.value = opening;
    uniforms.uBrandProgress.value = progress;
    uniforms.uBrandEnergy.value = energy;
    uniforms.uBrandFocus.value = focus;

    parts.forEach((part, index) => {
      const { direction, group, pivot } = part;
      const from = APPROACH_POSES[poseFrom].parts[index];
      const to = APPROACH_POSES[poseTo].parts[index];
      group.position.set(
        lerp(lerp(pivot.x, lerp(from.position[0], to.position[0], poseBlend), opening), direction.branch[0], branch),
        lerp(lerp(pivot.y, lerp(from.position[1], to.position[1], poseBlend), opening), direction.branch[1], branch),
        lerp(lerp(pivot.z, lerp(from.position[2], to.position[2], poseBlend), opening), direction.branch[2], branch),
      );
      group.rotation.set(
        lerp(lerp(from.rotation[0], to.rotation[0], poseBlend) * opening, direction.rotation[0] * opening * 0.7, branch),
        lerp(lerp(from.rotation[1], to.rotation[1], poseBlend) * opening, direction.rotation[1] * 0.6, branch),
        lerp(lerp(from.rotation[2], to.rotation[2], poseBlend) * opening, direction.rotation[2] * opening * 0.55, branch),
      );
      group.scale.setScalar(lerp(lerp(1, lerp(from.scale, to.scale, poseBlend), opening), direction.scale, branch));
      group.updateMatrixWorld(true);
    });

    contourMaterial.opacity = clamp((1 - assembly) * 0.7 + opening * 0.16 + branch * 0.13, 0, 0.76);
    for (const part of parts) part.contour.visible = contourMaterial.opacity > 0.005;
    const particleOpacity = clamp((1 - assembly) * 0.54 + opening * energy * 0.8 + branch * 0.5, 0, 0.9);
    if (points) {
      points.visible = particleOpacity > 0.01;
      particleMaterial.uniforms.uOpacity.value = particleOpacity;
      if (points.visible) {
        particles.forEach((particle, index) => {
          const { partIndex, origin, phase, position } = particle;
          const part = parts[partIndex];
          position.copy(origin).applyMatrix4(part.group.matrixWorld);
          const phaseAngle = phase * TAU + progress * TAU * 0.22;
          const drift = opening * (0.08 + energy * 0.58) + (1 - assembly) * 0.32;
          position.x += Math.cos(phaseAngle) * drift;
          position.y += Math.sin(phaseAngle) * drift;
          position.z += Math.sin(phaseAngle * 1.7) * drift * 1.6;
          if (branch > 0) {
            const anchorX = partIndex < 2 ? -2.55 : 2.35;
            position.x = lerp(position.x, anchorX + (origin.x + part.pivot.x) * 0.75, branch * 0.72);
            position.y = lerp(position.y, (origin.y + part.pivot.y) * 0.78, branch * 0.72);
            position.z += Math.sin(phaseAngle) * branch * 0.68;
          }
          particlePositions[index * 3] = position.x;
          particlePositions[index * 3 + 1] = position.y;
          particlePositions[index * 3 + 2] = position.z;
        });
        points.geometry.attributes.position.needsUpdate = true;
      }
    }

    const azimuth = cameraFrame.azimuth + (pointer.x - 0.5) * 0.20;
    const elevation = cameraFrame.elevation - (pointer.y - 0.5) * 0.11;
    const targetZ = opening * 0.42 + branch * 0.18;
    camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * cameraFrame.distance,
      Math.sin(elevation) * cameraFrame.distance + 0.12,
      Math.cos(azimuth) * Math.cos(elevation) * cameraFrame.distance + targetZ,
    );
    camera.lookAt(0, 0.12, targetZ);
    camera.updateMatrixWorld();
    keyLight.intensity = 3.0 + energy * 0.45;
    rimLight.intensity = 2.8 + energy * 1.6;
    lastFrame = { scene: frame.scene ?? 'brand', progress, opening, assembly, focus, branch, energy, camera: cameraFrame, pointer };
    lastPose = { from: APPROACH_POSES[poseFrom].name, to: APPROACH_POSES[poseTo].name, blend: poseBlend, opening, branch };

    try {
      renderer.info.reset();
      renderer.render(scene, camera);
      if (shaderDiagnostics.errors.length > 0) throw new Error('The narrative material could not be compiled.');
      frames += 1;
      lastDrawCalls = renderer.info.render.calls;
      renderCalls += lastDrawCalls;
      lastTriangles = renderer.info.render.triangles;
      lastPointCount = renderer.info.render.points;
      lastFrameCpuMs = performance.now() - start;
      if (frames === 1) firstFrameCpuMs = lastFrameCpuMs;
      return true;
    } catch (error) {
      disposeResources(true);
      notifyFailure('render', error);
      return false;
    }
  }

  function getStats() {
    const rounding = (value) => Math.round(value * 1000) / 1000;
    const vector = (value) => value.toArray().map(rounding);
    return {
      mode,
      disposed,
      contextLost,
      frames,
      renderCalls,
      lastDrawCalls,
      lastFrameCpuMs: rounding(lastFrameCpuMs),
      firstFrameCpuMs: rounding(firstFrameCpuMs),
      initialization: Object.fromEntries(Object.entries(initialization).map(([key, value]) => [key, typeof value === 'number' ? rounding(value) : Array.isArray(value) ? value.map(rounding) : value])),
      frame: lastFrame,
      pose: lastPose,
      camera: {
        fov: camera.fov,
        aspect: rounding(camera.aspect),
        near: camera.near,
        far: camera.far,
        position: vector(camera.position),
        azimuth: lastFrame?.camera.azimuth ?? null,
        elevation: lastFrame?.camera.elevation ?? null,
        distance: lastFrame?.camera.distance ?? null,
        recommendedDistance: { assembled: [9.5, 11], open: [13, 16], branch: [13, 15], focus: [13.6, 13, 13.6, 12.4] },
      },
      parts: parts.map(({ name, group, geometry }) => ({
        name,
        position: vector(group.position),
        rotation: [group.rotation.x, group.rotation.y, group.rotation.z].map(rounding),
        scale: rounding(group.scale.x),
        vertices: geometry.attributes.position.count,
      })),
      resources: {
        geometries: geometries.size,
        materials: materials.size,
        environmentTargets: environmentTarget ? 1 : 0,
        environmentResolution: economical ? 32 : mobile ? 64 : 128,
        gpuGeometries: disposed ? 0 : renderer.info.memory.geometries,
        gpuTextures: disposed ? 0 : renderer.info.memory.textures,
        programs: disposed ? 0 : renderer.info.programs.length,
        pendingGpuWaits: pendingGpuWaits.size,
        triangles: disposed ? 0 : lastTriangles,
        points: disposed ? 0 : lastPointCount,
        particleCount: disposed ? 0 : particleCount,
        segments,
        size: { ...cssSize },
        dpr: pixelRatio,
      },
      shader: {
        variant: 'gislaine-narrative-surface-v2',
        compilations: shaderDiagnostics.compilations,
        compiledParts: [...shaderDiagnostics.parts],
        errors: [...shaderDiagnostics.errors],
        uniforms: {
          assembly: uniforms.uBrandAssembly.value,
          opening: uniforms.uBrandOpening.value,
          progress: uniforms.uBrandProgress.value,
          energy: uniforms.uBrandEnergy.value,
          focus: uniforms.uBrandFocus.value,
        },
      },
    };
  }

  return { render, resize, dispose: () => disposeResources(true), getStats };
}
