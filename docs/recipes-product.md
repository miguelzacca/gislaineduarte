# Produto digital · 7 receitas para ajudar você a desinflamar!

## Arquitetura

O site continua em Vite + React + JavaScript/JSX, com páginas públicas pré-renderizadas. O produto usa a fonte canônica `src/data/recipes-product.js`. O gerador `scripts/generate-recipes-preview.mjs` deriva somente nomes, categorias, introduções e imagens para `src/generated/recipes-product-preview.js`, que pode entrar no bundle público. Ingredientes, preparo e alertas completos não são importados em nenhum componente público.

- Landing: `/7-receitas-para-ajudar-voce-a-desinflamar/`, estática, indexável, com prévia e schema `Product` sem preço, oferta ou `Recipe`.
- Área: `/minhas-receitas/`, HTML estático que contém apenas shell e estado de carregamento. `noindex,nofollow` e fora do sitemap. O conteúdo completo só vem de `/api/recipes/content`, após validação no servidor.
- Checkout mock: `POST /api/recipes/checkout` cria cookie assinado `httpOnly`, `SameSite=Lax`, `Secure` em HTTPS/produção. O formulário abre um diálogo nativo para confirmar que não há pagamento real. Não há `next` livre nem redirecionamento externo.
- Downloads: `GET /api/recipes/download?format=html|pdf` verifica a mesma sessão, sem cache público, com `Content-Disposition: attachment`, `X-Robots-Tag` e tipo correto. Os arquivos ficam em `artifacts/recipes/`, fora de `public/` e `dist/`, e são incluídos apenas no bundle da função por `vercel.json`.

Vercel Functions para projetos Vite são documentadas em [Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js) e [Project Configuration](https://vercel.com/docs/project-configuration/vercel-json). A plataforma limita o corpo de resposta de uma função a 4,5 MB segundo [Functions Limits](https://vercel.com/docs/functions/limitations); o build e os testes verificam que PDF e HTML permanecem abaixo desse limite. Para artefatos maiores, a substituição correta seria armazenamento privado com URLs assinadas de curta duração emitidas depois da autorização, nunca `public/`.

## Configuração na Vercel

Copie os nomes de `.env.example` para os ambientes desejados:

| Variável | Valor / efeito |
| --- | --- |
| `RECIPES_PRODUCT_ACCESS_MODE` | `locked` bloqueia; `mock` habilita o verificador temporário. Ausente ou inválido = bloqueado. |
| `RECIPES_PRODUCT_MOCK_CHECKOUT_ENABLED` | `true` libera a confirmação mock somente com modo `mock` e segredo válido. Ausente/`false` = bloqueado. |
| `RECIPES_PRODUCT_ACCESS_SECRET` | Segredo aleatório de **pelo menos 32 caracteres**, apenas server-side. Ausente ou curto = bloqueado. Trocar invalida sessões antigas. |
| `RECIPES_PRODUCT_SESSION_TTL_DAYS` | 1 a 365; padrão 30 quando ausente/inválido. |

Para uma demonstração local, configure as quatro variáveis em `.env.local` (arquivo ignorado) ou no ambiente do processo e execute `npm run dev` em `http://127.0.0.1:4321`. O Vite serve as páginas e encaminha `/api/recipes/*` aos mesmos handlers server-side usados em produção; o segredo nunca entra no bundle do navegador. Reinicie o servidor após alterar `.env.local`. Como alternativa para conferir o build estático pronto, execute `npm run build` e depois `npm run dev:product` em `http://127.0.0.1:4325`. Não use segredos em `PUBLIC_*`, `VITE_*`, links, HTML ou repositório. Para encerrar a demonstração, defina `RECIPES_PRODUCT_ACCESS_MODE=locked` e `RECIPES_PRODUCT_MOCK_CHECKOUT_ENABLED=false`, reinicie o servidor local ou faça nova implantação/atualização de ambiente. A validação também nega sessões mock anteriores quando o modo muda para `locked`.

O mock **não deve ser usado como checkout comercial**: qualquer visitante pode confirmar sem pagar. No lançamento, implemente um provedor real e troque o modo para o identificador dele. `verifyProductEntitlement()` em `server/recipes/access.js` é a interface única utilizada pelo conteúdo e pelos downloads; adicione ali a verificação server-side da compra/webhook e emissão de sessão vinculada a uma titularidade real. A página e os downloads não precisam ser reconstruídos.

## Build e arquivos

Instale as dependências JS conforme a política do repositório. O `package-lock.json` ainda inclui Playwright legado; agentes não devem instalar, atualizar, remover ou executá-lo por iniciativa própria. `npm run product:deps` instala `reportlab`, `fonttools[woff]`, `pypdf` e `pdfplumber` conforme `requirements-product.txt`. `npm run product:build` gera derivados AVIF/WebP e JPEG, OG, o HTML offline e o PDF. `npm run build` inclui essa etapa e compila o site. `npm run product:validate` confere conteúdo/segurança e a integridade estrutural do PDF; `npm run product:smoke` verifica o fluxo HTTP contra `npm run dev` com modo mock ativo (porta 4321 por padrão; defina `RECIPES_PRODUCT_TEST_ORIGIN=http://127.0.0.1:4325` para verificar `dev:product`).

- Fonte de imagens originais: `src/assets/recipes/original/`.
- Miniaturas e responsivas: `public/images/recipes/`.
- JPEGs de impressão: `artifacts/recipes/assets/`.
- HTML offline: `artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar-offline.html`.
- PDF: `artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar.pdf`.

O HTML incorpora estilos, scripts, fontes e imagens em data URI. Usa CSS 3D/fichas editoriais em vez de WebGL para estabilidade em `file://`. Seu CSP bloqueia conexão externa e o runtime não contém `fetch`. Estado de favoritos, progresso, checklists e compras fica no navegador, com fallback em memória. O PDF é A4, com fontes locais convertidas/embutidas, links clicáveis, metadados e numeração. Nenhum arquivo premium entra em `public/` ou `dist/`.

## Limites e revisão necessária

`CONTENT-VALIDATION.md` transcreve as imagens de referência, informa inferências de temperatura/tempo/preparo e lista alergênicos. O conteúdo culinário e a palavra “proteico” em uma das receitas dependem de validação da nutricionista antes do lançamento definitivo. Não há preço, rendimento, calorias ou macros inventados. As imagens são composições originais geradas, não registros de teste das receitas preparadas pela cliente.

Sem JavaScript, a landing permanece legível e o formulário HTML pode enviar `POST` diretamente, mas a área adquirida depende do endpoint protegido para exibir a coleção; o HTML offline contém todo o conteúdo e funciona sem JavaScript para leitura/print, com interações desativadas nesse caso.

## Verificação de lançamento

Localmente, lint, 222 testes unitários, auditoria de páginas, build, smoke HTTP do fluxo mock e inspeção das 14 páginas renderizadas do PDF passaram. A inspeção visual direta confirmou a landing e a área adquirida em desktop, além do diálogo de confirmação e da busca por ingrediente. O HTML foi verificado estruturalmente: oito imagens e fontes em data URI, CSS/JS inline, nenhum `fetch` nem recurso externo e CSP com `connect-src 'none'`.

Ainda é necessário testar visualmente os breakpoints específicos de 360×800, 390×844, 768×1024 e telas grandes em um navegador com controle de viewport e abrir o HTML em `file://` com rede desativada. A ferramenta de navegador deste ambiente bloqueou a URL `file://` por política de segurança e não disponibilizou redimensionamento preciso; não houve tentativa de contornar esse bloqueio. Também é necessária uma implantação de preview na Vercel para validar o empacotamento `includeFiles` e as Functions no ambiente real, sem ativar o mock comercialmente. Não execute Playwright para isso sem solicitação explícita, conforme `AGENTS.md`.
