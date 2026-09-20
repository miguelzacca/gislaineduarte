# Segunda direção de movimento — implementação e evidências

Vite + React, exclusivamente JavaScript/JSX. Camada integrada ao site existente; nenhuma migração, publicação ou mudança de informação profissional. A primeira rodada está registrada em `verification.md`; suas métricas não são métricas desta versão.

## Conceito implementado

Um único organismo nasce junto à fotografia, ganha espessura, abre quatro arranjos durante a leitura, acompanha a história, bifurca os atendimentos e se reúne antes da conversa final. O conteúdo continua em HTML pré-renderizado. O canvas é uma camada decorativa, não a página.

As skills de design e design-system orientaram a continuidade dos tokens, a composição por camadas e as regras de movimento. A direção foi consolidada em `motion-v2-bible.md`; a inspeção de React/lifecycle orientou o descarte e os testes de navegação. As decisões finais foram revistas pelo agente principal, não aceitas automaticamente.

## Mapa verificável das cenas

| Cena | Arquivos | Propriedade/acontecimento observável |
| --- | --- | --- |
| Nascimento | `components/MotionGraphics.jsx`, `motion/controller.js` | Quatro paths em construção, deslocamentos próprios, desenho e preenchimento por `--birth-progress`. Fotografia/fontes resolvidas alimentam progresso monotônico; deadline libera falha. Não há tela bloqueante ou porcentagem fictícia de bytes. |
| Hero | `components/Brand.jsx`, `styles/motion.css` | Máscara SVG utiliza o contorno real da polpa. Uma região permanente preserva o rosto; a abertura expande para a pessoa/mesa. Planos distintos ao redor da foto respondem ao primeiro scroll. |
| Desconstrução | `motion/model.js`, `motion/sculpture.js` | Centro e escala atravessam a página; `opening`, câmera e posições das quatro partes mudam do repouso para a abertura. |
| Percurso | `motion/vector-narrative.js` | Curvas cúbicas passam por seis portos medidos; dash/máscara desenham o percurso. O ponto acompanha uma posição real do viewport, com ida e volta determinísticas. H2 sticky, rostos, texto e CTAs têm zonas protegidas. |
| De dentro para fora | `styles/motion.css`, `motion/model.js`, `motion/sculpture.js` | Pin CSS sticky, sem interceptar wheel/touch. `focus=0..3` altera x/y/z, escala e rotação de cada parte: contorno, copa, equilíbrio, núcleo. Câmera perspectiva percorre um arco. |
| História | `motion/model.js`, `styles/motion.css` | O mesmo organismo deixa o pin e encontra a fotografia. Planos de papel, contorno e foto têm respostas diferentes; a pessoa não recebe shader nem deformação. |
| Serviços | `motion/sculpture.js`, `motion/vector-narrative.js`, `components/Pages.jsx` | `branch` organiza casca/folha à esquerda e polpa/semente à direita. Dois ramos chegam aos cards reais. Os paths dos cards se constroem conforme sua entrada; hover/foco alteram luz. |
| Rotas | `motion/transitions.js`, `styles/motion.css` | View Transitions multipágina, símbolo compartilhado e abertura espacial. Fallback com cobertura curta; modificadores, externos, hashes, histórico e URLs permanecem nativos. Reload não depende da transição. |
| FAQ/leitura | `motion/vector-narrative.js` | Traço em faixa lateral; áreas textuais protegidas. Nenhum material ou conteúdo editorial inexistente foi adicionado. |
| Recomposição | `motion/model.js`, `motion/vector-narrative.js` | `recompose` reúne as peças e faz morph de um contorno amostrado da casca em 36 pontos. Conclusão ocorre com o CTA ainda visível. O estado final não mantém loop. |
| Menu | `components/Layout.jsx`, `motion/transitions.js` | Máscara animada deriva da polpa original, não de um retângulo padrão. Paths, profundidade tipográfica e fechamento reverso; dialog, foco, Escape e scroll lock preservados. |

## Geometria, shader e ciclo de vida

`sculpture.js` interpreta os quatro paths editáveis de `src/lib/brand.js` com SVGLoader e cria ExtrudeGeometry chanfrada. Não há PNG encapsulado ou modelo genérico. As quatro peças têm pivôs próprios, materiais PBR, iluminação e câmera perspectiva de 42°. Os focos alteram a organização mesmo com câmera e abertura fixas.

`shaders.js` injeta uma superfície GLSL no material: campo de altura/noise faz revelação controlada; uma faixa luminosa e Fresnel evidenciam volume conforme progresso e foco. Um segundo shader desenha pontos originados dos contornos, sem distribuição aleatória a cada frame. A fotografia nunca é textura desses shaders.

O controlador central é o único dono de RAF. O renderer não tem RAF/listeners de scroll próprios; retorna primeiro frame válido antes de esconder o SVG. Observers invalidam medidas, os modelos calculam estado sem DOM e as escritas ocorrem juntas. Imports obsoletos são descartados por geração. Context loss retorna ao SVG; uma nova geração usa canvas novo. RAF, observers, eventos, geometrias, materiais, ambiente e contexto são liberados no cleanup/pagehide.

As duas máscaras da Journey são limitadas ao viewport, com viewBox e região de máscara em coordenadas documentais. Isso evita rasterizar uma superfície da altura da página durante cada atualização. O caminho completo continua existindo e mantém as âncoras reais.

## Modos

| Modo | Comportamento |
| --- | --- |
| Desktop capaz | Cena completa, DPR até 1,5, câmera e quatro poses, pin lateral. |
| Mobile capaz | WebGL preservado, DPR até 1,25, menos segmentos/pontos; arte sticky compacta e percurso próprio. Tela curta reduz a faixa; texto continua em fluxo. |
| Lite / sem WebGL | Mesmo percurso e quatro composições usando paths, projeção vetorial e máscaras; sem importar Three em saveData/ausência de contexto. |
| Movimento reduzido | Símbolo completo, foto íntegra, sem câmera/parallax/pin alongado. Menu, rotas e leitura imediatos. |
| Sem JavaScript | Conteúdo, foto, navegação alternativa, símbolos estáticos e links reais. Sem canvas obrigatório. |

## Reprodução

```sh
npm run check
npm run test:unit
npm test
npm run preview
# Com preview 4323 ativo, separadamente de outras suítes de navegador:
node tests/run-lighthouse.mjs
node tests/inspect-motion.mjs
node tests/inspect-motion.mjs --video
```

Em PowerShell, use `npm.cmd`/`npx.cmd` se necessário. `npm run dev` serve 4321; `?motionDebug=1` é exclusivo do desenvolvimento. Evidências locais ficam em `tests/artifacts/`; filmes e estados comparáveis em `tests/artifacts/motion-v2/`. Não enviar mensagens reais ao testar WhatsApp.

## Limites da verificação

Chromium local e emulação mobile não substituem aparelhos físicos. Cadência de callbacks RAF não prova FPS apresentado; heap JS não é toda a memória da GPU. TBT não é INP. Métricas de campo dependem de tráfego real após publicação. Nenhum selo ou premiação de design é reivindicado.
