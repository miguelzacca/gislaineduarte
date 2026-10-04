/** Conteúdo integral exclusivo da entrega adquirida. Nunca importar no bundle público. */
export const glpGuide = {
  edition: '1ª edição · outubro de 2026',
  title: 'À mesa com GLP-1',
  subtitle: 'Comer, beber e cuidar da rotina durante o tratamento',
  notice: 'Material educativo para adultos em acompanhamento médico e nutricional. As estratégias podem ajudar na tolerância alimentar, mas não tratam nem eliminam efeitos adversos. Não altere medicamentos por conta própria. Porções culinárias não são uma prescrição individual.',
  chapters: [
    {
      id: 'boas-vindas', kicker: '01 · Comece por aqui', title: 'Uma mesa possível, no seu ritmo',
      intro: 'Quando o apetite muda, cozinhar e escolher o que beber também podem pedir ajustes. Este livro reúne possibilidades para você conversar com sua equipe e organizar a alimentação com mais clareza.',
      sections: [
        { title: 'Para quem este livro foi pensado', paragraphs: ['Adultos que utilizam medicamentos com ação em GLP-1, incluindo os de ação dupla em GIP/GLP-1, sob prescrição e acompanhamento. Pessoas com diabetes também precisam seguir seu plano de glicemia e de medicamentos.'] },
        { title: 'Como aproveitar a coleção', bullets: ['Leia os cuidados e sinais de alerta antes de escolher receitas por desconforto.', 'Escolha duas ou três preparações para começar. A quantidade indicada é o rendimento da cozinha; sua porção será individual.', 'Teste uma mudança por vez e leve suas observações à consulta.', 'Use a versão digital para favoritar, acompanhar etapas e montar a lista de compras. O PDF pode ficar salvo no celular.'] },
        { title: 'Quando é necessário personalizar', paragraphs: ['Gestação, amamentação, idade inferior a 18 anos, doença renal, restrição de líquidos, alergias, transtornos alimentares e problemas importantes de esvaziamento gástrico exigem orientação específica. Este livro não define conduta para essas situações.', 'As receitas são propostas editoriais. Tempos e rendimentos são aproximados e dependem dos ingredientes e equipamentos. As imagens foram geradas com IA e ilustram sugestões de apresentação; não comprovam teste em cozinha.'] },
      ], sourceIds: ['niddk-medicamentos'],
    },
    {
      id: 'como-funciona', kicker: '02 · Entenda o tratamento', title: 'O que GLP-1 tem a ver com a alimentação?',
      intro: 'GLP-1 é um hormônio envolvido na resposta do corpo às refeições. Alguns medicamentos reproduzem sua ação; a tirzepatida atua também em GIP.',
      sections: [
        { title: 'O apetite e a digestão podem mudar', paragraphs: ['Esses medicamentos podem reduzir o apetite, aumentar a saciedade e retardar o esvaziamento do estômago. Também participam do controle da glicose. A intensidade dessas mudanças varia entre pessoas e medicamentos.'] },
        { title: 'Mais saciedade não significa nutrição suficiente', paragraphs: ['Sentir menos fome pode facilitar mudanças na rotina, mas também dificultar uma ingestão adequada. A alimentação continua precisando de energia, proteína, vitaminas, minerais e líquidos. Refeições repetidamente insuficientes merecem avaliação.'] },
        { title: 'A equipe decide o tratamento', bullets: ['Náusea, vômito, diarreia, constipação e desconforto abdominal podem ocorrer.', 'Conte à equipe quando um sintoma interfere em comer, beber ou trabalhar.', 'Doses, pausas, trocas e medicamentos para sintomas dependem do prescritor. O livro não fornece esquemas de uso.'] },
      ], sourceIds: ['niddk-medicamentos', 'leeds-glp', 'advisory-nutricao'],
    },
    {
      id: 'base-alimentar', kicker: '03 · A base da rotina', title: 'Comer menos volume, continuar se nutrindo',
      intro: 'O ponto de partida é encontrar uma quantidade e uma textura que você tolere, mantendo variedade ao longo do dia.',
      sections: [
        { title: 'Construa uma refeição que sustenta', bullets: ['Inclua um alimento com proteína: ovos, peixe, frango, leite ou iogurte, tofu e leguminosas são possibilidades.', 'Combine com arroz, aveia, milho, batata ou outro alimento que forneça energia.', 'Acrescente frutas e hortaliças na textura tolerada. Cozinhar e picar pode facilitar o preparo.', 'Use pequenas quantidades de gordura no cozimento; refeições muito gordurosas podem piorar desconfortos.'] },
        { title: 'Proteína e força precisam de um plano', paragraphs: ['A necessidade de proteína depende da situação clínica, do peso de referência e do plano alimentar. O livro não estabelece uma meta universal. Preservar a função muscular envolve também atividade de força adequada às suas condições, com orientação quando necessária.'] },
        { title: 'Organize oportunidades de comer', paragraphs: ['Coma devagar e interrompa ao perceber saciedade confortável. Se o volume de uma refeição fica difícil, converse sobre distribuir a alimentação em momentos menores. Evite transformar a falta de fome em longos períodos sem se alimentar.', 'Se você usa insulina ou medicamentos que podem causar hipoglicemia, siga o plano combinado para refeições, monitoramento e episódios de glicose baixa.'] },
      ], sourceIds: ['advisory-nutricao', 'leeds-glp', 'niddk-hipoglicemia'],
    },
    {
      id: 'nausea', kicker: '04 · Tolerância alimentar', title: 'Quando aparece náusea ou saciedade precoce',
      intro: 'Uma adaptação de volume, aroma ou temperatura pode ser útil. Nenhuma receita garante alívio, e náusea persistente precisa ser comunicada.',
      sections: [
        { title: 'Possibilidades para experimentar', bullets: ['Sirva menos de cada vez, mastigue com calma e faça uma pausa ao sentir conforto.', 'Prefira preparações simples; evite frituras e aromas que você identifica como incômodos.', 'Experimente a temperatura que tolera melhor: morna, ambiente ou fria.', 'Beba em pequenos goles ao longo do dia; se grandes volumes junto da comida incomodam, distribua em outros momentos.'] },
        { title: 'Escolhas dentro do livro', paragraphs: ['Mingau de banana e aveia, canja e purê com peixe oferecem opções de textura macia. Se laticínios, fibras ou qualquer ingrediente piorarem o desconforto, escolha outra preparação e registre o que aconteceu. Não é necessário forçar um prato por ele ser apresentado como uma opção.'] },
        { title: 'O limite do cuidado em casa', paragraphs: ['Vômitos repetidos, dificuldade para manter líquidos ou piora importante exigem avaliação. Dor abdominal forte ou persistente não deve ser atribuída automaticamente à adaptação ao medicamento. Consulte o quadro de sinais de alerta.'] },
      ], sourceIds: ['consenso-gi', 'nhs-diarreia', 'anvisa-pancreatite'],
    },
    {
      id: 'refluxo', kicker: '05 · Tolerância alimentar', title: 'Azia, refluxo e sensação de estômago cheio',
      intro: 'Observe o horário, o volume e os alimentos associados ao seu desconforto. A resposta a cada ingrediente é individual.',
      sections: [
        { title: 'Ajustes de rotina', bullets: ['Evite deitar logo após comer. Para sintomas noturnos, terminar a refeição pelo menos três horas antes de deitar pode ajudar.', 'Teste volumes menores e preparações com menos gordura.', 'Café, bebidas alcoólicas, chocolate, hortelã, alimentos ácidos e muito picantes podem ser gatilhos em algumas pessoas.'] },
        { title: 'Faça uma troca por vez', paragraphs: ['Uma bebida de banana sem cacau pode ser uma alternativa quando o chocolate incomoda. Água simples pode substituir uma bebida ácida. O objetivo é reconhecer tolerância, sem proibir grupos inteiros desnecessariamente.', 'Sintomas frequentes, dor ao engolir ou prejuízo importante à alimentação precisam de avaliação. Evite usar antiácidos de forma repetida sem orientação.'] },
      ], sourceIds: ['niddk-refluxo'],
    },
    {
      id: 'intestino', kicker: '06 · Tolerância alimentar', title: 'Constipação e diarreia pedem ajustes diferentes',
      intro: 'Primeiro observe o padrão, a duração e a intensidade. Uma dieta usada para um sintoma pode não ser a melhor escolha para o outro.',
      sections: [
        { title: 'Quando o intestino fica preso', paragraphs: ['Aumente fibras gradualmente, conforme tolerância, junto da hidratação orientada. Frutas, aveia, legumes e leguminosas ajudam a ampliar a variedade. Movimento possível e uma rotina para ir ao banheiro também podem fazer parte do cuidado.', 'Iogurte com kiwi, lentilha e pudim de chia são opções para o repertório habitual, sem garantia de efeito laxativo. Chia deve estar completamente hidratada. Não faça uma grande carga de fibras se houver dor, distensão importante ou dificuldade de esvaziamento gástrico.'] },
        { title: 'Quando há diarreia', paragraphs: ['Priorize a reposição de líquidos e o contato com a equipe quando necessário. Grandes quantidades de sucos, bebidas muito açucaradas, gordura e produtos com polióis podem piorar a tolerância. Observe se laticínios incomodam temporariamente.', 'Arroz macio, canja e batata podem compor escolhas temporárias. Volte à variedade de acordo com a melhora e a orientação recebida; não mantenha uma dieta muito restrita por conta própria.'] },
        { title: 'Reidratação não é uma receita de bebida', paragraphs: ['Solução de reidratação oral deve ser preparada exatamente conforme a embalagem ou orientação profissional. Água de coco, isotônicos, sucos e as bebidas deste livro não a substituem quando ela é indicada. Não improvise concentrações de sal e açúcar.'] },
      ], sourceIds: ['niddk-constipacao', 'consenso-gi', 'nhs-diarreia', 'nhs-hidratacao'],
    },
    {
      id: 'bebidas', kicker: '07 · Além do prato', title: 'Hidratação e bebidas com intenção',
      intro: 'Nem toda bebida tem a mesma função. Separe hidratação, um lanche líquido e a reposição indicada por um profissional.',
      sections: [
        { title: 'Uma rotina de pequenos goles', paragraphs: ['Deixe água acessível e distribua a ingestão ao longo do dia. A meta depende do contexto, especialmente em doença renal, cardíaca ou restrição de líquidos. Não existe uma quantidade obrigatória adequada a todos.', 'Urina mais escura, redução da urina, boca seca e tontura podem acompanhar desidratação. Incapacidade de manter líquidos ou sinais importantes exigem assistência.'] },
        { title: 'Como escolher as oito bebidas', bullets: ['Águas aromatizadas: uma opção de sabor, sem efeito detox ou promessa de tratamento.', 'Bebidas de fruta com leite, iogurte ou tofu: um lanche líquido. Contêm nutrientes e açúcares naturais; não substituem automaticamente refeições.', 'Infusão suave: uma bebida para variar. Não equivale a extratos, suplementos ou remédios contra náusea.', 'As preparações são sem adição de açúcar na fórmula; isso não significa ausência de açúcar ou carboidrato.'] },
        { title: 'Cuidados que fazem diferença', paragraphs: ['Evite bebidas alcoólicas como estratégia para relaxar ou aliviar sintomas. Se gás, cafeína ou acidez pioram sua tolerância, escolha outra opção. Não acrescente laxantes, ervas concentradas ou suplementos à receita sem conversar com sua equipe.'] },
      ], sourceIds: ['nhs-hidratacao', 'niddk-refluxo', 'consenso-gi'],
    },
    {
      id: 'alertas', kicker: '08 · Cuidado essencial', title: 'Quando procurar ajuda',
      intro: 'O livro apoia escolhas alimentares. Sintomas importantes podem ter outras causas e precisam de avaliação médica.',
      sections: [
        { title: 'Procure atendimento com urgência', bullets: ['Dor abdominal forte e persistente, especialmente se alcança as costas, com ou sem vômitos.', 'Vômitos repetidos ou incapacidade de manter líquidos; redução importante da urina, desmaio ou confusão.', 'Sangue no vômito ou nas fezes, falta de ar ou inchaço de rosto, língua ou garganta.', 'Distensão abdominal importante com dor, vômitos e dificuldade de eliminar gases ou fezes.'] },
        { title: 'Converse com a equipe sem adiar', bullets: ['Sintomas que prejudicam a alimentação, a hidratação ou as atividades diárias.', 'Ingestão muito baixa por vários dias, fraqueza crescente ou mudanças de peso além do esperado no seu plano.', 'Episódios ou suspeita de hipoglicemia, especialmente no uso de insulina ou sulfonilureias. Siga o plano individual para episódios.'] },
        { title: 'Informe antes de procedimentos', paragraphs: ['Avise a equipe de anestesia ou sedação sobre o medicamento e a última dose. Ela define os cuidados necessários; este livro não orienta suspensão ou jejum para procedimentos.', 'Em uma emergência no Brasil, procure o serviço de urgência ou acione o SAMU pelo 192. Leve a lista de medicamentos e informe quando os sintomas começaram.'] },
      ], sourceIds: ['anvisa-pancreatite', 'nhs-diarreia', 'nhs-hidratacao', 'niddk-hipoglicemia', 'anvisa-anestesia', 'samu'],
    },
    {
      id: 'cozinha', kicker: '09 · Cozinha organizada', title: 'Prepare com segurança, guarde com cuidado',
      intro: 'Organização reduz o trabalho nos dias em que cozinhar parece mais difícil. Escolha pequenos lotes e porcione assim que terminar.',
      sections: [
        { title: 'Antes de começar', bullets: ['Lave as mãos, higienize alimentos conforme as instruções do produto sanitizante adequado e use água potável.', 'Separe utensílios de carnes cruas e alimentos prontos. Não lave frango cru, para evitar respingos.', 'Use leite e derivados pasteurizados. Verifique validade e condições de conservação.', 'Leia rótulos e considere contaminação cruzada; sem lactose não significa seguro para alergia ao leite.'] },
        { title: 'Cozinhe e refrigere de verdade', paragraphs: ['Frango e preparações com frango devem atingir 74 °C no centro; peixe, 63 °C. Ovos devem estar completamente cozidos. Um termômetro culinário dá uma verificação melhor do que olhar apenas a cor.', 'Refrigere perecíveis em até duas horas, ou uma hora em ambiente acima de 32 °C. Use potes rasos e fechados na geladeira a 4 °C ou menos. Reaqueça preparações quentes a 74 °C antes de servir.'] },
        { title: 'Os prazos deste livro', paragraphs: ['Como organização conservadora, as fichas sugerem até 48 horas de geladeira para preparações cozidas, 24 horas para frutas cortadas e misturas frias, e consumo imediato para bebidas batidas. Isso depende de higiene, temperatura e qualidade dos ingredientes; não é validade laboratorial.', 'Quando indicado, congele em pequenas porções por até 30 dias como referência de qualidade. Descongele na geladeira, nunca na bancada. Descarte alimentos com conservação duvidosa; cheiro e aparência não garantem segurança.'] },
      ], sourceIds: ['cdc-cozinha', 'usda-sobras', 'foodsafety-temperaturas'],
    },
    {
      id: 'semana', kicker: '10 · Planeje sem engessar', title: 'Uma semana de possibilidades',
      intro: 'O roteiro a seguir é um repertório de combinações, não uma dieta de sete dias. Os horários, a quantidade total e os acompanhamentos serão ajustados à sua necessidade.',
      sections: [
        { title: 'O que o quadro representa', paragraphs: ['Cada linha sugere preparações para variar. Ela não representa toda a alimentação do dia, não estabelece déficit calórico e não informa uma meta de energia ou de proteína. Acrescente as refeições e os alimentos definidos no seu acompanhamento.', 'Escolha receitas que façam sentido para sua tolerância naquele momento. O lanche é uma possibilidade, não uma obrigação. As águas e infusões não contam como refeição.'] },
        { title: 'Uma sessão curta de organização', bullets: ['Escolha duas bases de carboidrato, duas preparações com proteína e dois legumes.', 'Cozinhe o frango e porcione; prepare arroz ou quinoa e legumes.', 'Reserve para as próximas 48 horas o que será refrigerado; congele o restante quando a ficha permitir.', 'Deixe as frutas inteiras higienizadas conforme necessidade, cortando perto do consumo.', 'Escolha apenas as receitas da semana na lista digital. A lista de todo o livro serve para consulta, não para comprar tudo de uma vez.'] },
      ], sourceIds: ['usda-sobras'],
    },
    {
      id: 'consulta', kicker: '11 · Leve para a consulta', title: 'Suas observações tornam o cuidado mais claro',
      intro: 'Você não precisa vigiar cada detalhe da alimentação. Um registro simples pode mostrar à equipe o que está difícil e o que funcionou melhor.',
      sections: [
        { title: 'O que vale anotar', bullets: ['Dia e horário; medicamento e mudanças já orientadas pelo prescritor, se relevantes.', 'O que conseguiu comer e beber; temperatura, volume aproximado e textura.', 'Desconforto percebido, intensidade e duração. Use suas palavras.', 'Evacuação, sinais de hidratação e impacto na rotina.', 'Ajustes testados e perguntas para a próxima consulta.'] },
        { title: 'Perguntas que ajudam', bullets: ['Minha ingestão está adequada para o meu momento?', 'Qual deve ser minha meta de proteína e como distribuí-la?', 'Como adaptar fibras e líquidos à minha condição clínica?', 'Algum suplemento é necessário ou a alimentação pode ser ajustada?', 'Quando devo entrar em contato antes do retorno marcado?', 'Qual é meu plano para hipoglicemia, se utilizo medicamentos de risco?'] },
        { title: 'Use com privacidade', paragraphs: ['O modelo de registro no PDF é para uso pessoal e pode ser preenchido à mão. A versão HTML permite imprimir as fichas. O livro não envia observações de saúde pela internet nem armazena um prontuário.', 'Favoritos e etapas de preparo são salvos apenas no armazenamento local do navegador quando disponível. Faça uma cópia do arquivo se quiser mantê-lo em outro dispositivo.'] },
      ], sourceIds: [],
    },
  ],
  quickChoices: [
    { title: 'Texturas macias', text: 'Quando você prefere preparações suaves. Escolha conforme sua tolerância.', slugs: ['glp-mingau-aveia', 'glp-creme-abobora-frango', 'canja-frango', 'glp-peixe-pure'] },
    { title: 'Mais variedade com fibras', text: 'Para o repertório habitual, com aumento gradual. Não usar como tratamento de dor ou obstrução.', slugs: ['iogurte-kiwi', 'glp-lentilha-legumes', 'pudim-chia', 'arroz-lentilha'] },
    { title: 'Refeições e lanches salgados', text: 'Ingredientes com proteína e combinações de diferentes grupos alimentares.', slugs: ['ovos-ricota', 'tofu-arroz', 'bowl-frango-quinoa', 'pate-frango'] },
    { title: 'Beber também faz parte', text: 'Águas para variar e lanches líquidos. Nenhuma opção substitui reidratação oral indicada.', slugs: ['agua-pepino', 'infusao-gengibre', 'vitamina-mamao', 'smoothie-manga-tofu'] },
  ],
  week: [
    { day: 'Segunda', morning: 'glp-mingau-aveia', meal: 'bowl-frango-quinoa', snack: 'glp-iogurte-mamao', evening: 'canja-frango' },
    { day: 'Terça', morning: 'ovos-ricota', meal: 'glp-peixe-pure', snack: 'pera-ricota', evening: 'tofu-arroz' },
    { day: 'Quarta', morning: 'cuscuz-ovo', meal: 'arroz-lentilha', snack: 'vitamina-mamao', evening: 'glp-creme-abobora-frango' },
    { day: 'Quinta', morning: 'panqueca-banana', meal: 'almondegas-frango', snack: 'iogurte-kiwi', evening: 'glp-arroz-frango-cenoura' },
    { day: 'Sexta', morning: 'glp-iogurte-mamao', meal: 'glp-omelete-abobrinha', snack: 'maca-iogurte', evening: 'glp-lentilha-legumes' },
    { day: 'Sábado', morning: 'ovos-ricota', meal: 'bowl-frango-quinoa', snack: 'pudim-chia', evening: 'bolinhos-frango-batata' },
    { day: 'Domingo', morning: 'cuscuz-ovo', meal: 'glp-peixe-pure', snack: 'glp-banana-iogurte', evening: 'pate-frango' },
  ],
  faqs: [
    { question: 'Este livro elimina os efeitos colaterais?', answer: 'Não. Ele oferece educação alimentar e possibilidades de preparo que podem ajudar na tolerância. Sintomas persistentes ou importantes precisam de avaliação; receitas não tratam eventos adversos.' },
    { question: 'Todas as receitas servem para qualquer pessoa?', answer: 'Não. Tolerância, condições clínicas, alergias e necessidades nutricionais mudam as escolhas. Use a coleção como repertório e ajuste com sua equipe.' },
    { question: 'Posso viver de vitaminas e sopas?', answer: 'Não use apenas a facilidade de engolir como critério. A ingestão do dia precisa ser adequada e variada. Dificuldade persistente para comer alimentos sólidos merece avaliação.' },
    { question: 'Preciso comprar whey ou suplementos?', answer: 'O livro não exige suplementos. A necessidade de complementação deve ser avaliada individualmente. Leite, ovos, peixe, frango, tofu e leguminosas aparecem como ingredientes de diferentes receitas.' },
    { question: 'Sem lactose é igual a sem leite?', answer: 'Não. Um produto sem lactose pode continuar contendo proteínas do leite e não ser adequado à alergia. Leia o rótulo e siga a orientação individual.' },
    { question: 'As bebidas de fruta são sem açúcar?', answer: 'As fórmulas não têm adição de açúcar, mas as frutas e os lácteos contêm açúcares naturais. Quantidade e combinação precisam caber no plano individual, especialmente no diabetes.' },
    { question: 'Posso fazer a mesma receita em quantidade maior?', answer: 'O multiplicador altera quantidades numéricas. Tamanho da panela, forno, ponto de cocção e conservação continuam exigindo atenção. Não multiplique automaticamente o tempo.' },
    { question: 'Por que não há calorias exatas em cada ficha?', answer: 'Peso final, marca, tamanho dos ingredientes e substituições mudam o cálculo. Esta edição não apresenta análise nutricional nem metas diárias. A profissional pode acrescentar cálculos com fonte e rendimento definidos no painel.' },
    { question: 'E se eu tiver gastroparesia ou doença renal?', answer: 'Não use filtros de receitas como liberação clínica. Essas situações pedem um plano individual de textura, fibras, proteína e líquidos, que o livro não determina.' },
    { question: 'Posso mudar minha dose porque estou com náusea?', answer: 'Entre em contato com o prescritor. Doses, intervalos, pausas e uso de medicamentos para sintomas não são decisões orientadas por este material.' },
  ],
  journalFields: ['Data e horário', 'Preparação / textura / quantidade aproximada', 'Líquidos ao longo do dia', 'Desconforto, intensidade e duração', 'Evacuação e observações', 'Pergunta para a equipe'],
  sources: [
    { id: 'niddk-medicamentos', title: 'NIDDK · Prescription Medications to Treat Overweight & Obesity', url: 'https://www.niddk.nih.gov/health-information/weight-management/prescription-medications-treat-overweight-obesity', use: 'Mecanismo, acompanhamento e limites de uso.' },
    { id: 'leeds-glp', title: 'Leeds Community Healthcare NHS · GLP-1 or GIP diabetes treatment', url: 'https://leedscommunityhealthcare.nhs.uk/our-services-a-z/diabetes/glp-1-or-gip-diabetes-treatment/', use: 'Porções, saciedade e tolerância digestiva.' },
    { id: 'advisory-nutricao', title: 'ACLM, ASN, OMA e TOS · Nutritional priorities to support GLP-1 therapy for obesity · 2025', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12125019/', use: 'Adequação nutricional, proteína e função muscular.' },
    { id: 'consenso-gi', title: 'Consenso multidisciplinar · Clinical Recommendations to Manage Gastrointestinal Adverse Events with GLP-1 Receptor Agonists', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9821052/', use: 'Estratégias educativas para sintomas gastrointestinais.' },
    { id: 'niddk-refluxo', title: 'NIDDK · Eating, Diet, & Nutrition for GER & GERD', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition', use: 'Horário da refeição e gatilhos individuais de refluxo.' },
    { id: 'niddk-constipacao', title: 'NIDDK · Treatment for Constipation', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/constipation/treatment', use: 'Aumento gradual de fibras e rotina intestinal.' },
    { id: 'nhs-diarreia', title: 'NHS · Diarrhoea and vomiting', url: 'https://www.nhs.uk/symptoms/diarrhoea-and-vomiting/', use: 'Líquidos, reidratação e sinais de urgência.' },
    { id: 'nhs-hidratacao', title: 'NHS · Dehydration', url: 'https://www.nhs.uk/conditions/dehydration/', use: 'Sinais de desidratação e reposição orientada.' },
    { id: 'niddk-hipoglicemia', title: 'NIDDK · Low Blood Glucose (Hypoglycemia)', url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia', use: 'Atenção a insulina, sulfonilureias e sintomas.' },
    { id: 'anvisa-pancreatite', title: 'Anvisa · Alerta sobre pancreatite e agonistas GLP-1 · 2026', url: 'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-emite-alerta-para-risco-de-pancreatite-aguda-associada-ao-uso-indevido-de-canetas-emagrecedoras', use: 'Dor abdominal persistente e necessidade de avaliação.' },
    { id: 'anvisa-anestesia', title: 'Anvisa · GLP-1, anestesia e sedação profunda', url: 'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2024/anvisa-alerta-sobre-o-risco-do-uso-de-medicamentos-agonistas-glp-1-em-pacientes-que-serao-submetidos-a-anestesia-ou-sedacao-profunda', use: 'Comunicação à equipe antes de procedimentos.' },
    { id: 'cdc-cozinha', title: 'CDC · Preventing Food Poisoning', url: 'https://www.cdc.gov/food-safety/prevention/', use: 'Higiene, separação e refrigeração.' },
    { id: 'usda-sobras', title: 'USDA FSIS · Leftovers and Food Safety', url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety', use: 'Conservação, descongelamento e reaquecimento.' },
    { id: 'foodsafety-temperaturas', title: 'FoodSafety.gov · Safe Minimum Internal Temperatures', url: 'https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures', use: 'Temperaturas seguras para frango, peixe e ovos.' },
    { id: 'samu', title: 'Ministério da Saúde · SAMU 192', url: 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192/samu-192', use: 'Contato de urgência no Brasil.' },
  ],
  sourceDate: 'Fontes consultadas em 4 de outubro de 2026. O conteúdo deve ser revisto quando novas orientações alterarem essas recomendações.',
};
