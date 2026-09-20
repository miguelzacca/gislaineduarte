const INITIALIZATION_TIMEOUT = 6000;
const noOp = () => {};
const abortError = () => new DOMException('Sculpture initialization was cancelled.', 'AbortError');

function framePacket(frame) {
  return {
    frame: {
      scene: frame.scene, progress: frame.progress, opening: frame.opening,
      assembly: frame.assembly, focus: frame.focus, branch: frame.branch, energy: frame.energy,
      camera: frame.camera ? { azimuth: frame.camera.azimuth, elevation: frame.camera.elevation, distance: frame.camera.distance } : undefined,
      pointer: frame.pointer ? { x: frame.pointer.x, y: frame.pointer.y } : undefined,
    },
    metadata: {
      phase: frame.intro?.phase ?? frame.scene ?? 'brand',
      progress: frame.intro?.progress ?? frame.progress ?? 0,
      azimuth: frame.camera?.azimuth ?? 0,
      distance: frame.camera?.distance ?? 10.8,
    },
  };
}

function publishFrame(canvas, metadata, frames) {
  const { phase, progress, azimuth, distance } = metadata;
  canvas.dataset.workerReady = 'true';
  canvas.dataset.workerPhase = String(phase);
  canvas.dataset.workerProgress = String(progress);
  canvas.dataset.workerAzimuth = String(azimuth);
  canvas.dataset.workerDistance = String(distance);
  canvas.dataset.workerRenderCount = String(frames);
  canvas.dataset.renderedPhase = String(phase);
  canvas.dataset.renderedProgress = String(progress);
}

async function createMainThread(options) {
  const { createSculpture } = await import('./sculpture.js');
  if (options.signal?.aborted) throw abortError();
  let ready = false;
  const runtime = await createSculpture({ ...options, onContextLost: information => { ready = false; options.onContextLost(information); } });
  options.canvas.dataset.rendererThread = 'main';
  return {
    ...runtime,
    render: frame => { const rendered = runtime.render(frame); ready = rendered; return rendered; },
    isReady: () => ready,
    dispose: () => { ready = false; runtime.dispose(); },
    getStats: () => ({ ...runtime.getStats(), thread: 'main' }),
  };
}

/** The main thread supplies frames; one worker owns the unchanged PBR engine. */
export async function createSculpture({ canvas, quality = {}, signal, onContextLost = noOp, onInvalidate = noOp } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas is required for the brand sculpture.');
  if (signal?.aborted) throw abortError();
  const options = { canvas, quality, signal, onContextLost, onInvalidate };
  if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function' || typeof canvas.transferControlToOffscreen !== 'function') {
    return quality.mode === 'mobile' ? null : createMainThread(options);
  }

  const started = performance.now();
  let probeMs = 0;
  let workerProbeMs = 0;
  let worker;
  try {
    worker = new Worker(new URL('./sculpture-worker.js', import.meta.url), { type: 'module', name: 'gislaine-brand-sculpture' });
  } catch {
    return quality.mode === 'mobile' ? null : createMainThread(options);
  }

  let disposed = false;
  let terminated = false;
  let transferred = false;
  let initialized = false;
  let ready = false;
  let settled = false;
  let notified = false;
  let inFlight = null;
  let latest = null;
  let lastAcknowledged = '';
  let sequence = 0;
  let posted = 0;
  let coalesced = 0;
  let acknowledgments = 0;
  let stats = null;
  let deadline;
  let frameDeadline;
  let termination;
  let resolveCreation;
  let rejectCreation;
  const mobile = quality.mode === 'mobile';
  let dimensions = { width: mobile ? 440 : 720, height: mobile ? 440 : 720 };
  let dpr = quality.dpr ?? 1;

  function terminate() {
    if (terminated) return;
    terminated = true;
    clearTimeout(termination);
    worker.removeEventListener('message', receive);
    worker.removeEventListener('error', workerError);
    worker.removeEventListener('messageerror', messageError);
    worker.terminate();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    ready = false;
    latest = null;
    inFlight = null;
    clearTimeout(deadline);
    clearTimeout(frameDeadline);
    signal?.removeEventListener('abort', cancelCreation);
    canvas.dataset.workerReady = 'false';
    canvas.dataset.workerPending = 'false';
    canvas.dataset.rendererState = 'disposed';
    try {
      worker.postMessage({ type: 'dispose' });
      termination = setTimeout(terminate, 80);
    } catch { terminate(); }
  }

  function fail(reason, error) {
    if (disposed) return;
    dispose();
    canvas.dataset.rendererState = 'failed';
    if (!settled) { settled = true; rejectCreation(error); }
    if (!notified) {
      notified = true;
      onContextLost({ reason, error });
      onInvalidate();
    }
  }

  function cancelCreation() {
    if (settled) return;
    dispose();
    settled = true;
    rejectCreation(abortError());
  }

  function flush() {
    if (disposed || !initialized || inFlight || !latest) return;
    inFlight = latest;
    latest = null;
    canvas.dataset.workerPending = 'true';
    try {
      worker.postMessage({
        type: 'frame', id: inFlight.id, frame: inFlight.frame, metadata: inFlight.metadata,
        size: inFlight.size, dpr: inFlight.dpr,
      });
      posted += 1;
      frameDeadline = setTimeout(() => fail('worker-frame-timeout', new Error('The sculpture worker did not acknowledge its frame.')), mobile ? 1200 : 3000);
    } catch (error) { fail('worker-message', error); }
  }

  function render(frame = {}) {
    if (disposed || !initialized) return false;
    const packet = { ...framePacket(frame), size: { ...dimensions }, dpr };
    const key = JSON.stringify(packet);
    if (inFlight?.key === key || !inFlight && lastAcknowledged === key) { latest = null; return true; }
    if (latest?.key === key) return true;
    if (latest) coalesced += 1;
    latest = { ...packet, key, id: ++sequence };
    flush();
    return !disposed;
  }

  function resize(size, nextDpr = dpr) {
    if (disposed) return;
    const width = typeof size === 'number' ? size : size?.width;
    const height = typeof size === 'number' ? size : size?.height;
    dimensions = {
      width: Number.isFinite(width) ? Math.max(16, Math.min(2048, Math.round(width))) : dimensions.width,
      height: Number.isFinite(height) ? Math.max(16, Math.min(2048, Math.round(height))) : dimensions.height,
    };
    if (Number.isFinite(nextDpr)) dpr = Math.max(.75, Math.min(mobile ? 1.25 : 1.5, nextDpr));
  }

  function getStats() {
    const resources = { ...stats?.resources, workers: terminated ? 0 : 1 };
    if (terminated) for (const key of ['geometries', 'materials', 'environmentTargets', 'gpuGeometries', 'gpuTextures', 'programs', 'pendingGpuWaits', 'triangles', 'points', 'particleCount']) resources[key] = 0;
    return {
      ...stats, thread: 'worker', disposed, disposing: disposed && !terminated, terminated, resources,
      transport: { ready, inFlight: Boolean(inFlight), queued: Boolean(latest), requested: sequence, posted, acknowledgments, coalesced, probeMs, workerProbeMs, initializationMs: initialized ? initializationMs : null },
    };
  }

  let initializationMs = 0;
  const api = { render, resize, getStats, isReady: () => ready && !disposed, dispose };

  function receive(event) {
    const message = event.data;
    if (message?.type === 'disposed') { stats = message.stats ?? stats; terminate(); return; }
    if (disposed || !message) return;
    if (message.type === 'available') {
      if (transferred) return;
      workerProbeMs = message.probeMs ?? 0;
      if (!message.supported) {
        clearTimeout(deadline);
        signal?.removeEventListener('abort', cancelCreation);
        terminate();
        disposed = true;
        settled = true;
        (mobile ? Promise.resolve(null) : createMainThread(options)).then(resolveCreation, rejectCreation);
        return;
      }
      try {
        // Worker bootstraps the driver; the real HTML probe still happens before
        // transfer and honors environments that disable HTMLCanvas WebGL.
        const probeStarted = performance.now();
        const probe = canvas.ownerDocument.createElement('canvas');
        probe.width = 1;
        probe.height = 1;
        const context = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
        probeMs = performance.now() - probeStarted;
        if (!context) { fail('unavailable', new Error('WebGL2 is unavailable; retain the SVG composition.')); return; }
        context.getExtension('WEBGL_lose_context')?.loseContext();
        const offscreen = canvas.transferControlToOffscreen();
        transferred = true;
        canvas.dataset.rendererThread = 'worker';
        canvas.dataset.rendererState = 'loading';
        worker.postMessage({ type: 'initialize', canvas: offscreen, quality: { mode: quality.mode, dpr: quality.dpr, segments: quality.segments, particles: quality.particles } }, [offscreen]);
      } catch (error) { fail('worker-transfer', error); }
    } else if (message.type === 'initialized') {
      initialized = true;
      stats = message.stats;
      initializationMs = performance.now() - started;
      clearTimeout(deadline);
      signal?.removeEventListener('abort', cancelCreation);
      if (!settled) { settled = true; resolveCreation(api); }
    } else if (message.type === 'rendered') {
      if (!inFlight || message.id !== inFlight.id) return;
      clearTimeout(frameDeadline);
      lastAcknowledged = inFlight.key;
      inFlight = null;
      stats = message.stats;
      acknowledgments += 1;
      publishFrame(canvas, message.metadata, stats.frames);
      canvas.dataset.rendererState = 'ready';
      canvas.dataset.workerPending = 'false';
      const first = !ready;
      ready = true;
      flush();
      if (first) onInvalidate();
    } else if (message.type === 'failure') {
      stats = message.stats ?? stats;
      const error = new Error(message.error?.message ?? 'The sculpture worker is unavailable.');
      error.name = message.error?.name ?? 'Error';
      if (message.error?.initialization) error.initialization = message.error.initialization;
      fail(message.reason ?? 'worker', error);
    }
  }

  function workerError(event) {
    event.preventDefault();
    fail('worker-error', new Error(event.message || 'The sculpture worker could not be loaded.'));
  }

  function messageError() { fail('worker-message', new Error('The sculpture worker message could not be decoded.')); }

  return new Promise((resolve, reject) => {
    resolveCreation = resolve;
    rejectCreation = reject;
    worker.addEventListener('message', receive);
    worker.addEventListener('error', workerError);
    worker.addEventListener('messageerror', messageError);
    signal?.addEventListener('abort', cancelCreation, { once: true });
    deadline = setTimeout(() => {
      const error = new Error('Sculpture initialization timed out; retain the SVG composition.');
      error.name = 'TimeoutError';
      fail('initialization-timeout', error);
    }, Math.max(0, (mobile ? 2600 : INITIALIZATION_TIMEOUT) - (performance.now() - started)));
    if (signal?.aborted) cancelCreation();
  });
}
