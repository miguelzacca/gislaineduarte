import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { clamp, ease, mix, range, sampleMotion, sampleRenderBudget, selectQuality } from '../../src/motion/model.js';

const viewport = Object.freeze({ width: 1440, height: 1000 });

function fixture() {
  return {
    hero: { left: 920, top: 160, width: 220, height: 220 },
    heroBottom: 900,
    pin: { top: 1200, bottom: 3500, height: 700, inset: 106, centerY: 350, x: 360, size: 400 },
    story: { left: 120, top: 3700, width: 560, height: 700 },
    services: { left: 660, top: 4700, width: 160, height: 160 },
    contact: { left: 1060, top: 6200, width: 180, height: 180 },
    end: 7600,
  };
}

function boundaries(layout, height = viewport.height) {
  const pinStart = layout.pin.top - layout.pin.inset;
  const pinEnd = Math.max(pinStart + 1, layout.pin.bottom - layout.pin.height - layout.pin.inset);
  const storyAt = Math.max(pinEnd + 1, layout.story.top - height * 0.12);
  const servicesAt = Math.max(storyAt + 1, layout.services.top - height * 0.28);
  const contactAt = Math.max(servicesAt + 1, layout.contact.top - height * 0.52);
  return { pinStart, pinEnd, storyAt, servicesAt, contactAt };
}

function assertFinite(value, path = 'frame') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path} deve ser finito: ${value}`);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertFinite(child, `${path}.${key}`);
  }
}

function freezeTree(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}

describe('primitivas do progresso', () => {
  test('clamp limita valores e usa limite inferior para entradas não finitas', () => {
    assert.equal(clamp(-10), 0);
    assert.equal(clamp(0.4), 0.4);
    assert.equal(clamp(10), 1);
    assert.equal(clamp(7, 2, 4), 4);
    for (const value of [NaN, Infinity, -Infinity, undefined]) assert.equal(clamp(value, 2, 4), 2);
  });

  test('mix preserva extremos e não extrapola', () => {
    assert.equal(mix(12, 32, -1), 12);
    assert.equal(mix(12, 32, 0.5), 22);
    assert.equal(mix(12, 32, 2), 32);
    assert.equal(mix(32, 12, 0.5), 22);
  });

  test('range normaliza distâncias físicas e limita extremos', () => {
    assert.equal(range(100, 500, 0), 0);
    assert.equal(range(100, 500, 100), 0);
    assert.equal(range(100, 500, 300), 0.5);
    assert.equal(range(100, 500, 900), 1);
  });

  test('range não divide por zero em seção sem distância disponível', () => {
    for (const value of [-10, 100, 100.5, 1000]) {
      const progress = range(100, 100, value);
      assert.ok(Number.isFinite(progress));
      assert.ok(progress >= 0 && progress <= 1);
    }
    assert.equal(range(100, 100, 100), 0);
    assert.equal(range(100, 100, 101), 1);
  });

  test('ease é monotônico, simétrico e respeita endpoints', () => {
    let previous = 0;
    for (let index = 0; index <= 100; index += 1) {
      const progress = index / 100;
      const value = ease(progress);
      assert.ok(value >= previous && value <= 1);
      assert.ok(Math.abs(value + ease(1 - progress) - 1) < 1e-12);
      previous = value;
    }
    assert.equal(ease(-1), 0);
    assert.equal(ease(0), 0);
    assert.equal(ease(0.5), 0.5);
    assert.equal(ease(1), 1);
    assert.equal(ease(2), 1);
  });
});

describe('qualidade por capacidade e preferência', () => {
  test('desktop capaz recebe WebGL com DPR limitado', () => {
    const quality = selectQuality({ width: 1440, dpr: 3, memory: 8, cores: 8 });
    assert.equal(quality.mode, 'full');
    assert.equal(quality.webgl, true);
    assert.ok(quality.dpr > 0 && quality.dpr <= 1.5);
    assert.ok(quality.segments > 0);
  });

  for (const width of [320, 375, 390, 430, 767]) {
    test(`mobile capaz de ${width} px não perde WebGL apenas pela largura`, () => {
      const mobile = selectQuality({ width, dpr: 3, memory: 8, cores: 8 });
      const desktop = selectQuality({ width: 1440, dpr: 3, memory: 8, cores: 8 });
      assert.equal(mobile.mode, 'mobile');
      assert.equal(mobile.webgl, true);
      assert.ok(mobile.dpr > 0 && mobile.dpr <= 1.25);
      assert.ok(mobile.segments < desktop.segments);
      assert.ok(mobile.particles <= desktop.particles);
    });
  }

  test('768 px troca composição sem desligar a cena', () => {
    assert.equal(selectQuality({ width: 768 }).mode, 'full');
    assert.equal(selectQuality({ width: 768 }).webgl, true);
  });

  test('movimento reduzido tem prioridade sobre capacidade e largura', () => {
    for (const width of [320, 1440]) {
      const quality = selectQuality({ width, reducedMotion: true, saveData: true });
      assert.equal(quality.mode, 'reduced');
      assert.equal(quality.webgl, false);
      assert.equal(quality.particles, 0);
    }
  });

  for (const restriction of [{ saveData: true }, { effectiveType: '2g' }, { effectiveType: 'slow-2g' }, { memory: 2 }, { cores: 2 }]) {
    test(`restrição explícita escolhe SVG narrativo: ${JSON.stringify(restriction)}`, () => {
      const quality = selectQuality({ width: 390, ...restriction });
      assert.equal(quality.mode, 'lite');
      assert.equal(quality.webgl, false);
      assert.equal(quality.particles, 0);
    });
  }

  test('APIs opcionais ausentes preservam uma decisão finita e utilizável', () => {
    const quality = selectQuality({ width: 390, memory: undefined, cores: undefined, effectiveType: undefined });
    assert.equal(quality.webgl, true);
    assert.equal(quality.dpr, 1);
    assert.equal(quality.particles, 24);
    assertFinite(quality, 'quality');
  });

  test('mobile intermediario conserva WebGL com custo menor', () => {
    const quality = selectQuality({ width: 390, dpr: 3, memory: 4, cores: 4 });
    assert.equal(quality.mode, 'mobile');
    assert.equal(quality.webgl, true);
    assert.equal(quality.dpr, 1);
    assert.equal(quality.segments, 6);
    assert.equal(quality.particles, 24);
  });

  test('DPR reage a quatro ACKs GPU lentos, nao a repeticao de um unico frame', () => {
    let budget = { dpr: 1.25, heavyFrames: 0, lastSample: 0 };
    for (let sample = 1; sample <= 3; sample += 1) {
      budget = sampleRenderBudget(budget, { sample, mainMs: 2, cpuMs: 5, gpuMs: 39 });
      assert.equal(budget.dpr, 1.25);
    }
    assert.equal(sampleRenderBudget(budget, { sample: 3, gpuMs: 999 }), budget);
    budget = sampleRenderBudget(budget, { sample: 4, mainMs: 2, cpuMs: 5, gpuMs: 39 });
    assert.equal(budget.dpr, 1);
    assert.equal(budget.heavyFrames, 0);
    for (let sample = 5; sample <= 9; sample += 1) budget = sampleRenderBudget(budget, { sample, gpuMs: 10 });
    assert.equal(budget.dpr, 1);
    assert.equal(budget.heavyFrames, 0);
  });
});

describe('amostragem determinística da narrativa', () => {
  test('não modifica layout/viewport e produz o mesmo estado ao voltar ao mesmo scroll', () => {
    const layout = freezeTree(fixture());
    const before = structuredClone(layout);
    const first = sampleMotion(layout, 2100, viewport);
    for (const y of [0, 500, 3100, 5200, 6600, 1000]) sampleMotion(layout, y, viewport);
    assert.deepEqual(sampleMotion(layout, 2100, viewport), first);
    assert.deepEqual(layout, before);
  });

  test('atravessa nascimento, abertura, pin, história, bifurcação e recomposição', () => {
    const layout = fixture();
    const { pinStart, pinEnd, storyAt, servicesAt, contactAt } = boundaries(layout);
    const samples = [
      [0, 'hero'],
      [(Math.max(0, layout.heroBottom - viewport.height * 0.78) + pinStart) / 2, 'unfold'],
      [(pinStart + pinEnd) / 2, 'approach'],
      [(pinEnd + storyAt) / 2, 'story'],
      [(storyAt + servicesAt) / 2, 'story'],
      [(servicesAt + contactAt) / 2, 'services'],
      [layout.contact.top, 'recompose'],
    ];
    for (const [scroll, scene] of samples) assert.equal(sampleMotion(layout, scroll, viewport).scene, scene);
  });

  test('quatro focos movem câmera e mantêm o organismo dentro da caixa sticky', () => {
    const layout = fixture();
    const { pinStart, pinEnd } = boundaries(layout);
    const frames = [0, 1 / 3, 2 / 3, 1].map(progress => sampleMotion(layout, pinStart + (pinEnd - pinStart) * progress, viewport));
    for (const [index, frame] of frames.entries()) {
      assert.equal(frame.scene, 'approach');
      assert.ok(Math.abs(frame.focus - index) < 1e-10);
      assert.equal(frame.world.x, layout.pin.x);
      assert.equal(frame.world.y, layout.pin.inset + layout.pin.centerY);
      assert.equal(frame.world.size, layout.pin.size);
    }
    assert.ok(Math.abs(frames.at(-1).camera.azimuth - frames[0].camera.azimuth) > 0.5);
    assert.ok(frames[1].opening > frames[0].opening);
    assert.equal(new Set(frames.map(frame => JSON.stringify(frame.camera))).size, 4);
  });

  test('centro e escala viajam entre âncoras, não apenas opacidade', () => {
    const layout = fixture();
    const { pinStart, pinEnd, servicesAt } = boundaries(layout);
    const hero = sampleMotion(layout, 0, viewport);
    const pin = sampleMotion(layout, (pinStart + pinEnd) / 2, viewport);
    const services = sampleMotion(layout, servicesAt, viewport);
    const contact = sampleMotion(layout, layout.contact.top, viewport);
    assert.ok(Math.hypot(hero.world.x - pin.world.x, hero.world.y - pin.world.y) > hero.world.size);
    assert.ok(Math.abs(services.world.x - pin.world.x) > pin.world.size * 0.8);
    assert.ok(Math.abs(contact.world.x - services.world.x) > services.world.size);
    assert.notEqual(hero.world.size, pin.world.size);
    for (const frame of [hero, pin, services, contact]) assert.equal(frame.world.opacity, 1);
  });

  test('ramos se abrem nos serviços e voltam à forma final', () => {
    const layout = fixture();
    const { servicesAt } = boundaries(layout);
    const branch = sampleMotion(layout, servicesAt + 10, viewport);
    const final = sampleMotion(layout, layout.contact.top, viewport);
    assert.equal(branch.scene, 'services');
    assert.ok(branch.branch > 0.9);
    assert.equal(final.scene, 'recompose');
    assert.equal(final.branch, 0);
    assert.equal(final.opening, 0);
    assert.equal(final.recompose, 1);
    assert.equal(final.assembly, 1);
  });

  test('trajetória de centro/escala é contínua nos limites das cenas', () => {
    const layout = fixture();
    for (const [name, scroll] of Object.entries(boundaries(layout))) {
      const before = sampleMotion(layout, scroll - 0.0001, viewport);
      const after = sampleMotion(layout, scroll + 0.0001, viewport);
      for (const key of ['x', 'y', 'size', 'opacity']) {
        assert.ok(Math.abs(before.world[key] - after.world[key]) < 0.01, `${name}: world.${key} não pode saltar`);
      }
      assert.ok(Math.abs(before.opening - after.opening) < 0.005, `${name}: opening não pode saltar`);
      assert.ok(Math.abs(before.branch - after.branch) < 0.005, `${name}: branch não pode saltar`);
    }
  });

  test('câmera não muda de pose abruptamente na passagem entre cenas', () => {
    const layout = fixture();
    for (const [name, scroll] of Object.entries(boundaries(layout))) {
      const before = sampleMotion(layout, scroll - 0.0001, viewport);
      const after = sampleMotion(layout, scroll + 0.0001, viewport);
      for (const key of ['azimuth', 'elevation', 'distance']) {
        assert.ok(Math.abs(before.camera[key] - after.camera[key]) < 0.005, `${name}: camera.${key} salta de ${before.camera[key]} para ${after.camera[key]}`);
      }
    }
  });

  test('progresso global é monotônico, clampado e independente da direção anterior', () => {
    const layout = fixture();
    const positions = Array.from({ length: 81 }, (_, index) => index * 100 - 200);
    const forward = positions.map(y => sampleMotion(layout, y, viewport));
    const backward = [...positions].reverse().map(y => sampleMotion(layout, y, viewport)).reverse();
    assert.deepEqual(forward, backward);
    let previous = 0;
    for (const frame of forward) {
      assert.ok(frame.journeyProgress >= previous && frame.journeyProgress <= 1);
      assert.ok(frame.progress >= 0 && frame.progress <= 1);
      assertFinite(frame);
      previous = frame.journeyProgress;
    }
    assert.equal(forward[0].journeyProgress, 0);
    assert.equal(forward.at(-1).journeyProgress, 1);
  });

  test('overscroll finito e seção curta não produzem NaN/Infinity', () => {
    const layout = fixture();
    layout.pin.bottom = layout.pin.top + layout.pin.height;
    for (const scroll of [-1000, 0, layout.pin.top, layout.end, 1000000]) assertFinite(sampleMotion(layout, scroll, viewport));
  });

  test('pin desativado por altura curta acompanha o fluxo natural, sem posição sticky fictícia', () => {
    const layout = fixture();
    layout.pin.enabled = false;
    layout.pin.inset = 0;
    const shortViewport = { width: 1440, height: 500 };
    const first = sampleMotion(layout, 1300, shortViewport);
    const next = sampleMotion(layout, 1420, shortViewport);
    assert.equal(first.scene, 'approach');
    assert.equal(next.scene, 'approach');
    assert.equal(first.world.y, layout.pin.top - 1300 + layout.pin.centerY);
    assert.equal(next.world.y, first.world.y - 120);
    assert.equal(next.world.x, first.world.x);
    assertFinite(next);
    const sticky = sampleMotion({ ...layout, pin: { ...layout.pin, enabled: true } }, 1420, shortViewport);
    assert.notEqual(next.world.y, sticky.world.y);
  });

  test('resize usa âncoras mobile e viewport novos, sem guardar coordenadas anteriores', () => {
    const layout = fixture();
    const mobile = { width: 390, height: 844 };
    const desktopFrame = sampleMotion(layout, 3800, viewport);
    const mobileFrame = sampleMotion(layout, 3800, mobile);
    assert.notDeepEqual(mobileFrame.world, desktopFrame.world);
    assert.deepEqual(sampleMotion(layout, 3800, viewport), desktopFrame);
    assertFinite(mobileFrame);
  });

  test('home reduzida mantém partes reunidas, sem energia ou câmera animada', () => {
    const layout = fixture();
    const frames = [0, 2000, 4200, 5000, 6500].map(y => sampleMotion(layout, y, viewport, true));
    for (const frame of frames) {
      assert.equal(frame.reduced, true);
      assert.equal(frame.opening, 0);
      assert.equal(frame.branch, 0);
      assert.equal(frame.energy, 0);
      assert.equal(frame.assembly, 1);
      assert.deepEqual(frame.camera, frames[0].camera);
    }
  });

  test('detalhe sem hero tem pose própria e coordenadas finitas', () => {
    const layout = { detail: { left: 900, top: 180, width: 300, height: 420 }, end: 1900 };
    const first = sampleMotion(layout, 0, viewport);
    const next = sampleMotion(layout, 200, viewport);
    assert.equal(first.scene, 'service-detail');
    assert.equal(next.scene, 'service-detail');
    assert.equal(first.world.x, 1050);
    assert.equal(next.world.y, first.world.y - 200);
    assert.notEqual(first.camera.azimuth, next.camera.azimuth);
    assertFinite(next);
  });

  test('detalhe reduzido segue a mesma regra estática da home', () => {
    const layout = { detail: { left: 900, top: 180, width: 300, height: 420 }, end: 1900 };
    const frames = [0, 100, 400].map(y => sampleMotion(layout, y, viewport, true));
    for (const frame of frames) {
      assert.equal(frame.opening, 0);
      assert.equal(frame.energy, 0);
      assert.equal(frame.branch, 0);
      assert.equal(frame.assembly, 1);
      assert.deepEqual(frame.camera, frames[0].camera);
      assertFinite(frame);
    }
  });

  test('página sem âncora visual mantém a cena invisível e o modelo utilizável', () => {
    const frame = sampleMotion({ end: 900 }, 0, viewport);
    assert.equal(frame.world.opacity, 0);
    assertFinite(frame);
  });
});
