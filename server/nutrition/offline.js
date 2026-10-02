// This function is embedded verbatim in the self-contained patient HTML.
// It deliberately has no imports, network calls, or access to clinical records.
export function initializeOfflinePlan(config) {
  'use strict';
  const { key, days, foods } = config;
  const byId = id => document.getElementById(id);
  const each = (selector, visit) => document.querySelectorAll(selector).forEach(visit);
  const number = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
  const svgNamespace = document.querySelector('.plate-photo').namespaceURI;
  const object = value => value && !Array.isArray(value) && typeof value === 'object' ? value : {};
  const cleanState = raw => {
    const input = object(raw);
    return { day: Number.isInteger(input.day) && input.day >= 0 && input.day < days.length ? input.day : 0,
      checks: object(input.checks), shopping: object(input.shopping), choices: object(input.choices),
      notes: String(input.notes || '').slice(0, 6000), water: object(input.water), updatedAt: Number(input.updatedAt) || 0 };
  };
  let embedded = {};
  let stored = {};
  let persistent = true;
  try { embedded = JSON.parse(document.body.dataset.progress || '{}'); } catch { /* New file. */ }
  try { stored = JSON.parse(localStorage.getItem(key) || '{}'); } catch { persistent = false; }
  let state = cleanState(Number(embedded?.updatedAt || 0) > Number(stored?.updatedAt || 0) ? embedded : stored);
  const date = byId('checkdate');
  const now = new Date();
  date.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const save = () => {
    state.updatedAt = Date.now();
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { persistent = false; }
    byId('storage').textContent = persistent
      ? 'Salvo neste navegador. Para levar suas marcações a outro aparelho, use “Salvar cópia com meu progresso”.'
      : 'Este navegador não salva marcações ao fechar. Use “Salvar cópia com meu progresso” para guardar o que fez.';
  };
  const choiceKey = (d, m, i) => `${d}-${m}-${i}`;
  const selected = (item, itemKey) => {
    const value = Number(state.choices[itemKey]);
    return item.options[Number.isInteger(value) && value >= 0 && value < item.options.length ? value : 0];
  };
  const mealKey = element => date.value + '-' + element.dataset.meal;
  const progress = () => {
    const boxes = [...document.querySelectorAll('#day-' + state.day + ' [data-meal]')];
    const done = boxes.filter(element => element.checked).length;
    byId('progress').style.width = (boxes.length ? done / boxes.length * 100 : 0) + '%';
    byId('progress-label').textContent = done + ' de ' + boxes.length + ' refeições marcadas · ' + days[state.day].label;
    const water = Math.min(10000, Math.max(0, Number(state.water[date.value]) || 0));
    byId('water-value').textContent = number(water) + ' ml';
    const target = Number(config.waterTarget);
    const meter = byId('water-progress');
    if (meter && target > 0) { meter.value = water; meter.max = target; }
    byId('water-note').textContent = target > 0 && water > target ? 'Registro acima da meta combinada. Siga a orientação individual recebida; o contador não recomenda aumentar líquidos.' : '';
  };
  const refresh = () => { each('[data-meal]', element => { element.checked = state.checks[mealKey(element)] === true; }); progress(); };
  const selectDay = day => {
    state.day = day;
    each('.day', (element, index) => { element.hidden = index !== day; });
    each('[data-day]', element => { element.setAttribute('aria-pressed', String(Number(element.dataset.day) === day)); });
    byId('previous-day').disabled = day === 0;
    byId('next-day').disabled = day === days.length - 1;
    byId('day-position').textContent = `Dia ${day + 1} de ${days.length}`;
    refresh(); save();
  };
  const shoppingRows = () => {
    const totals = new Map();
    const scope = byId('shopping-scope').value;
    days.forEach((day, d) => {
      if (scope !== 'week' && Number(scope) !== d) return;
      day.meals.forEach((meal, m) => meal.items.forEach((item, i) => {
        const option = selected(item, choiceKey(d, m, i));
        totals.set(option.foodId, (totals.get(option.foodId) || 0) + option.grams);
      }));
    });
    return [...totals].map(([foodId, grams]) => ({ foodId, grams, ...foods[foodId] }))
      .sort((a, b) => a.group.localeCompare(b.group, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  };
  const renderShopping = () => {
    const list = byId('shopping-list');
    list.replaceChildren();
    let group = '';
    shoppingRows().forEach(item => {
      if (group !== item.group) {
        group = item.group;
        const heading = document.createElement('li'); heading.className = 'shopping-group'; heading.textContent = group; list.append(heading);
      }
      const row = document.createElement('li');
      const label = document.createElement('label');
      const check = document.createElement('input'); check.type = 'checkbox'; check.dataset.shop = item.foodId; check.checked = state.shopping[item.foodId] === true;
      check.addEventListener('change', () => { state.shopping[item.foodId] = check.checked; save(); });
      const name = document.createElement('span'); name.textContent = item.name;
      const quantity = document.createElement('small'); quantity.textContent = number(item.grams) + ' g';
      name.append(quantity); label.append(check, name); row.append(label); list.append(row);
    });
  };
  const renderChoices = () => {
    const weeklyTotals = [];
    days.forEach((day, d) => {
      const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      day.meals.forEach((meal, m) => {
        let mealEnergy = 0;
        const mealValues = { protein: 0, carbs: 0, fat: 0 };
        const selectedItems = [];
        meal.items.forEach((item, i) => {
          const itemKey = choiceKey(d, m, i);
          const option = selected(item, itemKey);
          const food = foods[option.foodId];
          const card = byId('food-' + itemKey);
          card.querySelector('use').setAttribute('href', '#photo-' + option.foodId);
          card.querySelector('svg').setAttribute('aria-label', 'Fotografia de ' + food.name);
          card.querySelector('[data-food-name]').textContent = food.name;
          card.querySelector('[data-food-grams]').textContent = number(option.grams) + ' g';
          card.querySelector('[data-food-portion]').textContent = option.portionText;
          const values = Object.fromEntries(Object.keys(total).map(nutrient => [nutrient, (Number(food[nutrient]) || 0) * option.grams / 100]));
          card.querySelector('[data-food-nutrients]').textContent = number(values.kcal) + ' kcal · Proteínas ' + number(values.protein) + ' g · Carboidratos ' + number(values.carbs) + ' g · Gorduras ' + number(values.fat) + ' g';
          for (const nutrient of Object.keys(mealValues)) mealValues[nutrient] += values[nutrient];
          selectedItems.push({ name: food.name, grams: option.grams, foodId: option.foodId, plateGroup: food.plateGroup });
          for (const nutrient of Object.keys(total)) total[nutrient] += values[nutrient];
          mealEnergy += values.kcal;
          card.querySelectorAll('[data-choice]').forEach(radio => { radio.checked = Number(radio.value) === item.options.indexOf(option); });
          card.classList.toggle('has-swap', item.options.indexOf(option) !== 0);
        });
        byId('meal-energy-' + d + '-' + m).textContent = number(mealEnergy) + ' kcal';
        const visual = byId('visual-' + d + '-' + m);
        const maximum = Math.max(10, Math.ceil(Math.max(...Object.values(mealValues)) / 10) * 10);
        for (const [nutrient, value] of Object.entries(mealValues)) {
          visual.querySelector('[data-macro-label="' + nutrient + '"]').textContent = number(value) + ' g';
          visual.querySelector('[data-macro-bar="' + nutrient + '"]').style.width = value / maximum * 100 + '%';
        }
        visual.querySelector('[data-macro-scale]').textContent = 'Mesma escala: 0 a ' + number(maximum) + ' g de nutriente.';
        const chart = visual.querySelector('[data-food-plate]'); const legend = visual.querySelector('[data-mass-legend]');
        chart.replaceChildren(); legend.replaceChildren();
        const colors = ['#315e49', '#b38d45', '#9b6557', '#668092', '#879747', '#77648b', '#477b73'];
        selectedItems.forEach((item, index) => {
          const count = selectedItems.length; const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
          const distance = count === 1 ? 0 : count === 2 ? 30 : 39;
          const photo = document.createElementNS(svgNamespace, 'svg');
          photo.setAttribute('class', 'plate-photo'); photo.setAttribute('viewBox', '0 0 384 288'); photo.setAttribute('aria-hidden', 'true');
          photo.style.left = (100 + Math.cos(angle) * distance) / 2 + '%'; photo.style.top = (100 + Math.sin(angle) * distance) / 2 + '%';
          photo.style.width = photo.style.height = (count <= 2 ? 43 : count <= 4 ? 35 : 29) + '%';
          const image = document.createElementNS(svgNamespace, 'use'); image.setAttribute('href', '#photo-' + item.foodId); photo.append(image); chart.append(photo);
          const row = document.createElement('li'); const dot = document.createElement('i'); dot.style.background = colors[index % colors.length]; dot.setAttribute('aria-hidden', 'true');
          row.append(dot, item.name + ': ' + number(item.grams) + ' g'); legend.append(row);
        });
        const targets = visual.querySelector('[data-plate-targets]'); targets.replaceChildren();
        const labels = { protein: 'Proteínas e leguminosas', carbs: 'Cereais e raízes', vegetables: 'Vegetais' };
        if (config.plateGuide && Object.keys(labels).every(group => selectedItems.some(item => item.plateGroup === group))) {
          for (const [group, label] of Object.entries(labels)) { const line = document.createElement('span'); const value = document.createElement('b'); value.textContent = number(config.plateGuide[group]) + '%'; line.append(value, ' ' + label); targets.append(line); }
        }
      });
      for (const [nutrient, value] of Object.entries(total)) {
        byId('total-' + d + '-' + nutrient).textContent = number(value) + (nutrient === 'kcal' ? '' : ' g');
        const weeklyCell = byId('week-' + d + '-' + nutrient);
        if (weeklyCell) weeklyCell.textContent = number(value);
      }
      // Match dayTotals: round each day's total once before averaging the week.
      weeklyTotals.push(Object.fromEntries(Object.entries(total).map(([nutrient, value]) => [nutrient, Math.round(value * 10) / 10])));
    });
    const maximum = Math.max(500, Math.ceil(Math.max(...weeklyTotals.map(total => total.kcal)) / 500) * 500);
    weeklyTotals.forEach((total, d) => {
      const bar = byId('week-bar-' + d); const label = byId('week-energy-' + d);
      if (bar) bar.style.width = total.kcal / maximum * 100 + '%';
      if (label) label.textContent = number(total.kcal) + ' kcal';
    });
    for (const nutrient of ['kcal', 'protein', 'carbs', 'fat', 'fiber']) {
      const average = byId('week-average-' + nutrient);
      if (average) {
        const value = number(weeklyTotals.reduce((sum, total) => sum + total[nutrient], 0) / weeklyTotals.length);
        const unit = document.createElement('small'); unit.textContent = nutrient === 'kcal' ? 'kcal' : 'g';
        average.replaceChildren(value + ' ', unit);
      }
    }
    const scale = byId('week-scale');
    if (scale) scale.textContent = 'Mesma escala: 0 a ' + number(maximum) + ' kcal por dia.';
    renderShopping();
  };
  // Build repeated choice controls from the compact approved data. Photographs
  // remain embedded once; even very large plans stay below the download limit.
  each('[data-choices]', container => {
    const itemKey = container.dataset.choices;
    const [d, m, i] = itemKey.split('-').map(Number);
    const fieldset = document.createElement('fieldset'); fieldset.className = 'food-options';
    const legend = document.createElement('legend'); legend.textContent = 'Escolha uma opção.'; fieldset.append(legend);
    days[d].meals[m].items[i].options.forEach((option, index) => {
      const label = document.createElement('label');
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'choice-' + itemKey; radio.value = String(index); radio.dataset.choice = itemKey;
      const photo = byId('food-' + itemKey).querySelector('svg').cloneNode(true); photo.setAttribute('class', 'swap-image'); photo.setAttribute('aria-hidden', 'true'); photo.removeAttribute('aria-label'); photo.removeAttribute('role'); photo.querySelector('use').setAttribute('href', '#photo-' + option.foodId);
      const name = document.createElement('span'); name.textContent = foods[option.foodId].name;
      const quantity = document.createElement('small'); quantity.textContent = option.portionText + (index === 0 ? ' · principal' : ''); name.append(quantity);
      label.append(radio, photo, name); fieldset.append(label);
    });
    container.replaceChildren(fieldset);
  });
  each('[data-day]', element => element.addEventListener('click', () => selectDay(Number(element.dataset.day))));
  each('[data-plan-anchor]', element => element.addEventListener('click', () => {
    const target = byId(element.getAttribute('href').slice(1));
    if (!target) return;
    const day = target.closest('.day');
    if (day) selectDay(Number(day.id.slice(4)));
    // Reveal destinations before the browser performs its normal hash scroll.
    // A gallery link opens the actual selector of that specific meal.
    if (target.matches('details')) target.open = true;
    if (target.matches('.food')) target.querySelectorAll('details').forEach(details => { details.open = true; });
    let ancestor = target.parentElement;
    while (ancestor) { if (ancestor.matches('details')) ancestor.open = true; ancestor = ancestor.parentElement; }
  }));
  each('[data-meal]', element => element.addEventListener('change', () => { state.checks[mealKey(element)] = element.checked; progress(); save(); }));
  each('[data-choice]', element => element.addEventListener('change', () => {
    state.choices[element.dataset.choice] = Number(element.value); renderChoices(); save();
    byId('choice-status').textContent = 'Opção atualizada. Os totais do dia, o resumo da semana e a lista de compras já refletem a sua escolha.';
  }));
  date.addEventListener('change', () => { if (date.value) refresh(); });
  byId('previous-day').addEventListener('click', () => selectDay(Math.max(0, state.day - 1)));
  byId('next-day').addEventListener('click', () => selectDay(Math.min(days.length - 1, state.day + 1)));
  byId('shopping-scope').addEventListener('change', renderShopping);
  const notes = byId('notes'); notes.value = state.notes;
  notes.addEventListener('input', () => { state.notes = notes.value; save(); });
  byId('water-add').addEventListener('click', () => { state.water[date.value] = Math.min(10000, (Number(state.water[date.value]) || 0) + 200); progress(); save(); });
  byId('water-subtract').addEventListener('click', () => { state.water[date.value] = Math.max(0, (Number(state.water[date.value]) || 0) - 200); progress(); save(); });
  const download = (contents, type, filename) => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  byId('download-progress').addEventListener('click', () => {
    save();
    const copy = document.documentElement.cloneNode(true);
    copy.querySelector('body').dataset.progress = JSON.stringify(state);
    copy.querySelectorAll('.day').forEach(element => element.removeAttribute('hidden'));
    const originalInputs = [...document.querySelectorAll('input')];
    copy.querySelectorAll('input').forEach((element, index) => { element.toggleAttribute('checked', originalInputs[index].checked === true); });
    copy.querySelector('#notes').textContent = state.notes;
    copy.querySelectorAll('[data-choices]').forEach(element => element.replaceChildren());
    copy.querySelector('#storage').textContent = 'Cópia com progresso salva. Abra em um navegador para continuar.';
    download('<!doctype html>\n' + copy.outerHTML, 'text/html;charset=utf-8', 'meu-plano-com-progresso.html');
    byId('backup-status').textContent = 'Cópia preparada com suas escolhas e anotações. Guarde em local privado; ela contém suas informações pessoais.';
  });
  byId('download-shopping').addEventListener('click', () => {
    const scope = byId('shopping-scope');
    let group = '';
    const lines = ['MINHA LISTA DE COMPRAS', scope.options[scope.selectedIndex].textContent, ''];
    shoppingRows().forEach(item => { if (group !== item.group) { group = item.group; lines.push('', group.toUpperCase()); } lines.push((state.shopping[item.foodId] ? '[x] ' : '[ ] ') + item.name + ' - ' + number(item.grams) + ' g'); });
    lines.push('', 'Quantidades conforme o alimento descrito no plano, sem ajuste de rendimento. Incluem as trocas selecionadas.');
    download(lines.join('\n'), 'text/plain;charset=utf-8', 'minha-lista-de-compras.txt');
  });
  let printDetails = null;
  const preparePrint = () => {
    if (printDetails) return;
    printDetails = [...document.querySelectorAll('details')].map(element => ({ element, open: element.open }));
    printDetails.forEach(({ element }) => { element.open = true; });
  };
  const finishPrint = () => {
    printDetails?.forEach(({ element, open }) => { element.open = open; });
    printDetails = null;
  };
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', finishPrint);
  }
  byId('print').addEventListener('click', () => { preparePrint(); window.print(); finishPrint(); });
  byId('clear').addEventListener('click', () => {
    if (!window.confirm('Apagar escolhas, marcações, compras e anotações deste plano neste navegador? Cópias já baixadas permanecem com seus dados.')) return;
    state = cleanState({}); document.body.removeAttribute('data-progress'); notes.value = ''; renderChoices(); selectDay(0); save();
    byId('backup-status').textContent = 'Marcações apagadas neste navegador. Para apagar outras cópias, remova os arquivos salvos nos seus dispositivos.';
  });
  renderChoices(); selectDay(state.day);
}
