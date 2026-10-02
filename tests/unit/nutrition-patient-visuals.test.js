import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { patientVisuals } from '../../server/nutrition/patient-visuals.js';
import { createCalculationRecords } from '../../src/lib/nutrition-journey.js';

test('patient visuals never infer body fat from BMI alone', () => {
  const calculationInput = { weight: 95, height: 170, age: 40, sex: 'male' };
  const visuals = patientVisuals({ assessment: { calculationInput, calculations: createCalculationRecords(calculationInput) } });
  assert.match(visuals.composition.svg, /Ainda não registrada/);
  assert.match(visuals.composition.description, /IMC não informa/);
  assert.match(visuals.bmi.svg, /Obesidade/);
  assert.equal(visuals.hydration, null);
});

test('shared patient graphics retain registered composition and rasterize for the PDF', async () => {
  const calculationInput = { weight: 70, height: 165, age: 35, sex: 'female', activity: 1.4, skinfoldMethod: 'jackson-pollock-3', measurementDate: '2026-10-01', skinfolds: { triceps: 20, suprailiac: 18, thigh: 25 } };
  const visuals = patientVisuals({ targets: { energy: 1800, water: 2100 }, assessment: { calculationInput, calculations: createCalculationRecords(calculationInput), privateNotes: 'DO_NOT_EXPORT' } });
  assert.match(visuals.composition.svg, /25,4%/);
  assert.match(visuals.composition.svg, /17,8 kg/);
  assert.match(visuals.composition.svg, /52,2 kg/);
  assert.match(visuals.energy.svg, /1\.800 kcal\/dia/);
  assert.match(visuals.hydration.description, /não representam consumo/);
  for (const visual of Object.values(visuals)) {
    assert.ok(!visual.svg.includes('DO_NOT_EXPORT'));
    assert.ok(!/NaN|undefined/.test(visual.svg));
    const metadata = await sharp(Buffer.from(visual.svg)).png().toBuffer({ resolveWithObject: true });
    assert.equal(metadata.info.width, visual.width);
    assert.equal(metadata.info.height, visual.height);
    assert.ok(!/NaN|undefined|DO_NOT_EXPORT/.test(visual.compactSvg));
    const compact = await sharp(Buffer.from(visual.compactSvg)).png().toBuffer({ resolveWithObject: true });
    assert.equal(compact.info.width, 400);
    assert.match(visual.compactSvg, /-compact-title/);
    assert.match(visual.compactSvg, /-compact-description/);
  }
});

test('patient BMI graphics omit adult body categories when the clinical context excludes them', () => {
  for (const override of [{ pregnant: true }, { age: 19 }]) {
    const calculationInput = { weight: 70, height: 165, age: 35, sex: 'female', ...override };
    const visuals = patientVisuals({ assessment: { calculationInput, calculations: createCalculationRecords(calculationInput) } });
    assert.ok(!visuals.bmi.svg.includes('Obesidade'));
    assert.match(visuals.bmi.svg, /Interpretação individual/);
  }
});
