# Introdução — de dentro para fora

Rodada exclusivamente de introdução sobre Vite + React/JSX. Os quatro paths, a fotografia, a composição final da hero e o renderer são os mesmos do site. Conteúdo, dados profissionais, contato, serviços, URLs e metadados não foram reescritos.

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

O renderer usa `compileAsync` e fences assíncronos finitos. Em navegadores com OffscreenCanvas, preparação de iluminação, geometria e renderização ocorrem em um worker. O controlador principal envia no máximo um frame em voo e mantém apenas o último solicitado. Não há RAF no worker nem loop em repouso. O ACK só publica a cena após a GPU completar o frame; metadados distinguem o frame apresentado do progresso solicitado. Timeout, cancelamento e perda de contexto encerram o worker e mantêm o SVG.

O canvas da intro **não é duplicado**: ele se torna o canvas da hero. Ao pular ou terminar, a timeline/controle modal são encerrados; o renderer existente volta a operar sob demanda. Em navegação/unmount, a criação pendente é abortada e os recursos GPU são descartados. Sem OffscreenCanvas/Worker, o mesmo motor pode operar na thread principal, com orçamento de inicialização e fallback SVG; o custo pode ser maior nesse caminho de compatibilidade.

A regressão também cobre o cancelamento normal de transições nativas ao ocultar o documento de saída. A promise `ready` é tratada especificamente para cancelamento/timeout, sem esconder outros erros. Referência: [ciclo de vida MPA no Chrome](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document#the_pageswap_and_pagereveal_events).

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
- **Medium/mobile**: menos segmentos e pontos, DPR até 1,25, arco de câmera mais estável, dimensões/orientação medidas novamente.
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
node tests/run-lighthouse.mjs --output=tests/artifacts/lighthouse-intro-worker
```

Executar inspeção/Lighthouse separadamente de outras suítes de navegador. Os artefatos ficam em `tests/artifacts/`. Scores de Lighthouse, cadência RAF e heap medidos em emulação não equivalem a INP, FPS apresentado nem memória física de uma GPU de celular. Validação em aparelhos reais continua recomendada antes da publicação.
