# Gislaine Duarte · Nutricionista

Site institucional em **Vite + React + JavaScript/JSX**, com HTML pré-renderizado, CSS próprio, SVG e Three.js progressivo. Não usa Next.js ou TypeScript.

## Executar

Recomendado: Node.js 24 LTS e npm. O mínimo aceito é Node 22.12.

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:4321`. No PowerShell com scripts bloqueados, use `npm.cmd` e `npx.cmd`.

```sh
npm run check          # lint + build + auditoria HTML/SEO/links
npm run test:unit      # validação e normalização dos contatos configuráveis
npx playwright install chromium
npm test               # E2E, axe, responsividade, hidratação e fallbacks
npm run preview        # revisar o build de produção
node tests/run-lighthouse.mjs  # com preview ativo; relatório mobile/desktop
```

O desenvolvimento usa a porta 4321; preview de produção e testes usam 4323. Isso evita auditar acidentalmente o bundle de desenvolvimento.

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
- `src/scripts/`: motion nativo e WebGL sob demanda.
- `src/entry-server.jsx`: ReactDOMServer gera o HTML completo; `entry-client.jsx` o hidrata.
- `scripts/generate-pages.mjs`: usa o transformador SSR do Vite durante o build; escreve `.site/`.

O Vite compila as entradas HTML de `.site/` para `dist/`. Os visitantes recebem o conteúdo antes do JavaScript. Não é necessário servidor Node em produção. Navegação multipágina usa links reais, com histórico nativo e transições de documento nos navegadores compatíveis. O build não publica nada.

## Páginas

Início; sobre; atendimentos; consulta individual; ciclos de acompanhamento; contato; privacidade; 404 com status correto no preview e em hospedagem estática compatível.

O domínio canônico é `https://gislaineduarte.com.br`. O arquivo `vercel.json` descreve apenas o build estático e cache dos assets; nenhuma associação de domínio ou implantação foi feita. Outros hosts devem servir os `index.html` das pastas e `404.html` com status 404, sem rewrite universal para a home.

## Conteúdo e contato

WhatsApp oficial atualizado pelo usuário: `+55 (47) 99191-3588`. E-mail: `duartegisarte@gmail.com`. Os links de orçamento têm mensagens específicas para cada serviço; não enviam automaticamente nem confirmam agendamento.

Para sobrescrever dados oficiais, copie `.env.example` para `.env` e preencha `PUBLIC_WHATSAPP`, `PUBLIC_EMAIL` ou `PUBLIC_INSTAGRAM`. Números brasileiros de 10 ou 11 dígitos com DDD recebem o prefixo internacional 55; números já completos são preservados. A interface e o pré-render compartilham a configuração, com `envDir` apontando para a raiz. Todas as variáveis `PUBLIC_*` e `VITE_*` são públicas: nunca coloque segredos nelas.

Previews reconhecidos por `VERCEL_ENV`/`CONTEXT` usam `noindex`. Para outros ambientes de revisão, configure `PUBLIC_SITE_NOINDEX=true`. A produção deve usar `false`; execute `AUDIT_REQUIRE_INDEXABLE=1 npm run audit` (no PowerShell, atribua essa variável antes do comando) para exigir indexação válida.

## Fotografia e marca

Os originais `profile_foto.jpeg` e `icone.png` permanecem intactos. A foto não foi substituída por um rosto gerado: o arquivo editado foi usado **apenas como máscara alfa**, aplicada aos pixels RGB da foto original. A pessoa, a mesa e o notebook foram preservados. A parede com a identidade antiga foi removida.

- Recorte mestre: `src/assets/gislaine-duarte-recorte.png`.
- Derivados AVIF/WebP em 360, 540, 720 e 960 px: `public/images/`.
- Símbolo: quatro paths editáveis em `src/lib/brand.js`, também exportados em SVG público.
- Social: `public/images/og-gislaine-duarte.jpg`, 1200 × 630.
- Fontes locais: Cormorant Garamond e Manrope, com licenças em `public/fonts/`.

`npm run assets` regenera os derivados usando Sharp. A máscara proveniente da edição está preservada em `src/assets/`. Método e prompt estão em [docs/assets.md](docs/assets.md).

O WebGL usa os mesmos paths do SVG, carregamento dinâmico, DPR limitado, renderização sob demanda e descarte completo. Em celular, movimento reduzido, economia de dados, capacidade limitada ou falha de GPU, o SVG mantém a composição. Leia [docs/motion-bible.md](docs/motion-bible.md).

## Publicação e pendências

Antes do lançamento, a cliente precisa confirmar a identificação completa do CRN e aprovar os textos finais. Duração dos ciclos (divergência 3/5 versus 3/6 meses), encontros, inclusões, suporte, modalidades, preços e localização continuam omitidos. Materiais e artigos permanecem fora da interface até haver arquivos, destinos e revisão profissional aprovados. Detalhes em [docs/content-audit.md](docs/content-audit.md).

Não há formulário cenográfico, coleta de dados de saúde, analytics, cookies de publicidade, compra ou downloads simulados. A política de privacidade descreve os links externos e a preferência temporária de abertura guardada na sessão.

## Verificação

A suíte verifica 320, 375, 390, 430, 768, 1024, 1440, 1920 e 2560 px, além de teclado, foco, zoom, ausência de JavaScript, movimento reduzido, economia de dados e WebGL indisponível. Os relatórios e screenshots gerados ficam em `tests/artifacts/` e não entram no Git. Resultados finais e limitações: [docs/verification.md](docs/verification.md).
