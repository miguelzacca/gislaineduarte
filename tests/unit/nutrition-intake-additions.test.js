import assert from 'node:assert/strict';
import test from 'node:test';
import { intakeErrors, sanitizeIntake } from '../../src/lib/nutrition.js';

test('optional tea preferences and reported measurements survive intake sanitization', () => {
  const cleaned = sanitizeIntake({ occupation: ' Trabalho em turnos ', teaHabit: 'daily', teasUsed: ' Camomila ', teaPreferences: 'Sem açúcar', teaAvoidances: 'Não gosto de hortelã', waist: '88.5', bodyFat: '26', familyHistory: 'Histórico informado', womenHealth: 'Menopausa', waterIntake: '1 litro', bowelFrequency: '3 vezes/semana' });
  assert.equal(cleaned.occupation, 'Trabalho em turnos'); assert.equal(cleaned.teasUsed, 'Camomila');
  assert.equal(cleaned.teaHabit, 'daily'); assert.equal(cleaned.waist, 88.5); assert.equal(cleaned.bodyFat, 26);
  assert.equal(cleaned.usualWeight, null); assert.equal(cleaned.bowelFrequency, '3 vezes/semana');
  assert.ok(!('skinfolds' in cleaned));
});

test('optional clinical inputs reject malformed numbers, unbounded text and unknown tea choices', () => {
  const errors = intakeErrors({ waist: true, bodyFat: 'not-a-number', teaHabit: 'detox', teasUsed: 'x'.repeat(2001) });
  for (const key of ['waist', 'bodyFat', 'teaHabit', 'teasUsed']) assert.ok(errors[key]);
  const optional = intakeErrors({ waist: '', bodyFat: null, teaHabit: '' });
  for (const key of ['waist', 'bodyFat', 'teaHabit', 'teasUsed']) assert.ok(!optional[key]);
});
