import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { chatActionLabels } from '../lib/nutrition-chat.js';
import './NutritionCopilot.css';

const Registration = createContext(null);
const ActivePage = createContext(null);

export function NutritionCopilotProvider({ children, initialPage }) {
  const [entries, setEntries] = useState({});
  const [opened, setOpened] = useState(false);
  const [prompt, setPrompt] = useState('');
  const publish = useCallback((id, entry) => setEntries(current => ({ ...current, [id]: entry })), []);
  const remove = useCallback(id => setEntries(current => { const next = { ...current }; delete next[id]; return next; }), []);
  const open = useCallback(text => { setPrompt(text || ''); setOpened(true); }, []);
  const registration = useMemo(() => ({ publish, remove, open }), [publish, remove, open]);
  const page = Object.values(entries).sort((a, b) => b.priority - a.priority)[0] || { data: initialPage, handlers: { current: {} } };
  return <Registration.Provider value={registration}><ActivePage.Provider value={page}>{children}{page.data?.visible !== false && <NutritionCopilot key={`${page.data.scope}:${page.data.requestId || 'general'}`} page={page} opened={opened} onOpen={open} onClose={() => setOpened(false)} prompt={prompt} />}</ActivePage.Provider></Registration.Provider>;
}

// Optional outside the provider, so small existing component tests remain isolated.
export function useNutritionAssistantPage(data, actions = {}, priority = 5) {
  const registry = useContext(Registration);
  const id = useId();
  const handlers = useRef(actions);
  handlers.current = actions;
  const serialized = JSON.stringify({ ...data, actions: Object.keys(actions) });
  useEffect(() => {
    if (!registry) return;
    registry.publish(id, { data: JSON.parse(serialized), handlers, priority });
  }, [registry, id, serialized, priority]);
  useEffect(() => () => registry?.remove(id), [registry, id]);
}

export function useOpenNutritionAssistant() {
  const registry = useContext(Registration);
  return registry?.open || (() => {});
}

function ChatText({ text }) {
  // Render only simple emphasis as React nodes; provider HTML is always text.
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part.startsWith('`') && part.endsWith('`') ? <code key={index}>{part.slice(1, -1)}</code> : part);
}

function NutritionCopilot({ page, opened, onOpen, onClose, prompt }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryUntil, setRetryUntil] = useState(0);
  const [now, setNow] = useState(Date.now);
  const pending = useRef(null);
  const launcher = useRef(null);
  const editor = useRef(null);
  const log = useRef(null);
  const currentPage = useRef(page);
  currentPage.current = page;
  const signature = JSON.stringify(page.data);
  const seconds = Math.max(0, Math.ceil((retryUntil - now) / 1000));
  const professional = page.data.scope === 'professional';
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);
  useEffect(() => { if (opened) editor.current?.focus(); }, [opened]);
  useEffect(() => { if (prompt) setInput(prompt); }, [prompt]);
  useEffect(() => { log.current?.scrollTo?.({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy, opened]);
  useEffect(() => {
    if (retryUntil <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= retryUntil) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [retryUntil]);
  const close = () => { onClose(); launcher.current?.focus(); };
  const send = async (retry = false) => {
    if (pending.current || seconds > 0 || (!retry && !input.trim())) return;
    const next = retry ? messages : [...messages, { role: 'user', content: input.trim() }];
    if (!next.length || next.at(-1).role !== 'user') return;
    const snapshot = currentPage.current.data;
    const source = JSON.stringify(snapshot);
    const controller = new AbortController();
    pending.current = controller; setBusy(true); setError('');
    if (!retry) { setMessages(next); setInput(''); }
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch(professional ? '/api/admin/nutrition-assistant' : '/api/nutrition/assistant', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: snapshot, messages: next.slice(-12).map(({ role, content }) => ({ role, content })) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const retryAfter = Number(result.retryAfter || response.headers.get('retry-after')) || 0;
        if (retryAfter) setRetryUntil(Date.now() + retryAfter * 1000);
        throw new Error(result.error || 'Não foi possível consultar a NVIDIA agora. Tente novamente.');
      }
      if (typeof result.reply !== 'string' || !Array.isArray(result.actions)) throw new Error('A resposta da assistente está incompleta. Tente novamente.');
      if (!controller.signal.aborted) setMessages([...next, { role: 'assistant', content: result.reply, actions: result.actions, model: result.model, source }]);
    } catch (failure) {
      if (pending.current === controller) setError(failure.name === 'AbortError' ? 'A resposta demorou mais que o esperado. Tente novamente.' : failure.message);
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  };
  const suggestions = professional ? ['Qual modelo combina com o objetivo deste atendimento?', 'Analise a semana e me ajude a melhorar as refeições.', 'O que falta conferir antes de entregar o plano?'] : ['Me ajude a preencher esta etapa.', 'Como informar alergias e intolerâncias?', 'O que escrever sobre minha rotina alimentar?'];
  return <div className={`nutrition-copilot ${page.data.requestId ? 'nutrition-copilot--workspace' : ''}`}>
    {opened && <section id="nutrition-copilot-dialog" className="nutrition-copilot__panel" role="dialog" aria-modal="false" aria-labelledby="nutrition-copilot-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header className="nutrition-copilot__header"><span className="nutrition-copilot__spark" aria-hidden="true">✦</span><div><h2 id="nutrition-copilot-title">Seu assistente</h2><p>IA para nutrição · sempre ativa</p></div><button type="button" onClick={close} aria-label="Fechar assistente">×</button></header>
      <div className="nutrition-copilot__context"><span aria-hidden="true">◉</span> Lendo: {page.data.label || 'esta página'}</div>
      <div className="nutrition-copilot__log" ref={log} role="log" aria-label="Conversa com a assistente" aria-live="polite" aria-relevant="additions text">
        {!messages.length && <div className="nutrition-copilot__welcome"><h3>{professional ? 'Vamos preparar um plano melhor?' : 'Vamos preencher juntos?'}</h3><p>{professional ? 'Posso discutir o objetivo, indicar bases e analisar as refeições do atendimento aberto. Os atalhos levam às ferramentas de montagem.' : 'Posso explicar os campos e ajudar você a contar sua rotina para a Gi. Suas respostas continuam sob seu controle.'}</p><div>{suggestions.map(text => <button type="button" key={text} onClick={() => { setInput(text); editor.current?.focus(); }}>{text} ↗</button>)}</div></div>}
        {messages.map((message, index) => <article className={`nutrition-copilot__message nutrition-copilot__message--${message.role}`} key={index}><small>{message.role === 'user' ? 'Você' : 'Assistente · NVIDIA'}</small><p><ChatText text={message.content} /></p>{message.model && <small className="nutrition-copilot__model">{message.model.replace('nvidia/', '')}</small>}{message.actions?.length > 0 && <div className="nutrition-copilot__actions">{message.actions.filter(id => chatActionLabels[id] && page.handlers.current[id]).map(id => <button key={id} type="button" disabled={busy || page.data.busy || message.source !== signature} onClick={() => page.handlers.current[id]?.()}>{chatActionLabels[id]} ↗</button>)}{message.source !== signature && <small>O contexto mudou. Envie uma nova mensagem para atualizar a orientação.</small>}</div>}</article>)}
        {busy && <p className="nutrition-copilot__working" role="status">✦ A NVIDIA está preparando sua resposta…</p>}
      </div>
      {error && <div className="nutrition-copilot__error" role="alert"><p>{error}</p><button type="button" disabled={busy || seconds > 0} onClick={() => send(true)}>{seconds > 0 ? `Aguarde ${seconds} s` : 'Tentar novamente'}</button></div>}
      <form className="nutrition-copilot__form" onSubmit={event => { event.preventDefault(); send(); }}><label className="sr-only" htmlFor="nutrition-copilot-input">Sua mensagem para a assistente</label><textarea ref={editor} id="nutrition-copilot-input" value={input} onChange={event => setInput(event.target.value)} rows="2" maxLength="3000" placeholder={professional ? 'Conte o que você quer montar ou conferir…' : 'Qual campo deixou você com dúvida?'} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} /><button type="submit" disabled={busy || seconds > 0 || !input.trim()} aria-label="Enviar mensagem">{busy ? '…' : '↑'}</button></form>
      <footer className="nutrition-copilot__footer"><span>O texto que você enviar é processado pela NVIDIA. A Gi revisa o plano.</span><button type="button" disabled={busy || !messages.length} onClick={() => { setMessages([]); setError(''); }}>Nova conversa</button></footer>
    </section>}
    <button ref={launcher} type="button" className="nutrition-copilot__launcher" aria-expanded={opened} aria-controls="nutrition-copilot-dialog" onClick={() => opened ? close() : onOpen()}><span aria-hidden="true">✦</span><span><strong>Seu assistente</strong><small>IA para nutrição</small></span><i aria-hidden="true">{opened ? '×' : '↗'}</i></button>
  </div>;
}
