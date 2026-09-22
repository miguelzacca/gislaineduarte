import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recipesProductPreview as product } from '../generated/recipes-product-preview.js';
import { biography, contactLink } from '../data/site.js';
import { BrandMark } from './Brand.jsx';
import { ProfessionalIdentity } from './Layout.jsx';
import { Arrow, Portrait, TextLink } from './UI.jsx';

const STORAGE_PREFIX = 'gislaine:receitas:v1';

function ProductPhoto({ image, className = '', eager = false, sizes = '(min-width: 900px) 50vw, 100vw' }) {
  return (
    <picture className={className}>
      {image.avifSrcSet ? <source type="image/avif" srcSet={image.avifSrcSet} sizes={sizes} /> : null}
      {image.srcSet ? <source type="image/webp" srcSet={image.srcSet} sizes={sizes} /> : null}
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={image.alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
      />
    </picture>
  );
}

function Icon({ name }) {
  if (name === 'heart') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.7a5.4 5.4 0 0 0-7.7 0L12 5.8l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.7Z" /></svg>;
  if (name === 'check') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19.5 6.5" /></svg>;
  if (name === 'search') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.7" /><path d="m16 16 5 5" /></svg>;
  if (name === 'download') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16" /></svg>;
  if (name === 'list') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>;
  return null;
}

function CheckoutButton({ children = 'Quero acessar as 7 receitas', onActivate, className = '' }) {
  return (
    <button className={`button product-checkout-button ${className}`} type="button" onClick={onActivate}>
      <span>{children}</span><span className="button__icon"><Arrow /></span>
    </button>
  );
}

function ProductCheckoutDialog({ dialogRef, catalog, onRetry, accessStatus, onCheckAccess }) {
  const { priceCents, available, status } = catalog;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !available) return;
    setBusy(true); setError('');
    let checkoutTab = null;
    try {
      const keepWaitingHere = window.matchMedia('(min-width: 800px) and (pointer: fine)').matches;
      checkoutTab = keepWaitingHere ? window.open('about:blank', '_blank') : null;
      if (checkoutTab) {
        checkoutTab.opener = null;
        checkoutTab.document.title = 'Preparando pagamento';
        checkoutTab.document.body.textContent = 'Preparando o pagamento seguro…';
      }
      const response = await fetch('/api/recipes/checkout', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível abrir o pagamento.');
      if (data.accessUrl) {
        checkoutTab?.close();
        window.location.assign(data.accessUrl);
        return;
      }
      if (checkoutTab) {
        checkoutTab.location.href = data.checkoutUrl;
        window.location.assign(`${product.experiencePath}?payment=pending`);
      } else window.location.assign(data.checkoutUrl);
    } catch (failure) {
      checkoutTab?.close();
      setError(failure.name === 'TimeoutError' ? 'O pagamento demorou para responder. Tente novamente.' : failure.message);
      setBusy(false);
    }
  };
  return (
    <dialog className="product-checkout-dialog" ref={dialogRef} aria-labelledby="checkout-title">
      <form method="dialog" className="product-checkout-dialog__close"><button aria-label="Fechar janela">×</button></form>
      <div className="product-checkout-dialog__mark" aria-hidden="true"><BrandMark /></div>
      <p className="eyebrow eyebrow--gold">Coleção digital</p>
      <h2 id="checkout-title">Seu próximo passo começa aqui.</h2>
      {accessStatus === 'checking' ? <p role="status">Verificando seu acesso…</p> : null}
      {accessStatus === 'error' ? <><p role="alert">Não foi possível verificar seu acesso. Tente novamente.</p><button className="text-link" type="button" onClick={onCheckAccess}>Tentar novamente <Arrow /></button></> : null}
      {available && accessStatus === 'login' ? <p>Informe seu e-mail para receber o acesso após a confirmação do pagamento. Vamos preenchê-lo também no checkout da InfinitePay.</p> : null}
      {accessStatus === 'login' ? <div aria-live="polite" aria-busy={status === 'loading'}>
        {status === 'loading' ? <p className="product-checkout-dialog__price">Consultando a disponibilidade da coleção…</p> : available && priceCents ? <p className="product-checkout-dialog__price">Valor da coleção: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceCents / 100)}</strong></p> : <>
          <p className="product-checkout-dialog__price">{status === 'error' ? 'Não foi possível consultar a disponibilidade. Tente novamente.' : 'Esta coleção ainda não está disponível para compra. Volte em breve.'}</p>
          <button className="text-link" type="button" onClick={onRetry}>Consultar novamente <Arrow /></button>
        </>}
      </div> : null}
      {available && accessStatus === 'login' ? <form onSubmit={submit}>
        <label className="product-checkout-dialog__email">Seu e-mail<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="voce@exemplo.com" required /></label>
        <button className="button" type="submit" disabled={busy || !available}><span>{busy ? 'Preparando checkout…' : 'Ir para o pagamento seguro'}</span><span className="button__icon"><Arrow /></span></button>
      </form> : null}
      {error ? <p className="product-checkout-dialog__error" role="alert">{error}</p> : null}
      <p className="product-checkout-dialog__fineprint">{available ? 'O pagamento é feito na InfinitePay. Após a aprovação, enviaremos um link de confirmação para seu e-mail. ' : ''}<a href={product.experiencePath}>Já comprou? Entre aqui.</a></p>
    </dialog>
  );
}

function RecipeCardsScene({ fallbackImage }) {
  const hostRef = useRef(null);
  useEffect(() => {
    let destroy = () => {};
    let cancelled = false;
    import('../motion/recipe-cards-scene.js').then(({ mountRecipeCardsScene }) => {
      if (!cancelled && hostRef.current) destroy = mountRecipeCardsScene(hostRef.current);
    }).catch(() => {});
    return () => { cancelled = true; destroy(); };
  }, []);
  return (
    <div className="product-hero-art" ref={hostRef} data-recipe-scene="" data-scene-images={product.recipes.map((recipe) => recipe.image.src).join('|')} aria-hidden="true">
      <div className="product-hero-art__halo" />
      <div className="product-card-stack">
        {[0, 1, 2, 3, 4, 5, 6].map((index) => <span style={{ '--card-index': index }} key={index} />)}
        <ProductPhoto image={fallbackImage} className="product-card-stack__photo" eager sizes="(min-width: 900px) 44vw, 90vw" />
      </div>
      <div className="product-scene-canvas" data-recipe-scene-canvas="" />
      <span className="product-hero-art__caption">7 lâminas · uma jornada prática</span>
    </div>
  );
}

function ProductFaq() {
  return (
    <section className="section product-faq" aria-labelledby="product-faq-title">
      <div className="shell product-faq__grid">
        <div>
          <p className="eyebrow eyebrow--gold">Dúvidas frequentes</p>
          <h2 id="product-faq-title">Antes de<br /><em>começar.</em></h2>
        </div>
        <div className="faq-list">
          {product.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
        </div>
      </div>
    </section>
  );
}

export function RecipeProductLandingPage() {
  const dialogRef = useRef(null);
  const [accessLocked, setAccessLocked] = useState(false);
  const [checkoutAccess, setCheckoutAccess] = useState('checking');
  const [catalog, setCatalog] = useState({ status: 'loading', available: false, priceCents: null });
  const refreshCatalog = useCallback(async (signal = AbortSignal.timeout(10_000)) => {
    setCatalog({ status: 'loading', available: false, priceCents: null });
    try {
      const response = await fetch('/api/recipes/catalog', { cache: 'no-store', signal });
      if (!response.ok) throw new Error('Não foi possível consultar a coleção.');
      const data = await response.json();
      const available = data.available === true && Number.isSafeInteger(data.priceCents) && data.priceCents > 0;
      setCatalog({ status: 'ready', available, priceCents: available ? data.priceCents : null });
    } catch (failure) {
      if (failure.name !== 'AbortError') setCatalog({ status: 'error', available: false, priceCents: null });
    }
  }, []);
  useEffect(() => setAccessLocked(new URLSearchParams(window.location.search).get('access') === 'locked'), []);
  useEffect(() => {
    const controller = new AbortController();
    void refreshCatalog(AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]));
    return () => controller.abort();
  }, [refreshCatalog]);
  const openCheckout = async () => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    setCheckoutAccess('checking');
    try {
      const response = await fetch('/api/recipes/status', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error('Falha ao verificar acesso.');
      const data = await response.json();
      if (['ready', 'payment', 'email'].includes(data.state)) {
        window.location.assign(product.experiencePath);
        return;
      }
      if (data.state !== 'login') throw new Error('Estado de acesso indisponível.');
      setCheckoutAccess('login');
      void refreshCatalog();
    } catch { setCheckoutAccess('error'); }
  };

  return (
    <>
      <section className="product-hero" aria-labelledby="product-title">
        <div className="shell product-hero__grid">
          <div className="product-hero__copy">
            <p className="eyebrow eyebrow--gold">{product.positioning} · por Gislaine Duarte</p>
            <h1 id="product-title">7 receitas para ajudar você a <em>desinflamar!</em></h1>
            <p className="product-hero__subtitle">{product.subtitle}</p>
            <div className="product-hero__actions">
              <CheckoutButton onActivate={openCheckout} />
              <a className="text-link" href="#colecao">Conhecer a coleção <Arrow /></a>
            </div>
            {catalog.available && catalog.priceCents ? <p className="product-live-price">Acesso completo por {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(catalog.priceCents / 100)}</p> : null}
            <p className="product-hero__trust"><span>7 receitas</span><span>3 formatos</span><span>acesso organizado</span></p>
          </div>
          <RecipeCardsScene fallbackImage={product.hero.image} />
        </div>
      </section>

      {accessLocked ? (
        <div className="shell product-access-message" id="acesso" role="status">
          <BrandMark /><p><strong>A compra ainda não está disponível.</strong> Volte em breve ou entre em contato para saber mais.</p>
        </div>
      ) : null}

      <section className="section product-introduction" id="colecao" aria-labelledby="collection-title">
        <div className="shell product-introduction__grid">
          <div>
            <p className="eyebrow eyebrow--gold">Uma coleção para usar de verdade</p>
            <h2 id="collection-title">Menos receitas salvas.<br />Mais receitas <em>preparadas.</em></h2>
          </div>
          <div className="product-introduction__copy">
            <p>{product.description}</p>
            <p>Do primeiro ingrediente à lista de compras, cada detalhe foi pensado para tornar a consulta clara, bonita e possível — sem transformar alimentação em promessa rápida ou regra impossível.</p>
          </div>
        </div>
      </section>

      <section className="product-preview" aria-labelledby="preview-title">
        <div className="shell">
          <div className="product-preview__heading">
            <div><p className="eyebrow">A jornada</p><h2 id="preview-title">Do doce ao salgado,<br /><em>sete caminhos.</em></h2></div>
            <p>Uma prévia editorial da seleção. Ingredientes, modo de preparo, substituições e alertas ficam organizados na área da coleção.</p>
          </div>
          <div className="product-preview__list">
            {product.recipes.map((recipe) => (
              <article className="product-preview-item" key={recipe.id}>
                <span className="product-preview-item__number">0{recipe.number}</span>
                <ProductPhoto image={recipe.image} className="product-preview-item__image" sizes="(min-width: 900px) 34vw, 88vw" />
                <div className="product-preview-item__copy">
                  <p className="eyebrow">{recipe.category}</p>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.introduction}</p>
                  <span>{recipe.tags.join(' · ')}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section product-formats" aria-labelledby="formats-title">
        <div className="shell">
          <div className="product-formats__heading">
            <p className="eyebrow eyebrow--gold">Três formas de consultar</p>
            <h2 id="formats-title">A mesma coleção.<br /><em>No seu ritmo.</em></h2>
          </div>
          <div className="product-formats__grid">
            {product.formats.map((format, index) => (
              <article key={format.id}><span>0{index + 1}</span><h3>{format.title}</h3><p>{format.description}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section product-details" aria-labelledby="find-title">
        <div className="shell product-details__grid">
          <div className="product-details__panel product-details__panel--dark">
            <p className="eyebrow">O que você encontra</p>
            <h2 id="find-title">Clareza em cada <em>etapa.</em></h2>
            <ul>{product.whatYouFind.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}</ul>
          </div>
          <div className="product-details__panel">
            <p className="eyebrow eyebrow--gold">Para quem é</p>
            <h2>Para a vida<br /><em>como ela é.</em></h2>
            <ol>{product.audience.map((item, index) => <li key={item}><span>0{index + 1}</span><p>{item}</p></li>)}</ol>
          </div>
        </div>
      </section>

      <section className="section product-organization" aria-labelledby="organization-title">
        <div className="shell product-organization__grid">
          <div className="product-organization__visual" aria-hidden="true">
            <span className="product-organization__sheet product-organization__sheet--one">Lista de compras</span>
            <span className="product-organization__sheet product-organization__sheet--two">Favoritas</span>
            <span className="product-organization__sheet product-organization__sheet--three">Já preparei</span>
            <BrandMark />
          </div>
          <div>
            <p className="eyebrow eyebrow--gold">Praticidade e organização</p>
            <h2 id="organization-title">Da escolha<br />à cozinha,<br /><em>sem ruído.</em></h2>
            <p>Pesquise uma receita ou ingrediente, ajuste quantidades numéricas, marque o que já está na despensa e reúna as preparações escolhidas em uma lista de compras única.</p>
            <p>Favoritos e progresso ficam apenas no seu navegador. Nenhuma informação de saúde é solicitada ou armazenada.</p>
          </div>
        </div>
      </section>

      <section className="section product-author" aria-labelledby="author-title">
        <div className="shell product-author__grid">
          <div className="product-author__portrait"><Portrait sizes="(min-width: 900px) 38vw, 88vw" /></div>
          <div>
            <p className="eyebrow eyebrow--gold">Por Gislaine Duarte</p>
            <h2 id="author-title">Com ciência,<br />escuta e <em>vida real.</em></h2>
            <p>{biography.short}</p>
            <p>{biography.education}</p>
            <ProfessionalIdentity />
            <TextLink href="/sobre">Conhecer a Nutri Gi</TextLink>
          </div>
        </div>
      </section>

      <section className="section product-bridge" aria-labelledby="bridge-title">
        <div className="shell product-bridge__inner">
          <div><p className="eyebrow">Quando a receita é só o começo</p><h2 id="bridge-title">Sua alimentação também pode pedir um olhar <em>só para você.</em></h2></div>
          <div><p>A coleção ajuda a organizar possibilidades. O acompanhamento nutricional individualizado considera sua história, rotina, necessidades e objetivos com a profundidade que uma seleção de receitas não pretende substituir.</p><TextLink href="/atendimentos">Conhecer os atendimentos</TextLink></div>
        </div>
      </section>

      <ProductFaq />

      <section className="product-final-cta" aria-labelledby="final-cta-title">
        <div className="shell product-final-cta__inner">
          <BrandMark />
          <p className="eyebrow">Sua coleção, sempre à mão</p>
          <h2 id="final-cta-title">Sete receitas.<br />Um jeito mais leve de <em>começar.</em></h2>
          <p>{product.subtitle}</p>
          <div><CheckoutButton onActivate={openCheckout} /></div>
          <small>{product.educationalNotice}</small>
        </div>
      </section>
      <ProductCheckoutDialog dialogRef={dialogRef} catalog={catalog} onRetry={() => { void refreshCatalog(); }} accessStatus={checkoutAccess} onCheckAccess={openCheckout} />
    </>
  );
}

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
      if (stored != null) setValue(JSON.parse(stored));
    } catch {
      // O estado em memória continua funcional quando o armazenamento falha.
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value)); } catch { /* fallback em memória */ }
  }, [key, ready, value]);
  return [value, setValue];
}

function toggleInList(list, item) {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

function scaledNumber(value) {
  const rounded = Math.round(value * 4) / 4;
  const whole = Math.floor(rounded);
  const quarters = Math.round((rounded - whole) * 4);
  const fraction = ['', '¼', '½', '¾'][quarters] || '';
  if (!whole) return fraction || String(rounded);
  return fraction ? `${whole} ${fraction}` : String(whole);
}

function ingredientLabel(ingredient, multiplier = 1) {
  if (ingredient.quantity == null) return ingredient.display;
  const amount = ingredient.quantity * multiplier;
  const unit = amount <= 1 ? ingredient.unit.singular : ingredient.unit.plural;
  return [scaledNumber(amount), unit, ingredient.name].filter(Boolean).join(' ');
}

function buildShoppingItems(recipes, selectedIds, multipliers) {
  const selected = recipes.filter((recipe) => selectedIds.includes(recipe.id));
  const entries = new Map();
  for (const recipe of selected) {
    const multiplier = Number(multipliers[recipe.id]) || 1;
    for (const ingredient of recipe.ingredients) {
      const key = `${ingredient.shoppingKey}:${ingredient.unit?.singular || 'display'}`;
      const current = entries.get(key);
      if (ingredient.quantity == null) {
        if (!current) entries.set(key, { ...ingredient, recipeNames: [recipe.name] });
        else current.recipeNames.push(recipe.name);
      } else if (current) {
        current.quantity += ingredient.quantity * multiplier;
        current.recipeNames.push(recipe.name);
        current.optional = current.optional && ingredient.optional;
      } else {
        entries.set(key, { ...ingredient, quantity: ingredient.quantity * multiplier, recipeNames: [recipe.name] });
      }
    }
  }
  return [...entries.values()].sort((left, right) => left.section.localeCompare(right.section, 'pt-BR'));
}

function RecipeNavigation({ recipes, activeId, favorites, prepared, onSelect, onFavorite }) {
  return (
    <nav className="recipe-library-nav" aria-label="Navegação entre receitas">
      {recipes.map((recipe, index) => (
        <div className={`recipe-nav-item ${activeId === recipe.id ? 'is-active' : ''}`} key={recipe.id}>
          <button className="recipe-nav-item__main" type="button" onClick={() => onSelect(recipe.id)} aria-current={activeId === recipe.id ? 'page' : undefined}>
            <span>0{index + 1}</span><span><small>{recipe.category}</small>{recipe.name}</span>{prepared.includes(recipe.id) ? <Icon name="check" /> : null}
          </button>
          <button className="icon-button" type="button" aria-label={`${favorites.includes(recipe.id) ? 'Remover' : 'Adicionar'} ${recipe.name} ${favorites.includes(recipe.id) ? 'dos' : 'aos'} favoritos`} aria-pressed={favorites.includes(recipe.id)} onClick={() => onFavorite(recipe.id)}><Icon name="heart" /></button>
        </div>
      ))}
    </nav>
  );
}

function RecipeDetail({ recipe, index, favorites, prepared, multiplier, checkedIngredients, checkedSteps, inShoppingList, onFavorite, onPrepared, onMultiplier, onIngredient, onStep, onShopping }) {
  return (
    <article className="recipe-detail" aria-labelledby={`recipe-title-${recipe.id}`}>
      <div className="recipe-detail__hero">
        <ProductPhoto image={recipe.image} className="recipe-detail__photo" eager sizes="(min-width: 1000px) 48vw, 100vw" />
        <div className="recipe-detail__hero-copy">
          <span className="recipe-detail__number">0{index + 1} / 07</span>
          <p className="eyebrow">{recipe.category}</p>
          <h2 id={`recipe-title-${recipe.id}`}>{recipe.name}</h2>
          <p>{recipe.introduction}</p>
          <div className="recipe-detail__actions">
            <button className="soft-button" type="button" aria-pressed={favorites.includes(recipe.id)} onClick={() => onFavorite(recipe.id)}><Icon name="heart" />{favorites.includes(recipe.id) ? 'Favorita' : 'Favoritar'}</button>
            <button className="soft-button" type="button" aria-pressed={prepared.includes(recipe.id)} onClick={() => onPrepared(recipe.id)}><Icon name="check" />{prepared.includes(recipe.id) ? 'Já preparei' : 'Marcar como preparada'}</button>
          </div>
        </div>
      </div>

      <div className="recipe-facts" aria-label="Informações da receita">
        <div><span>Tempo</span><strong>{recipe.time.label}</strong>{recipe.time.inferred ? <small>Definição editorial a confirmar</small> : null}</div>
        <div><span>Equipamentos</span><strong>{recipe.equipment.join(' · ')}</strong></div>
        <div><span>Ajuste</span><strong>{multiplier === 1 ? 'Receita original' : `${scaledNumber(multiplier)}× a receita`}</strong></div>
      </div>

      <div className="recipe-detail__columns">
        <section className="recipe-ingredients" aria-labelledby={`ingredients-${recipe.id}`}>
          <div className="recipe-section-heading">
            <div><p className="eyebrow eyebrow--gold">Checklist</p><h3 id={`ingredients-${recipe.id}`}>Ingredientes</h3></div>
            <fieldset className="portion-control"><legend>Ajustar quantidade</legend>{[0.5, 1, 1.5, 2].map((value) => <button type="button" aria-pressed={multiplier === value} onClick={() => onMultiplier(recipe.id, value)} key={value}>{scaledNumber(value)}×</button>)}</fieldset>
          </div>
          <ul>
            {recipe.ingredients.map((ingredient) => {
              const checked = checkedIngredients.includes(ingredient.id);
              return <li key={ingredient.id}><label><input type="checkbox" checked={checked} onChange={() => onIngredient(recipe.id, ingredient.id)} /><span className="recipe-checkbox" aria-hidden="true"><Icon name="check" /></span><span>{ingredientLabel(ingredient, multiplier)}{ingredient.optional ? <small>Opcional</small> : null}</span></label></li>;
            })}
          </ul>
          {recipe.alternativeIngredients?.length ? <div className="recipe-substitution"><strong>Alternativa</strong>{recipe.substitutions.map((item) => <p key={item}>{item}</p>)}</div> : null}
          <button className="shopping-toggle" type="button" aria-pressed={inShoppingList} onClick={() => onShopping(recipe.id)}><Icon name="list" />{inShoppingList ? 'Na lista de compras' : 'Adicionar à lista de compras'}</button>
        </section>

        <section className="recipe-method" aria-labelledby={`method-${recipe.id}`}>
          <p className="eyebrow eyebrow--gold">Passo a passo</p>
          <h3 id={`method-${recipe.id}`}>Modo de preparo</h3>
          <ol>{recipe.preparation.map((step, stepIndex) => {
            const stepId = String(stepIndex);
            const checked = checkedSteps.includes(stepId);
            return <li className={checked ? 'is-complete' : ''} key={step}><button type="button" aria-pressed={checked} onClick={() => onStep(recipe.id, stepId)}><span>{String(stepIndex + 1).padStart(2, '0')}</span><p>{step}</p><span className="recipe-step-check"><Icon name="check" /></span></button></li>;
          })}</ol>
        </section>
      </div>

      <div className="recipe-notes-grid">
        <section><p className="eyebrow">Observações</p>{recipe.notes.map((note) => <p key={note}>{note}</p>)}</section>
        <section className="recipe-allergens"><p className="eyebrow">Alergênicos e cuidados</p><ul>{recipe.allergens.map((allergen) => <li key={allergen.id}><strong>{allergen.label}</strong><span>{allergen.detail}</span></li>)}</ul></section>
      </div>
      <p className="recipe-editorial-context">{recipe.editorialContext}</p>
    </article>
  );
}

function ShoppingList({ recipes, selectedIds, multipliers, checked, onChecked, onSelectAll, onClear }) {
  const items = useMemo(() => buildShoppingItems(recipes, selectedIds, multipliers), [recipes, selectedIds, multipliers]);
  const sections = [...new Set(items.map((item) => item.section))];
  return (
    <section className="shopping-list" id="lista-de-compras" aria-labelledby="shopping-title">
      <div className="shopping-list__heading">
        <div><p className="eyebrow eyebrow--gold">Organização</p><h2 id="shopping-title">Lista de compras</h2><p>Reúne as medidas das receitas selecionadas e respeita os multiplicadores escolhidos.</p></div>
        <div><button className="soft-button" type="button" onClick={onSelectAll}>Adicionar todas</button><button className="soft-button" type="button" onClick={onClear}>Limpar lista</button></div>
      </div>
      {!items.length ? <p className="shopping-list__empty">Use “Adicionar à lista de compras” em uma receita para começar.</p> : (
        <div className="shopping-list__grid">{sections.map((section) => <div key={section}><h3>{section}</h3><ul>{items.filter((item) => item.section === section).map((item) => {
          const key = `${item.shoppingKey}:${item.unit?.singular || 'display'}`;
          return <li key={key}><label><input type="checkbox" checked={checked.includes(key)} onChange={() => onChecked(key)} /><span className="recipe-checkbox" aria-hidden="true"><Icon name="check" /></span><span>{ingredientLabel(item, 1)}{item.optional ? <small>Opcional</small> : null}</span></label></li>;
        })}</ul></div>)}</div>
      )}
    </section>
  );
}

export function RecipeLibrary({ data }) {
  const [query, setQuery] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [category, setCategory] = useState('todas');
  const [activeId, setActiveId] = useState(data.recipes[0]?.id);
  const [favorites, setFavorites] = useStoredState('favorites', []);
  const [prepared, setPrepared] = useStoredState('prepared', []);
  const [shoppingRecipes, setShoppingRecipes] = useStoredState('shopping-recipes', []);
  const [checkedIngredients, setCheckedIngredients] = useStoredState('ingredients', {});
  const [checkedSteps, setCheckedSteps] = useStoredState('steps', {});
  const [multipliers, setMultipliers] = useStoredState('multipliers', {});
  const [shoppingChecked, setShoppingChecked] = useStoredState('shopping-checked', []);

  const visibleRecipes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return data.recipes.filter((recipe) => {
      const matchesCategory = category === 'todas' || recipe.category === category;
      const searchable = [recipe.name, recipe.introduction, ...recipe.tags, ...recipe.ingredients.map((item) => item.display || `${item.name} ${item.unit?.singular || ''}`)].join(' ').toLocaleLowerCase('pt-BR');
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
  }, [category, data.recipes, query]);

  useEffect(() => {
    if (visibleRecipes.length && !visibleRecipes.some((recipe) => recipe.id === activeId)) setActiveId(visibleRecipes[0].id);
  }, [activeId, visibleRecipes]);
  const active = visibleRecipes.find((recipe) => recipe.id === activeId) || visibleRecipes[0];
  const activeIndex = data.recipes.findIndex((recipe) => recipe.id === active?.id);
  const toggleMapItem = (setter, map, recipeId, itemId) => setter({ ...map, [recipeId]: toggleInList(map[recipeId] || [], itemId) });
  const logout = async () => {
    setLogoutError('');
    try {
      const response = await fetch('/api/recipes/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error();
      window.location.assign(data.publicPath);
    } catch { setLogoutError('Não foi possível sair agora. Tente novamente.'); }
  };

  return (
    <>
      <section className="recipe-app-hero">
        <div className="shell recipe-app-hero__grid">
          <div><p className="eyebrow eyebrow--gold">Bem-vinda à sua coleção</p><h1>{data.title}</h1><p>{data.subtitle}</p></div>
          <div className="recipe-progress" aria-label={`${prepared.length} de 7 receitas preparadas`}><span><strong>{prepared.length}</strong> / 7</span><p>receitas preparadas</p><div><i style={{ width: `${Math.min(100, prepared.length / 7 * 100)}%` }} /></div></div>
        </div>
      </section>

      <section className="recipe-toolbar" aria-label="Ferramentas da coleção">
        <div className="shell recipe-toolbar__inner">
          <label className="recipe-search"><span className="sr-only">Pesquisar receita ou ingrediente</span><Icon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar receita ou ingrediente" /></label>
          <fieldset className="recipe-filters"><legend className="sr-only">Filtrar receitas por categoria</legend>{['todas', 'doce', 'salgada'].map((filter) => <button type="button" aria-pressed={category === filter} onClick={() => setCategory(filter)} key={filter}>{filter === 'todas' ? 'Todas' : filter === 'doce' ? 'Doces' : 'Salgadas'}</button>)}</fieldset>
          <div className="recipe-downloads"><a href={`${data.downloadEndpoint}?format=html`}><Icon name="download" />Versão offline</a><a href={`${data.downloadEndpoint}?format=pdf`}><Icon name="download" />PDF</a><button type="button" onClick={logout}>Sair da conta</button>{logoutError ? <span role="alert">{logoutError}</span> : null}</div>
        </div>
      </section>

      <div className="shell recipe-app-layout">
        <aside className="recipe-app-sidebar">
          <div className="recipe-app-sidebar__heading"><span>{visibleRecipes.length}</span><p>{visibleRecipes.length === 1 ? 'receita encontrada' : 'receitas encontradas'}</p></div>
          {visibleRecipes.length ? <RecipeNavigation recipes={visibleRecipes} activeId={active?.id} favorites={favorites} prepared={prepared} onSelect={setActiveId} onFavorite={(id) => setFavorites(toggleInList(favorites, id))} /> : <p className="recipe-empty-search">Nenhuma receita corresponde à sua busca. Tente outro ingrediente ou remova o filtro.</p>}
          <a className="recipe-sidebar-shopping" href="#lista-de-compras"><Icon name="list" /><span><strong>{shoppingRecipes.length}</strong> receitas na lista de compras</span><Arrow /></a>
        </aside>
        <div className="recipe-app-content">
          {active ? <RecipeDetail recipe={active} index={activeIndex} favorites={favorites} prepared={prepared} multiplier={multipliers[active.id] || 1} checkedIngredients={checkedIngredients[active.id] || []} checkedSteps={checkedSteps[active.id] || []} inShoppingList={shoppingRecipes.includes(active.id)} onFavorite={(id) => setFavorites(toggleInList(favorites, id))} onPrepared={(id) => setPrepared(toggleInList(prepared, id))} onMultiplier={(id, value) => setMultipliers({ ...multipliers, [id]: value })} onIngredient={(id, item) => toggleMapItem(setCheckedIngredients, checkedIngredients, id, item)} onStep={(id, item) => toggleMapItem(setCheckedSteps, checkedSteps, id, item)} onShopping={(id) => setShoppingRecipes(toggleInList(shoppingRecipes, id))} /> : null}
        </div>
      </div>

      <div className="shell"><ShoppingList recipes={data.recipes} selectedIds={shoppingRecipes} multipliers={multipliers} checked={shoppingChecked} onChecked={(key) => setShoppingChecked(toggleInList(shoppingChecked, key))} onSelectAll={() => setShoppingRecipes(data.recipes.map((recipe) => recipe.id))} onClear={() => { setShoppingRecipes([]); setShoppingChecked([]); }} /></div>

      <section className="recipe-app-footer-cta">
        <div className="shell"><div><p className="eyebrow">Um cuidado que continua</p><h2>Receitas ajudam a começar.<br /><em>Individualidade dá direção.</em></h2></div><div><p>Se você deseja olhar para sua alimentação, rotina e objetivos com mais profundidade, conheça a consulta e os ciclos de acompanhamento da Nutri Gi.</p><a className="button button--secondary" href={contactLink()} target="_blank" rel="noopener noreferrer"><span>Falar com a Nutri Gi</span><span className="button__icon"><Arrow external /></span></a></div></div>
      </section>
      <p className="shell recipe-educational-notice">{data.educationalNotice}</p>
    </>
  );
}

function ProductAccessGate() {
  const [email, setEmail] = useState('');
  const emailRequested = useRef(false);
  const [waiting, setWaiting] = useState(true);
  const [status, setStatus] = useState('checking');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!waiting) return undefined;
    let active = true;
    let timer;
    const controller = new AbortController();
    const check = async () => {
      try {
        const response = await fetch('/api/recipes/status', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (!response.ok) throw new Error('Falha ao verificar acesso.');
        const data = await response.json();
        if (!active) return;
        if (data.state === 'ready') { window.location.reload(); return; }
        if (!['login', 'payment', 'email'].includes(data.state)) throw new Error('Estado de acesso indisponível.');
        setStatus(data.state === 'login' && emailRequested.current ? 'email' : data.state);
        setCheckoutUrl(data.checkoutUrl || '');
        if (data.state === 'login') setWaiting(false);
        else timer = window.setTimeout(check, 3000);
      } catch { if (active) { setStatus('error'); setWaiting(false); } }
    };
    void check();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [waiting]);
  const login = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/recipes/login', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o link.');
      if (result.ready) { window.location.reload(); return; }
      emailRequested.current = true;
      setMessage(result.message); setStatus('email'); setWaiting(true);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const changeEmail = async () => {
    setBusy(true); setWaiting(false); setMessage('');
    try {
      const response = await fetch('/api/recipes/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error('Não foi possível trocar o e-mail agora.');
      emailRequested.current = false;
      setEmail(''); setCheckoutUrl(''); setStatus('login');
    } catch (error) { setMessage(error.message); setStatus('error'); }
    finally { setBusy(false); }
  };
  const copy = {
    checking: ['Verificando seu acesso.', 'Estamos conferindo sua sessão e o andamento da compra.'],
    payment: ['Aguardando a confirmação do pagamento.', 'Assim que o pagamento for confirmado, enviaremos um link de acesso ao e-mail informado. Esta página acompanha a confirmação automaticamente.'],
    email: ['Confira seu e-mail.', 'Abra o link enviado por e-mail no computador ou no celular. Quando você confirmar, esta página entrará automaticamente.'],
    login: ['Entre na sua coleção.', 'Se você já comprou, informe o mesmo e-mail usado no pagamento. O link entra na sua conta existente, com suas compras preservadas.'],
    error: ['Não foi possível verificar seu acesso.', 'Tente novamente em instantes. Sua compra e sua conta continuam salvas.'],
  }[status];
  return (
    <section className="shell recipe-access-gate">
      <BrandMark />
      <p className="eyebrow eyebrow--gold">Área da coleção</p>
      <h1>{copy[0]}</h1>
      <p aria-live="polite">{copy[1]}</p>
      {status === 'login' ? <form className="recipe-access-gate__form" onSubmit={login}><label>Seu e-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="voce@exemplo.com" required /></label><button className="button" type="submit" disabled={busy}><span>{busy ? 'Enviando…' : 'Receber link de acesso'}</span><span className="button__icon"><Arrow /></span></button></form> : null}
      {status === 'payment' && checkoutUrl ? <a className="button" href={checkoutUrl} target="_blank" rel="noopener noreferrer"><span>Continuar pagamento</span><span className="button__icon"><Arrow /></span></a> : null}
      {status === 'email' ? <button className="button" type="button" onClick={login} disabled={busy}><span>{busy ? 'Enviando…' : 'Reenviar link de acesso'}</span><span className="button__icon"><Arrow /></span></button> : null}
      {['payment', 'email'].includes(status) ? <button className="text-link recipe-access-gate__change" type="button" disabled={busy} onClick={changeEmail}>Usar outro e-mail</button> : null}
      {status === 'error' ? <button className="button" type="button" disabled={busy} onClick={() => { setStatus('checking'); setWaiting(true); }}><span>Verificar novamente</span><span className="button__icon"><Arrow /></span></button> : null}
      {message ? <p role="status">{message}</p> : null}
      <a className="button" href={product.publicPath}><span>Voltar à coleção</span><span className="button__icon"><Arrow /></span></a>
    </section>
  );
}

export function RecipeExperiencePage() {
  const [state, setState] = useState({ status: 'loading', data: null });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/recipes/content', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return setState({ status: 'unauthorized', data: null });
        if (!response.ok) throw new Error('Falha ao carregar a coleção.');
        const data = await response.json();
        setState({ status: 'ready', data });
      })
      .catch((error) => { if (error.name !== 'AbortError') setState({ status: 'error', data: null }); });
    return () => controller.abort();
  }, []);
  if (state.status === 'loading') return <section className="shell recipe-loading" aria-live="polite"><h1 className="sr-only">Sua jornada de 7 receitas</h1><BrandMark /><p>Preparando sua coleção…</p><span /></section>;
  if (state.status === 'unauthorized') return <ProductAccessGate />;
  if (state.status === 'error') return <section className="shell recipe-access-gate"><p className="eyebrow eyebrow--gold">Não foi possível carregar</p><h1>Tente novamente em instantes.</h1><p>A sessão não foi alterada. Recarregue a página ou volte à apresentação da coleção.</p><button className="button" type="button" onClick={() => window.location.reload()}><span>Recarregar</span><span className="button__icon"><Arrow /></span></button></section>;
  return <RecipeLibrary data={state.data} />;
}
