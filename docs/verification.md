# Verificação final — 20 de setembro de 2026

## Entrega e ambiente

Vite 8.3.0 + React 19.3.0, JavaScript/JSX. Não há Next.js, TypeScript ou aplicação vanilla disfarçada: páginas, navegação, menu e componentes são React, com HTML pré-renderizado e hidratação. Node 25.2.1 foi usado neste ambiente Windows; Node 24 LTS é a versão recomendada para uso do projeto.

O domínio canônico é `https://gislaineduarte.com.br`. O WhatsApp final confirmado pelo usuário é `+55 (47) 99191-3588`; o e-mail é `duartegisarte@gmail.com`. O `.env` local foi preservado, e a normalização aceita seu número brasileiro sem prefixo de país. O Instagram aparece somente quando configurado.

Desenvolvimento em `http://127.0.0.1:4321`; preview estático de produção em `http://127.0.0.1:4323`. Portas distintas impedem que os testes reutilizem acidentalmente o servidor de desenvolvimento.

## Resultados de código e integração

| Verificação | Resultado |
| --- | --- |
| `npm ci` | Instalação reproduzível concluída; 0 vulnerabilidades |
| `npm run lint` | Passou, sem erros ou avisos de código |
| `npm run build` | Passou; oito documentos HTML pré-renderizados |
| `npm run audit` com `AUDIT_REQUIRE_INDEXABLE=1` | Oito páginas, sete URLs no sitemap, zero erros e zero observações |
| `npm run test:unit` | 20/20 testes aprovados |
| `npm test` | 46/46 testes aprovados na versão final, em aproximadamente 1,5 minuto |
| Axe | 15 cenários sem violações automáticas WCAG A/AA 2.0, 2.1 e 2.2 |
| Git | Originais intactos; sem commit, push, merge ou deploy |

Não há etapa TypeScript por decisão explícita do usuário. A validação de código usa ESLint, compilação JSX, testes unitários e testes de integração.

O instalador reporta uma depreciação transitiva de `whatwg-encoding`, utilizada pelo Cheerio de desenvolvimento. O pacote mais recente do Cheerio ainda depende dessa versão; não foi aplicado override incompatível para esconder o aviso. Nenhuma vulnerabilidade foi encontrada. O executor Playwright também pode informar a precedência de `FORCE_COLOR` sobre `NO_COLOR` definidos pelo ambiente; isso não é erro da aplicação.

## Navegador e experiência

As sete rotas públicas foram verificadas em 320, 375, 390, 430, 768, 1024, 1440, 1920 e 2560 px. Os testes verificam ausência de overflow, fotografia carregada e dimensionada, títulos sem corte, revelação dos blocos durante o scroll, navegação e capturas integrais. Home, escultura, história e menu também receberam inspeção visual manual.

Fluxos aprovados: os dois “Saiba mais”, mensagens contextuais de orçamento, destinos de WhatsApp/e-mail, breadcrumbs, âncoras, FAQ por teclado, skip link, menu com foco contido e Escape, restauração do scroll, histórico, recarregamento interno e HTTP 404 real. Nenhuma mensagem foi enviada a terceiros.

Fallbacks aprovados: sem JavaScript, sem WebGL, movimento reduzido, economia de dados, imagem com falha e zoom de texto a 200%. A cena WebGL também inicia em dispositivo compatível, preservando fallback SVG. Texto e ações não dependem do canvas.

O HTML servido contém o conteúdo antes da hidratação. As provas de integração confirmam que React reutiliza `main` e `h1`, preserva os destinos e não produz erros de hidratação ou console nos fluxos testados. Uma divergência entre `.env` e cliente foi encontrada durante a revisão do dev e corrigida com `envDir` na raiz; a nova configuração foi validada no navegador e no build final.

## Performance

Lighthouse 13.5.0, build de produção local com rede/CPU simuladas. As medições detalhadas e os relatórios ficam em `tests/artifacts/lighthouse`; a síntese está em `docs/quality-plan.md`.

| Cenário final | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| Home mobile — mediana de três execuções | 98 | 2,336 s | 0,00167 | 18 ms |
| Home desktop | 100 | 0,513 s | 0 | 0 ms |
| Consulta mobile | 99 | 2,007 s | 0 | 4 ms |

Acessibilidade, boas práticas e SEO atingiram 100 em todas as cinco execuções. JavaScript inicial: 83.887 bytes gzip. Transferência total da home nesse perfil mobile: 255.562 bytes. Todas as medições mobile da home tiveram LCP abaixo de 2,5 s. Não houve avisos do Lighthouse.

Os resultados são de laboratório, não métricas de usuários reais. TBT não é INP. INP e Core Web Vitals de campo ainda precisam de tráfego após publicação. O WebGL é separado do JavaScript crítico, carregado somente perto da cena em dispositivos elegíveis, e renderizado sob demanda.

## SEO, AEO e GEO

Metadados únicos, canonical, Open Graph/Twitter, imagem social, ícones, manifest, sitemap com sete URLs, robots, breadcrumbs, FAQ visível, entidades ligadas e `/llms.txt` foram auditados no HTML final. A página 404 tem `noindex`; previews podem ser explicitamente marcados com `PUBLIC_SITE_NOINDEX=true`.

Uma amostra do grafo foi submetida ao Schema.org Validator: zero erros e zero avisos. O Google Rich Results Test identificou um BreadcrumbList válido. A validação externa foi do código gerado, não de um domínio já publicado, e não garante destaque em busca. Evidências e limites em `docs/content-audit.md`.

## Assets e fatos pendentes

A máscara de recorte conserva a pessoa, mesa e notebook, sem a parede e a identidade antiga. O mestre preserva os RGB de 821.351 pixels retidos: zero alterações nesses canais. Os derivados AVIF/WebP usam compressão própria para a web. Foto e ícone originais mantêm seus hashes Git. Os quatro paths vetoriais originam tanto o SVG quanto a escultura Three.js.

Continuam pendentes: identificação completa do CRN, aprovação editorial e confirmação de duração/inclusões dos ciclos, modalidades, preços e localização. Esses dados não foram presumidos. Materiais e artigos não foram publicados sem arquivos e revisão aprovados. O site está implementado e executável; esta entrega não constitui autorização de publicação nem validação profissional das credenciais.

## Reproduzir

```sh
npm ci
npm run check
npm run test:unit
npx playwright install chromium
npm test
npm run preview
# Em outro terminal, com o preview ativo:
node tests/run-lighthouse.mjs
```

Use `npm.cmd` e `npx.cmd` se o PowerShell bloquear scripts. Relatórios locais: `tests/artifacts/playwright-report/index.html`, `tests/artifacts/site-audit.json`, `tests/artifacts/lighthouse/summary.json`. Screenshots estão em `tests/artifacts/results` e nas capturas finais de mobile/menu em `tests/artifacts`.
