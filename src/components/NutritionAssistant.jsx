import { useEffect, useState } from 'react';
import { goalOptions } from '../data/nutrition-journey.js';
import { assistantTemplateOptions } from '../lib/nutrition-assistant.js';

export function NutritionAssistant({ intake, goal, onGoalChange, request, onRequestChange, plan, analysis, templates, template, onSelect, onAnalyze, onBuild, onVary, onCalculators, enabled, approved, busy, retryUntil }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!retryUntil || retryUntil <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= retryUntil) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [retryUntil]);
  const seconds = Math.max(0, Math.ceil((retryUntil - now) / 1000));
  const blocked = Boolean(busy) || approved || !intake.aiConsent || !enabled || seconds > 0;
  const options = assistantTemplateOptions({ ...intake, goal }, templates);
  const choices = analysis ? analysis.templateIds.map(id => {
    const item = options.find(item => item.id === id);
    return item && { ...item, reason: analysis.recommendations?.find(item => item.templateId === id)?.reason || item.reason };
  }).filter(Boolean) : options.slice(0, 3);
  const goalLabel = goalOptions.find(item => item.id === goal)?.label;
  return <section className="nw-assistant-panel" aria-label="Assistente de montagem do plano">
    <div className="nw-assistant"><div><span className="nw-assistant__mark" aria-hidden="true">✦</span><div><p className="admin-label">Uma assistente ao seu lado</p><h3>{goalLabel || 'Do objetivo à semana completa'}</h3><p>Escolha a base, organize os sete dias e confira as porções em uma sugestão pronta para revisar.</p></div></div></div>
    <div className="nw-assistant-inputs nw-form">
      <label>Objetivo para esta montagem<select value={goal} onChange={event => onGoalChange(event.target.value)} disabled={Boolean(busy) || approved}>{goalOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Como você quer organizar o plano? (opcional)<textarea value={request} onChange={event => onRequestChange(event.target.value)} disabled={Boolean(busy) || approved} maxLength="800" rows="2" placeholder="Ex.: priorizar preparos simples, variar o jantar e distribuir fontes de proteína nos lanches." /></label>
    </div>
    <p className="nw-fine">Use o campo para orientar a montagem, sem incluir nome ou outros dados de identificação. Metas e adequação clínica ficam para sua revisão.</p>
    {analysis && <div className="nw-assistant-summary" role="status"><p className="admin-label">Seleção da assistente</p><p>{analysis.summary}</p></div>}
    <div className="nw-assistant-templates">{choices.map((item, index) => <article key={item.id} className={template === item.id ? 'is-selected' : ''}>
      <p className="admin-label">{index === 0 ? 'Primeira opção para avaliar' : 'Outra possibilidade'}</p><h4>{item.name}</h4><p>{item.reason}</p>
      <button type="button" className="nw-button nw-button--quiet" disabled={Boolean(busy) || approved} aria-pressed={template === item.id} onClick={() => onSelect(item.id)}>{template === item.id ? 'Base selecionada ✓' : 'Escolher esta base'}</button>
    </article>)}</div>
    <div className="nw-assistant__actions">
      <button type="button" className="nw-button nw-button--quiet" disabled={blocked} onClick={onAnalyze}>{busy === 'analyze' ? 'Analisando o objetivo…' : 'Indicar modelos com IA'}</button>
      <button type="button" className="nw-button" disabled={blocked || !template} onClick={onBuild}>{busy === 'ai-draft' ? 'Montando os sete dias…' : 'Montar semana com IA'}</button>
      <button type="button" className="nw-button nw-button--quiet" disabled={blocked || !plan} onClick={onVary}>{busy === 'ai' ? 'Preparando trocas…' : 'Sugerir trocas com IA'}</button>
      <button type="button" className="nw-button nw-button--quiet" disabled={Boolean(busy)} onClick={onCalculators}>Conferir cálculos e metas</button>
    </div>
    {seconds > 0 && <p className="nw-fine" role="status">Aguarde {seconds} s para consultar a IA novamente. Você pode continuar editando o plano.</p>}
    {!intake.aiConsent && <p className="nw-fine">Esta pessoa preferiu atendimento sem IA externa. Escolha uma das bases acima e use a montagem automática.</p>}
    {!enabled && <p className="nw-fine">Configure a chave NVIDIA no servidor para consultar a IA. As bases por objetivo já estão disponíveis.</p>}
    {analysis && <div className="nw-grid-2 nw-assistant-advice"><div><h4>Conferir em atendimento</h4><ul>{analysis.questions.map((text, i) => <li key={i}>{text}</li>)}</ul></div><div><h4>Próximos ajustes</h4><ul>{analysis.actions.map((text, i) => <li key={i}>{text}</li>)}</ul></div></div>}
  </section>;
}
