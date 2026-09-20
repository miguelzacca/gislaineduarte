# Plano de implementação — Gislaine Duarte

## Inspeção concluída

Repositório inicialmente contém briefing, HTML de identidade, ícone PNG e retrato JPEG, sem framework. Git limpo, branch main, sem AGENTS.md aplicável. `vercel.json` vazio apareceu durante a inspeção e será preservado/adaptado somente à aplicação local, sem deploy.

Fonte de verdade: prompt do usuário > instruções do projeto > briefing > identidade > assets. Domínio confirmado: https://gislaineduarte.com.br. WhatsApp final atualizado pelo usuário: 47991913588, normalizado como +55 (47) 99191-3588; e-mail: duartegisarte@gmail.com. CRN 22562 com região desconhecida não será anunciado como identificação completa. Duração 3/5 versus 3/6 não resolvida. Materiais e artigos não têm arquivos finais, portanto não serão publicados.

## Conceito

Cuidado de dentro para fora. Marfim editorial, verde profundo, luz dourada e o símbolo original do abacate em camadas. Fotografia real recortada com mesa e notebook; arquivo original intacto. Layout independente para mobile, tipografia legível, amplos espaços, navegação nativa e conteúdo estático.

## Arquitetura e responsabilidades

- Principal: Vite + React, JavaScript/JSX, HTML pré-renderizado, layout, páginas, fotografia, navegação, interação, integração e verificação visual.
- Agente conteúdo/SEO: dados centralizados em JavaScript, fatos, metadados/JSON-LD, sitemap, robots, llms e auditoria editorial.
- Agente marca/motion: paths vetoriais fiéis, componente SVG, cena Three.js progressiva, motion bible.
- Agente qualidade: testes Playwright, axe, inspeção de HTML e links, verificação final.

Stack final solicitada explicitamente pelo usuário: Vite + React com JavaScript/JSX, sem TypeScript e sem Next.js. Gerador Vite SSR produz HTML multipágina via ReactDOMServer, com conteúdo completo antes de JS; hydrateRoot ativa componentes React reais. Menu com estado e efeitos React. Three.js separado, dinâmico e condicionado à capacidade. Fontes locais. Sem formulários sem destino, trackers ou cookies promocionais.

## Etapas verificáveis

1. [x] Inspecionar fontes e imagens integralmente.
2. [x] Definir conceito, arquitetura e áreas dos agentes.
3. [x] Produzir assets otimizados e símbolo vetorial.
4. [x] Construir conteúdo semântico, homepage e páginas internas.
5. [x] Integrar menu acessível, motion e WebGL progressivo.
6. [x] Integrar SEO, respostas diretas e privacidade real.
7. [x] Passar lint/sintaxe JavaScript, build, auditoria de links e E2E.
8. [x] Inspecionar 320–2560 px, teclado, sem JS, sem WebGL e movimento reduzido.
9. [x] Medir Lighthouse em produção; corrigir gargalos e documentar limites.

Não fazer push, merge ou deploy. Publicação depende da identificação completa do CRN e aprovação editorial da cliente. Evidências e limites estão em `quality-plan.md` e `verification.md`.
