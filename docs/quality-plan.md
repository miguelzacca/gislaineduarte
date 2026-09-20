# Verificação de qualidade

## Base factual

Fontes: `briefing-site-gislaine-duarte (3).md`, HTML de identidade e confirmações diretas do projeto. Domínio: `https://gislaineduarte.com.br`. WhatsApp atualizado pelo usuário: `5547991913588`. E-mail: `duartegisarte@gmail.com`.

Não publicar duração de ciclos, região do CRN, quantidade de encontros, suporte, preços, modalidades ou material digital sem confirmação. Pós-graduações continuam em andamento. O registro recebido é `22562`; sua identificação completa ainda requer confirmação.

## Contratos verificados

- Vite e React em JavaScript/JSX, com HTML pré-renderizado útil, `lang="pt-BR"`, um `h1`, `main#conteudo` e skip link em todas as páginas.
- Hidratação React preserva o `main`, o `h1` e os destinos dos links do HTML inicial; nenhum erro ou aviso de hidratação é aceito.
- Rotas: `/`, `/sobre/`, `/atendimentos/`, `/atendimentos/consulta-nutricional/`, `/atendimentos/ciclos-de-acompanhamento/`, `/contato/`, `/privacidade/` e 404 real.
- Botão `Abrir menu`, `dialog#navigation-dialog`, `Fechar menu`, Escape, foco contido e retorno de foco.
- Âncoras `#abordagem`, `#atendimentos`, `#perguntas`; FAQ nativo com `details` e `summary`.
- Retrato real em `picture`, fontes responsivas, dimensões explícitas e texto alternativo factual.
- Contato contextual real, sem envio automatizado de mensagens e sem formulário simulado.
- Sem JavaScript, WebGL indisponível, movimento reduzido, economia de dados e falha do retrato.

## Execução

Depois de `npm ci`, instale o navegador uma vez com `npx playwright install chromium`. Execute `npm run build`, `npm run audit` e `npx playwright test`. O Playwright inicia o preview de produção em `127.0.0.1:4323` quando necessário; não testa o servidor de desenvolvimento, que usa a porta 4321.

Os testes de responsividade cobrem 320, 375, 390, 430, 768, 1024, 1440, 1920 e 2560 px, em todas as páginas, incluindo ultrawide. Geram capturas integrais da página principal em `tests/artifacts/results`. A inspeção humana/visual dessas imagens complementa as verificações automáticas de overflow, leitura e enquadramento.

`axe-core` verifica WCAG A/AA em 390 e 1440 px e menu mobile aberto. Resultado sem violações automáticas não equivale a certificação WCAG: revisão visual, uso por teclado e zoom fazem parte da validação.

## SEO e conteúdo

`scripts/audit-site.mjs` percorre o HTML de `dist`: links, âncoras, imagens, fontes referenciadas, metadados únicos, canonicals, Open Graph/Twitter, JSON-LD sintaticamente válido, entidades, FAQ visível, sitemap, robots, manifest e ausência de informações profissionais presumidas. A auditoria local não substitui o Schema.org Validator nem garante elegibilidade a rich results.

## Performance

Budget da stack React/JSX solicitada: JavaScript crítico comprimido abaixo de 100 KB por rota, incluindo React/ReactDOM, fontes locais apenas necessárias à primeira tela, retrato responsivo em WebP/AVIF e módulo Three separado. O audit informa bytes reais e gzip para revisão; as metas de bytes são orientação técnica, enquanto a aceitação de experiência usa as medições de laboratório e inspeção de carregamento. Conteúdo não espera hidratação.

Contrastes da identidade: verde profundo/marfim 10,36:1, verde folha/marfim 5,29:1, dourado/marfim 2,40:1, dourado/verde profundo 4,31:1. O dourado original não atende texto normal nesses fundos; reservar para gráficos ou usar variantes de texto com contraste suficiente.

Com preview ativo, execute `node tests/run-lighthouse.mjs`. Os relatórios HTML/JSON e o resumo ficam em `tests/artifacts/lighthouse`. O script faz três medições mobile da home, calcula a mediana de cada métrica e mede desktop e uma página de serviço. Para repetir somente as três medições mobile após uma otimização da hero, use `node tests/run-lighthouse.mjs --mobile-only`; o resumo específico fica em `summary-mobile.json`.

Metas: LCP < 2,5 s, CLS < 0,1, Performance ≥ 90, Acessibilidade/Boas práticas/SEO próximos de 100. Resultados de Lighthouse são de laboratório; TBT é medido, mas não representa uma medição de INP real. INP e Core Web Vitals de campo dependem de tráfego e observação após o lançamento. Não apresentar métricas locais como resultados reais de usuários.

## Limites e liberação

A aprovação editorial dos textos, identificação completa do registro e informações de atendimento pendentes devem ser concluídas pela cliente antes de publicação. Esta frente não faz deploy, push, envio de WhatsApp nem envio de e-mail. Os testes validam o destino e a mensagem dos links sem executar comunicação externa.

## Evidências verificadas em 20 de setembro de 2026

- Playwright: **46/46 aprovados** na rodada final, em aproximadamente 1,5 minuto. Os testes incluem as sete rotas, nove larguras, menu por toque e teclado, histórico, recarregamento, 404, contato, ausência de JavaScript/WebGL, preferências e hidratação React. A captura percorre cada bloco revelado para confirmar sua presença antes do screenshot.
- Configuração: **20/20 testes unitários aprovados**, incluindo telefone nacional/internacional, e-mail, Instagram e restauração do ambiente após erros. O WhatsApp final é o DDD 47 confirmado na última mensagem do usuário.
- Axe: **15 cenários sem violações**, incluindo todos os níveis A/AA pertinentes de WCAG 2.0, 2.1 e 2.2 e o menu aberto. O nome acessível do wordmark foi alinhado ao texto visível após a verificação complementar do Lighthouse.
- Auditoria estática com `AUDIT_REQUIRE_INDEXABLE=1`: **8 páginas, 7 URLs no sitemap, zero erros e zero observações**. A página 404 permanece com `noindex`.
- Console e hidratação: nenhum erro inesperado nos fluxos testados; o React preservou os elementos `main` e `h1` e os destinos dos links do HTML inicial em todas as rotas.
- JavaScript inicial: **83.887 bytes gzip**, incluindo React/ReactDOM. Three.js permanece em chunks separados e só é solicitado pela cena habilitada.

Lighthouse **13.5.0**, preview de produção local, perfis com rede/CPU simuladas:

| Cenário | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home mobile — mediana de três medições finais | 98 | 100 | 100 | 100 | 2,336 s | 0,00167 | 18 ms |
| Home desktop | 100 | 100 | 100 | 100 | 0,513 s | 0 | 0 ms |
| Consulta mobile | 99 | 100 | 100 | 100 | 2,007 s | 0 | 4 ms |

As três execuções finais mobile tiveram Performance 98/99/97 e LCP 2,336/2,022/2,426 s: todas abaixo de 2,5 s. O CLS foi 0,00167 nas três. A transferência total medida caiu de 349.634 para **255.562 bytes** com a seleção correta do retrato responsivo: hero e biografia reutilizam o AVIF de 720 px nesse perfil. As cinco medições são do build final na porta 4323, com o contato atualizado, leitura coerente do `.env` e contraste final da marca. Não houve avisos do Lighthouse. Não há dados de INP de campo neste projeto ainda.

Relatórios reproduzíveis: `tests/artifacts/playwright-report/index.html`, `tests/artifacts/site-audit.json`, `tests/artifacts/lighthouse/summary.json`, `tests/artifacts/lighthouse/home-desktop.html` e `tests/artifacts/lighthouse/consulta-mobile.html`. `summary-mobile.json` registra uma rodada anterior, não a entrega final. Screenshots em nove larguras ficam nas pastas de testes correspondentes sob `tests/artifacts/results`.
