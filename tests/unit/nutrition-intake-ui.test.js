import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { load } from 'cheerio';

// Render actual React components without launching a browser or Playwright.
test('intake UI keeps critical information visible and optional health choices accessible', async t => {
  const server = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, logLevel: 'error' });
  try {
    const { BristolScale, FoodPreferencePicker, IntakeRestrictionSummary, IntakePhotos, draftSafeIntake, nextFoodPreferences } = await server.ssrLoadModule('/src/components/NutritionIntakeExtras.jsx');
    const { IntakeForm, nutritionApi } = await server.ssrLoadModule('/src/components/NutritionPublic.jsx');
    const render = (component, props) => load(renderToStaticMarkup(createElement(component, props)));
    await t.test('API client explains a non-JSON size rejection and preserves structured field errors', async t => {
      t.mock.method(globalThis, 'fetch', async () => new Response('Payload Too Large', { status: 413 }));
      await assert.rejects(nutritionApi('intake', { intake: {} }), error => error.status === 413 && /fotos opcionais/.test(error.message));
      const fields = { photosConsent: 'Autorize as fotos ou remova os anexos.' };
      globalThis.fetch.mock.mockImplementation(async () => Response.json({ error: 'Confira os campos indicados.', fields }, { status: 422 }));
      await assert.rejects(nutritionApi('intake', { intake: {} }), error => {
        assert.equal(error.message, 'Confira os campos indicados.');
        assert.equal(error.status, 422); assert.deepEqual(error.fields, fields); return true;
      });
    });
    await t.test('Bristol has seven illustrated and labelled radio choices plus an explicit skip', () => {
      const $ = render(BristolScale, { value: 3, onChange() {} });
      assert.equal($('input[type=radio]').length, 8);
      assert.equal($('input[type=radio][checked]').attr('value'), '3');
      assert.equal($('svg[aria-hidden=true]').length, 7);
      assert.equal($('label').filter((_, element) => $(element).text().includes('Tipo')).length, 7);
      assert.match($('fieldset').text(), /Prefiro não responder/);
      assert.doesNotMatch($('fieldset').text(), /falta.*fibra|normal|diarreia grave/i);
      const empty = render(BristolScale, { value: null });
      assert.equal(empty('input[checked]').attr('value'), '');
    });
    await t.test('food choices remain distinct and changing an excluded item is explicit', () => {
      const intake = { likedFoodIds: ['egg', 'rice'], dislikedFoodIds: ['banana'], excludedFoodIds: ['egg'] };
      assert.deepEqual(nextFoodPreferences(intake, 'egg', 'excludedFoodIds'), { likedFoodIds: ['rice'], dislikedFoodIds: ['banana'], excludedFoodIds: ['egg'] });
      assert.deepEqual(nextFoodPreferences(intake, 'banana', 'likedFoodIds'), { likedFoodIds: ['egg', 'rice', 'banana'], dislikedFoodIds: [], excludedFoodIds: ['egg'] });
      const $ = render(FoodPreferencePicker, { intake, onChange() {} });
      assert.equal($('details').length, 0);
      assert.ok($('.ni-food-card img').length > 20);
      assert.equal($('.ni-food-card select').length, $('.ni-food-card img').length);
      assert.match($('.ni-food-summary').text(), /Excluir do plano/);
      assert.match($('.ni-food-summary__excluded dd').text(), /Ovo/);
      assert.ok($('.ni-food-summary').nextAll('label').find('input[type=search]').length === 1);
      assert.equal($('.ni-food-card select').filter((_, element) => $(element).find('option[selected]').attr('value') === 'excludedFoodIds').length, 1);
    });
    await t.test('allergy notes, intolerances and exclusions are readable outside filters', () => {
      const $ = render(IntakeRestrictionSummary, { intake: { allergies: ['milk'], allergyNotes: 'Reação já avaliada', intolerances: ['lactose'], excludedFoodIds: ['egg'], foodExclusionNotes: 'Cogumelos', seasoningExclusions: 'Mistura com leite' } });
      assert.equal($('details,input,select').length, 0);
      assert.match($('section').text(), /Proteína do leite/);
      assert.match($('section').text(), /Reação já avaliada/);
      assert.match($('section').text(), /Intolerância à lactose/);
      assert.match($('section').text(), /Mistura com leite/);
      assert.match($('section').text(), /Outros alimentos: Cogumelos/);
    });
    await t.test('photos require separate consent and never enter draft storage', () => {
      const intake = { name: 'Pessoa', consent: true, aiConsent: true, photosConsent: true, photos: [{ name: 'refeicao.jpg', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,/9j/', purpose: 'food-context' }] };
      const saved = draftSafeIntake(intake);
      assert.deepEqual(saved.photos, []);
      assert.equal(saved.photosConsent, false); assert.equal(saved.consent, false); assert.equal(saved.aiConsent, false);
      assert.equal(intake.photos.length, 1);
      const $ = render(IntakePhotos, { intake, onChange() {}, errors: { photosConsent: 'Confirme o uso destas fotos.' } });
      assert.equal($('input[type=checkbox]').length, 1);
      const errorId = $('input[type=checkbox]').attr('aria-describedby');
      assert.equal($(`[id="${errorId}"]`).text(), 'Confirme o uso destas fotos.');
      assert.match($('.ni-photos').text(), /somente.*atendimento/);
      assert.match($('.ni-photos').text(), /Não precisamos de fotos do corpo/);
      assert.equal($('button[aria-label="Remover foto 1"]').length, 1);
      const empty = render(IntakePhotos, { intake: { photos: [] }, onChange() {} });
      assert.equal(empty('input[type=checkbox]').length, 0);
    });
    await t.test('entry screen exposes labelled contact fields without preselecting consent or storage', () => {
      const $ = render(IntakeForm, { offer: { title: 'Plano', priceCents: 10000, deliveryDays: 3, followupDays: 0, bristolReviewed: false } });
      for (const name of ['name', 'age', 'email', 'phone']) {
        assert.equal($(`#intake-${name}`).length, 1);
        assert.ok($(`label[for="intake-${name}"] span`).text());
      }
      assert.equal($('input[type=checkbox][checked]').length, 0);
      assert.equal($('progress').attr('aria-label'), 'Progresso da anamnese');
      assert.equal($('li[aria-current=step]').length, 1);
      assert.equal($('.ni-bristol').length, 0);
      assert.doesNotMatch($('form').text(), /Voc\?|sa\?de|informa\?\?es/);
    });
  } finally { await server.close(); }
});
