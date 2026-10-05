import { useEffect, useState } from 'react';
import { site } from '../data/site.js';
import { normalizeServiceOffer, serviceAudiences } from '../data/service-offers.js';
import { Arrow } from './UI.jsx';
import '../styles/service-offers.css';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const billingLabels = { month: '/mês', person: '/pessoa · periodicidade a confirmar', 'person-month': '/pessoa por mês', 'person-total': '/pessoa no total', total: ' no total' };
async function offersApi(admin = false, body) {
  const response = await fetch(`/api/${admin ? 'admin/' : ''}service-offers`, { credentials: 'same-origin', cache: 'no-store', ...(body ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as opções.');
  return data;
}

function PlanIcon({ audience }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    {audience === 'individual' ? <><circle cx="24" cy="13" r="7" /><path d="M10 40v-5a14 14 0 0 1 28 0v5H10Z" /></> : <>
      <circle cx="12" cy="14" r="6" /><circle cx="36" cy="14" r="6" />
      <path d={audience === 'familia' ? 'M17 39H3v-8a9 9 0 0 1 18-1m10 9h14v-8a9 9 0 0 0-18-1' : 'M21 39H3v-8a9 9 0 0 1 18 0v8Zm6 0h18v-8a9 9 0 0 0-18 0v8Z'} />
      {audience === 'familia' && <><circle cx="24" cy="27" r="5" /><path d="M16 44v-4a8 8 0 0 1 16 0v4H16Z" /></>}
    </>}
  </svg>;
}

const planContact = (title, durationMonths, price = '') => `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Olá, Gi! Gostaria de conhecer as condições do ${title}, com ${durationMonths} meses de acompanhamento${price ? ` (${price})` : ''}.`)}`;

export function ServiceOffers({ standaloneHref = '/plano-alimentar' }) {
  const [offers, setOffers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [duration, setDuration] = useState(3);
  useEffect(() => {
    let active = true;
    offersApi().then(data => { if (active) { setOffers(data.offers.map(normalizeServiceOffer)); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, []);
  const durations = [...new Set([3, 6, ...offers.map(offer => offer.durationMonths)])].sort((a, b) => a - b);
  return <section id="planos-acompanhamento" className="section service-offers" aria-labelledby="service-offers-title"><div className="shell">
    <div className="service-offers__heading"><div><p className="eyebrow eyebrow--gold">Acompanhamento personalizado</p><h2 id="service-offers-title">Um cuidado para você.<br /><em>E para quem caminha junto.</em></h2></div><p>Ciência, escuta e cuidado para entender você por inteiro. Atendimento presencial e online, com orientação que respeita a rotina de cada pessoa.</p></div>
    <div className="service-offers__period"><p>Escolha seu tempo de cuidado</p><div role="group" aria-label="Duração do acompanhamento">{durations.map(months => <button type="button" key={months} aria-pressed={duration === months} onClick={() => setDuration(months)}>{months} meses</button>)}</div></div>
    <div className="service-offers__grid">{serviceAudiences.map(audience => {
      const options = offers.filter(offer => offer.audience === audience.id && offer.durationMonths === duration);
      return <article className="service-offers__card" key={audience.id}>
        <div className="service-offers__icon"><PlanIcon audience={audience.id} /></div><h3>{audience.title}</h3>
        {options.length ? options.map(offer => <div className="service-offers__option" key={offer.id}>
          {offer.badge && <span className="service-offers__badge">{offer.badge}</span>}
          {offer.title !== audience.title && <h4>{offer.title}</h4>}<p>{offer.description}</p>
          <div className="service-offers__price">{offer.originalPriceCents && <del>{money(offer.originalPriceCents)}</del>}<strong>{money(offer.priceCents)}</strong><span>{billingLabels[offer.billing]}</span></div>
          <small>{offer.durationMonths} meses de acompanhamento</small><p className="service-offers__conditions">{offer.conditions}</p>
          <a className="button" href={planContact(offer.title, offer.durationMonths, `${money(offer.priceCents)}${billingLabels[offer.billing]}`)} target="_blank" rel="noopener noreferrer"><span>Conhecer este plano</span><Arrow external /></a>
        </div>) : <div className="service-offers__option"><p>{audience.description}</p><p className="service-offers__quote">Valores sob consulta</p><small>Acompanhamento de {duration} meses</small><p className="service-offers__conditions">Converse com a Gi sobre valores, encontros e disponibilidade para o seu momento.</p><a className="button" href={planContact(audience.title, duration)} target="_blank" rel="noopener noreferrer"><span>Conversar sobre este plano</span><Arrow external /></a></div>}
      </article>;
    })}</div>
    {status !== 'ready' && <p className="service-offers__status" role="status">{status === 'loading' ? 'Consultando os valores dos acompanhamentos…' : 'Não foi possível consultar os valores agora. Converse com a Gi pelo WhatsApp.'}</p>}
    <div className="service-offers__standalone"><div><p className="eyebrow eyebrow--gold">Um objetivo específico</p><h3>Prefere somente um <em>plano alimentar?</em></h3><p>Conheça o plano personalizado ou converse com a Gi para escolher o cuidado que faz sentido para você.</p></div><a className="text-link" href={standaloneHref}>Conhecer o plano alimentar <Arrow /></a></div>
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
  const save = async event => { event.preventDefault(); setBusy(true); setMessage(''); try { accept(await offersApi(true, data)); setMessage('Opções salvas. Os valores publicados já estão disponíveis nas páginas de atendimentos e de planos.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  return <section className="nw-card service-offers-editor" aria-labelledby="service-offers-editor-title"><h2 id="service-offers-editor-title">Planos e valores dos acompanhamentos</h2><p>Edite os planos individual, casal e família exibidos nas páginas de atendimentos e de planos. Cada público e duração pode ter seu próprio valor. A contratação é combinada pelo WhatsApp.</p>
    <p className="nw-fine">As opções de 3 e 6 meses já têm valores iniciais. Altere o preço, a forma de cobrança e as condições, escolha se deseja exibir cada opção e salve. Novas opções começam em rascunho. Esses valores são independentes do plano alimentar avulso e dos produtos digitais.</p>
    {message && <p role="status" className="nutrition-alert">{message}</p>}
    <button className="nw-button nw-button--secondary" type="button" disabled={busy} onClick={reload}>Recarregar opções</button>
    {data && <form onSubmit={save}><fieldset disabled={busy} className="service-offers-editor__fields">{data.offers.map(offer => <div className="service-offers-editor__item" key={offer.id}>
      <div className="service-offers-editor__summary"><strong>{serviceAudiences.find(audience => audience.id === offer.audience)?.title} · {offer.durationMonths} meses</strong><span className={`admin-pill ${offer.published ? 'admin-pill--live' : ''}`}>{offer.published ? 'Visível no site' : 'Rascunho'}</span></div>
      <div className="nutrition-form-grid"><label className="nutrition-field"><span>Público do plano</span><select value={offer.audience} onChange={event => edit(offer.id, 'audience', event.target.value)}>{serviceAudiences.map(audience => <option key={audience.id} value={audience.id}>{audience.title}</option>)}</select></label><label className="nutrition-field"><span>Título</span><input required maxLength={100} value={offer.title} onChange={event => edit(offer.id, 'title', event.target.value)} /></label><label className="nutrition-field"><span>Destaque</span><input maxLength={40} value={offer.badge} onChange={event => edit(offer.id, 'badge', event.target.value)} /></label></div>
      <label className="nutrition-field"><span>Descrição</span><textarea maxLength={500} value={offer.description} onChange={event => edit(offer.id, 'description', event.target.value)} /></label>
      <div className="nutrition-form-grid"><label className="nutrition-field"><span>Preço atual (R$)</span><input required={offer.published} type="number" min="1" max="100000" step="0.01" placeholder="Defina o valor" value={offer.priceCents === null ? '' : offer.priceCents / 100} onChange={event => edit(offer.id, 'priceCents', event.target.value === '' ? null : Math.round(Number(event.target.value) * 100))} /></label><label className="nutrition-field"><span>Preço anterior (opcional)</span><input type="number" min="1" max="100000" step="0.01" value={offer.originalPriceCents === null ? '' : offer.originalPriceCents / 100} onChange={event => edit(offer.id, 'originalPriceCents', event.target.value === '' ? null : Math.round(Number(event.target.value) * 100))} /></label><label className="nutrition-field"><span>Apresentação do preço</span><select value={offer.billing} onChange={event => edit(offer.id, 'billing', event.target.value)}><option value="month">Por mês</option><option value="person">Por pessoa · periodicidade pendente</option><option value="person-month">Por pessoa por mês</option><option value="person-total">Por pessoa no total</option><option value="total">Valor total</option></select></label><label className="nutrition-field"><span>Duração (meses)</span><input required type="number" min="1" max="24" value={offer.durationMonths} onChange={event => edit(offer.id, 'durationMonths', Number(event.target.value))} /></label></div>
      <label className="nutrition-field"><span>Condições da oferta</span><textarea maxLength={600} value={offer.conditions} onChange={event => edit(offer.id, 'conditions', event.target.value)} /></label><label className="nutrition-check"><input type="checkbox" checked={offer.published} onChange={event => edit(offer.id, 'published', event.target.checked)} />Exibir esta opção no site</label>
      <button type="button" className="nw-button nw-button--secondary" onClick={() => setData(current => ({ ...current, offers: current.offers.filter(item => item.id !== offer.id) }))}>Remover opção</button>
    </div>)}<div className="service-offers-editor__actions"><button type="button" className="nw-button nw-button--secondary" disabled={data.offers.length >= 12} onClick={() => setData(current => ({ ...current, offers: [...current.offers, { id: `plano-${crypto.randomUUID()}`, audience: 'individual', title: 'Novo acompanhamento', description: '', priceCents: null, originalPriceCents: null, billing: 'total', durationMonths: 3, badge: '', conditions: '', published: false }] }))}>Adicionar opção</button><button className="nw-button" type="submit">{busy ? 'Salvando…' : 'Salvar acompanhamentos'}</button></div></fieldset></form>}
  </section>;
}
