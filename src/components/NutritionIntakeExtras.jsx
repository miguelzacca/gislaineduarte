import { useId, useRef, useState } from 'react';
import { allergies, foods } from '../data/nutrition.js';
import { bristolTypes, intolerances } from '../data/nutrition-journey.js';
import '../styles/nutrition-intake-upgrade.css';

const normalizeSearch = value => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
const selectedNames = (options, selected, property = 'label') => options.filter(item => (selected || []).includes(item.id)).map(item => item[property]).join(', ');

export function IntakeSection({ number, title, description, children, tone = '' }) {
  return <section className={`ni-section ${tone && `ni-section--${tone}`}`}><div className="ni-section__heading"><span aria-hidden="true">{number}</span><div><h3>{title}</h3>{description && <p>{description}</p>}</div></div>{children}</section>;
}

export function IntakeRestrictionSummary({ intake, compact = false }) {
  const items = [
    ['Alergias', selectedNames(allergies, intake.allergies) || 'Nenhuma informada', intake.allergyNotes],
    ['Intolerâncias', selectedNames(intolerances, [...(intake.intolerances || []), ...((intake.conditions || []).includes('lactose') ? ['lactose'] : [])]) || 'Nenhuma informada', intake.intoleranceNotes],
    ['Excluir do plano', selectedNames(foods, intake.excludedFoodIds, 'name') || 'Nenhum alimento selecionado nas fotos', [intake.foodExclusionNotes && `Outros alimentos: ${intake.foodExclusionNotes}`, intake.seasoningExclusions && `Temperos: ${intake.seasoningExclusions}`].filter(Boolean).join('\n')],
  ];
  return <section className={`ni-restrictions ${compact ? 'ni-restrictions--compact' : ''}`} aria-label="Resumo de alergias, intolerâncias e exclusões"><div className="ni-restrictions__heading"><span aria-hidden="true">!</span><div><strong>O que precisa de atenção</strong><p>Alergias e intolerâncias são informações de saúde. Gostos e exclusões ficam registrados separadamente.</p></div></div><dl>{items.map(([label, value, note]) => <div key={label}><dt>{label}</dt><dd>{value}{note && <small>{note}</small>}</dd></div>)}</dl></section>;
}

export function nextFoodPreferences(intake, foodId, choice) {
  const keys = ['likedFoodIds', 'dislikedFoodIds', 'excludedFoodIds'];
  return Object.fromEntries(keys.map(key => [key, [...(intake[key] || []).filter(id => id !== foodId), ...(key === choice ? [foodId] : [])]]));
}

export function FoodPreferencePicker({ intake, onChange, errors = {} }) {
  const [search, setSearch] = useState('');
  const searchId = useId();
  const matches = foods.filter(food => normalizeSearch(food.name).includes(normalizeSearch(search)));
  const names = key => selectedNames(foods, intake[key], 'name') || 'Nenhum selecionado';
  const error = errors.likedFoodIds || errors.dislikedFoodIds || errors.excludedFoodIds;
  return <section className="ni-food-picker" aria-label="Preferências por alimento">
    <div className="ni-food-summary"><dl><div><dt>Gosto de comer</dt><dd>{names('likedFoodIds')}</dd></div><div><dt>Não gosto</dt><dd>{names('dislikedFoodIds')}</dd></div><div className="ni-food-summary__excluded"><dt>Excluir do plano</dt><dd>{names('excludedFoodIds')}</dd></div></dl></div>
    <p className="ni-help">Escolha uma opção por alimento. “Excluir do plano” impede sua inclusão. Os alimentos marcados como “Não gosto” também são evitados, com o motivo registrado separadamente. Informe reações no campo de alergias, mesmo que também exclua o alimento.</p>
    <label className="nutrition-field" htmlFor={searchId}><span>Buscar alimento pelas fotos</span><input id={searchId} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex.: arroz, ovo, maçã…" aria-controls={`${searchId}-results`} /></label>
    <p className="ni-result-count" role="status">{matches.length} {matches.length === 1 ? 'alimento encontrado' : 'alimentos encontrados'}. Suas escolhas continuam no resumo acima.</p>
    {error && <p id={`${searchId}-error`} className="nutrition-field-error" role="alert">{error}</p>}
    <div className="ni-food-grid" id={`${searchId}-results`}>{matches.map(food => {
      const choice = ['excludedFoodIds', 'dislikedFoodIds', 'likedFoodIds'].find(key => (intake[key] || []).includes(food.id)) || '';
      return <article className={`ni-food-card ${choice === 'excludedFoodIds' ? 'is-excluded' : choice ? 'is-chosen' : ''}`} key={food.id}><img src={food.image} width="240" height="180" alt="" loading="lazy" decoding="async" /><div><h4>{food.name}</h4><label><span className="ni-sr-only">Sua escolha para {food.name}</span><select value={choice} onChange={event => onChange(nextFoodPreferences(intake, food.id, event.target.value))} aria-invalid={Boolean(error)} aria-describedby={error ? `${searchId}-error` : undefined}><option value="">Sem preferência</option><option value="likedFoodIds">Gosto de comer</option><option value="dislikedFoodIds">Não gosto</option><option value="excludedFoodIds">Excluir do plano</option></select></label></div></article>;
    })}</div>
    {!matches.length && <p className="ni-empty">Não encontramos esse alimento. Registre o nome nos campos de preferências ou exclusões por escrito abaixo.</p>}
  </section>;
}

function BristolIllustration({ type }) {
  const shapes = {
    1: <>{[[28, 25, 9], [53, 22, 10], [76, 32, 8], [43, 48, 9], [67, 53, 8]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} />)}</>,
    2: <><path d="M24 50c-9-6-4-17 4-18-2-10 10-16 18-11 6-9 21-4 22 5 12-3 22 9 15 17 5 8-5 18-15 13-7 8-17 4-22-3-9 6-16 4-22-3Z" /><path d="m31 30 7 12m11-18 3 16m13-10 1 17m-24 0 9 5" className="ni-bristol__line" /></>,
    3: <><path d="M22 47c1-11 25-20 41-21 25-2 31 18 13 25-17 3-34 15-46 10-6-3-9-7-8-14Z" /><path d="m39 35 5 8-6 8m20-20-3 9 7 7m11-17-4 10" className="ni-bristol__line" /></>,
    4: <path d="M22 49c0-9 11-12 25-16 11-3 18-11 28-8 13 4 17 15 5 22-8 5-20 4-28 9-16 9-29 5-30-7Z" />,
    5: <><path d="M21 26c5-7 20-5 23 3 4 10-8 17-17 12-7-3-10-8-6-15ZM59 21c7-5 22 0 22 9 0 9-14 11-21 6-6-4-6-11-1-15ZM43 49c8-5 22-1 22 7 0 9-17 11-24 4-4-3-3-8 2-11Z" /></>,
    6: <path d="m21 28 8-7 7 4 5-5 8 10-6 7-9-1-5 6-10-7Zm42-6 8 3 8-3 5 9-8 6-1 8-12-1-5-9Zm-23 22 8 4 9-5 6 9-4 10-12-2-6 4-8-10Z" />,
    7: <><path d="M18 41c0-13 11-11 21-14 11-4 13-11 22-7 7 3 10 8 17 9 17 4 10 25-2 25-15 0-13 8-30 7-15-1-28-6-28-20Z" opacity=".6" /><path d="m31 37 12-2m13 12 16-4m-38 6 9 1" className="ni-bristol__line" /></>,
  };
  return <svg viewBox="0 0 104 80" className="ni-bristol__image" aria-hidden="true" focusable="false"><g fill="#8a6946" stroke="#705332" strokeWidth="1.4" strokeLinejoin="round">{shapes[type]}</g></svg>;
}

export function BristolScale({ value = null, onChange, disabled = false, error }) {
  const id = useId();
  return <fieldset className="ni-bristol" disabled={disabled} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}><legend>Como costumam ser suas fezes? <span>Opcional</span></legend><p id={`${id}-help`} className="ni-help">Escolha a imagem que mais se aproxima do que você observa. A escala descreve o formato e a consistência; a Gi interpreta o registro junto com sua história.</p><div className="ni-bristol__grid">{bristolTypes.map(item => <label className={`ni-bristol__choice ${Number(value) === item.type ? 'is-selected' : ''}`} key={item.type}><input type="radio" name={id} value={item.type} checked={Number(value) === item.type} onChange={() => onChange?.(item.type)} aria-invalid={Boolean(error)} /><BristolIllustration type={item.type} /><span><strong>Tipo {item.type} · {item.label}</strong><small>{item.description}</small></span></label>)}</div><label className="nutrition-check ni-bristol__skip"><input type="radio" name={id} value="" checked={value === null || value === undefined || value === ''} onChange={() => onChange?.(null)} /><span>Prefiro não responder</span></label>{error && <p className="nutrition-field-error" id={`${id}-error`}>{error}</p>}</fieldset>;
}

export function draftSafeIntake(intake) {
  const safe = { ...intake, photos: [], photosConsent: false, consent: false };
  delete safe.aiConsent;
  return safe;
}

export async function prepareIntakePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Cada foto original pode ter até 10 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Não foi possível ler esta foto. Escolha outra imagem.')); image.src = objectUrl; });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 48000000) throw new Error('Escolha uma foto com resolução de até 48 megapixels.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Seu navegador não conseguiu preparar a foto. Você pode seguir sem anexos.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1] || '';
      const bytes = base64.length * 3 / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
      if (dataUrl.startsWith('data:image/jpeg;base64,') && bytes > 0 && bytes <= 180000) return { name: `${file.name.replace(/\.[^.]*$/, '').slice(0, 70) || 'refeicao'}.jpg`, type: 'image/jpeg', dataUrl, purpose: 'food-context' };
    }
    throw new Error('Essa foto ainda está grande. Escolha uma imagem menor.');
  } finally { URL.revokeObjectURL(objectUrl); }
}

export function IntakePhotos({ intake, onChange, errors = {}, onBusyChange }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const inputRef = useRef(null); const id = useId();
  const photos = intake.photos || [];
  const error = errors.photos || message;
  const addPhotos = async event => {
    const files = Array.from(event.target.files || []); event.target.value = ''; setMessage('');
    if (!files.length) return;
    if (photos.length + files.length > 2) { setMessage('Você pode anexar até 2 fotos. Remova uma antes de adicionar outra.'); return; }
    setBusy(true); onBusyChange?.(true);
    try { const prepared = await Promise.all(files.map(prepareIntakePhoto)); onChange({ photos: [...photos, ...prepared] }); }
    catch (failure) { setMessage(failure.message); inputRef.current?.focus(); }
    finally { setBusy(false); onBusyChange?.(false); }
  };
  return <div className="ni-photos"><p id={`${id}-help`} className="ni-help">Se quiser, mostre uma refeição ou a organização dos alimentos na sua rotina. Isso ajuda a Gi a entender seus hábitos. Não precisamos de fotos do corpo, rosto ou pescoço para esta etapa.</p><p className="ni-help">Até 2 fotos, somente para este atendimento. Elas não entram no rascunho salvo nesta aba, na assistência por IA nem nos arquivos do plano.</p><label className="nutrition-field"><span>Adicionar fotos de refeições ou rotina (opcional)</span><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || photos.length >= 2} onChange={addPhotos} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)} /><small>JPG, PNG ou WebP, até 10 MB por original. A imagem é reduzida antes do envio.</small></label>{busy && <p role="status">Preparando suas fotos…</p>}{error && <p id={`${id}-error`} role="alert" className="nutrition-field-error">{error}</p>}<div className="ni-photo-previews">{photos.map((photo, index) => <figure key={`${photo.name}-${index}`}><img src={photo.dataUrl} alt={`Foto opcional de refeição ou rotina ${index + 1}`} width="180" height="135" /><figcaption><span>{photo.name}</span><button type="button" disabled={busy} onClick={() => onChange({ photos: photos.filter((_, item) => item !== index), ...(photos.length === 1 ? { photosConsent: false } : {}) })} aria-label={`Remover foto ${index + 1}`}>Remover</button></figcaption></figure>)}</div>{photos.length > 0 && <><label className="nutrition-check"><input type="checkbox" checked={Boolean(intake.photosConsent)} onChange={event => onChange({ photosConsent: event.target.checked })} aria-invalid={Boolean(errors.photosConsent)} aria-describedby={errors.photosConsent ? `${id}-consent-error` : `${id}-help`} /><span>Autorizo o uso destas fotos somente pela equipe responsável pelo meu atendimento nutricional. Entendo que posso seguir sem enviá-las.</span></label>{errors.photosConsent && <p id={`${id}-consent-error`} className="nutrition-field-error">{errors.photosConsent}</p>}</>}</div>;
}
