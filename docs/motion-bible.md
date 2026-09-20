# Movimento: cuidado de dentro para fora

> Registro da v1. A direção e a implementação atuais estão em [motion-v2-bible.md](motion-v2-bible.md). Os módulos antigos citados abaixo foram substituídos por `src/motion/`.

O abacate fornecido em `icone.png` é a origem geométrica da linguagem. A casca, a folha com seu vinco, a polpa e a semente mantêm as proporções do desenho original. Os vazados são transparência real, não preenchimentos brancos. A fotografia permanece intacta; nenhum deslocamento de vértices ou shader atua sobre o rosto.

## Ritmo

| Uso | Duração | Curva | Limite |
| --- | --- | --- | --- |
| Estado rápido / saída de documento | 180 ms | `cubic-bezier(0.2, 0.7, 0.2, 1)` | sem atraso no foco |
| Hover / troca SVG–WebGL | 420 ms | mesma curva / ease | ponteiro limitado a 2,5 px por eixo |
| Menu | 550 ms | curva principal | foco aplicado imediatamente |
| Revelação de bloco | 850 ms | curva principal | deslocamento de 22 px |
| Composição inicial da marca | 450 ms por parte | curva principal | nunca adia conteúdo |
| Stagger da marca | 50 ms entre partes | herdada | somente quatro partes |

Tokens de duração e curvas ficam em `src/styles/tokens.css`; a abertura e os limites de interação ficam em `src/scripts/site.js`. O parallax da fotografia é limitado a 20 px no desktop e zero no celular. As entradas não alteram a ordem de leitura. Texto essencial existe integralmente no HTML estático. Não há animação contínua de respiração nem loop gratuito de partículas. O accordion usa a interação nativa de `details`, sem adiar a resposta.

## Percurso

1. A marca está presente desde o primeiro HTML; a abertura acompanha o carregamento real da fotografia e das fontes, sem porcentagem artificial.
2. A hero revela a pessoa e preserva texto, nome e ações legíveis antes de qualquer camada 3D.
3. A cena de abordagem traduz “de dentro para fora”: a semente ganha profundidade, a polpa a acompanha e a casca permanece como referência. A geometria nunca deixa de ser reconhecível.
4. A história recebe um ritmo mais quieto; os serviços recuperam a geometria da marca em pequenos detalhes editoriais.
5. Na conversão, o símbolo completo volta a ser assinatura e ponto de continuidade.

Nenhuma seção prende o scroll. O navegador continua responsável pela rolagem, pelas âncoras e pelo histórico. Hover e pointer são camadas decorativas; toque e teclado preservam todos os destinos.

## Escultura WebGL

`BrandScene` em `src/components/Brand.jsx` inclui SVG de fallback e uma camada para canvas, sem conteúdo ou ações exclusivos do canvas. `BrandMark` recebe `className`, `mono` e `outline` e renderiza SVG em JSX real. `src/styles/brand.css` concentra os estilos. O efeito React em `App.jsx` chama `initializeMotion`, que usa `initBrandScenes()` de `src/scripts/brand-scene.js` e devolve a limpeza. Também existe `initBrandScene(root)` para uma raiz.

A importação de Three.js e SVGLoader ocorre apenas quando a cena chega a 80 px do viewport, em largura de pelo menos 768 px, movimento normal, sem economia de dados, conexão acima de 2G e capacidade disponível de pelo menos 4 GB/4 threads quando informada. Falhas de contexto retornam ao SVG. O primeiro frame confirmado aciona `data-scene-ready="true"`; a troca de opacidade dura 420 ms. Não há bloqueio do LCP da hero.

A cena extruda os quatro paths reais da marca. Não há texturas transferidas, modelos externos, vídeos, pós-processamento ou sombras em tempo real. Um ambiente de estúdio é calculado uma única vez em 128 px para produzir reflexos sutis no dourado; a polpa mantém um acabamento sálvia fosco. Luzes fixas e a orientação discreta mostram a espessura dos contornos. A textura de ambiente e o gerador são descartados corretamente.

O progresso de passagem pelo viewport dirige uma separação pequena em profundidade, com retorno à forma ao sair. A rotação horizontal do ponteiro fica limitada a 0,11 radiano adicional, a vertical a 0,065. Nenhum giroscópio é solicitado. O canvas é decorativo e ignorado por tecnologias assistivas.

## Capacidade e ciclo de vida

- DPR máximo de 1,5; 1,25 em dispositivos com até 4 GB reportados.
- Um único `requestAnimationFrame` pendente por cena, requisitado por scroll, pointer ou resize. Não existe loop de renderização permanente.
- A saída do viewport e a ocultação da aba suspendem o desenho.
- Mudança para movimento reduzido, tela estreita ou economia de dados descarta o renderer e restaura o SVG.
- `ResizeObserver`, `IntersectionObserver`, eventos, geometrias, materiais, listas de renderização e contexto são descartados na limpeza.
- Contexto perdido não inicia tentativas repetidas nem afeta conteúdo, menu ou links.

## Movimento reduzido e celular

Com `prefers-reduced-motion`, a abertura é imediata, o SVG permanece estático e as transições decorativas são removidas. A mesma composição continua completa em telas estreitas sem download do WebGL. Parallax de fotografia no celular é zero. Não se depende de hover para descobrir conteúdo.

## Revisão

Conferir o ícone em fundo claro e escuro; ausência de fundo branco residual; ordem e proporção dos quatro paths; furos da folha/casca/polpa; transição entre SVG e primeiro frame; resize entre 767 e 768 px; toggle de movimento reduzido; perda de contexto; limpeza na navegação; ausência de frames ociosos. A avaliação visual do site e os testes de integração são registrados pelo agente principal.

Validação isolada em Chromium headless em 20/09/2026: desktop com WebGL produziu um canvas e primeiro frame confirmado; celular de 375 px, movimento reduzido, `saveData` e ausência forçada de WebGL mantiveram o SVG visível sem requisitar Three.js. Todos os modos tiveram zero erros de página/console e zero frames requisitados durante 800 ms de ociosidade. A limpeza removeu todo canvas. Alternar movimento reduzido durante a execução descartou a cena e restaurou sua criação ao voltar à preferência normal. O SVG rasterizado e a escultura foram inspecionados visualmente. ESLint passou nos três módulos de marca. Capturas headless podem emitir avisos do driver sobre `ReadPixels`; esses avisos não são erros da aplicação.

Referências de implementação: [SVGLoader](https://threejs.org/docs/pages/SVGLoader.html), [ExtrudeGeometry](https://threejs.org/docs/pages/ExtrudeGeometry.html) e [migração de ShapePath em r185](https://github.com/mrdoob/three.js/wiki/Migration-Guide#184--185).
