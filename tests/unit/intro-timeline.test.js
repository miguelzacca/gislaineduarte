import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { INTRO_TIMING, introClock, sampleIntro } from '../../src/intro/timeline.js';
import { sampleMotion } from '../../src/motion/model.js';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function finite(value, path = 'frame') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path}: ${value}`);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) finite(child, `${path}.${key}`);
  }
}

function near(actual, expected, message, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
}

function fixture(mobile = false) {
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
  const layout = {
    hero: mobile ? { left: 270, top: 540, width: 96, height: 96 } : { left: 1000, top: 180, width: 220, height: 220 },
    heroBottom: mobile ? 1020 : 900,
    pin: { top: 1200, bottom: 3500, height: 700, inset: 106, centerY: 350, x: mobile ? 195 : 360, size: mobile ? 300 : 400 },
    story: { left: 120, top: 3700, width: 560, height: 700 },
    services: { left: 660, top: 4700, width: 160, height: 160 },
    contact: { left: 1060, top: 6200, width: 180, height: 180 },
    end: 7600,
  };
  const hero = sampleMotion(layout, 0, viewport);
  hero.pointer = { x: 0.9, y: 0.1 };
  const stage = mobile ? { x: 195, y: 360, size: 400, opacity: 1 } : { x: 720, y: 420, size: 600, opacity: 1 };
  return freeze({ hero, stage });
}

function expectedFinal(hero) {
  return { ...hero, pointer: { x: 0.5, y: 0.5 }, intro: { build: 1, assembly: 1, handoff: 1, progress: 1, phase: 'handoff' } };
}

describe('linha do tempo cinematográfica da abertura', () => {
  test('duração visível fica entre 3 e 4,4 s, inclusive orçamento máximo de assets', () => {
    assert.ok(Object.isFrozen(INTRO_TIMING));
    assert.ok(INTRO_TIMING.duration >= 3000);
    assert.ok(INTRO_TIMING.duration + INTRO_TIMING.assetHold <= 4400);
    assert.ok(INTRO_TIMING.skip > 0 && INTRO_TIMING.skip <= 300);
    assert.ok(INTRO_TIMING.skipAvailable <= INTRO_TIMING.draw);
    assert.ok(INTRO_TIMING.draw < INTRO_TIMING.depth);
    assert.ok(INTRO_TIMING.depth < INTRO_TIMING.form);
    assert.ok(INTRO_TIMING.form < INTRO_TIMING.handoff);
    assert.ok(INTRO_TIMING.handoff < INTRO_TIMING.duration);
  });

  test('começa em fragmentos com câmera próxima, geometria aberta e palco próprio', () => {
    const { hero, stage } = fixture();
    const frame = sampleIntro(0, hero, stage);
    assert.equal(frame.scene, 'intro');
    assert.equal(frame.progress, 0);
    assert.equal(frame.opening, 1);
    assert.equal(frame.focus, 2.8);
    assert.equal(frame.assembly, 0.12);
    assert.equal(frame.branch, 0);
    assert.deepEqual(frame.camera, { azimuth: -1.2, elevation: 0.36, distance: 7.8 });
    assert.deepEqual(frame.world, { ...stage, opacity: 0 });
    assert.deepEqual(frame.pointer, { x: 0.5, y: 0.5 });
    assert.deepEqual(frame.intro, { build: 0, assembly: 0, handoff: 0, progress: 0, phase: 'fragments' });
  });

  test('cada fronteira temporal troca para o estado esperado sem dependência de amostras anteriores', () => {
    const { hero, stage } = fixture();
    const states = [
      [-100, 'fragments'], [0, 'fragments'], [499.999, 'fragments'],
      [500, 'drawing'], [1249.999, 'drawing'], [1250, 'depth'],
      [2399.999, 'depth'], [2400, 'assembled'], [2799.999, 'assembled'],
      [2800, 'handoff'], [3599.999, 'handoff'], [3600, 'handoff'],
    ];
    for (const [elapsed, phase] of states) assert.equal(sampleIntro(elapsed, hero, stage).intro.phase, phase, `${elapsed} ms`);
    for (const [elapsed, phase] of states.toReversed()) assert.equal(sampleIntro(elapsed, hero, stage).intro.phase, phase, `${elapsed} ms ao retornar`);
  });

  test('traço, montagem e handoff são monotônicos e limitados, não um fade único', () => {
    const { hero, stage } = fixture();
    let previous = { build: 0, assembly: 0, handoff: 0, progress: 0 };
    for (let elapsed = 0; elapsed <= INTRO_TIMING.duration; elapsed += 16) {
      const frame = sampleIntro(elapsed, hero, stage);
      for (const key of ['build', 'assembly', 'handoff', 'progress']) {
        assert.ok(frame.intro[key] >= previous[key] && frame.intro[key] <= 1, `${key} em ${elapsed} ms`);
      }
      previous = frame.intro;
      finite(frame);
    }
    assert.equal(sampleIntro(90, hero, stage).intro.build, 0);
    assert.equal(sampleIntro(1540, hero, stage).intro.build, 1);
    assert.equal(sampleIntro(560, hero, stage).intro.assembly, 0);
    assert.equal(sampleIntro(2400, hero, stage).intro.assembly, 1);
    assert.equal(sampleIntro(2800, hero, stage).intro.handoff, 0);
  });

  test('profundidade só assume a cena durante seu trecho e chega a opacidade completa', () => {
    const { hero, stage } = fixture();
    assert.equal(sampleIntro(1250, hero, stage).world.opacity, 0);
    const partial = sampleIntro(1540, hero, stage).world.opacity;
    assert.ok(partial > 0 && partial < 1);
    assert.equal(sampleIntro(1840, hero, stage).world.opacity, 1);
    assert.equal(sampleIntro(2800, hero, stage).world.opacity, 1);
  });

  test('recuo realmente muda distância, azimute e elevação antes de fechar a marca', () => {
    const { hero, stage } = fixture();
    const close = sampleIntro(500, hero, stage);
    const wide = sampleIntro(1650, hero, stage);
    near(close.camera.distance, 7.8, 'distância inicial');
    near(wide.camera.distance, 14, 'distância do recuo');
    near(wide.camera.azimuth, 0.8, 'órbita do recuo');
    near(wide.camera.elevation, 0.16, 'elevação do recuo');
    assert.ok(wide.camera.distance - close.camera.distance > 6);
    assert.ok(wide.camera.azimuth - close.camera.azimuth > 1.9);
    assert.equal(wide.opening, 1);
  });

  test('geometria se reúne antes do handoff e câmera já coincide com a hero', () => {
    const { hero, stage } = fixture();
    const formed = sampleIntro(INTRO_TIMING.form, hero, stage);
    assert.equal(formed.opening, 0);
    assert.equal(formed.focus, 0);
    assert.equal(formed.assembly, 1);
    assert.equal(formed.branch, 0);
    for (const key of Object.keys(hero.camera)) near(formed.camera[key], hero.camera[key], `camera.${key}`);
    assert.equal(formed.intro.handoff, 0);
    assert.equal(formed.world.x, stage.x);
    assert.equal(formed.world.y, stage.y);
    near(sampleIntro(1850, hero, stage).energy, 0.85, 'pico de energia');
    near(sampleIntro(2800, hero, stage).energy, 0, 'energia em repouso');
  });

  test('respiração é pequena, finita e retorna à escala-base antes de transportar', () => {
    const { hero, stage } = fixture();
    const initial = sampleIntro(2400, hero, stage);
    const breath = sampleIntro(2600, hero, stage);
    const end = sampleIntro(2800, hero, stage);
    assert.equal(initial.world.size, stage.size);
    near(breath.world.size, stage.size * 1.024, 'amplitude da respiração');
    assert.equal(end.world.size, stage.size);
    assert.equal(breath.world.x, stage.x);
    assert.equal(breath.world.y, stage.y);
  });

  test('handoff transporta centro e escala ao ponto real da hero', () => {
    const { hero, stage } = fixture();
    const midpoint = sampleIntro((INTRO_TIMING.handoff + INTRO_TIMING.duration) / 2, hero, stage);
    near(midpoint.intro.handoff, 0.5, 'metade do handoff');
    for (const key of ['x', 'y', 'size']) near(midpoint.world[key], (stage[key] + hero.world[key]) / 2, `world.${key}`);
    assert.notEqual(midpoint.world.x, stage.x);
    assert.notEqual(midpoint.world.size, stage.size);
    assert.equal(midpoint.world.opacity, 1);
  });

  for (const mobile of [false, true]) {
    test(`endpoint ${mobile ? 'mobile' : 'desktop'} é exatamente o frame real da hero, inclusive câmera e viewport`, () => {
      const { hero, stage } = fixture(mobile);
      for (const elapsed of [INTRO_TIMING.duration, INTRO_TIMING.duration + 1, 100_000]) {
        const frame = sampleIntro(elapsed, hero, stage, { mobile });
        assert.deepEqual(frame, expectedFinal(hero));
        assert.deepEqual(frame.camera, hero.camera);
        assert.deepEqual(frame.world, hero.world);
        assert.equal(frame.scene, hero.scene);
        assert.equal(frame.progress, hero.progress);
      }
    });
  }

  test('endpoint recebe alvo atualizado após resize, sem cache de coordenadas antigas', () => {
    const desktop = fixture();
    const mobile = fixture(true);
    sampleIntro(2250, desktop.hero, desktop.stage);
    const final = sampleIntro(INTRO_TIMING.duration, mobile.hero, mobile.stage, { mobile: true });
    assert.deepEqual(final, expectedFinal(mobile.hero));
    assert.notDeepEqual(final.world, desktop.hero.world);
  });

  test('a versão mobile conserva profundidade com órbita menor e mais espaço de câmera', () => {
    const { hero, stage } = fixture(true);
    const first = sampleIntro(0, hero, stage, { mobile: true });
    const wide = sampleIntro(1650, hero, stage, { mobile: true });
    const desktop = sampleIntro(1650, hero, stage);
    near(first.camera.azimuth, -0.55, 'órbita inicial mobile');
    near(first.camera.distance, 7.8, 'câmera inicial mobile');
    near(wide.camera.azimuth, 0.22, 'órbita final mobile');
    near(wide.camera.distance, 14.8, 'recuo mobile');
    assert.ok(wide.camera.distance > desktop.camera.distance);
    assert.ok(wide.camera.azimuth - first.camera.azimuth < 1);
    assert.equal(wide.opening, 1);
    assert.equal(wide.world.x, stage.x);
    assert.equal(wide.world.y, stage.y);
  });

  test('câmera, geometria e posição não saltam nas fronteiras da narrativa natural', () => {
    const { hero, stage } = fixture();
    for (const boundary of [90, 500, 560, 1125, 1250, 1540, 1650, 1760, 1840, 2250, 2400, 2800, 3600]) {
      const before = sampleIntro(boundary - 0.0001, hero, stage);
      const after = sampleIntro(boundary + 0.0001, hero, stage);
      for (const key of ['opening', 'focus', 'assembly', 'energy']) near(before[key], after[key], `${boundary}: ${key}`, 0.0001);
      for (const group of ['camera', 'world']) {
        for (const key of Object.keys(before[group])) near(before[group][key], after[group][key], `${boundary}: ${group}.${key}`, 0.001);
      }
    }
  });

  test('amostragem não modifica hero, stage ou skipFrom e independe da ordem das chamadas', () => {
    const { hero, stage } = fixture();
    const first = sampleIntro(1575, hero, stage);
    const skipFrom = freeze(structuredClone(first));
    const before = structuredClone({ hero, stage, skipFrom });
    for (const elapsed of [0, 3100, 900, 3600, 2800]) sampleIntro(elapsed, hero, stage);
    assert.deepEqual(sampleIntro(1575, hero, stage), first);
    sampleIntro(1650, hero, stage, { skipFrom, skipProgress: 0.4 });
    assert.deepEqual({ hero, stage, skipFrom }, before);
  });

  test('tempo negativo ou não finito não propaga NaN para a cena', () => {
    const { hero, stage } = fixture();
    for (const elapsed of [-1000, NaN, Infinity, -Infinity, undefined]) {
      const frame = sampleIntro(elapsed, hero, stage);
      finite(frame);
      assert.deepEqual(frame, sampleIntro(0, hero, stage));
    }
  });
});

describe('saída voluntária e handoff do skip', () => {
  test('skip parte da geometria e câmera atuais, sem um reset visual', () => {
    const { hero, stage } = fixture();
    const from = sampleIntro(1575, hero, stage);
    const start = sampleIntro(1650, hero, stage, { skipFrom: from, skipProgress: 0 });
    assert.deepEqual(start.world, from.world);
    assert.deepEqual(start.camera, from.camera);
    for (const key of ['opening', 'focus', 'assembly', 'branch', 'energy']) assert.equal(start[key], from[key], key);
    assert.equal(start.intro.assembly, from.intro.assembly);
    assert.equal(start.intro.handoff, from.intro.handoff);
    assert.equal(start.intro.phase, 'handoff');
  });

  test('metade do skip interpola cada propriedade de geometria, câmera e posição', () => {
    const { hero, stage } = fixture();
    const from = sampleIntro(1575, hero, stage);
    const middle = sampleIntro(1650, hero, stage, { skipFrom: from, skipProgress: 0.5 });
    for (const key of ['opening', 'focus', 'assembly', 'branch', 'energy']) near(middle[key], (from[key] + hero[key]) / 2, key);
    for (const group of ['camera', 'world']) {
      for (const key of Object.keys(hero[group])) near(middle[group][key], (from[group][key] + hero[group][key]) / 2, `${group}.${key}`);
    }
    near(middle.intro.handoff, (from.intro.handoff + 1) / 2, 'abertura do portal');
  });

  for (const mobile of [false, true]) {
    test(`skip completo ${mobile ? 'mobile' : 'desktop'} chega exatamente ao mesmo frame que o término natural`, () => {
      const { hero, stage } = fixture(mobile);
      const from = sampleIntro(1400, hero, stage, { mobile });
      for (const skipProgress of [1, 2]) {
        assert.deepEqual(sampleIntro(1575, hero, stage, { mobile, skipFrom: from, skipProgress }), expectedFinal(hero));
      }
    });
  }

  test('skip ainda em andamento não é forçado ao endpoint apenas pelo relógio natural', () => {
    const { hero, stage } = fixture();
    const from = sampleIntro(INTRO_TIMING.duration - 100, hero, stage);
    const halfway = sampleIntro(INTRO_TIMING.duration + 100, hero, stage, { skipFrom: from, skipProgress: 0.5 });
    assert.equal(halfway.scene, 'intro');
    assert.notDeepEqual(halfway.world, hero.world);
    assert.deepEqual(sampleIntro(INTRO_TIMING.duration + 100, hero, stage, { skipFrom: from, skipProgress: 1 }), expectedFinal(hero));
  });

  test('skip não extrapola a pose de origem com progresso negativo ou inválido', () => {
    const { hero, stage } = fixture();
    const from = sampleIntro(1800, hero, stage);
    for (const skipProgress of [-1, NaN, undefined]) {
      const frame = sampleIntro(1900, hero, stage, { skipFrom: from, skipProgress });
      assert.deepEqual(frame.world, from.world);
      assert.deepEqual(frame.camera, from.camera);
      finite(frame);
    }
  });
});

describe('relógio com espera real e limitada por assets', () => {
  test('assets já prontos não acrescentam duração artificial', () => {
    for (const elapsed of [0, 500, 1500, 2000, 2800, 3600, 4400]) assert.deepEqual(introClock(elapsed, true), { elapsed, hold: 0 });
  });

  test('assets pendentes não atrasam fragmentos nem desenho inicial', () => {
    for (const elapsed of [0, 500, 900, 1540, INTRO_TIMING.holdAt]) assert.deepEqual(introClock(elapsed, false), { elapsed, hold: 0 });
  });

  test('espera congela apenas a montagem e cresce no máximo 800 ms', () => {
    let hold = 0;
    for (const offset of [0, 100, 400, 600, INTRO_TIMING.assetHold]) {
      const clock = introClock(INTRO_TIMING.holdAt + offset, false, hold);
      assert.equal(clock.elapsed, INTRO_TIMING.holdAt);
      assert.equal(clock.hold, offset);
      hold = clock.hold;
    }
    const after = introClock(INTRO_TIMING.holdAt + INTRO_TIMING.assetHold + 400, false, hold);
    assert.equal(after.hold, INTRO_TIMING.assetHold);
    assert.equal(after.elapsed, INTRO_TIMING.holdAt + 400);
  });

  test('resolver assets durante a espera preserva tempo consumido sem salto', () => {
    const waiting = introClock(INTRO_TIMING.holdAt + 350, false);
    assert.equal(waiting.hold, 350);
    assert.equal(waiting.elapsed, 2000);
    const released = introClock(INTRO_TIMING.holdAt + 350, true, waiting.hold);
    assert.deepEqual(released, waiting);
    const later = introClock(INTRO_TIMING.holdAt + 450, true, released.hold);
    assert.deepEqual(later, { elapsed: INTRO_TIMING.holdAt + 100, hold: 350 });
  });

  test('falha permanente de assets ainda chega à hero em no máximo 4,4 segundos', () => {
    const { hero, stage } = fixture();
    let hold = 0;
    let previous = 0;
    for (let elapsed = 0; elapsed <= 4400; elapsed += 25) {
      const clock = introClock(elapsed, false, hold);
      hold = clock.hold;
      assert.ok(hold >= 0 && hold <= INTRO_TIMING.assetHold);
      assert.ok(clock.elapsed >= previous);
      previous = clock.elapsed;
    }
    assert.equal(previous, INTRO_TIMING.duration);
    assert.deepEqual(sampleIntro(previous, hero, stage), expectedFinal(hero));
  });

  test('tempo visível negativo não produz progresso negativo', () => {
    assert.deepEqual(introClock(-100, false), { elapsed: 0, hold: 0 });
    assert.deepEqual(introClock(-100, true), { elapsed: 0, hold: 0 });
  });

  test('o relógio carrega hold anterior sem ultrapassar o orçamento em sequência normal', () => {
    let hold = 0;
    let previous = 0;
    for (let elapsed = 0; elapsed <= 4400; elapsed += 20) {
      const clock = introClock(elapsed, elapsed >= 2600, hold);
      assert.ok(clock.hold >= hold && clock.hold <= INTRO_TIMING.assetHold);
      assert.ok(clock.elapsed >= previous);
      hold = clock.hold;
      previous = clock.elapsed;
    }
    assert.equal(hold, 580);
    assert.equal(previous, 3820);
  });
});
