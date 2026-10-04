import { useEffect, useRef } from 'react';

/** Recebe conteúdo somente do endpoint autorizado; não importa o livro canônico. */
export function ProductGuide({ guide, recipes, onRecipeSelect }) {
  const root = useRef(null);
  useEffect(() => {
    let closed = [];
    const prepare = () => {
      closed = [...root.current.querySelectorAll('details:not([open])')];
      closed.forEach(detail => { detail.open = true; });
    };
    const restore = () => { closed.forEach(detail => { detail.open = false; }); closed = []; };
    window.addEventListener('beforeprint', prepare);
    window.addEventListener('afterprint', restore);
    return () => { window.removeEventListener('beforeprint', prepare); window.removeEventListener('afterprint', restore); restore(); };
  }, []);
  const recipeBySlug = new Map(recipes.map(recipe => [recipe.slug, recipe]));
  const sourceNumber = id => guide.sources.findIndex(source => source.id === id) + 1;
  const choose = slug => {
    const recipe = recipeBySlug.get(slug);
    return recipe ? <button type="button" onClick={() => onRecipeSelect(recipe.id)}>{recipe.name}</button> : <span>Preparação temporariamente indisponível</span>;
  };
  return <section ref={root} className="product-guide shell" id="guia-do-livro" aria-labelledby="guide-title">
    <header className="product-guide__header"><div><p className="eyebrow eyebrow--gold">Seu guia · {guide.edition}</p><h2 id="guide-title">Comer, beber<br />e cuidar da <em>rotina.</em></h2></div><div><p>Comece pelos cuidados. Depois escolha preparações e adapte as possibilidades com sua equipe.</p><a className="text-link" href="#receitas-do-livro">Ir para as receitas ↓</a></div></header>
    <p className="product-guide__notice">{guide.notice}</p>
    <div className="product-guide__chapters">{guide.chapters.map(chapter => <details className={`product-guide__chapter${chapter.id === 'alertas' ? ' product-guide__chapter--alert' : ''}`} key={chapter.id} id={`guia-${chapter.id}`}><summary><span>{chapter.kicker}</span><strong>{chapter.title}</strong></summary><div className="product-guide__chapter-body"><p className="product-guide__lead">{chapter.intro}</p>{chapter.sections.map(section => <section key={section.title}><h3>{section.title}</h3>{section.paragraphs?.map(text => <p key={text}>{text}</p>)}{section.bullets ? <ul>{section.bullets.map(text => <li key={text}>{text}</li>)}</ul> : null}</section>)}{chapter.sourceIds.length ? <p className="product-guide__citations">Fontes: {chapter.sourceIds.map(id => { const source = guide.sources.find(item => item.id === id); return <a href={source.url} key={id} target="_blank" rel="noopener noreferrer">[{sourceNumber(id)}] {source.title.split(' · ')[0]}</a>; })}</p> : null}</div></details>)}</div>
    <div className="product-guide__choices">{guide.quickChoices.map(choice => <article key={choice.title}><h3>{choice.title}</h3><p>{choice.text}</p><ul>{choice.slugs.map(slug => <li key={slug}>{choose(slug)}</li>)}</ul></article>)}</div>
    <details className="product-guide__chapter"><summary><span>Planejamento</span><strong>Combinações para variar durante a semana</strong></summary><div className="product-guide__chapter-body"><p>Repertório de combinações, sem representar toda a alimentação do dia ou determinar quantidades e metas. Acrescente acompanhamentos e refeições definidos no seu plano.</p><div className="product-guide__table-wrap"><table><caption>Exemplos para adaptar com sua nutricionista</caption><thead><tr><th scope="col">Dia</th><th scope="col">Manhã</th><th scope="col">Refeição</th><th scope="col">Lanche possível</th><th scope="col">Outra refeição</th></tr></thead><tbody>{guide.week.map(day => <tr key={day.day}><th scope="row">{day.day}</th>{['morning', 'meal', 'snack', 'evening'].map(key => <td key={key}>{choose(day[key])}</td>)}</tr>)}</tbody></table></div></div></details>
    <details className="product-guide__chapter"><summary><span>Material de apoio</span><strong>Um registro simples para a consulta</strong></summary><div className="product-guide__chapter-body"><p>Imprima esta ficha ou use uma folha. Registre somente o que for útil para a conversa com a equipe. O livro não solicita dados de saúde.</p><div className="product-guide__journal">{guide.journalFields.map(field => <div key={field}><strong>{field}</strong><span /><span /></div>)}</div><button className="soft-button product-guide__print" type="button" onClick={() => window.print()}>Imprimir guia e fichas</button></div></details>
    <details className="product-guide__chapter"><summary><span>Dúvidas frequentes</span><strong>Perguntas que podem surgir no caminho</strong></summary><div className="product-guide__chapter-body">{guide.faqs.map(faq => <section key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></section>)}</div></details>
    <details className="product-guide__chapter"><summary><span>Referências</span><strong>As fontes por trás das orientações</strong></summary><div className="product-guide__chapter-body"><p>{guide.sourceDate}</p><ol className="product-guide__sources">{guide.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p>{source.use}</p></li>)}</ol></div></details>
  </section>;
}
