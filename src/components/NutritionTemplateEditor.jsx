import { useEffect, useRef, useState } from 'react';
import { clinicalProfiles, foodById, foods } from '../data/nutrition.js';
import { goalOptions } from '../data/nutrition-journey.js';
import { dayTotals, sumItems } from '../lib/nutrition.js';
import { nutritionApi } from './NutritionPublic.jsx';

const api = (action, body, query) => nutritionApi(action, body, true, query);
const num = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function NutritionTemplateEditor({ template, onClose, onSaved }) {
  const [model, setModel] = useState(null); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false); const [day, setDay] = useState(0); const [dirty, setDirty] = useState(false);
  const dialog = useRef(null);
  useEffect(() => { if (!dirty) return; const handler = event => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
  useEffect(() => { dialog.current.showModal(); let active = true; api('template-detail', null, `&templateId=${encodeURIComponent(template.id)}`).then(result => { if (active) setModel(result); }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, [template.id]);
  const close = () => { if (!busy && (!dirty || window.confirm('Sair sem salvar as alterações deste modelo?'))) onClose(); };
  const editPlan = fn => { setModel(current => { const next = structuredClone(current); fn(next.plan); return next; }); setDirty(true); };
  const set = (key, value) => { setModel(current => ({ ...current, [key]: value })); setDirty(true); };
  const save = async copy => {
    setBusy(true); setMessage('');
    try { const result = await api('template-save', { ...(!copy && !model.builtin ? { id: model.id, revision: model.revision } : {}), title: model.title, profile: model.profile, goals: model.goals || [], plan: model.plan }); setModel(result); setDirty(false); await onSaved(); setMessage('Modelo salvo na sua biblioteca. Você pode continuar editando ou usá-lo em um atendimento.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const remove = async () => { if (!window.confirm('Excluir este modelo da biblioteca? Planos já preparados continuam preservados.')) return; setBusy(true); try { await api('template-delete', { templateId: model.id, revision: model.revision }); await onSaved(); onClose(); } catch (error) { setMessage(error.message); setBusy(false); } };
  const current = model?.plan.days[day];
  return <dialog className="nw-food-dialog nw-template-preview nw-model-editor" ref={dialog} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="model-editor-title">
    <div className="nw-food-dialog__head"><div><p className="admin-label">Biblioteca profissional</p><h2 id="model-editor-title">Personalize uma base.</h2></div><button className="nw-close" onClick={close} aria-label="Fechar editor" disabled={busy}>×</button></div>
    {message && <p className="nw-notice" role="status">{message}</p>}{!model ? <p>Carregando modelo…</p> : <fieldset className="nw-editor nw-form" disabled={busy}>
      <p className="nw-fine">{model.builtin ? 'Esta é uma base inicial. Salve uma cópia para adaptá-la à sua prática.' : 'As alterações valem para os próximos atendimentos que usarem este modelo.'} Metas e avaliações da pessoa serão definidas no atendimento.</p>
      <div className="nw-grid-2"><label>Nome do modelo<input maxLength="120" value={model.title} onChange={event => set('title', event.target.value)} /></label><label>Contexto<select value={model.profile} onChange={event => set('profile', event.target.value)}>{clinicalProfiles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <fieldset><legend>Objetivos</legend><div className="nw-chips">{goalOptions.map(item => <label className="nw-check" key={item.id}><input type="checkbox" checked={model.goals?.includes(item.id) || false} onChange={event => set('goals', event.target.checked ? [...(model.goals || []), item.id] : model.goals.filter(id => id !== item.id))} />{item.label}</label>)}</div></fieldset>
      <nav className="nw-day-tabs" aria-label="Dias do modelo">{model.plan.days.map((item, index) => <button type="button" key={item.label} aria-pressed={day === index} onClick={() => setDay(index)}>{item.label.slice(0, 3)} <small>{num(dayTotals(item).kcal)} kcal</small></button>)}</nav>
      <p><strong>{num(dayTotals(current).kcal)} kcal neste dia</strong> · {num(dayTotals(current).protein)} g de proteína · valores calculados dos alimentos e porções.</p>
      {current.meals.map((meal, mi) => <section className="nw-card nw-form" key={`${day}-${mi}`}><div className="nw-grid-2"><label>Refeição<input maxLength="80" value={meal.name} onChange={event => editPlan(plan => { plan.days[day].meals[mi].name = event.target.value; })} /></label><label>Horário<input type="time" value={meal.time} onChange={event => editPlan(plan => { plan.days[day].meals[mi].time = event.target.value; })} /></label></div><p className="nw-fine">{num(sumItems(meal.items).kcal)} kcal</p>
        {meal.items.map((item, ii) => <div className="nw-model-food" key={ii}><img src={foodById[item.foodId]?.image} alt={foodById[item.foodId]?.name || ''} loading="lazy" /><label>Alimento<select value={item.foodId} onChange={event => editPlan(plan => { plan.days[day].meals[mi].items[ii] = { foodId: event.target.value, grams: item.grams, alternatives: [] }; })}>{foods.map(food => <option key={food.id} value={food.id}>{food.name}</option>)}</select></label><label>Gramas<input type="number" min="1" max="1500" step="1" value={item.grams} onChange={event => editPlan(plan => { plan.days[day].meals[mi].items[ii].grams = Number(event.target.value); plan.days[day].meals[mi].items[ii].alternatives = []; })} /></label><button type="button" className="nw-button nw-button--quiet" disabled={meal.items.length <= 1} onClick={() => editPlan(plan => { plan.days[day].meals[mi].items.splice(ii, 1); })}>Remover</button></div>)}
        <div className="nw-actions"><button type="button" className="nw-button nw-button--quiet" disabled={meal.items.length >= 15} onClick={() => editPlan(plan => { plan.days[day].meals[mi].items.push({ foodId: 'rice', grams: 100, alternatives: [] }); })}>+ Alimento</button><button type="button" className="nw-button nw-button--quiet" disabled={current.meals.length <= 1} onClick={() => editPlan(plan => { plan.days[day].meals.splice(mi, 1); })}>Remover refeição</button></div>
      </section>)}
      <div className="nw-actions"><button type="button" className="nw-button nw-button--quiet" disabled={current.meals.length >= 8} onClick={() => editPlan(plan => { plan.days[day].meals.push({ name: 'Nova refeição', time: '15:00', note: '', items: [{ foodId: 'banana', grams: 80, alternatives: [] }] }); })}>+ Refeição</button><button type="button" className="nw-button nw-button--quiet" onClick={() => { if (window.confirm('Copiar as refeições deste dia para toda a semana?')) editPlan(plan => { plan.days = plan.days.map(item => ({ ...item, meals: structuredClone(current.meals) })); }); }}>Copiar este dia para a semana</button></div>
      <div className="nw-actions"><button type="button" className="nw-button" onClick={() => save(model.builtin)}>{busy ? 'Salvando…' : model.builtin ? 'Salvar como meu modelo' : 'Salvar alterações'}</button>{!model.builtin && <><button type="button" className="nw-button nw-button--quiet" onClick={() => save(true)}>Duplicar modelo</button><button type="button" className="nw-button nw-button--quiet" onClick={remove}>Excluir modelo</button></>}</div>
    </fieldset>}
  </dialog>;
}
