import * as THREE from 'three';

const canUseWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

export function mountRecipeCardsScene(host) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData;
  if (!host || reducedMotion || saveData || !canUseWebGL()) return () => {};

  const mount = host.querySelector('[data-recipe-scene-canvas]');
  if (!mount) return () => {};
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  mount.append(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default' });
  } catch {
    canvas.remove();
    return () => {};
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0.15, 10.8);
  scene.add(new THREE.HemisphereLight('#fff5df', '#173f35', 2.2));
  const key = new THREE.DirectionalLight('#fff4dc', 4.2);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#d9bf85', 2.6);
  rim.position.set(5, -1, 4);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);
  const geometry = new THREE.BoxGeometry(2.6, 3.55, 0.065, 1, 1, 1);
  const edgeMaterial = new THREE.MeshPhysicalMaterial({ color: '#eee8da', roughness: 0.82, metalness: 0, clearcoat: 0.12 });
  const backMaterial = new THREE.MeshPhysicalMaterial({ color: '#173f35', roughness: 0.72, metalness: 0, clearcoat: 0.15 });
  const imageUrls = (host.dataset.sceneImages || '').split('|').filter(Boolean).slice(0, 7);
  const loader = new THREE.TextureLoader();
  const meshes = [];
  const materials = [];

  imageUrls.forEach((url, index) => {
    const face = new THREE.MeshPhysicalMaterial({ color: index % 2 ? '#a6b49a' : '#d9bf85', roughness: 0.76, clearcoat: 0.12 });
    materials.push(face);
    loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      face.map = texture;
      face.needsUpdate = true;
    });
    const mesh = new THREE.Mesh(geometry, [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, face, backMaterial]);
    const spread = index - 3;
    mesh.position.set(spread * 0.32, Math.abs(spread) * -0.025, index * -0.13);
    mesh.rotation.set(-0.025 * spread, -0.085 * spread, -0.045 * spread);
    mesh.userData = { baseY: mesh.position.y, phase: index * 0.58 };
    group.add(mesh);
    meshes.push(mesh);
  });

  const orbit = new THREE.Group();
  const orbitGeometry = new THREE.SphereGeometry(0.09, 14, 10);
  const orbitColors = ['#b69a58', '#a6b49a', '#806624'];
  for (let index = 0; index < 9; index += 1) {
    const dot = new THREE.Mesh(orbitGeometry, new THREE.MeshPhysicalMaterial({ color: orbitColors[index % orbitColors.length], roughness: 0.55 }));
    const angle = index / 9 * Math.PI * 2;
    dot.position.set(Math.cos(angle) * (2.25 + index % 2 * .32), Math.sin(angle) * 2.05, -.4 + index % 3 * .22);
    orbit.add(dot);
  }
  group.add(orbit);

  let visible = false;
  let frame = 0;
  let last = 0;
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };

  const resize = () => {
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const render = (time = 0) => {
    frame = 0;
    if (!visible || document.hidden) return;
    if (time - last < 30) {
      frame = requestAnimationFrame(render);
      return;
    }
    last = time;
    pointer.x += (target.x - pointer.x) * .045;
    pointer.y += (target.y - pointer.y) * .045;
    const seconds = time * .001;
    group.rotation.y = pointer.x * .13 + Math.sin(seconds * .24) * .035;
    group.rotation.x = pointer.y * -.08 + Math.cos(seconds * .2) * .018;
    group.position.y = Math.sin(seconds * .38) * .045;
    orbit.rotation.z = seconds * .055;
    orbit.rotation.y = seconds * .035;
    meshes.forEach((mesh, index) => {
      mesh.position.y = mesh.userData.baseY + Math.sin(seconds * .42 + mesh.userData.phase) * .015;
      mesh.rotation.z = -0.045 * (index - 3) + Math.sin(seconds * .25 + index) * .006;
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };

  const start = () => {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render);
  };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const onPointer = (event) => {
    const bounds = host.getBoundingClientRect();
    target.x = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - .5) * 2;
    target.y = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - .5) * 2;
  };
  const onLeave = () => { target.x = 0; target.y = 0; };
  const onVisibility = () => document.hidden ? stop() : start();
  const onContextLost = (event) => { event.preventDefault(); stop(); delete host.dataset.sceneReady; };

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio > 0.05;
    if (visible) start(); else stop();
  }, { threshold: [0, .05, .25] });
  resizeObserver.observe(host);
  intersectionObserver.observe(host);
  host.addEventListener('pointermove', onPointer, { passive: true });
  host.addEventListener('pointerleave', onLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  resize();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  host.dataset.sceneReady = '';

  return () => {
    stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    host.removeEventListener('pointermove', onPointer);
    host.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    geometry.dispose();
    orbitGeometry.dispose();
    for (const material of materials) {
      material.map?.dispose();
      material.dispose();
    }
    edgeMaterial.dispose();
    backMaterial.dispose();
    for (const child of orbit.children) child.material.dispose();
    renderer.dispose();
    canvas.remove();
    delete host.dataset.sceneReady;
  };
}

