import { useCallback, useEffect, useState } from 'react';
import { BrandMark } from './Brand.jsx';

const money = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
const date = (value) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
  return data;
}

function parsePrice(value) {
  const clean = value.trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  if (!/^\d{1,5}(?:[.,]\d{1,2})?$/.test(clean)) return null;
  const [whole, decimal = ''] = clean.replace('.', ',').split(',');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return cents >= 100 && cents <= 10_000_000 ? cents : null;
}

function ProductEditor({ product, onSaved }) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.priceCents ? (product.priceCents / 100).toFixed(2).replace('.', ',') : '');
  const [published, setPublished] = useState(product.published);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const deliverable = product.kind === 'recipes';
  const save = async (event) => {
    event.preventDefault();
    const priceCents = price.trim() ? parsePrice(price) : null;
    if (price.trim() && !priceCents) { setMessage('Informe um valor válido em reais.'); return; }
    setBusy(true); setMessage('');
    try {
      await api('/api/admin/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, title, description, priceCents, published }) });
      setMessage('Alterações salvas. O checkout já usa este valor.');
      onSaved();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <form className="admin-product" onSubmit={save}>
    <div className="admin-product__top"><div><span className="admin-label">{deliverable ? 'Coleção digital' : 'Rascunho'}</span><h3>{product.title}</h3></div><span className={`admin-pill ${product.published ? 'admin-pill--live' : ''}`}>{product.published ? 'Publicado' : 'Não publicado'}</span></div>
    <div className="admin-product__fields"><label>Nome do produto<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} disabled={deliverable} required /></label><label>Preço em reais<input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="Defina o valor" /></label></div>
    <label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} disabled={deliverable} /></label>
    <div className="admin-product__bottom"><label className="admin-switch"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} disabled={!deliverable || !price.trim()} /><span>Disponível para compra</span></label><button disabled={busy} type="submit">{busy ? 'Salvando…' : 'Salvar produto'}</button></div>
    {!deliverable && <p className="admin-hint">Este cadastro é um rascunho. Para vender outro arquivo digital, é preciso configurar sua entrega protegida antes da publicação.</p>}
    {message && <p className="admin-feedback" role="status">{message}</p>}
  </form>;
}

function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const body = new URLSearchParams({ username, password });
      await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      setPassword(''); onSuccess();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <div className="admin-login"><div className="admin-login__brand"><BrandMark /><span>GISLAINE DUARTE · GESTÃO</span></div><div className="admin-login__card"><p className="admin-label">Acesso reservado</p><h1>Bem-vinda de volta.</h1><p>Entre para administrar a coleção, os preços e acompanhar os pedidos.</p><form onSubmit={submit}><label>Usuário<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>Senha<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label><button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar no painel'}</button></form>{message && <p className="admin-feedback" role="alert">{message}</p>}</div></div>;
}

export function AdminPage() {
  const [state, setState] = useState('loading');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ paid: 0, pending: 0, grossCents: 0 });
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState('');
  const loadData = useCallback(async () => {
    const [catalog, sales] = await Promise.all([api('/api/admin/products'), api('/api/admin/orders')]);
    setProducts(catalog.products); setOrders(sales.orders); setStats(sales.stats);
  }, []);
  const afterLogin = async () => { setState('loading'); try { await loadData(); setState('ready'); } catch (error) { setMessage(error.message); setState('error'); } };
  useEffect(() => {
    let active = true;
    api('/api/admin/session').then(async ({ authenticated }) => {
      if (!active) return;
      if (!authenticated) { setState('login'); return; }
      await loadData(); if (active) setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [loadData]);
  const createDraft = async (event) => {
    event.preventDefault(); setMessage('');
    try { await api('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) }); setNewTitle(''); await loadData(); }
    catch (error) { setMessage(error.message); }
  };
  const logout = async () => { await api('/api/admin/logout', { method: 'POST' }); setState('login'); };
  if (state === 'loading') return <div className="admin-loading">Preparando painel…</div>;
  if (state === 'login') return <Login onSuccess={afterLogin} />;
  if (state === 'error') return <div className="admin-loading"><p>{message || 'Painel indisponível.'}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>;
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-sidebar__brand"><BrandMark /><span>GISLAINE DUARTE<br /><small>PAINEL DE GESTÃO</small></span></div><nav aria-label="Painel"><a href="#visao-geral">Visão geral</a><a href="#produtos">Produtos</a><a href="#pedidos">Pedidos</a></nav><button type="button" onClick={logout}>Sair do painel</button></aside><div className="admin-main"><header className="admin-header"><div><p className="admin-label">Painel privado</p><h1>Seu negócio,<br /><em>em boas mãos.</em></h1></div><span className="admin-header__date">{date(new Date())}</span></header><section id="visao-geral" className="admin-stats" aria-label="Visão geral"><article><span>Vendas confirmadas</span><strong>{stats.paid}</strong></article><article><span>Pedidos aguardando</span><strong>{stats.pending}</strong></article><article><span>Valor bruto confirmado</span><strong>{money(stats.grossCents)}</strong></article></section><section id="produtos" className="admin-section"><div className="admin-section__heading"><div><p className="admin-label">Catálogo</p><h2>Produtos</h2></div><span>{products.length} cadastrado{products.length === 1 ? '' : 's'}</span></div><div className="admin-products">{products.map((product) => <ProductEditor key={product.id} product={product} onSaved={loadData} />)}</div><form className="admin-new" onSubmit={createDraft}><div><strong>Novo produto</strong><p>Cadastre uma ideia como rascunho para organizar o catálogo.</p></div><input aria-label="Nome do novo produto" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Nome do produto" maxLength={120} required /><button type="submit">Criar rascunho</button></form>{message && <p className="admin-feedback" role="status">{message}</p>}</section><section id="pedidos" className="admin-section"><div className="admin-section__heading"><div><p className="admin-label">Acompanhamento</p><h2>Pedidos recentes</h2></div></div><div className="admin-table-wrap"><table><thead><tr><th>Data</th><th>Comprador</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{orders.length ? orders.map((order) => <tr key={order.id}><td>{date(order.createdAt)}</td><td>{order.email}</td><td>{money(order.amountCents)}</td><td><span className={`admin-pill ${order.status === 'paid' ? 'admin-pill--live' : ''}`}>{order.status === 'paid' ? 'Pago' : 'Aguardando'}</span></td></tr>) : <tr><td colSpan="4">Nenhum pedido ainda.</td></tr>}</tbody></table></div></section></div></div>;
}
