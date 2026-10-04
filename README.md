# Gislaine Duarte · Nutricionista

Site institucional em **Vite + React + JavaScript/JSX**, com HTML pré-renderizado, CSS próprio, SVG e Three.js progressivo. Não usa Next.js ou TypeScript.

## Executar

Recomendado: Node.js 24 LTS e npm. O mínimo aceito é Node 22.12.

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:4321`. No PowerShell com scripts bloqueados, use `npm.cmd` e `npx.cmd`.

Para usar `vercel dev` em `http://localhost:3000`, configure as variáveis privadas das Functions no arquivo `.env` da raiz. O Vercel CLI instalado não carregou essas variáveis a partir de `.env.local`; isso impedia o login no painel. `npm run dev` carrega ambos os arquivos. Eles são ignorados pelo Git; mantenha as configurações de backend sincronizadas ao alterar credenciais. O modelo de IA é definido no código (Nemotron Ultra, com alternativa Super).

```sh
npm run check          # lint + build + auditoria HTML/SEO/links
npm run test:unit      # regras, APIs, autorização, persistência e fluxos isolados
npm run preview        # revisar o build de produção
```

O desenvolvimento usa a porta 4321; preview de produção e testes usam 4323. Isso evita auditar acidentalmente o bundle de desenvolvimento.

Playwright, E2E e os scripts de inspeção de navegador são legados. Siga `AGENTS.md`: só execute Playwright mediante pedido explícito na solicitação atual. A publicação e o push também exigem autorização explícita para cada execução.

## Arquitetura

- `src/App.jsx`: composição React e ciclo de vida dos efeitos.
- `src/components/Pages.jsx`: páginas e seções em JSX real.
- `src/components/Layout.jsx`: header, menu com estado/foco, breadcrumb, conversão e rodapé.
- `src/components/UI.jsx`: fotografia responsiva, links e botões.
- `src/components/Brand.jsx`: símbolo e fallback SVG.
- `src/data/site.js`: conteúdo profissional, contatos, serviços, FAQ e pendências omitidas.
- `src/data/routes.js`: rotas e metadados editoriais.
- `src/lib/seo.js` e `discovery.js`: canonical, JSON-LD, sitemap, robots e llms.
- `src/styles/`: tokens e composição responsiva.
- `src/motion/model.js`: modelo puro e determinístico de cenas/qualidade.
- `src/motion/controller.js`: medidas DOM, único RAF e carregamento progressivo.
- `src/motion/sculpture.js` e `shaders.js`: geometria extrudada e superfícies GLSL.
- `src/motion/vector-narrative.js`: quatro poses SVG, percurso medido, ramos e recomposição.
- `src/motion/transitions.js`: menu coreografado e transições multipágina.
- `src/intro/`: introdução cinematográfica uma vez por sessão, integrada ao canvas da hero; [coreografia, sessão e revisão](docs/intro.md).
- `src/entry-server.jsx`: ReactDOMServer gera o HTML completo; `entry-client.jsx` o hidrata.
- `scripts/generate-pages.mjs`: usa o transformador SSR do Vite durante o build; escreve `.site/`.

O Vite compila as entradas HTML de `.site/` para `dist/`. Os visitantes recebem o conteúdo público antes do JavaScript. A venda digital usa Vercel Functions Node.js para checkout, confirmação do pagamento, autenticação e entrega protegida. Navegação multipágina usa links reais, com histórico nativo e transições de documento nos navegadores compatíveis. O build não publica nada.

## Páginas

Início; sobre; atendimentos; consulta individual; ciclos de acompanhamento; contato; privacidade; 404 com status correto no preview e em hospedagem estática compatível.

O domínio canônico é `https://gislaineduarte.com.br`. O arquivo `vercel.json` configura o build estático, os assets e a inclusão privada dos artefatos nas Functions. Para configurar checkout InfinitePay, Postgres, e-mail e painel de gestão, consulte [docs/recipes-product.md](docs/recipes-product.md). Outros hosts devem servir os `index.html` das pastas e `404.html` com status 404, além de implementar as rotas de API.

O produto **À mesa com GLP-1** tem página própria em `/receitas-glp-1`, 30 receitas (8 bebidas), 11 capítulos educativos e entregas PDF/HTML protegidas. Conteúdo, pacote local, revisão profissional pendente e operação estão em [docs/glp1-product.md](docs/glp1-product.md); os textos de divulgação estão em [docs/glp1-kit-comercial.md](docs/glp1-kit-comercial.md).

## Conteúdo e contato

WhatsApp oficial atualizado pelo usuário: `+55 (47) 9163-5624`. E-mail: `duartegisarte@gmail.com`. Os links de orçamento têm mensagens específicas para cada serviço; não enviam automaticamente nem confirmam agendamento.

O WhatsApp oficial está fixado em `src/data/site.js`: `554791635624`, exibido como `+55 (47) 9163-5624`. Configurações antigas de `PUBLIC_WHATSAPP` são ignoradas no navegador, no pré-render e na API. Para sobrescrever e-mail ou Instagram, copie `.env.example` para `.env` e preencha `PUBLIC_EMAIL` ou `PUBLIC_INSTAGRAM`. A interface e o pré-render compartilham a configuração, com `envDir` apontando para a raiz. Todas as variáveis `PUBLIC_*` e `VITE_*` são públicas: nunca coloque segredos nelas.

Previews reconhecidos por `VERCEL_ENV`/`CONTEXT` usam `noindex`. Para outros ambientes de revisão, configure `PUBLIC_SITE_NOINDEX=true`. A produção deve usar `false`; execute `AUDIT_REQUIRE_INDEXABLE=1 npm run audit` (no PowerShell, atribua essa variável antes do comando) para exigir indexação válida.

## Fotografia e marca

Os originais `profile_foto.jpeg` e `icone.png` permanecem intactos. A foto não foi substituída por um rosto gerado: o arquivo editado foi usado **apenas como máscara alfa**, aplicada aos pixels RGB da foto original. A pessoa, a mesa e o notebook foram preservados. A parede com a identidade antiga foi removida.

- Recorte mestre: `src/assets/gislaine-duarte-recorte.png`.
- Derivados AVIF/WebP em 360, 540, 720 e 960 px: `public/images/`.
- Símbolo: quatro paths editáveis em `src/lib/brand.js`, também exportados em SVG público.
- Social: `public/images/og-gislaine-duarte.jpg`, 1200 × 630.
- Fontes locais: Cormorant Garamond e Manrope, com licenças em `public/fonts/`.

`npm run assets` regenera os derivados usando Sharp. A máscara proveniente da edição está preservada em `src/assets/`. Método e prompt estão em [docs/assets.md](docs/assets.md).

O WebGL usa os quatro paths do SVG, extrusão chanfrada, câmera perspectiva e shader de revelação/varredura/Fresnel. Um único canvas atravessa a hero, quatro poses da abordagem, história, bifurcação e recomposição final. O pin é CSS sticky com scroll nativo. A foto usa uma máscara derivada da polpa da marca; nenhum shader altera a pessoa.

Celulares capazes mantêm 3D com DPR até 1,25; desktop até 1,5. Economia de dados, capacidade limitada ou falha de GPU preservam a narrativa em SVG. Movimento reduzido tem composição estática, sem pin alongado. Renderização sob demanda: nenhum loop permanente. Em desenvolvimento, `?motionDebug=1` mostra cena, progresso, DPR, recursos e estado WebGL. Não existe painel no build de produção. Direção e contratos: [docs/motion-v2-bible.md](docs/motion-v2-bible.md).

## Publicação e pendências

A identificação profissional confirmada é **Gislaine Muller Duarte · Nutricionista · CRN-2 nº 22562**, centralizada em `src/data/site.js` e usada no rodapé, Sobre, Contato, privacidade e JSON-LD. “Gislaine Duarte” continua como marca. CPF e data de nascimento não integram o projeto público. O link do CRN leva à consulta oficial, sem alegar certificação ou situação cadastral verificada pelo site.

As referências fornecidas em 01/10/2026 configuram acompanhamentos de 3 meses (R$ 299/mês), 6 meses (R$ 239,90/mês) e dupla familiar (R$ 197/pessoa). A periodicidade da dupla não foi inferida: a apresentação orienta confirmar as condições. Títulos, valores, visibilidade e condições são editáveis no painel e persistidos com controle de revisão. Encontros, suporte e localização não especificados continuam sujeitos à confirmação no atendimento.

O formulário de anamnese coleta informações autorizadas para o atendimento; o registro e os planos são criptografados no banco. Não há analytics ou cookies de publicidade. A compra das receitas usa a InfinitePay, com confirmação no servidor; o conteúdo e os downloads são protegidos por sessão ligada a um pagamento confirmado. Planos alimentares exigem revisão profissional antes da liberação. A política de privacidade descreve o tratamento do cadastro, informações de saúde, pedidos, sessões e links externos.

As melhorias clínicas e editoriais de outubro estão descritas em [docs/nutrition-editorial-upgrade.md](docs/nutrition-editorial-upgrade.md).

## Verificação

A suíte verifica 320, 375, 390, 430, 768, 1024, 1440, 1920 e 2560 px, além de teclado, foco, zoom, ausência de JavaScript, movimento reduzido, economia de dados e WebGL indisponível. Os novos testes comparam poses, pixels, scroll reverso, perda de contexto, imports pendentes e loading tardio. Os relatórios e screenshots ficam em `tests/artifacts/` e não entram no Git. Segunda rodada: [docs/motion-v2-verification.md](docs/motion-v2-verification.md). Registro da primeira: [docs/verification.md](docs/verification.md).
