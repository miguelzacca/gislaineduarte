import assert from 'node:assert/strict';
import test from 'node:test';
import { planTemplates } from '../../src/data/nutrition.js';
import { searchPlanTemplateMatches, searchPlanTemplates } from '../../src/lib/nutrition-template-search.js';

test('related objectives and everyday phrasing find dedicated bases rather than every compatible clinical model', () => {
  for (const query of ['hipertrofia', 'quero um plano para ganhar massa', 'aumentar a massa muscular', 'musculação']) {
    const results = searchPlanTemplates(planTemplates, { query });
    assert.equal(results.length, 5, query);
    assert.ok(results.every(item => item.goal === 'muscle'), query);
  }
  for (const query of ['emagrecer', 'perder gordura', 'quero perder peso com saúde']) {
    const results = searchPlanTemplates(planTemplates, { query });
    assert.equal(results.length, 5, query);
    assert.ok(results.every(item => item.goal === 'weight-management'), query);
    assert.ok(results.every(item => !['glp1', 'oncology'].includes(item.profile)));
  }
  assert.ok(searchPlanTemplates(planTemplates, { query: 'engordar' }).every(item => item.goal === 'weight-gain'));
});

test('accent, plural, partial typing and small spelling mistakes retain the intended objective', () => {
  for (const query of ['HIPERTROFÍA', 'hipertro', 'hiper', 'hipetrofia', 'hipertroifa', 'ganhar músculos']) {
    const results = searchPlanTemplates(planTemplates, { query });
    assert.equal(results.length, 5, query);
    assert.equal(results[0].goal, 'muscle', query);
  }
  assert.equal(searchPlanTemplates(planTemplates, { query: 'hipertensão' }).length, 5);
  assert.equal(searchPlanTemplates(planTemplates, { query: 'hipertensão' })[0].profile, 'hypertension');
});

test('a generic custom title is found through its actual objective and keeps its original object', () => {
  const custom = Object.freeze({ id: 'custom', title: 'Semana da rotina', profile: 'balanced', goals: ['muscle'], tags: [] });
  const results = searchPlanTemplateMatches([custom, ...planTemplates], { query: 'ganhar massa' });
  assert.equal(results[0].template.goal, 'muscle', 'dedicated bases rank before broadly declared objectives');
  const match = results.find(item => item.template.id === 'custom');
  assert.equal(match.template, custom);
  assert.match(match.reasons.join(' '), /Objetivo: Hipertrofia/);
});

test('description, editorial tags and the complete clinical context are searchable without matching the title', () => {
  const custom = { id: 'roots', title: 'Semana A', profile: 'balanced', goals: [], description: 'Preparações com raízes brasileiras e alimentos da estação.', tags: ['marmitas para levar'] };
  const described = searchPlanTemplateMatches([custom], { query: 'raízes brasileiras' });
  assert.equal(described.length, 1); assert.ok(described[0].reasons.includes('Descrição'));
  assert.equal(searchPlanTemplates([custom], { query: 'marmita' }).length, 1);
  const context = searchPlanTemplateMatches(planTemplates, { query: 'potássio', profile: 'renal' });
  assert.equal(context.length, 5); assert.ok(context.every(item => item.reasons.some(reason => reason.includes('Contexto') || reason.includes('contexto'))));
});

test('objective, clinical context and routine combine even when the query uses different words', () => {
  const diabetic = searchPlanTemplates(planTemplates, { query: 'ganhar massa para diabético' });
  assert.equal(diabetic.length, 5); assert.ok(diabetic.every(item => item.profile === 'diabetes'));
  const practical = searchPlanTemplates(planTemplates, { query: 'quero ganhar massa com refeições rápidas' });
  assert.deepEqual(practical.map(item => item.id), ['muscle-pratica']);
  assert.deepEqual(searchPlanTemplates(planTemplates, { query: 'ganhar massa vegetariana' }).map(item => item.id), ['muscle-vegetal']);
  assert.equal(searchPlanTemplates(planTemplates, { query: 'perder gordura com pressão alta' }).length, 5);
  assert.equal(searchPlanTemplates(planTemplates, { query: 'emagrecer GLP-1' }).length, 5);
});

test('explicit filters, exclusions and absent concepts are respected without mutating the catalogue', () => {
  const catalogue = Object.freeze([...planTemplates]); const order = catalogue.map(item => item.id);
  assert.equal(searchPlanTemplates(catalogue, { query: 'hipertrofia', goal: 'weight-management' }).length, 0);
  assert.equal(searchPlanTemplates(catalogue, { query: 'hipertrofia', profile: 'renal' }).length, 0);
  assert.equal(searchPlanTemplates(catalogue, { query: 'hipertrofia sem diabetes' }).length, 5);
  assert.equal(searchPlanTemplates(catalogue, { query: 'xyzabc qwertyu' }).length, 0);
  assert.equal(searchPlanTemplates(catalogue, { query: 'hi' }).length, 0);
  assert.deepEqual(searchPlanTemplates(catalogue, {}).map(item => item.id), order);
  assert.deepEqual(catalogue.map(item => item.id), order);
});

test('search differentiates declared vegan and vegetarian diets and recognises clinical context across profiles', () => {
  const catalogue = [
    { id: 'vegetarian', title: 'Semana A', profile: 'balanced', goals: ['muscle'], diet: 'vegetarian' },
    { id: 'vegan', title: 'Semana B', profile: 'balanced', goals: ['muscle'], diet: 'vegan' },
  ];
  assert.deepEqual(searchPlanTemplates(catalogue, { query: 'ganhar massa vegana' }).map(item => item.id), ['vegan']);
  assert.equal(searchPlanTemplates(catalogue, { query: 'ganhar massa sem carne' }).length, 2);
  const clinical = searchPlanTemplates(planTemplates, { query: 'cuidado clínico' });
  assert.equal(clinical.length, 55); assert.ok(clinical.every(item => item.profile !== 'balanced'));
});

test('lexical relevance ranks a title before a description and retains partially related wording', () => {
  const catalogue = [
    { id: 'description', title: 'Semana A', description: 'Usar raízes brasileiras em preparos cozidos.', profile: 'balanced', goals: [] },
    { id: 'title', title: 'Raízes brasileiras', description: 'Preparos da semana.', profile: 'balanced', goals: [] },
  ];
  assert.deepEqual(searchPlanTemplates(catalogue, { query: 'raízes brasileiras' }).map(item => item.id), ['title', 'description']);
  assert.equal(searchPlanTemplates(catalogue, { query: 'raízes da estação' }).length, 2);
});
