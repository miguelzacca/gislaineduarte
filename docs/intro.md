# Introdução — de dentro para fora

Introdução sobre Vite + React/JSX. Os quatro paths, a fotografia, a composição final da hero e o renderer são os mesmos do site. A intro preserva conteúdo, contato, serviços, URLs e metadados. A atualização posterior do nome completo e CRN, solicitada separadamente pelo usuário, está documentada em [content-audit.md](content-audit.md).

## Coreografia

Uma timeline pura, amostrada pelo RAF que já pertence ao controlador de movimento. Nenhum relógio de animação paralelo, vídeo ou porcentagem fictícia.

| Tempo nominal | Cena | Transformação |
| --- | --- | --- |
| 0–650 ms | Fragmentos | Casca, folha, polpa e semente em planos CSS 3D independentes, traços incompletos e câmera próxima. |
| 650–1650 ms | Desenho espacial | `stroke-dashoffset`, máscaras individuais e preenchimento progressivo; os planos convergem. |
| 1650–3200 ms | Profundidade | Extrusões chanfradas dos paths substituem o desenho; câmera recua/contorna, shader revela superfície, peças se encaixam. |
| 3200–3800 ms | Símbolo completo | Mesma geometria reunida, luz rasante, uma única respiração de 2,4%. Sem rotação contínua. |
| 3800–4800 ms | Nascimento da página | O contorno da polpa abre a cobertura; máscara da foto revela os pixels originais. Centro, tamanho e câmera convergem para o frame real da hero. |

A montagem absorve até 1200 ms adicionais de espera por fotografia, fontes e GPU. A readiness é latched: resize ou troca de capacidade não fazem o tempo retroceder. Deadline de segurança de 6600 ms; aba oculta pausa o relógio e o deadline. A duração normal é 4,8–6 s, sem uma espera extra depois dos assets.

## Arquivos e contratos

- `src/intro/session.js`: reserva e conclusão da sessão; bootstrap autossuficiente antes do paint.
- `src/intro/timeline.js`: tempos, interpolação e endpoint exatamente igual à hero.
- `src/intro/controller.js`: lease por execução, assets, interação, scroll/foco, skip e cleanup.
- `src/components/IntroOverlay.jsx` e `src/styles/intro.css`: camadas SVG/3D, máscaras, wordmark e botão.
- `src/motion/controller.js`: único RAF e único canvas compartilhados entre intro e scroll.
- `src/motion/sculpture-client.js`: transporte de frames, cancelamento, qualidade, deduplicação e fallback sem OffscreenCanvas.
- `src/motion/sculpture-worker.js`: renderer em OffscreenCanvas, preparação de iluminação e ACK após conclusão real da GPU.
- `src/motion/brand-shapes.js`: leitura dos paths sem DOM; buffers geométricos conferidos contra o SVGLoader em 48 testes.
- `src/motion/sculpture.js`: geometria real, compilação progressiva, GPU warmup, AbortSignal e descarte.
- `src/motion/shaders.js`: shader existente de revelação altura/noise, Fresnel e faixa luminosa. A foto nunca é distorcida por ele.
- `src/motion/native-transitions.js`: observador das transições entre documentos, instalado no head antes da hidratação e mantido na restauração do histórico.

O renderer usa `compileAsync` e fences assíncronos finitos. Em navegadores com OffscreenCanvas, preparação de iluminação, geometria e renderização ocorrem em um worker. O controlador principal envia no máximo um frame em voo e mantém apenas o último solicitado. Não há RAF no worker nem loop em repouso. O ACK só publica a cena após a GPU completar o frame; metadados distinguem o frame apresentado do progresso solicitado. Timeout, cancelamento e perda de contexto encerram o worker e mantêm o SVG.

O canvas da intro **não é duplicado**: ele se torna o canvas da hero. Ao pular ou terminar, a timeline/controle modal são encerrados; o renderer existente volta a operar sob demanda. Em navegação/unmount, a criação pendente é abortada e os recursos GPU são descartados. Sem OffscreenCanvas/Worker, o mobile usa diretamente a composição SVG; o fallback de renderer na thread principal fica restrito ao desktop.

A regressão também cobre o cancelamento normal de transições nativas ao ocultar o documento de saída. O observador idempotente é instalado por script clássico no head, porque `pagereveal` pode anteceder a hidratação. Seus dois listeners pertencem ao documento, não à cena, e continuam válidos após `pagehide`/BFCache; não acumulam em replay de efeitos. As promises `ready`, `updateCallbackDone` e `finished` são observadas para cancelamento/timeout e opt-in desativado. Outros erros são reportados, sem filtros globais de console ou rejeições. Referência: [ciclo de vida MPA no Chrome](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document#the_pageswap_and_pagereveal_events).

## Sessão

Chave: `gislaine:intro:v1`. Estado `playing` é gravado antes de mostrar qualquer overlay; conclusão ou skip gravam `seen`. Tanto `playing` de um documento anterior quanto `seen` impedem replay após refresh. O bootstrap fica no head de todas as rotas, mas só a home sem hash pode iniciar a sequência.

`gislaine:intro:tab:v1` identifica a aba. Uma janela com opener que recebeu cópia do sessionStorage é separada da sessão original, sem modificar a aba mãe. Uma aba nova comum tem armazenamento próprio. Alterar a versão permite uma futura nova introdução.

O primeiro controller reclama a lease do bootstrap. O replay de efeitos do React StrictMode reassume a mesma execução antes da microtask de cleanup: não reserva nem reinicia a timeline. Um watchdog de 7 s libera apenas um bootstrap ainda não reclamado se o bundle falhar. Sem JavaScript, o overlay fica oculto por CSS e todo o HTML permanece útil.

Storage bloqueado usa memória do documento. Não existe promessa de persistência entre documentos/refresh quando o navegador proíbe o próprio armazenamento; o site permanece utilizável e não lança exceções.

Para revisar novamente na aba atual, no console local:

```js
sessionStorage.removeItem('gislaine:intro:v1');
location.assign('/');
```

## Interação e capacidades

- Botão **Pular introdução**, alvo de pelo menos 48 px, aparece após 650 ms. Escape funciona desde o começo; saída de 280 ms.
- O skip link original continua sendo o primeiro destino do teclado e permite ir diretamente ao conteúdo. Tab também alcança o botão da intro; elementos decorativos nunca recebem foco.
- Overlay intercepta ponteiro e scroll simples, preservando pinch zoom. Compensa scrollbar e restaura estilos, posição original e foco. O conteúdo não recebe `aria-hidden` nem `inert`.
- **High**: extrusão completa, câmera ampla, DPR até 1,5.
- **Medium/mobile**: menos segmentos e pontos, DPR até 1,25 nos aparelhos capazes. Capacidade desconhecida ou intermediária limita o DPR a 1, usa 24 pontos, geometria mais simples e iluminação mais leve. Frames lentos confirmados pela GPU reduzem o DPR progressivamente.
- **Lite / sem WebGL**: paths, máscaras, planos e o mesmo handoff; sem importar Three em economia de dados, nem os chunks Three quando o contexto é indisponível.
- **Reduced motion**: entrada direta na hero, símbolo completo, sessão marcada vista, sem espera por assets ou GPU.

## Verificação reproduzível

```sh
npm run check
npm run test:unit
npx playwright test tests/e2e/intro.spec.js --workers=1
npm test -- --workers=1
node tests/inspect-intro.mjs
node tests/inspect-intro.mjs --video
node tests/inspect-intro.mjs --performance
node tests/inspect-intro-dev.mjs
node tests/run-lighthouse.mjs --output=tests/artifacts/lighthouse-intro-worker
node tests/run-lighthouse.mjs --mobile-only --complete-intro --trace --output=tests/artifacts/lighthouse-complete-intro
```

Executar inspeção/Lighthouse separadamente de outras suítes de navegador. Os artefatos ficam em `tests/artifacts/`. Scores de Lighthouse, cadência RAF e heap medidos em emulação não equivalem a INP, FPS apresentado nem memória física de uma GPU de celular. Validação em aparelhos reais continua recomendada antes da publicação.

## Evidências de 20/09/2026

- 207 testes unitários aprovados: geometria, progresso, sessão, cleanup, qualidade, transições nativas e dados públicos profissionais.
- Suíte completa de navegador: **83/83 aprovados**, em 6,5 minutos. Relatório `tests/artifacts/playwright-report/index.html`. Após ajustar o nome acessível do link do CRN, os 24 testes de identidade e acessibilidade foram executados novamente e passaram; relatório separado `tests/artifacts/final-label-report/index.html`.
- A jornada real de reload, voltar/avançar e navegação entre serviços passou em três repetições após antecipar o observador de transições para o head. Relatório `tests/artifacts/playwright-history-guard-report/index.html`.
- Chrome instalado, Vite em desenvolvimento: duas montagens reais do efeito StrictMode, primeiro AbortSignal encerrado, uma única reserva `playing`, um canvas, conclusão `seen` e nenhum erro. Arquivo `tests/artifacts/intro/dev-strict-review.json`.
- Screenshots e sequência conferidos em 320, 375, 390, 430, 768, 1024, 1440 e 2560 px; correção adicional da cobertura ultrawide e espaçamento do símbolo em landscape. Artefatos `tests/artifacts/intro/`.
- Os testes E2E comparam PNGs reais da GPU nas poses desmontada/recomposta e a câmera confirmada por ACK, não apenas atributos solicitados pela timeline. Incluem skip durante inicialização, contexto perdido, storage bloqueado, nova aba com opener, assets lentos, resize, teclado e ausência de WebGL/Worker.
- Repetições de navegação e inicialização verificam que canvas/workers não se acumulam; no repouso, contadores de RAF/render param. Isso não substitui uma análise de memória de GPU em dispositivo físico.

### Performance medida

Lighthouse 13.5.0, build final de produção, mobile simulado, GPU por software, três amostras **incluindo a intro inteira e o handoff**. O runner espera 7500 ms após load/FCP para não terminar a coleta no meio da abertura; isso não altera a duração da animação:

| Métrica | Resultado |
| --- | --- |
| Performance | 89 / 86 / 81; mediana **86** |
| Acessibilidade / boas práticas / SEO | **100 / 100 / 100** nas três amostras |
| LCP | mediana **2,484 s**; faixa 2,416–2,498 s |
| CLS | mediana **0**; máximo 0,0017 |
| TBT | mediana **375 ms** |

Relatório final e traces: `tests/artifacts/lighthouse-complete-intro/summary-mobile.json`. A meta ideal de 90+ não foi atingida nessa medição integral. Não se removeu a sequência para elevar a nota.

As rodadas padrão anteriores estão preservadas: mediana 95 em `lighthouse-intro-final/summary-mobile.json`, 83 em `lighthouse-delivery/summary-mobile.json` e uma amostra 89 em `lighthouse-native-trace/summary-mobile.json`. A revisão dos filmstrips mostrou que algumas dessas coletas terminavam com a intro ainda aberta; elas não substituem o resultado integral acima. A rodada inicial na main thread tinha mediana 62, antes de transferir a preparação de iluminação para o worker. Desktop 96 e consulta mobile 99 são medições anteriores registradas em `lighthouse-intro-worker/summary.json`, não novas medições do build final.

Na análise do trace final, uma task de 75,764 ms consumiu somente 4,366 ms de CPU da thread; o callback de animação ocupou menos de 1 ms e o maior intervalo ocorreu antes do layout. Isso indica espera/desagendamento, mas não permite atribuir a causa especificamente à GPU. Não há evidência de PMREM ou renderização WebGL síncrona na main thread no caminho com worker. Os resultados de laboratório não prometem INP de campo nem fluidez em todo dispositivo.

No Chrome local sem encoder de vídeo, a última revisão do build final completou em **5,65 s no desktop e 4,79 s no mobile**, sem erros. A cadência mediana dos callbacks foi 16,7 ms, com p95 de 33,4 ms no desktop e 17 ms no mobile; o consumo observado da main thread durante a revisão foi de 1,17 s e 1,57 s, respectivamente. Os contadores de renderização pararam no repouso. Dados: `tests/artifacts/intro/performance-review.json`. Esses intervalos de callbacks não equivalem a FPS efetivamente apresentado pela GPU.

Com gravação de tela e GPU por software, a compilação pode demorar mais: a abertura usa o orçamento máximo de 6 s e continua pelo SVG se necessário. O vídeo não foi usado como medição de performance. O LCP mede o conteúdo atrás da cobertura; o tempo para liberação visual da intro é registrado separadamente, sem tratar os dois como equivalentes.

### Ajuste pontual de fluidez

- O mobile sem Worker/OffscreenCanvas preserva o desenho e o handoff SVG, sem compilar Three na thread principal. Inicialização e frame do worker têm deadlines menores no mobile; GPU lenta confirmada por ACK reduz o DPR. Apenas no mobile, um watchdog de frames libera a hero se a intro deixar de avançar por 1,1 s, além do deadline geral; o desktop conserva a sequência completa.
- O percurso SVG mobile agora segue a margem de leitura, com curvas locais; guias ainda não desenhadas ficam ocultas. A recomposição de 36 curvas só é gerada quando começa a aparecer. Resize que muda apenas a altura visual do navegador não recompõe toda a geometria.
- No desktop, a transição mantém o portal entre páginas sem redimensionar dois snapshots do símbolo, que causavam imagem borrada. A versão mobile da transição foi preservada.
- Lighthouse 13.5.0, build de produção, três amostras mobile com intro completa: Performance **85 / 89 / 86** (mediana **86**), LCP mediano **2,528 s**, CLS mediano **0**, TBT mediano **359 ms**; Acessibilidade, Boas práticas e SEO **100** nas três. Artefatos em `tests/artifacts/lighthouse-motion-efficiency/summary-mobile.json`. Medição simulada, não substitui teste em aparelho físico fraco.
