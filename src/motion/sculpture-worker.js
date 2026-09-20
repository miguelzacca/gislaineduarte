import { createSculpture } from './sculpture.js';

let canvas;
let runtime;
let context;
let frameFence;
let frameTimer;
let resolveFrame;
let disposed = false;
let busy = false;
let frameGpuMs = 0;
let lastSize = '';
const initialization = new AbortController();

function cancelFrame() {
  clearTimeout(frameTimer);
  if (frameFence && context && !context.isContextLost()) context.deleteSync(frameFence);
  frameFence = null;
  resolveFrame?.(false);
  resolveFrame = null;
}

function release() {
  if (disposed) return;
  disposed = true;
  cancelFrame();
  initialization.abort();
  runtime?.dispose();
}

function fail(reason, error) {
  if (disposed) return;
  release();
  self.postMessage({ type: 'failure', reason, stats: runtime?.getStats(), error: { name: error?.name ?? 'Error', message: error?.message ?? reason, initialization: error?.initialization } });
  self.close();
}

// One finite completion check per requested frame, never a worker animation loop.
function commitFrame() {
  const started = performance.now();
  frameFence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!frameFence) return Promise.resolve(false);
  context.flush();
  return new Promise(resolve => {
    resolveFrame = resolve;
    const check = () => {
      if (disposed || context.isContextLost()) { cancelFrame(); return; }
      const state = context.clientWaitSync(frameFence, 0, 0);
      if (state === context.WAIT_FAILED || performance.now() - started > 2000) {
        cancelFrame();
        return;
      }
      if (state === context.ALREADY_SIGNALED || state === context.CONDITION_SATISFIED) {
        context.deleteSync(frameFence);
        frameFence = null;
        frameGpuMs = performance.now() - started;
        // Let the worker's rendering-update step publish its completed bitmap.
        frameTimer = setTimeout(() => {
          resolveFrame = null;
          resolve(!disposed);
        }, 0);
      } else {
        frameTimer = setTimeout(check, 4);
      }
    };
    frameTimer = setTimeout(check, 0);
  });
}

self.addEventListener('message', async event => {
  const message = event.data;
  if (!message || typeof message.type !== 'string') return;
  if (message.type === 'dispose') {
    release();
    self.postMessage({ type: 'disposed', stats: runtime?.getStats() });
    self.close();
    return;
  }
  if (disposed) return;
  if (message.type === 'initialize') {
    if (canvas) return;
    canvas = message.canvas;
    try {
      runtime = await createSculpture({
        canvas, quality: message.quality, signal: initialization.signal,
        onContextLost: ({ reason, error }) => fail(reason, error),
      });
      if (disposed) { runtime.dispose(); return; }
      context = canvas.getContext('webgl2');
      self.postMessage({ type: 'initialized', stats: runtime.getStats() });
    } catch (error) {
      if (!disposed) fail('worker-initialization', error);
    }
    return;
  }
  if (message.type === 'lose-context') {
    // Diagnostic command exercises a real GPU context loss, not a mocked result.
    canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    return;
  }
  if (message.type !== 'frame' || !runtime || busy) return;
  busy = true;
  try {
    if (message.size) {
      const sizeKey = `${message.size.width}:${message.size.height}:${message.dpr}`;
      if (sizeKey !== lastSize) { runtime.resize(message.size, message.dpr); lastSize = sizeKey; }
    }
    if (!runtime.render(message.frame)) {
      if (!disposed) fail('worker-render', new Error('The sculpture could not render this frame.'));
      return;
    }
    if (!await commitFrame()) {
      if (!disposed) fail('worker-frame-timeout', new Error('The sculpture GPU did not complete its frame.'));
      return;
    }
    self.postMessage({
      type: 'rendered', id: message.id, metadata: message.metadata,
      stats: { ...runtime.getStats(), workerFrameGpuMs: frameGpuMs },
    });
  } catch (error) {
    if (!disposed) fail('worker-render', error);
  } finally {
    busy = false;
  }
});

const probeStarted = performance.now();
let supported = false;
if (typeof OffscreenCanvas === 'function' && typeof self.cancelAnimationFrame === 'function') {
  try {
    const probe = new OffscreenCanvas(1, 1);
    const probeContext = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    supported = Boolean(probeContext);
    probeContext?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* The untouched HTML canvas can still use the main-thread engine. */ }
}
self.postMessage({ type: 'available', supported, probeMs: performance.now() - probeStarted });
