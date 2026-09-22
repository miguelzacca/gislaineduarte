# Produto digital · 7 receitas para ajudar você a desinflamar!

O site permanece em Vite + React + JavaScript/JSX. A landing é pública e mostra somente a prévia. Ingredientes, preparo e alertas completos não entram no bundle público; `/minhas-receitas` é um shell estático, e o conteúdo completo é servido por `/api/recipes/content` somente após autorização no servidor. O PDF e o HTML offline ficam em `artifacts/recipes/`, fora de `public/` e `dist/`, e `/api/recipes/download` exige a mesma sessão. Como qualquer arquivo baixado, o PDF e o HTML podem ser copiados pelo comprador depois do download.

## Compra e acesso

As páginas internas, links de e-mail e callbacks usam URLs sem barra final. `vercel.json` define `cleanUrls: true` e `trailingSlash: false`; endereços antigos com barra redirecionam para a versão canônica. O ambiente local segue o mesmo padrão.

1. A pessoa escolhe comprar. Uma sessão válida abre a coleção diretamente; um pedido em andamento é retomado. Sem sessão ou pedido conhecido, o e-mail é solicitado uma vez e enviado também em `customer.email` para preencher o checkout da InfinitePay. Se esse e-mail já comprou a coleção, enviamos o link de acesso à conta existente, sem criar outra cobrança.
2. `POST /api/recipes/checkout` consulta o preço publicado no Postgres, grava um pedido com valor imutável e gera o link em `POST https://api.checkout.infinitepay.io/links`. O navegador é direcionado ao checkout da InfinitePay.
3. A InfinitePay chama o webhook. O endpoint confere um segredo aleatório próprio daquele pedido, `order_nsu`, `transaction_nsu` e `invoice_slug`; depois consulta `POST https://api.checkout.infinitepay.io/payment_check` diretamente no servidor, usando a InfiniteTag gravada no pedido. Só uma resposta `success: true`, `paid: true`, com o mesmo valor e identificadores do pedido cria a conta por e-mail e concede a titularidade. O retorno do navegador é verificado do mesmo modo, sem confiar nos parâmetros da URL. A documentação pública da InfinitePay não descreve assinatura do webhook; a consulta independente ao provedor é a confirmação autoritativa.
4. Um link de acesso de uso único e validade de 15 minutos é enviado por e-mail. O clique abre uma página de confirmação; apenas o envio do formulário consome o link, evitando consumo por leitores automáticos de e-mail. O dispositivo que confirma recebe uma sessão opaca em cookie `HttpOnly`, `Secure` em HTTPS e `SameSite=Lax`, com prazo padrão de 30 dias.
5. O computador que iniciou a compra possui outro segredo aleatório em cookie `HttpOnly`. Enquanto acompanha o pedido, ele troca esse segredo por uma sessão própria depois que o link é confirmado, mesmo quando o clique aconteceu no celular. Compradores antigos podem pedir novo link em `/minhas-receitas` com o e-mail da compra. O botão “Sair da conta” revoga a sessão no banco.

A tela de acompanhamento consulta a sessão antes de mostrar o formulário. Enquanto aguarda pagamento ou confirmação por e-mail, não pede o endereço novamente. O reenvio reutiliza o e-mail do pedido e o mesmo desafio de autenticação, com limite de envios. “Usar outro e-mail” limpa o acompanhamento no dispositivo por ação explícita da pessoa. Após o prazo da sessão (30 dias por padrão), um novo link autentica a conta existente; as compras e titularidades permanecem no banco.

Pedidos, titularidades, links de acesso e sessões ficam em Postgres. Tokens são guardados apenas como hashes. Alterar `INFINITEPAY_HANDLE` e fazer um novo deploy troca a conta para novos pedidos sem mudar código; cada pedido antigo conserva a InfiniteTag original para sua confirmação. Mudar o preço no painel afeta somente novos pedidos, sem novo deploy. A publicação exige preço definido; sem configuração de checkout, banco ou e-mail, a compra fica indisponível.

## Painel de gestão

`/painel` não está em menus nem sitemap e traz `noindex`. A URL não é a proteção: todos os endpoints `/api/admin/*` exigem sessão administrativa assinada, com cookie `HttpOnly`, `Secure` em HTTPS e `SameSite=Strict`. O login usa usuário e senha de ambiente, segredo de sessão separado e limite de tentativas por IP. A sessão dura oito horas; trocar a senha ou o segredo invalida cookies existentes.

O painel permite definir preço e disponibilidade da coleção, ver pedidos e criar cadastros de futuros produtos como rascunho. Um rascunho novo só pode ser publicado depois que sua entrega digital protegida for implementada; a coleção de receitas já possui essa entrega. O preço em reais exibido ao visitante é lido da API pública do catálogo e não exige novo deploy quando alterado no painel.

## Variáveis de produção

Configure estas variáveis **apenas no ambiente de servidor da Vercel**. Não use `PUBLIC_` ou `VITE_` para nenhuma delas.

| Nome | Valor |
| --- | --- |
| `INFINITEPAY_HANDLE` | InfiniteTag da conta, sem `$`. Trocar este valor direciona novos pagamentos para outra conta. |
| `RECIPES_SITE_URL` | URL HTTPS real do site, por exemplo `https://gislaineduarte.com.br`, sem caminho. Usada no webhook, retorno e link de acesso. |
| `DATABASE_URL` | String de conexão PostgreSQL com TLS, de um banco persistente como Neon. |
| `SMTP_HOST` | `smtp.gmail.com` para Gmail. |
| `SMTP_PORT` | `465` para SMTP com TLS. |
| `SMTP_USER` | Endereço da conta Gmail remetente. |
| `SMTP_APP_PASSWORD` | Senha de app do Google, sem expor a senha principal. |
| `SMTP_FROM` | Remetente, por exemplo `Gislaine Duarte <email@gmail.com>`. |
| `RECIPES_ADMIN_USERNAME` | Nome de usuário administrativo, com ao menos três caracteres. |
| `RECIPES_ADMIN_PASSWORD` | Senha administrativa definida pelo responsável, com ao menos 8 caracteres. |
| `RECIPES_ADMIN_SESSION_SECRET` | Segredo aleatório com ao menos 32 caracteres. |
| `RECIPES_PRODUCT_SESSION_TTL_DAYS` | Opcional; `30` por padrão, aceitando 1 a 365. |

Na Vercel, uma integração Postgres via Marketplace pode fornecer `DATABASE_URL` automaticamente. É possível criar uma senha de app no Google após habilitar a verificação em duas etapas; algumas contas não oferecem essa opção. Não compartilhe esses valores no repositório ou em chat. O painel inicia com a coleção **não publicada e sem preço**. Entre em `/painel`, defina o preço e publique somente após configurar e verificar os serviços externos.

## Build e validação

`npm run build` gera derivados de imagem, HTML offline, PDF e o site. As dependências Python são instaladas em `tmp/product-python/`, sem alterar o Python global. O `package-lock.json` mantém Playwright apenas como legado; conforme `AGENTS.md`, não execute nem instale os testes de navegador por iniciativa própria.

Os testes unitários de segurança verificam negação sem sessão, rejeição de webhook forjado ou com valor divergente, confirmação independente no provedor, troca de sessão entre dispositivos e autenticação do painel. Um pagamento real, webhook e SMTP precisam ser validados com as credenciais e serviços de produção antes da venda. A InfinitePay documenta o [Checkout Integrado](https://www.infinitepay.io/checkout-documentacao), a Vercel documenta [Postgres no Marketplace](https://vercel.com/docs/postgres), e o Google documenta [senhas de app](https://support.google.com/mail/answer/185833?hl=pt-BR).
