# Motion bible v2 — um organismo, uma jornada

Status: direção de movimento e critérios de verificação para a segunda rodada. Este documento não declara a implementação v2 aprovada. A baseline foi inspecionada em Chromium, no build de produção de `http://127.0.0.1:4323/`, em 20/09/2026. Não houve edição de conteúdo, dados ou aplicação nesta auditoria.

## 1. Diagnóstico com evidência

O problema da primeira versão não é falta de quantidade de efeitos. É a ausência de transformação espacial que conecte seus momentos.

| Observação em navegador | Consequência para a v2 |
| --- | --- |
| Em 1440 × 1000, a hero ocupa 831 px; o único canvas fica na abordagem, com caixa de aproximadamente 568 × 440 px, começando na coordenada documental y = 1344 px. | O organismo precisa nascer na hero e continuar identificável fora de uma única seção. |
| No início da abordagem, o canvas torna-se `ready`, mas os quatro pilares dividem espaço com uma escultura quase inteira. Após mais 620 px de scroll, a escultura é simplesmente recortada pelo header; a história entra com outra fotografia, sem passagem de bastão. | A saída do pin deve ser uma transformação e um transporte, não o desaparecimento do componente pela borda do viewport. |
| O único percurso vetorial tem comprimento aproximado de 2135 unidades e acompanha apenas a abordagem. | A linha deve encontrar história, os dois serviços e a recomposição final; comprimento desenhado não basta sem destinos visíveis. |
| Em 390 × 844, a hero tem 980 px e a abordagem 1609 px. A fotografia começa perto de y = 540 px. O símbolo da abordagem tem caixa de 350 × 330 px, mas já sai do campo de leitura antes dos pilares. | A composição mobile precisa reservar uma área menor e persistente para a arte durante os pilares, mantendo fotografia e texto protagonistas em seus momentos. |
| No celular, `canvas = 0` e nenhuma requisição a Three. O código exclui WebGL abaixo de 768 px, independentemente da capacidade. | Largura deve decidir composição e qualidade; não deve, sozinha, eliminar a camada 3D. |
| O contato final usa um fragmento grande da marca como fundo estático. | O visitante deve reconhecer a mesma geometria que se recompôs, em vez de apenas ver outra decoração. |

O menu mobile já tem boa hierarquia e destinos claros. Escape fechou o diálogo e devolveu foco ao botão; a largura de 390 px não apresentou overflow. Não apareceram erros de página nem `console.error`. O driver emitiu um aviso de precisão na compilação GLSL do Three; ele não deve ser descrito como erro funcional, nem ignorado como se a sessão tivesse console inteiramente vazio.

As capturas desta inspeção ficaram na pasta temporária do navegador, fora do repositório. A inspeção da abertura foi complementada pelo código: a baseline usa uma barra de 2 px, formação breve das partes e reveals por opacidade/deslocamento. Uma captura já estabilizada não demonstra o comportamento de loading.

## 2. Ideia única e limites

O cuidado começa em uma pessoa, ganha estrutura, olha para dentro, respeita diferenças e continua. A casca, a folha, a polpa e a semente originais são os quatro elementos dessa linguagem. Não representam órgãos, tratamentos ou resultados clínicos.

Uma única escultura percorre a página. Uma única trajetória vetorial explicita seu percurso. Fotografia, tipografia e navegação não disputam com elas: definem os pontos de chegada. O sistema deve funcionar em marcha reversa, em salto por âncora e após restauração do histórico.

- Preservar rigorosamente rosto, proporções, pixels e naturalidade da fotografia. Máscara revela; não deforma. Nenhum shader desloca o rosto.
- Manter intactos textos aprovados, serviços, contato, credenciais, pendências e metadados. Movimento não pode transformar uma metáfora em alegação de saúde.
- Nenhum wheel handler que altere a rolagem, bloqueio para terminar animação ou rolagem forçada para a próxima etapa.
- A pessoa deve conseguir ler cada pilar mesmo sem entender o movimento. Todos os quatro títulos e textos permanecem no DOM e no fluxo de leitura.
- O desenho original continua reconhecível. A semente dourada é referência; a casca e a folha não viram um conjunto indistinto de peças metálicas.

## 3. Gramática de tempo

Scroll não tem duração artificial: o estado vem de distância real no documento. Durações abaixo são para estados de interface e acabamento; não para atrasar o progresso do leitor.

| Categoria | Direção | Limite |
| --- | --- | --- |
| Hover, foco e pressão | 140–180 ms, `cubic-bezier(.2,.7,.2,1)` | Feedback imediato; deslocamento magnético até 3 px apenas com ponteiro fino. |
| Reorganização local | 320–480 ms, mesma curva | Quatro partes com stagger de 35–45 ms; evitar efeito de onda em todos os textos. |
| Passagem entre composições | Interpolação pelo scroll, `smoothstep` entre âncoras | Sem atraso acumulado. A posição final deve corresponder ao scroll atual. |
| Mudança entre os quatro focos | Peso interpolado entre vizinhos | Poses legíveis próximas de p = 0, 1/3, 2/3 e 1; evitar degraus abruptos. |
| Abertura do menu | 420–520 ms; saída 260–340 ms | Máscara reversível; foco e Escape nunca aguardam o fim. |
| Transição multipágina suportada | 220–360 ms | Não atrasar a requisição da página para encenar uma saída. |
| Troca de SVG por primeiro frame 3D | 100–160 ms | Só depois de render confirmado e com pose/posição equivalentes. |
| Preferência de movimento reduzido | Imediato; no máximo 100 ms de acabamento de estado | Sem transporte, parallax, pin alongado, varredura ou partícula. |

Não aplicar a mesma entrada de baixo para cima em cada seção. Revelação de texto é pontuação, não o enredo. Animações de máscaras de linhas devem conservar uma representação textual inteira para tecnologias assistivas e seleção/cópia normal.

## 4. Partitura por estado

Os nomes acompanham o modelo em integração em `src/motion/model.js`. Valores visuais abaixo são alvos de direção, a confirmar com a geometria projetada em tela, não limites em unidades arbitrárias do mundo Three.

| Estado | Composição e acontecimento observável | Resposta do percurso |
| --- | --- | --- |
| `birth` / entrada | As quatro partes constroem o símbolo no próprio espaço da hero. A formação termina na mesma pose usada pelo organismo, sem corte para uma segunda marca. A pessoa e o CTA já são identificáveis. | O contorno nasce a partir do vinco/haste real; nenhum círculo genérico de progresso substitui a marca. |
| `hero` | Símbolo em repouso vivo junto à fotografia, sem cobrir rosto, mãos ou notebook. Espessura e luz tornam a geometria real perceptível. Dimensão inicial sugerida: 160–230 px desktop; 88–120 px mobile, conforme a foto. | Um segmento curto fornece direção para o próximo momento. Não desenhar a página inteira antecipadamente. |
| `unfold` | O organismo deixa a hero e chega ao espaço da abordagem. Muda de escala, centro e profundidade; casca e miolo começam a se separar em x/y, além de z. | A curva acompanha a transferência; não deve haver duas esculturas com a mesma importância durante a troca. |
| `approach`, foco 0 | Ciência: organização precisa, planos legíveis e câmera em três quartos. A marca se abre em estrutura ordenada, com uma relação clara entre contorno e centro. | O primeiro ponto se encontra com o primeiro pilar. |
| `approach`, foco 1 | Olhar para dentro: a semente e a polpa tornam-se o centro da composição; a casca continua presente como referência. A separação em profundidade também produz mudança visível na silhueta frontal. | O percurso entra na região interna real do símbolo e alcança o segundo pilar. |
| `approach`, foco 2 | Individualidade: as quatro partes ocupam posições distintas, sem perder a família geométrica. Não é apenas a mesma escultura girada. | A linha desloca seu centro e encontra o terceiro pilar, sem passar por letras. |
| `approach`, foco 3 | Continuidade/autonomia: peças voltam a conversar e a estrutura começa a se fechar. Não completar a recomposição final antes da história e dos serviços. | Uma saída claramente direcionada conduz para a história. |
| `story` | A escultura sai do pin, reduz escala e acompanha a borda externa da fotografia. A leitura desacelera. A pessoa volta a ser o centro; o símbolo conserva presença, não vira cursor sobre o texto. | Trecho mais simples, que evidencia continuidade sem adicionar uma timeline biográfica inventada. |
| `services` | Duas famílias espaciais derivadas das quatro peças conduzem à consulta e aos ciclos. O organismo efetivamente bifurca; não apenas dois ícones iguais aparecem por fade. Os cards e seus links permanecem estáveis. | Um tronco dá origem a dois ramos com destinos nos dois serviços. Não criar um terceiro ramo/serviço. |
| Passagem pelo FAQ | Movimento mais contido e borda visual limpa para leitura. O símbolo pode ficar menor enquanto o leitor abre perguntas; não acompanhar cada accordion com um efeito concorrente. | Linha continua em faixa lateral, sem atravessar summaries, foco ou respostas expandidas. |
| `recompose` | Os dois caminhos retornam a uma única forma, alinhada com o desenho original. A recomposição termina enquanto o CTA ainda está no viewport; a forma final permanece legível. | Os ramos se reencontram. A linha termina no símbolo, não no meio de um parágrafo. |

### Intensidade mínima perceptível

Medir a arte projetada, não apenas valores numéricos de rotação:

- Entre pelo menos dois focos da abordagem, a distância projetada entre centros de duas partes deve mudar em pelo menos 20% da largura da escultura em repouso. Isso impede chamar um avanço quase invisível em z de decomposição marcante.
- Pelo menos três partes devem ganhar uma posição x/y distinta de repouso ao longo dos quatro focos. Uma curva seno aplicada igualmente ao conjunto não constitui quatro momentos.
- Reservar espaço para uma caixa explodida até aproximadamente 1,45 vez a caixa em repouso; ajustar amplitude à faixa livre, não sobrepor a leitura para cumprir a métrica.
- Deve haver ao menos duas transferências em que o centro do organismo percorra uma distância equivalente à própria largura. Hero → pin e pin → história/serviços são candidatas naturais.
- A câmera pode ter um arco expressivo na abordagem, mas sem deixar o símbolo permanentemente de perfil. A face e os vazados reais precisam ser reconhecíveis nas quatro poses de referência.
- Fresnel e varredura revelam volume; não substituem a transformação. Sem glow sobre a página, luz estourada, partículas permanentes ou reflexo que apague os vazados.

Esses mínimos são gates de revisão, não autorização para movimento agressivo. Se uma largura não comportar a pose, redesenhar a faixa visual ou usar a mesma composição em SVG — não invadir texto/rosto.

## 5. Mobile com a mesma ideia

Não existe uma versão mobile resumida a fades. Existem três níveis de expressão, todos com a mesma arquitetura de informação:

| Nível | Condição | Experiência |
| --- | --- | --- |
| 3D completo | Contexto válido, sem restrições, capacidade suficiente | Geometria integral, câmera e iluminação; DPR até 1,5. |
| 3D mobile | Tela estreita capaz, sem restrição explícita | Mesmo enredo, geometria simplificada, DPR até 1,25, menor densidade de partículas quando usadas. A largura isolada não bloqueia o import. |
| SVG narrativo | Sem WebGL, economia de dados, conexão muito limitada ou capacidade baixa | As quatro partes conservam transporte, foco e bifurcação em 2D. Não requisita Three. |
| Estático intencional | Movimento reduzido ou sem JavaScript | Foto completa, símbolo íntegro, texto e CTAs imediatos; sem altura artificial e sem pin decorativo. |

APIs de memória/conexão ausentes não significam dispositivo fraco. Sua leitura precisa ser defensiva. Uma detecção explícita de contexto indisponível escolhe SVG antes de baixar a biblioteca. Mudanças de preferência em runtime devem desmontar a cena e restaurar uma composição digna.

### Pin e composição pequena

- Desktop: a arte fica sticky em sua coluna; os quatro blocos textuais oferecem a distância real de leitura. O pin termina no fim da abordagem, sem outro mecanismo capturar rolagem.
- Mobile: arte sticky acima da zona de leitura, com altura inicial sugerida entre 140 e 200 px. Cabeçalho, arte e margem não devem consumir mais de aproximadamente 45% da altura útil de uma tela curta. Em 320 × 568, reduzir a arte ou abandonar o pin se isso não couber.
- O texto não deve passar atrás de uma superfície transparente repleta de peças. Delimitar a zona da arte e a zona de leitura.
- A altura da seção deriva de conteúdo, viewport e espaço necessário à composição. Não impor quatro telas vazias. Como alerta de revisão, a abordagem acima de três viewports no desktop ou 2,5 no celular exige justificativa de conteúdo; texto ampliado pode legitimamente ultrapassar esse alerta.
- Um pilar muito alto deve expandir o fluxo. Nunca usar `max-height` ou `overflow: hidden` para forçar a coreografia. Com zoom de 200%, viewport muito baixo ou distância insuficiente, preferir fluxo normal a pin quebrado.
- Uma mesma fase deve poder ser revisitada ao rolar para cima. O numeral/traço do pilar ativo pode mudar, mas o texto dos demais não deve desaparecer nem ficar com contraste insuficiente.
- A fotografia precisa continuar relevante na primeira tela de 375/390/430 px. Não comprimir o rosto para abrir espaço para a escultura. A mesa pode continuar na sequência abaixo da dobra.
- Sem hover obrigatório, giroscópio ou permissão nova. Parallax da fotografia: até 20 px desktop; até 6 px mobile capaz, apenas se o enquadramento permanecer seguro. Zero em reduced.

## 6. Abertura, foto e navegação

### Carregamento honesto

A construção do ícone acompanha estados reais dos recursos críticos — fotografia e fonte escolhida — sem esperar materiais abaixo da dobra. Não usar porcentagem que avance por relógio. Uma contagem de recursos resolvidos não deve ser apresentada como porcentagem de bytes transferidos.

O primeiro HTML já deve entregar nome, frase, CTA e imagem. A abertura não pode aplicar opacidade zero ao conteúdo principal. Se a máscara atuar sobre a foto, sua abertura inicial deve incluir integralmente o rosto e ampliar a revelação em direção à pessoa/mesa; uma falha de JS deve deixar a imagem inteira, não a máscara fechada.

Se tudo estiver pronto, terminar imediatamente; não inventar uma duração mínima. Uma pequena resolução visual pode ocorrer sem bloquear o conteúdo. Visita repetida: formação reduzida ou omitida. Falha ou timeout de recurso deve soltar a apresentação; o deadline de segurança sugerido é de até 1200 ms, sem transformar esse deadline em duração padrão.

### Menu

A máscara deriva do contorno da marca e revela um espaço editorial, não uma bolha aleatória. Os itens entram em 35–45 ms de stagger, com pequeno deslocamento de plano; o contato já tem um lugar fixo. A sequência fecha pelo mesmo gesto reverso.

`dialog` continua responsável pela modalidade. Abrir, focar, fechar por Escape, fechar por navegação e devolver foco não dependem de `animationend`. Cliques rápidos repetidos não criam dois diálogos, scroll travado ou estado intermediário persistente. Overlay e símbolo decorativo usam `pointer-events: none` quando apropriado e nunca cobrem o botão de fechar.

### Páginas internas

Usar transição multipágina nativa apenas onde suportada, com feature detection e navegação nativa como fallback. Não interceptar botão do meio, modificadores, download, destinos externos, hash local ou histórico para tocar uma animação. Nunca adicionar atraso de navegação para aguardar a saída.

O símbolo compartilhado liga a origem ao detalhe do serviço; a página seguinte tem sua própria composição de chegada, sem repetir uma introdução longa. Back/forward e reload interno restauram conteúdo, posição e foco adequadamente. Se o recurso de transição falhar, a nova página ainda deve aparecer, sem cobertura remanescente.

## 7. Contrato do motor e composição

O modelo puro calcula o estado a partir de layout medido e `scrollY`. O controlador central aplica esse estado ao Three e ao SVG. Nenhum dos renderizadores possui relógio de scroll independente.

1. Medir âncoras após fontes/layout inicial e invalidar medidas em resize, mudança de orientação, conteúdo expandido e alterações relevantes de layout.
2. Ler em lote, calcular estado sem DOM, escrever estilos/uniforms em lote. Não medir todas as seções depois de modificar transform a cada frame.
3. Agendar no máximo um RAF pendente para o controlador. Scroll, ponteiro, resize e conclusão de asset apenas invalidam. Sem frame novo se nada mudou.
4. Usar uma raiz de cena estável. Transportar por coordenadas da camada visual, não reparentear o canvas repetidamente nem criar um contexto por seção.
5. Converter as âncoras documentais em coordenadas de viewport de modo consistente, incluindo altura real do header e limites do sticky. Mudanças entre estados compartilham a mesma pose de fronteira.
6. Manter o canvas contido na caixa útil da composição quando possível. Não usar uma superfície WebGL da altura da página. Uma superfície de viewport inteira também exige DPR e área de desenho justificados em ultrawide.
7. Trocar SVG/Three na mesma posição, escala e organização das quatro partes. Canvas transparente, congelado ou não renderizado nunca autoriza esconder o fallback.
8. Pausar em aba oculta e quando a composição não estiver visível. Descartar geometria, materiais, texturas/ambiente, observers e listeners na limpeza. Context lost retorna ao SVG sem laço de retentativas.

O caminho SVG usa âncoras das seções e dos dois serviços; recalcula quando a geometria de layout muda. Deve ter contraste visual suficiente para ser percebido em captura normal e espessura coerente nos dois fundos. Uma linha branca/dourada extremamente opaca não precisa dominar: o teste é se seus destinos são identificáveis sem procurar a linha com zoom.

SVG, canvas e partículas não recebem foco nem eventos de ponteiro e ficam fora da árvore acessível. O caminho pode passar atrás de superfícies de conteúdo para preservar leitura, desde que sua continuidade de entrada/saída permaneça clara. Não atravessa rosto, texto, controles, safe areas ou outlines de foco.

## 8. Budgets para não trocar acabamento por custo

São metas da v2, ainda não verificadas. Aferir no build final e preservar resultados reais, inclusive resultados abaixo do alvo.

| Medida | Meta de revisão |
| --- | --- |
| JavaScript crítico transferido | Até aproximadamente 90 KB gzip; baseline React era cerca de 83,8 KB. |
| Pacote 3D progressivo total | Até aproximadamente 205 KB gzip; baseline era cerca de 189 KB. Sem framework 3D duplicado. |
| Transferência inicial mobile | Próxima de 290 KB ou menor, sem antecipar recursos não críticos sobre a fotografia. |
| LCP mobile, mediana de três execuções | Abaixo de 2,5 s. WebGL não pode se tornar condição para pintar foto/heading. |
| CLS | Abaixo de 0,1; alvo local abaixo de 0,02. Reservar dimensões de foto, máscara, canvas e pin. |
| Bloqueio de main thread em laboratório | TBT abaixo de 100 ms. Medir long tasks durante scroll/menu; não chamar TBT de INP. |
| Custo do controlador em scroll | Alvo p95 de até 4 ms de CPU por atualização; investigar tarefas acima de 50 ms. |
| Desenho | Um contexto; sem render contínuo ocioso; até 12 draw calls de cena como alvo. |
| Geometria | Alvo até 40 mil triângulos no completo e 14 mil no mobile; ajustar pelo perfil real. Sem texturas enormes, vídeo-textura ou pós-processamento multipass gratuito. |
| Ociosidade | Zero novos RAFs do motor em uma janela estável de 1 s, depois de finalizar a entrada. A mesma regra vale fora da viewport e com a aba oculta. |

Desempenho de animação deve ser observado em scroll real/filmado e perfilado; não inferir 60 fps apenas contando chamadas a RAF. O navegador headless e a emulação de CPU não substituem teste em hardware mobile. Caso esse hardware não esteja disponível, registrar a limitação.

Referência histórica, não resultado da v2: a última baseline em 4323 teve Lighthouse mobile mediano 98, LCP 2336 ms, CLS 0,00167 e TBT 18 ms; desktop 100. A v2 precisa de nova medição. Não reaproveitar esse número na entrega como se medisse a nova cena.

## 9. Verificação que pode reprovar a versão

### Prova visual obrigatória

Criar uma folha comparativa ou conjunto de capturas com o mesmo viewport e pontos de scroll derivados das âncoras: hero; chegada ao pin; quatro focos; saída do pin/história; bifurcação; símbolo final recomposto. Repetir em 1440 × 1000 e 390 × 844. Complementar com gravação contínua de scroll para observar continuidade e direção reversa.

Reprovar como ainda insuficiente se ocorrer qualquer uma destas condições:

- Os quatro focos diferem apenas na opacidade do texto ou na rotação muito pequena do mesmo objeto.
- O canvas continua visualmente restrito à abordagem, mesmo que seu elemento tenha sido movido para uma raiz global.
- A saída do pin corta a escultura e a seção seguinte faz aparecer uma marca independente sem continuidade perceptível.
- O mobile capaz não baixa/usa a camada 3D por causa da largura, ou o fallback SVG perde a mesma decomposição e bifurcação.
- Os dois serviços não recebem ramos visualmente reconhecíveis; um path de grande comprimento sem relação com os cards não cumpre o requisito.
- A recomposição acontece depois que a chamada final já saiu da tela, ou termina em uma forma irreconhecível/recortada.
- A abertura continua sendo apenas a barra anterior e quatro fades, sem continuidade entre formação e hero.
- A fotografia perde protagonismo, o rosto fica escondido no primeiro estado, ou a arte toca texto/CTA/foco para produzir impacto.

Critérios funcionais e acessíveis também reprovam, independentemente de beleza: qualquer overflow, conteúdo inacessível, scroll preso, âncora incorreta, menu sem Escape/retorno de foco, canvas bloqueando clique, ausência de fallback, warning de hidratação, erro inesperado de rede/página ou regressão de indexabilidade.

### Matriz mínima

- Larguras: 320, 375, 390, 430, 768, 1024, 1440, 1920 e 2560 px. Acrescentar 320 × 568 para altura curta, orientação horizontal e zoom 200%.
- Modos: normal capaz, WebGL ausente, contexto perdido, saveData, movimento reduzido antes de abrir e alternado em runtime, sem JavaScript.
- Navegação: mouse, touch, teclado, âncora direta, reload em rota interna, back/forward, menu durante o pin, FAQ expandido antes de medir a trajetória.
- Conteúdo: todos os quatro pilares legíveis, foto com enquadramento íntegro, todos os Saiba mais, orçamento com contato oficial; nunca enviar mensagem real como parte dos testes.
- Carregamento: cache frio, cache quente, foto falhando, import 3D falhando, fontes lentas. O CTA não espera e a cobertura sempre libera.

### Testes do modelo e observabilidade

Na próxima etapa, ampliar testes sem acoplar à implementação interna de shaders:

- `sampleMotion`: saídas finitas, extremos, progressos clampados, reversibilidade, poses contínuas nos limites, resize e layouts curtos/sem pin.
- Quatro focos: amostras p = 0, 1/3, 2/3, 1 devem produzir poses projetadas/materialmente distintas; não apenas um contador diferente.
- `selectQuality`: mobile capaz permite 3D; reduced/saveData/contexto inválido escolhem fallback; APIs opcionais ausentes não quebram inicialização.
- `scene`, modo, primeiro frame e foco podem ficar em atributos de diagnóstico estáveis. Não anunciar cada frame por `aria-live` nem expor dados pessoais novos.
- E2E deve comparar transformação/posição e pixels úteis do canvas em etapas distintas. `canvas.count() === 1` sozinho não prova uma cena funcional.
- Medir imports por modo, número de contextos, RAF ocioso e limpeza. Verificar que o SVG permanece visível até o primeiro frame e volta em falha.
- Manter os 46 E2E e 20 unitários anteriores como base; acrescentar contratos após integração. Lighthouse somente depois de correções funcionais e sem execução concorrente de outras suítes de navegador.

## Decisão de direção

A aposta de um canvas transportado, um pin nativo com quatro focos e uma linha bifurcada é adequada. Ela merece ser aprovada apenas se alterar a relação espacial entre as seções e oferecer a mesma ideia no celular. A ambição deve estar na organização visível das partes, nas transferências e no reencontro final; fades continuam existindo, mas deixam de ser o acontecimento principal.
