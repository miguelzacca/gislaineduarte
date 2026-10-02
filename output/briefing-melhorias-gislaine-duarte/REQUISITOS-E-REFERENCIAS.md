# Gislaine Duarte — requisitos de melhoria do painel e da entrega ao paciente

**Data de consolidação:** 2 de outubro de 2026.  
**Finalidade:** reunir os pedidos de evolução do sistema, os critérios de qualidade e as referências visuais fornecidas pelo solicitante.

Este documento é um briefing de requisitos. Não atribui status de implementação, aprovação, teste ou publicação a nenhuma funcionalidade. Os verbos “deve”, “permitir” e “apresentar” descrevem o resultado esperado.

O escopo reúne três frentes: **painel da nutricionista**, **avaliação e plano entregues ao paciente** e **produtos digitais de receitas**. As imagens são exemplos de conteúdo e de intenção visual; não são layouts para copiar literalmente nem prescrições para reproduzir sem avaliação profissional.

## 1. Direção geral do pedido

O sistema deve permitir que Gislaine conduza o atendimento e administre seus produtos com autonomia. Ela deve conseguir alterar o que usa no dia a dia pelo próprio painel, sem depender do desenvolvedor para mudar preço, fator, receita, orientação, modelo ou informação editorial.

A entrega ao paciente deve ter apresentação profissional, muito visual e fácil de entender. A exigência é elevar bastante a qualidade do PDF e do HTML, com fotografias reais, gráficos, representação corporal, hierarquia clara e leitura confortável.

Os pontos centrais são:

- Usar fotografias reais dos alimentos e das preparações, substituindo imagens de IA com deformações ou aparência artificial.
- Apresentar uma fotografia real de um prato montado e explicar visualmente os grupos alimentares.
- Mostrar a avaliação da pessoa, composição corporal, IMC, cálculos e metas de forma compreensível.
- Incluir substituições inteligentes com imagens e quantidades.
- Oferecer ao menos **60 modelos de plano alimentar**, personalizáveis e com refeições, imagens e calorias.
- Usar a integração NVIDIA NIM como assistência à nutricionista na análise e escolha de modelos.
- Incluir chás na anamnese, na biblioteca profissional e nas orientações selecionadas para o paciente.
- Ampliar o produto de sete receitas para um **Livro de receitas** e prever um produto específico de receitas para **GLP-1**.
- Entregar o conteúdo essencial nos dois formatos: **PDF e HTML**, sem empobrecer o HTML.
- Mostrar exemplos concretos do resultado, com arquivos e imagens de prévia, para avaliação da qualidade.

### 1.1 Correções de direção expressas nas mensagens posteriores

| Observação do solicitante | Requisito correspondente |
| --- | --- |
| Falta representação de gordura e uma figura humana que ajude a entender o corpo. | Incluir representação corporal contextualizada, composição e gráficos; não limitar a avaliação a números em texto. |
| A entrega precisa ser “o mais visual possível”. | Dar protagonismo a gráficos, fotografias, diagramas explicativos e blocos curtos. |
| O HTML contém menos informação que o PDF. | Garantir equivalência de conteúdo clínico e alimentar entre os dois formatos. |
| O PDF está difícil de ler, muito textual e sem hierarquia. | Redesenhar a organização editorial: tipografia, espaçamento, contraste, títulos, páginas e blocos visuais. |
| O prato deve ser uma imagem real, e não uma montagem visual desconexa. | Usar uma fotografia única de refeição pronta; uma colagem de ingredientes dentro de um círculo não atende ao pedido. |
| O resultado precisa incluir “substituições inteligentes”. | Criar uma seção explícita, visual e fácil de encontrar, além das opções dentro das refeições. |
| A URL continua mencionando sete receitas. | Usar endereço público compatível com Livro de receitas, sem quantidade fixa. |
| As fotos enviadas são “somente exemplo”. | Aproveitar os conteúdos e a intenção visual, preservando a identidade do projeto e melhorando a legibilidade. |

## 2. Painel da nutricionista

### 2.1 Fluxo principal de trabalho

O painel deve apoiar uma sequência simples: **receber anamnese → entender o caso → escolher uma base → personalizar → revisar os cálculos e a entrega → aprovar → disponibilizar ao paciente → acompanhar**.

Requisitos:

1. Reunir os dados da pessoa e os elementos necessários para elaborar o plano.
2. Mostrar objetivos, rotina, preferências e restrições durante a edição, sem exigir buscas repetidas em telas diferentes.
3. Permitir abrir a anamnese completa e voltar ao trabalho sem perder alterações.
4. Distinguir claramente rascunho, revisão, aprovação e entrega.
5. Facilitar a edição por uma profissional que não precisa conhecer código.
6. Oferecer uma prévia do que o paciente receberá, incluindo os dois formatos de entrega.
7. Facilitar o compartilhamento pelo WhatsApp, com mensagem e destino conferíveis pela profissional.

### 2.2 Autonomia de edição

| Área | O que a profissional deve poder alterar |
| --- | --- |
| Oferta de atendimento | Título, descrição, preço, condições, prazo e acompanhamento. |
| Planos comerciais | Valores e condições dos acompanhamentos, períodos e promoções. |
| Modelos alimentares | Criar, copiar, personalizar, salvar e reutilizar modelos próprios. |
| Semana do paciente | Dias, refeições, horários, alimentos, porções, medidas caseiras, alternativas e observações. |
| Avaliação | Medidas, dados necessários aos cálculos, método utilizado e interpretação destinada ao paciente. |
| Fatores e metas | Fatores aplicáveis, parâmetros, metas energéticas e nutricionais, hidratação e orientação do prato. |
| Conteúdo editorial | Receitas, fotografias, ingredientes, modo de preparo, textos e orientações. |
| Chás e conteúdos adicionais | Itens da biblioteca, imagens, preparo e orientações individualizadas. |
| Produtos digitais | Livro principal, coleção GLP-1, conteúdo de cada coleção, preço e disponibilidade. |
| Entrega | Resumo público, explicações, seleção de conteúdos e prévias dos arquivos. |

Alterar conteúdo ou preço pelo painel deve refletir na experiência correspondente e nos documentos gerados, sem exigir uma nova alteração manual de código para cada edição cotidiana.

### 2.3 Biblioteca de pelo menos 60 modelos

- Disponibilizar **no mínimo 60 modelos**, conforme o pedido explícito.
- Oferecer variedade real de refeições e preparações; trocar apenas o nome do modelo não é variedade suficiente.
- Apresentar objetivo, contexto de uso, imagens, refeições, porções e calorias, incluindo totais diários.
- Permitir pré-visualizar o modelo antes de aplicá-lo à pessoa.
- Sugerir opções compatíveis com a anamnese.
- Permitir pesquisar e filtrar modelos, incluindo combinações de objetivo e contexto.
- Permitir copiar um modelo e ajustar somente o necessário.
- Permitir salvar uma versão personalizada como base reutilizável, sem transportar dados pessoais de outro paciente.
- Tratar o modelo como ponto de partida para decisão profissional, sem transformar sua seleção em prescrição automática.

### 2.4 Editor do plano alimentar

- Editar os dias e as refeições de forma visual.
- Alterar alimentos, preparos, quantidades e alternativas.
- Mostrar fotografia, nome, gramas e medida caseira de forma inequívoca.
- Exibir energia e nutrientes por item, refeição e dia, com totais coerentes com as quantidades.
- Permitir adicionar, remover, copiar e reorganizar refeições e dias.
- Mostrar comparação da semana e das metas para facilitar a revisão.
- Preservar o contexto do paciente enquanto a profissional trabalha.
- Evitar perda de conteúdo durante navegação, salvamento, troca de modelo ou falha de uma assistência externa.

### 2.5 Assistência pela NVIDIA NIM

O pedido é aproveitar a integração NVIDIA já prevista no projeto para ajudar a profissional a analisar a anamnese, escolher uma base e personalizar o plano.

- Sugerir modelos a partir de objetivos, preferências e restrições.
- Apresentar uma síntese útil do caso e pontos que merecem conferência.
- Propor personalizações e variações comparáveis com o plano atual.
- Permitir aceitar, editar ou descartar as sugestões.
- Preservar a revisão profissional antes da entrega.
- Manter a montagem manual disponível mesmo quando a IA não puder responder.

**Delimitação:** o solicitante menciona a opção gratuita da NVIDIA. O briefing não promete gratuidade ilimitada nem fixa um modelo específico; a disponibilidade deve ser conferida na configuração e na conta utilizadas.

## 3. Anamnese e coleta inicial

### 3.1 Conteúdo esperado

A ficha enviada como referência deve orientar a abrangência do formulário, com organização mais legível e adequada ao celular.

- Identificação e contato.
- Objetivo da consulta e expectativas.
- Sintomas e percepção de bem-estar.
- Histórico de saúde e informações relevantes sobre medicamentos.
- Histórico familiar.
- Peso, altura e outras medidas pertinentes à avaliação.
- Histórico alimentar, frequência e horários das refeições.
- Preferências, aversões, alergias, intolerâncias e exclusões alimentares, apresentadas como informações distintas.
- Rotina, atividade física, sono e estresse.
- Consumo de água e outras bebidas.
- Funcionamento intestinal e digestão.
- Saúde hormonal e da mulher, quando aplicável.
- Hábitos e estilo de vida.
- Exames relatados, observações e metas da pessoa.

Os campos devem ser compreensíveis, ter unidades claras e permitir corrigir informações antes do envio. A seleção de condições como uso de GLP-1 ou “outra condição” deve permitir o detalhamento necessário.

### 3.2 Chás

- Perguntar se a pessoa já toma chá.
- Perguntar quais chás costuma consumir.
- Registrar se gosta, não gosta ou deseja incluir chás.
- Registrar preferências e itens que evita.
- Disponibilizar essas respostas no painel durante a personalização.
- Permitir que a nutricionista selecione um chá específico e acrescente sua orientação.
- Usar fotografias reais e identificação clara na biblioteca e na entrega.

**Fonte ainda a delimitar:** a conversa menciona uma lista de chás a ser enviada. Não tratar uma lista criada pelo sistema como se fosse a lista fornecida pela nutricionista.

### 3.3 Funcionamento intestinal

O pedido informal sobre avaliação das fezes deve ser traduzido em uma coleta clara e pertinente sobre funcionamento intestinal, frequência, consistência e sintomas. Uma seleção visual baseada na escala de Bristol é uma forma de atender a essa intenção, com linguagem definida pela profissional.

Não interpretar esse pedido como exigência literal de medir o tamanho das fezes, nem transformar uma escolha isolada em diagnóstico automático.

## 4. Avaliação clínica e antropometria

### 4.1 Informações e cálculos

O painel e o resultado destinado ao paciente devem permitir compreender **quais dados foram considerados, como os resultados foram obtidos e o que foi definido pela nutricionista**.

| Tema | Conteúdo esperado |
| --- | --- |
| Avaliação inicial | Identificação apropriada, idade, altura, peso e contexto individual. |
| IMC | Dados usados, cálculo, resultado, unidade e interpretação aplicável ao caso. |
| Energia | Estimativa em repouso/basal, fator utilizado, gasto energético total e distinção em relação à meta alimentar. |
| Antropometria | Medidas, circunferências, dobras quando utilizadas, data e método. |
| Composição corporal | Percentual de gordura, massa de gordura e massa livre de gordura quando houver dados adequados. |
| Metas | Energia, nutrientes e hidratação definidos pela profissional, com unidade e justificativa. |
| Memória de cálculo | Fórmula ou método, entradas, fatores, resultado e fonte. |
| Critério profissional | Explicação de por que o plano e suas adaptações foram escolhidos. |

O protocolo antropométrico enviado cita técnicas e equações. Ele deve servir como referência de abrangência do conteúdo, sem assumir que toda fórmula da imagem é correta ou aplicável a qualquer pessoa.

### 4.2 Representação visual do corpo

- Incluir uma figura humana/silhueta que ajude a contextualizar a avaliação.
- Representar visualmente gordura corporal e a composição disponível, em conjunto com os números.
- Usar gráficos legíveis, legendas claras e escalas compreensíveis.
- Destacar o resultado individual nas faixas ou referências pertinentes.
- Evitar uma avaliação composta apenas por tabelas densas e parágrafos.
- Usar representação respeitosa e informativa, sem caricatura depreciativa.
- Não apresentar uma silhueta ilustrativa como reconstrução exata do corpo da pessoa.

### 4.3 Coerência dos dados

Estes são critérios de rigor para concretizar a entrega pedida:

- Não inventar resultados quando faltarem medidas.
- Não estimar gordura corporal a partir de uma fotografia decorativa.
- Não chamar massa livre de gordura de massa muscular sem base para isso.
- Não afirmar que uma variação de peso equivale integralmente a gordura eliminada.
- Distinguir estimativa, medida registrada e meta escolhida pela profissional.
- Manter a explicação simplificada no corpo do documento e os detalhes de cálculo acessíveis, sem comprometer a leitura.

## 5. Resultado destinado ao paciente

### 5.1 Conteúdo essencial nos dois formatos

O **PDF e o HTML** devem contemplar o mesmo conteúdo clínico e alimentar aprovado. A organização pode variar para aproveitar cada formato, mas o HTML não deve ser uma versão reduzida do conteúdo do PDF.

Conteúdo esperado:

1. Apresentação e identificação do atendimento.
2. Avaliação inicial e contexto da pessoa.
3. Composição corporal e representação visual, quando houver dados.
4. IMC e interpretação.
5. Gasto energético, metas e hidratação.
6. Explicações e memória dos cálculos utilizados.
7. Orientações personalizadas.
8. Como montar o prato, com fotografia real e identificação dos grupos.
9. Refeições organizadas por dia e horário.
10. Fotografias dos alimentos, quantidades e medidas caseiras.
11. Calorias e nutrientes de forma clara.
12. Substituições inteligentes.
13. Conteúdos adicionais selecionados pela profissional, como receitas e chás.
14. Recursos de organização, como resumo semanal e lista de compras.
15. Autoria profissional e referências das informações e imagens utilizadas.

O acesso ao conteúdo não deve depender de ler um relatório inteiro em sequência. Sumário, links internos e organização por assuntos devem ajudar o paciente a encontrar o que precisa.

### 5.2 Como montar o prato

Este ponto é uma exigência visual central e foi reforçado na conversa.

- Mostrar **uma fotografia real de um prato com a refeição pronta**.
- Identificar visualmente proteínas, carboidratos/cereais/raízes e vegetais, conforme a orientação individual.
- Usar rótulos, setas, chamadas ou blocos próximos da fotografia para explicar os elementos.
- Apresentar os percentuais definidos para aquele plano de forma legível.
- Não substituir o prato por um gráfico de pizza abstrato.
- Não apresentar uma colagem de pequenas fotografias de ingredientes como se fosse um prato fotografado.
- Não usar imagem de IA ou alimento deformado para cumprir esse requisito.
- Diferenciar orientação de grupos alimentares de distribuição de macronutrientes.
- Manter coerência entre o que aparece na foto, a legenda e a orientação escrita.

**Fotografia de referência versus porção prescrita:** quando a imagem apenas demonstrar montagem, isso deve estar claro. Ela não deve sugerir que suas proporções visuais são a medida exata da porção individual. O pedido das imagens de exemplo não determina uma foto diferente para cada refeição; exige, no mínimo, que o guia do prato use uma refeição real reconhecível.

### 5.3 Substituições inteligentes

- Criar uma seção com esse nome ou identificação igualmente clara.
- Mostrar “opção do plano → alternativa” lado a lado.
- Usar fotografias reais e nomes fáceis de reconhecer.
- Informar a quantidade específica de cada opção, com gramas e medida caseira.
- Indicar a refeição ou situação em que a troca se aplica.
- Explicar que uma alternativa substitui a outra; não é um acréscimo automático à refeição.
- Preservar as restrições e a adequação individual.
- Destacar alguns exemplos sem obrigar o paciente a abrir inúmeros blocos para entender como usar as trocas.
- Disponibilizar também as demais alternativas aprovadas.
- Permitir que a profissional revise e personalize as comparações.

A tabela enviada pelo solicitante sugere uma linguagem direta de comparação. Ela não exige que as mesmas trocas genéricas sejam prescritas para todas as pessoas. Quantidades e equivalências precisam ser coerentes com o plano.

### 5.4 Qualidade editorial do PDF

- Design próprio, alinhado à identidade visual do projeto.
- Tipografia confortável, contraste adequado e tamanho de texto legível.
- Hierarquia visível entre título, subtítulo, resultado principal, explicação e detalhe técnico.
- Fotografias grandes o suficiente para serem úteis.
- Gráficos e elementos visuais que expliquem, em vez de apenas decorar.
- Espaçamento entre blocos e margens consistentes.
- Distribuição em páginas sem texto cortado, sobreposição, tabelas espremidas ou títulos isolados.
- Redução de parágrafos extensos na leitura principal.
- Fórmulas e conteúdo técnico completos em blocos de consulta, sem dominar todas as páginas.
- Sumário e navegação interna úteis.
- Boa leitura em tela e impressão.

Não há um número de páginas exigido. O critério é **completude com legibilidade**, sem condensar tudo em letras pequenas nem expandir o documento com repetição desnecessária.

### 5.5 Qualidade do HTML

- Preservar a mesma informação essencial do PDF.
- Adaptar o layout ao computador e ao celular.
- Oferecer navegação clara entre avaliação, metas, prato, dias, refeições e trocas.
- Manter os blocos essenciais visíveis e usar expansão para detalhes extensos.
- Exibir fotografias, gráficos, cálculos e porções com a mesma clareza do PDF.
- Nas trocas interativas, manter a seleção, os nutrientes, os totais e a lista de compras coerentes.
- Permitir guardar e consultar a entrega de forma prática.
- Se houver diário, registro de água ou marcação de refeições, explicar como o progresso é guardado e se há ou não envio para a profissional.
- Evitar que a interatividade esconda informações que precisam aparecer na impressão.

Funcionar offline, permitir cópia com progresso e oferecer diário são recursos complementares discutidos no contexto do produto. Devem ser tratados como requisitos de usabilidade e preservação do fluxo, sem confundi-los com a exigência explícita de equivalência entre PDF e HTML.

## 6. Fotografias e identidade visual

### 6.1 Fotografias dos alimentos

- Substituir imagens geradas por IA por fotografias reais.
- Evitar alimentos deformados, ambiguidades e erros visuais de preparo.
- Procurar correspondência entre a fotografia e o nome do alimento/preparação.
- Não usar uma foto de ingrediente cru como se demonstrasse exatamente um prato cozido; identificar o caráter de referência quando necessário.
- Usar imagens com qualidade, enquadramento e proporções consistentes.
- Preservar créditos e condições de uso das fotografias selecionadas.

O pedido de não usar IA se refere às imagens alimentares. Ele não elimina gráficos, ícones e silhuetas explicativas solicitados para a avaliação.

### 6.2 Design

- Seguir o sistema visual do projeto Gislaine Duarte.
- Usar a identidade de verde, marfim e dourado como orientação do contexto existente, com tipografia e espaçamento consistentes.
- Melhorar a leitura e a organização em relação aos exemplos enviados.
- Não copiar integralmente as artes, a diagramação dos screenshots ou as interfaces das redes sociais.
- Priorizar uma experiência de uso simples tanto para a profissional quanto para o paciente.

Algumas referências de receitas têm aparência publicitária ou possivelmente sintética. Elas servem para identificar a receita e a intenção editorial; não substituem a exigência de fotografias reais na entrega final.

## 7. Livro de receitas e produto GLP-1

### 7.1 Livro principal

- Usar o nome **Livro de receitas**, sem limitar o produto ao nome antigo de sete receitas.
- Incorporar as receitas adicionais enviadas pela profissional.
- Manter nome, descrição, páginas e downloads coerentes com a coleção ampliada.
- Usar uma URL pública sem a quantidade antiga, como `/livro-de-receitas`.
- Encaminhar links antigos para o endereço correspondente e preservar o acesso das compras existentes.
- Permitir administrar receitas, imagens, ingredientes, preparo e disponibilidade pelo painel.
- Gerar entregas PDF e HTML com boa organização e fotografias adequadas.

### 7.2 Produto específico de receitas para GLP-1

- Prever um produto/coleção específico e identificável, separado do livro geral.
- Permitir controlar conteúdo, título, descrição, preço e disponibilidade pelo painel.
- Usar o material que a profissional destinar a essa coleção.
- Preservar a distinção entre orientação nutricional individual e apresentação comercial de um livro.
- Não converter automaticamente todas as receitas enviadas em receitas GLP-1.

**Delimitação de fonte:** o pedido inicial anuncia que os materiais específicos de GLP-1 seriam fornecidos. As imagens anexadas devem ser classificadas pelo conteúdo efetivamente visível; a ausência de identificação explícita de GLP-1 não autoriza atribuí-las a essa coleção por suposição.

### 7.3 Tratamento editorial das receitas recebidas

- Transcrever e organizar ingredientes, quantidades e preparo com fidelidade à fonte.
- Associar as imagens de prato pronto à receita correta.
- Consolidar repetições do mesmo material.
- Sinalizar receitas que dependam de vídeo não fornecido ou estejam sem parte do preparo.
- Não inventar temperatura, tempo, quantidade ou etapa ausente e apresentar isso como transcrição.
- Conferir divergências entre unidade, volume e quantidade antes de publicar.
- Não transportar chamadas promocionais como “seca barriga”, “detox”, “anti-inflamatório” ou alegações semelhantes para orientação clínica sem revisão da profissional.
- Distinguir o que a imagem informa do que precisa de complementação editorial.

O catálogo de imagens ao final reúne as referências fornecidas, incluindo receitas repetidas e pares de “foto do prato + texto da receita”.

## 8. Valores e condições comerciais da referência

Os valores abaixo são **referências da arte enviada**, para uso como ponto de partida editável no painel. Não representam confirmação de oferta vigente.

| Oferta da imagem | Valor apresentado | Tratamento esperado |
| --- | --- | --- |
| Acompanhamento de 3 meses | R$ 299,00 por mês | Permitir editar preço, período e condições. |
| Acompanhamento de 6 meses | R$ 239,90 por mês; referência anterior de R$ 249,90 | Permitir editar promoção, preço anterior e condições sem alterar código. |
| Atendimento em dupla, plano de 3 meses | R$ 197 por pessoa | Permitir definir claramente a periodicidade e as condições; a arte não esclarece se o valor é mensal ou total. |
| Público da promoção em dupla | Familiares, com exemplos de mãe e filha ou casal | Permitir editar elegibilidade e apresentação. |

Separar os preços de acompanhamento dos preços de livros e de outros produtos digitais.

## 9. Referências visuais principais

As seis imagens abaixo são referências para **conteúdo, entendimento visual e expectativas de entrega**. As cópias devem acompanhar este documento. Não reutilizar os dados da pessoa do exemplo como dados de um novo paciente.

### 9.1 Avaliação inicial

**Observar:** identificação, idade, altura, peso, IMC, classificação, gasto energético e objetivos em uma composição fácil de reconhecer.  
**Exigir na evolução:** dados individuais, explicações e hierarquia melhor; substituir blocos excessivos de texto por recursos visuais pertinentes.  
**Não copiar automaticamente:** identidade da paciente, valores, metas de peso ou conclusões clínicas da arte.

[Abrir referência de avaliação inicial](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-001.jpg)

![Referência enviada de avaliação inicial](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-001.jpg)

### 9.2 Como montar seu prato

**Observar:** prato reconhecível, alimentos de verdade, nomes dos grupos e chamadas próximas da refeição.  
**Exigir na evolução:** fotografia real de refeição montada, identificação dos elementos e orientação individual, com leitura clara.  
**Não substituir por:** círculo com recortes de ingredientes, prato abstrato ou gráfico de pizza usado como imagem principal da refeição.

[Abrir referência do prato](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-002.jpg)

![Referência enviada de como montar o prato](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-002.jpg)

### 9.3 Substituições inteligentes

**Observar:** comparação direta entre uma opção e outra, título explícito e presença de alimentos na composição visual.  
**Exigir na evolução:** opções personalizadas com fotografias, quantidades, medida caseira e contexto da refeição.  
**Não copiar automaticamente:** uma lista genérica de trocas como prescrição universal ou equivalência nutricional exata.

[Abrir referência de substituições](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-003.jpg)

![Referência enviada de substituições inteligentes](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-003.jpg)

### 9.4 Protocolo de avaliação antropométrica

**Observar:** medidas, dobras, pontos anatômicos, composição corporal, gasto energético, ficha de registro e evolução.  
**Exigir na evolução:** suporte a esses temas no painel e explicação visual adequada ao paciente, com métodos e dados registrados.  
**Melhorar em relação à arte:** distribuir o conteúdo para evitar uma página excessivamente densa; manter cálculos e referências legíveis.

[Abrir referência antropométrica](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-060.jpg)

![Referência enviada de avaliação antropométrica](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-060.jpg)

### 9.5 Ficha de anamnese nutricional

**Observar:** abrangência dos temas de identificação, saúde, alimentação, líquidos, intestino, sono, atividade, exames e metas.  
**Exigir na evolução:** transformar essa abrangência em um formulário simples, organizado, legível e adequado a telas pequenas.  
**Não copiar literalmente:** a concentração de todos os campos em uma única arte com texto pequeno.

[Abrir referência da anamnese](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-061.jpg)

![Referência enviada de anamnese nutricional](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-061.jpg)

### 9.6 Acompanhamento, valores e identidade

**Observar:** retrato profissional, identidade da marca, apresentação do atendimento e ofertas de acompanhamento.  
**Exigir na evolução:** condições e valores controlados pela nutricionista no painel, com identidade consistente.  
**Não presumir:** periodicidade ausente, promoção permanente ou preço fixo que não possa ser editado.

[Abrir referência comercial](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-062.jpg)

![Referência enviada de acompanhamento e valores](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-062.jpg)

## 10. Critérios complementares para funcionamento coerente

Os itens desta seção desdobram os pedidos em cuidados de implementação e preservação do fluxo. Não são apresentados como citações literais do solicitante.

- Respeitar alergias, intolerâncias, preferências e exclusões ao aplicar modelos ou sugerir trocas.
- Manter textos livres de restrições disponíveis para conferência profissional.
- Separar resumo destinado ao paciente de prontuário e observações privadas.
- Não transportar dados pessoais ao salvar um modelo reutilizável.
- Preservar histórico e versões para evitar perda ou sobrescrita silenciosa de trabalho.
- Exigir nova revisão quando alterações relevantes mudarem o conteúdo destinado ao paciente.
- Proteger o acesso ao painel e às entregas de cada pessoa.
- Manter coerência entre oferta apresentada, pedido, preço e direito de acesso.
- Evitar que uma falha de IA, armazenamento ou geração de arquivo apague o trabalho salvo.
- Conferir direitos de uso e atribuição das fotografias finais.
- Não confundir fotos anexadas pelo paciente com imagens editoriais públicas.
- Manter o fluxo utilizável sem dependência obrigatória da IA.
- Preservar a stack Vite + React com JavaScript/JSX, conforme a instrução do projeto.

## 11. Revisão, demonstração e publicação

### 11.1 Três frentes de revisão

O pedido inicial exige pelo menos três revisões antes da publicação. A organização sugerida é:

1. **Conteúdo e cálculos:** conferir dados, fórmulas, unidades, porções, alternativas, restrições e equivalência PDF/HTML.
2. **Painel e jornada:** conferir anamnese, escolha de modelos, personalização, persistência, prévia, aprovação, acesso e compartilhamento.
3. **Qualidade visual:** conferir páginas do PDF, hierarquia, gráficos, fotografias, legibilidade, navegação e apresentação em telas adequadas.

As revisões devem procurar falhas reais, com verificações proporcionais às alterações. Não basta relatar que o código compila para demonstrar que a entrega está visualmente boa.

### 11.2 Exemplo para avaliação

- Produzir um exemplo fictício de paciente, identificado como demonstração.
- Mostrar a avaliação visual, figura corporal, cálculos, prato real e substituições.
- Disponibilizar PDF e HTML completos para consulta.
- Mostrar imagens de prévia das partes relevantes para facilitar a conferência.
- Registrar claramente eventuais diferenças ou limitações, sem declarar conformidade sem evidência.

### 11.3 Autonomia e comunicação

- Conduzir o trabalho autonomamente, sem interromper o solicitante com perguntas rotineiras.
- Usar o contexto e as referências disponíveis para decisões comuns de implementação.
- Ao final, explicar as decisões relevantes e as limitações efetivas.
- Usar agentes auxiliares quando ajudarem na revisão e na organização do trabalho.

### 11.4 Push, deploy e notificação

O histórico contém pedidos de push, deploy e aviso ao final. Para novas execuções, devem prevalecer as instruções atuais do projeto: **cada push ou deploy exige autorização explícita para aquela execução**. Um pedido para elaborar este briefing não é uma autorização de publicação.

Quando uma publicação for autorizada, revisar o resultado e comunicar o desfecho pelo canal permitido. O pedido inicial menciona preferência por notificação por e-mail, no chat ou no celular; registrar essa intenção não significa prometer um canal que não esteja configurado.

Os testes de navegador e scripts legados com Playwright não devem ser executados por iniciativa própria. Aplicar as regras do `AGENTS.md` e usar verificações diretamente relacionadas à mudança.

## 12. Lista de aceite para a revisão do produto

Os itens abaixo são perguntas de conferência, sem marcação de conclusão.

- [ ] A nutricionista consegue alterar fatores, valores, receitas, modelos e orientações sem pedir edição de código?
- [ ] A anamnese inclui hábitos de chá, funcionamento intestinal e os temas pertinentes das referências?
- [ ] As restrições permanecem claras durante a montagem do plano?
- [ ] Existem pelo menos 60 modelos com variedade real, imagens e calorias?
- [ ] É possível copiar, personalizar e reutilizar modelos sem carregar dados pessoais de outra pessoa?
- [ ] A assistência NVIDIA ajuda na seleção/personalização e permite revisão antes de aplicar?
- [ ] Avaliação e antropometria registram dados, métodos, fatores, resultados e unidades?
- [ ] O paciente entende a diferença entre medidas, estimativas e metas?
- [ ] A avaliação inclui representação humana e composição corporal visual quando houver dados?
- [ ] O prato aparece em uma fotografia real de refeição pronta?
- [ ] Os grupos do prato estão identificados e os percentuais têm significado claro?
- [ ] As fotografias alimentares são reais, reconhecíveis e coerentes com as legendas?
- [ ] As substituições estão destacadas, com imagens, quantidades e indicação de uso?
- [ ] O PDF tem hierarquia, espaçamento e leitura confortável, sem excesso de texto corrido?
- [ ] O HTML preserva o conteúdo essencial do PDF?
- [ ] As trocas interativas mantêm porções, totais e compras coerentes?
- [ ] A profissional consegue conferir os arquivos e preparar o compartilhamento com o paciente?
- [ ] O Livro de receitas utiliza nome e URL sem o limite antigo de sete receitas?
- [ ] O produto GLP-1 tem conteúdo e gestão próprios, sem classificação por suposição?
- [ ] Receitas incompletas ou divergentes são identificadas para revisão editorial?
- [ ] Os valores dos acompanhamentos e produtos são editáveis e apresentados com periodicidade clara?
- [ ] O exemplo fictício permite avaliar as partes visuais relevantes no PDF e no HTML?
- [ ] As três frentes de revisão têm evidências suficientes para avaliar o resultado?
- [ ] Toda publicação segue a autorização específica da execução e é comunicada com precisão?

## 13. Delimitações das referências

- As imagens de exemplo não determinam diagnóstico, conduta, metas universais ou resultados clínicos.
- A fotografia de uma mulher na avaliação não substitui uma representação calculada ou uma medida corporal.
- Os percentuais citados informalmente na conversa são exemplos; as proporções aplicáveis devem ser definidas pela profissional.
- A referência de R$ 197 por pessoa não esclarece periodicidade; não completar essa informação por suposição.
- Áudios e vídeos mencionados devem ser considerados somente se estiverem efetivamente disponíveis. A frase “passo a passo no vídeo” em um screenshot não fornece o preparo ausente.
- Uma lista de chás ou uma seleção específica para GLP-1 não deve ser atribuída à nutricionista sem a respectiva fonte.
- Recursos complementares detalhados neste briefing tornam a expectativa verificável; não constituem uma declaração de implementação.

## 14. Catálogo completo das imagens fornecidas

As referências abaixo acompanham o briefing em arquivos locais. As imagens repetidas são preservadas como evidências do material recebido, sem representar receitas adicionais. O catálogo identifica o assunto e a função de cada arquivo; as alegações presentes nas artes continuam sujeitas à revisão editorial e profissional.

**Acervo:** 62 arquivos vinculados, com 37 conteúdos distintos. As 25 repetições são identificadas abaixo. Não há, neste conjunto, uma imagem explicitamente identificada como coleção GLP-1 ou uma ficha específica de chá.

### 14.1 Entrega ao paciente

| Ref. | Imagem e assunto | Como utilizar a referência |
| --- | --- | --- |
| R001 | [Avaliação inicial, IMC e gasto energético](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-001.jpg) | Exemplo visual de organização da avaliação. Dados pessoais e conclusões clínicas do exemplo não devem ser transportados para outros pacientes. |
| R002 | [Como montar seu prato — refeição montada e grupos alimentares](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-002.jpg) | Referência principal para imagem de prato inteiro, identificação de verduras/legumes, proteínas e carboidratos e orientações curtas. |
| R003 | [Substituições inteligentes — troque isso por isso](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-003.jpg) | Referência principal para comparação lado a lado. As substituições do produto precisam corresponder às porções e restrições do paciente. |

### 14.2 Anamnese e avaliação profissional

| Ref. | Imagem e assunto | Como utilizar a referência |
| --- | --- | --- |
| R060 | [Protocolo completo de avaliação antropométrica](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-060.jpg) | Referência de dobras cutâneas, pontos anatômicos, fórmulas, ficha de medidas e fotos evolutivas. Validar protocolos e fórmulas antes de implementação. |
| R061 | [Ficha de anamnese nutricional](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-061.jpg) | Referência de identificação, objetivos, sintomas, histórico clínico e familiar, antropometria, rotina alimentar, líquidos, intestino, saúde da mulher, sono, atividade física, hábitos, exames e metas. |

### 14.3 Identidade e oferta comercial

| Ref. | Imagem e assunto | Como utilizar a referência |
| --- | --- | --- |
| R062 | [Acompanhamento nutricional personalizado — apresentação e planos](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-062.jpg) | Referência de marca, retrato, tipografia, cartões e apresentação do acompanhamento. Os preços e promoções da imagem são exemplos e não determinam a oferta vigente. |

### 14.4 Bebidas enviadas como referências de receitas

| Ref. | Imagem e assunto | Como utilizar a referência |
| --- | --- | --- |
| R005 | [Suco de laranja, cenoura, mamão e gengibre](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-005.jpg) | A imagem contém alegações de desintoxicação do fígado e imunidade; são texto da referência, não requisito clínico validado. |
| R006 | [Suco de couve, água de coco, limão e hortelã](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-006.jpg) | A imagem contém alegações de energia e desintoxicação; são texto da referência, não requisito clínico validado. |
| R007 | [Suco de laranja, mamão, ameixa, aveia e chia ou linhaça](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-007.jpg) | A imagem contém alegação de regular o intestino; a orientação deve passar por revisão profissional. |
| R009 | [Supercoffee caseiro — café, especiarias e óleo de coco](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-009.jpg) | Receita de bebida com café solúvel, canela, gengibre, pimenta-caiena e óleo de coco; não é chá. |

### 14.5 Receitas, imagens de preparações e instruções

| Ref. | Imagem e assunto | Como utilizar a referência |
| --- | --- | --- |
| R004 | [Chocolate caseiro e saudável — receita com identidade de Gislaine Duarte](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-004.jpg) | Referência de fotografia de receita, retrato profissional, ingredientes ilustrados, preparo numerado e marca. |
| R008 | [Bolo de cacau e nozes — ingredientes e preparo](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-008.jpg) | Título da referência declara zero açúcar e glúten; revisar a formulação e a nomenclatura antes de reutilizar. |
| R010 | [Banana com cobertura de chocolate — imagem da sobremesa](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-010.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R011 | [Banana com cobertura de chocolate — imagem da sobremesa, versão de clipboard](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-011.jpg) | Repetição da imagem R010. |
| R012 | [Banana com cobertura de chocolate — ingredientes e instruções](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-012.jpg) | O texto remete parte do preparo a um vídeo; a referência isolada não contém o passo a passo completo. |
| R013 | [Tortinha de frango com tapioca — ingredientes e preparo](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-013.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R014 | [Tortinha de frango — imagem da receita pronta](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-014.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R015 | [Carne moída assada sobre batatas — imagem da receita pronta](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-015.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R016 | [Carne moída assada com batatas — ingredientes, preparo e informação nutricional](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-016.jpg) | Valores nutricionais impressos pertencem à referência e precisam ser conferidos antes de reutilização. |
| R017 | [Maçã cozida — modo de preparo e observações digestivas](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-017.jpg) | A imagem contém recomendações sobre sintomas intestinais; não tratar como regra universal para pacientes. |
| R018 | [Maçã com canela, cravo e noz-moscada — ingredientes e imagem](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-018.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R019 | [Purê de mandioquinha com alecrim — ingredientes e preparo](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-019.jpg) | A referência contém alegações de ação antioxidante e melhora digestiva a revisar profissionalmente. |
| R020 | [Pão de aveia e iogurte](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-020.jpg) | Referência com ingredientes, fotografia e resumo de preparo; sem temperatura ou tempo de forno detalhados. |
| R021 | [Pão de amêndoa e sementes](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-021.jpg) | Referência com ingredientes, fotografia e resumo de preparo; sem temperatura ou tempo de forno detalhados. |
| R022 | [Pão de quinoa e chia](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-022.jpg) | Referência com ingredientes, fotografia e resumo de preparo; sem temperatura ou tempo de forno detalhados. |
| R023 | [Bolo de coco com três ingredientes](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-023.jpg) | Referência de ingredientes e foto; não apresenta modo de preparo completo. |
| R024 | [Pão australiano low carb e vegano — ingredientes e preparo](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-024.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R025 | [Pão australiano low carb e vegano — capa e imagem](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-025.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R026 | [Pão de fubá sem glúten — ingredientes e preparo](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-026.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R027 | [Pão de fubá — imagem da receita pronta](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-027.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R028 | [Tâmaras recheadas com nozes e chocolate branco — ingredientes e preparo](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-028.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R029 | [Tâmaras recheadas e banhadas em chocolate branco — imagem](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-029.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R030 | [Docinho de uva — ingredientes, preparo e imagem](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-030.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R031 | [Docinho de morango — ingredientes, preparo e imagem](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-031.jpg) | A referência usa a expressão sem açúcar; distinguir ausência de adição de açúcar dos açúcares naturais. |
| R032 | [Beijinho — ingredientes, preparo e imagem](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-032.jpg) | A referência usa a expressão zero açúcar; distinguir ausência de adição de açúcar dos açúcares naturais. |
| R033 | [Bolo de banana — imagem da receita pronta](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-033.jpg) | O título da referência usa sem açúcar e sem farinha; a receita correspondente contém aveia e deve ser descrita com precisão. |
| R034 | [Bolo de banana — ingredientes e preparo](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-034.jpg) | Contém aveia, banana e uvas-passas opcionais; revisar o título sem açúcar e sem farinha antes de reutilizar. |
| R035 | [Brigadeiro de banana — ingredientes, preparo e imagem](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-035.jpg) | Referência de conteúdo e apresentação da receita; conferir a correspondência entre ingredientes, preparo e fotografia. |
| R036 | [Banana com cobertura de chocolate — ingredientes e instruções, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-036.jpg) | O texto remete parte do preparo a um vídeo; a referência isolada não contém o passo a passo completo. Repetição da imagem R012. |
| R037 | [Tortinha de frango com tapioca — ingredientes e preparo, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-037.jpg) | Repetição da imagem R013. |
| R038 | [Tortinha de frango — imagem da receita pronta, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-038.jpg) | Repetição da imagem R014. |
| R039 | [Carne moída assada sobre batatas — imagem, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-039.jpg) | Repetição da imagem R015. |
| R040 | [Carne moída assada com batatas — ingredientes e preparo, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-040.jpg) | Valores nutricionais impressos pertencem à referência e precisam ser conferidos antes de reutilização. Repetição da imagem R016. |
| R041 | [Maçã cozida — preparo e observações digestivas, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-041.jpg) | A imagem contém recomendações sobre sintomas intestinais; não tratar como regra universal para pacientes. Repetição da imagem R017. |
| R042 | [Maçã com especiarias — ingredientes e imagem, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-042.jpg) | Repetição da imagem R018. |
| R043 | [Purê de mandioquinha com alecrim — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-043.jpg) | A referência contém alegações de ação antioxidante e melhora digestiva a revisar profissionalmente. Repetição da imagem R019. |
| R044 | [Pão de aveia e iogurte — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-044.jpg) | Referência com ingredientes, fotografia e resumo de preparo; sem temperatura ou tempo de forno detalhados. Repetição da imagem R020. |
| R045 | [Pão de amêndoa e sementes — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-045.jpg) | Referência com ingredientes, fotografia e resumo de preparo; sem temperatura ou tempo de forno detalhados. Repetição da imagem R021. |
| R046 | [Pão de quinoa e chia — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-046.jpg) | Referência com ingredientes, fotografia e resumo de preparo; sem temperatura ou tempo de forno detalhados. Repetição da imagem R022. |
| R047 | [Bolo de coco com três ingredientes — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-047.jpg) | Referência de ingredientes e foto; não apresenta modo de preparo completo. Repetição da imagem R023. |
| R048 | [Pão australiano low carb e vegano — ingredientes, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-048.jpg) | Repetição da imagem R024. |
| R049 | [Pão australiano low carb e vegano — imagem, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-049.jpg) | Repetição da imagem R025. |
| R050 | [Pão de fubá sem glúten — ingredientes e preparo, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-050.jpg) | Repetição da imagem R026. |
| R051 | [Pão de fubá — imagem, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-051.jpg) | Repetição da imagem R027. |
| R052 | [Tâmaras recheadas com nozes e chocolate branco — ingredientes, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-052.jpg) | Repetição da imagem R028. |
| R053 | [Tâmaras com chocolate branco — imagem, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-053.jpg) | Repetição da imagem R029. |
| R054 | [Docinho de uva — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-054.jpg) | Repetição da imagem R030. |
| R055 | [Docinho de morango — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-055.jpg) | A referência usa a expressão sem açúcar; distinguir ausência de adição de açúcar dos açúcares naturais. Repetição da imagem R031. |
| R056 | [Beijinho — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-056.jpg) | A referência usa a expressão zero açúcar; distinguir ausência de adição de açúcar dos açúcares naturais. Repetição da imagem R032. |
| R057 | [Bolo de banana — imagem, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-057.jpg) | O título da referência usa sem açúcar e sem farinha; a receita correspondente contém aveia e deve ser descrita com precisão. Repetição da imagem R033. |
| R058 | [Bolo de banana — ingredientes e preparo, arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-058.jpg) | Contém aveia, banana e uvas-passas opcionais; revisar o título sem açúcar e sem farinha antes de reutilizar. Repetição da imagem R034. |
| R059 | [Brigadeiro de banana — arquivo WhatsApp](C:/Users/Distritek/gislaineduarte/output/briefing-melhorias-gislaine-duarte/referencias/ref-059.jpg) | Repetição da imagem R035. |

### 14.6 Organização dos arquivos

- `referencias/`: cópias integrais das imagens fornecidas, sem alteração visual.
- `inventario-referencias.json`: identificação, origem, categoria, hash e duplicatas do acervo.
- No pacote ZIP, os links do Markdown apontam para a pasta `referencias` do próprio pacote. Extraia a pasta completa antes de abrir o documento.

As imagens são material de referência fornecido pelo solicitante. Sua inclusão neste briefing não autoriza a publicação das artes nem a reprodução automática de dados pessoais, alegações ou condutas clínicas.


