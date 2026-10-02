import { useEffect, useState } from 'react';
import { site } from '../data/site.js';
import '../styles/service-offers.css';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const billingLabels = { month: '/mês', person: '/pessoa · periodicidade a confirmar', 'person-month': '/pessoa por mês', 'person-total': '/pessoa no total', total: ' no total' };
async function offersApi(admin = false, body) {
  const response = await fetch(`/api/${admin ? 'admin/' : ''}service-offers`, { credentials: 'same-origin', cache: 'no-store', ...(body ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as opções.');
  return data;
}

export function ServiceOffers() {
  const [offers, setOffers] = useState(null);
  useEffect(() => { let active = true; offersApi().then(data => { if (active) setOffers(data.offers); }).catch(() => { if (active) setOffers([]); }); return () => { active = false; }; }, []);
  if (!offers?.length) return null;
  return <section className="section service-offers" aria-labelledby="service-offers-title"><div className="shell">
    <p className="eyebrow eyebrow--gold">Acompanhamento personalizado</p><h2 id="service-offers-title">Cuidado com <em>continuidade.</em></h2>
    <p>Conheça as opções e converse com a Gi para escolher o acompanhamento para o seu momento.</p>
    <div className="service-offers__grid">{offers.map(offer => <article className="service-offers__card" key={offer.id}>
      {offer.badge && <span className="service-offers__badge">{offer.badge}</span>}<h3>{offer.title}</h3><p>{offer.description}</p>
      <div className="service-offers__price">{offer.originalPriceCents && <del>{money(offer.originalPriceCents)}</del>}<strong>{money(offer.priceCents)}</strong><span>{billingLabels[offer.billing]}</span></div>
      <small>{offer.durationMonths} meses de acompanhamento</small><p className="service-offers__conditions">{offer.conditions}</p>
      <a className="button" href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Olá, Gi! Gostaria de conhecer as condições do ${offer.title} (${money(offer.priceCents)}${billingLabels[offer.billing]}).`)}`} target="_blank" rel="noopener noreferrer">Conhecer este plano <span aria-hidden="true">↗</span></a>
    </article>)}</div>
  </div></section>;
}

export function ServiceOffersEditor({ onEditingStateChange }) {
  const [data, setData] = useState(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const dirty = Boolean(data && saved && JSON.stringify(data) !== saved);
  const accept = value => { setData(value); setSaved(JSON.stringify(value)); };
  const reload = async () => { if (dirty && !window.confirm('Descartar as alterações de acompanhamento ainda não salvas?')) return; setBusy(true); setMessage(''); try { accept(await offersApi(true)); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  useEffect(() => { let active = true; offersApi(true).then(value => { if (active) { setData(value); setSaved(JSON.stringify(value)); } }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);
  useEffect(() => { onEditingStateChange?.({ dirty, busy }); return () => onEditingStateChange?.({ dirty: false, busy: false }); }, [dirty, busy, onEditingStateChange]);
  useEffect(() => { if (!dirty && !busy) return; const leave = event => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave); }, [dirty, busy]);
  const edit = (id, key, value) => setData(current => ({ ...current, offers: current.offers.map(item => item.id === id ? { ...item, [key]: value } : item) }));
  const save = async event => { event.preventDefault(); setBusy(true); setMessage(''); try { accept(await offersApi(true, data)); setMessage('Opções salvas. Os valores publicados já estão disponíveis na página de atendimentos.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  return <section className="nw-card service-offers-editor" aria-labelledby="service-offers-editor-title"><h2 id="service-offers-editor-title">Valores dos acompanhamentos</h2><p>Edite as opções exibidas na página de atendimentos. A contratação é combinada pelo WhatsApp. Esses valores são independentes dos produtos digitais.</p>
    <p className="nw-fine">Os valores iniciais vêm da arte de referência e começam em rascunho. Confira condições, vigência e periodicidade antes de exibir cada oferta.</p>
    {message && <p role="status" className="nutrition-alert">{message}</p>}
    <button className="nw-button nw-button--secondary" type="button" disabled={busy} onClick={reload}>Recarregar opções</button>
    {data && <form onSubmit={save}><fieldset disabled={busy} className="service-offers-editor__fields">{data.offers.map(offer => <div className="service-offers-editor__item" key={offer.id}>
      <div className="nutrition-form-grid"><label className="nutrition-field"><span>Título</span><input required maxLength={100} value={offer.title} onChange={event => edit(offer.id, 'title', event.target.value)} /></label><label className="nutrition-field"><span>Destaque</span><input maxLength={40} value={offer.badge} onChange={event => edit(offer.id, 'badge', event.target.value)} /></label></div>
      <label className="nutrition-field"><span>Descrição</span><textarea maxLength={500} value={offer.description} onChange={event => edit(offer.id, 'description', event.target.value)} /></label>
      <div className="nutrition-form-grid"><label className="nutrition-field"><span>Preço atual (R$)</span><input required type="number" min="1" max="100000" step="0.01" value={offer.priceCents / 100 || ''} onChange={event => edit(offer.id, 'priceCents', Math.round(Number(event.target.value) * 100))} /></label><label className="nutrition-field"><span>Preço anterior (opcional)</span><input type="number" min="1" max="100000" step="0.01" value={offer.originalPriceCents === null ? '' : offer.originalPriceCents / 100} onChange={event => edit(offer.id, 'originalPriceCents', event.target.value === '' ? null : Math.round(Number(event.target.value) * 100))} /></label><label className="nutrition-field"><span>Apresentação do preço</span><select value={offer.billing} onChange={event => edit(offer.id, 'billing', event.target.value)}><option value="month">Por mês</option><option value="person">Por pessoa · periodicidade pendente</option><option value="person-month">Por pessoa por mês</option><option value="person-total">Por pessoa no total</option><option value="total">Valor total</option></select></label><label className="nutrition-field"><span>Duração (meses)</span><input required type="number" min="1" max="24" value={offer.durationMonths} onChange={event => edit(offer.id, 'durationMonths', Number(event.target.value))} /></label></div>
      <label className="nutrition-field"><span>Condições da oferta</span><textarea maxLength={600} value={offer.conditions} onChange={event => edit(offer.id, 'conditions', event.target.value)} /></label><label className="nutrition-check"><input type="checkbox" checked={offer.published} onChange={event => edit(offer.id, 'published', event.target.checked)} />Exibir esta opção no site</label>
      <button type="button" className="nw-button nw-button--secondary" onClick={() => setData(current => ({ ...current, offers: current.offers.filter(item => item.id !== offer.id) }))}>Remover opção</button>
    </div>)}<div className="service-offers-editor__actions"><button type="button" className="nw-button nw-button--secondary" disabled={data.offers.length >= 12} onClick={() => setData(current => ({ ...current, offers: [...current.offers, { id: `plano-${crypto.randomUUID()}`, title: 'Novo acompanhamento', description: '', priceCents: 100, originalPriceCents: null, billing: 'month', durationMonths: 3, badge: '', conditions: '', published: false }] }))}>Adicionar opção</button><button className="nw-button" type="submit">{busy ? 'Salvando…' : 'Salvar acompanhamentos'}</button></div></fieldset></form>}
  </section>;
}
