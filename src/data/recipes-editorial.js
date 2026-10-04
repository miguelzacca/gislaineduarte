// Complementos culinários solicitados pelo usuário em 04/10/2026.
// Não representam receitas testadas em cozinha nem revisão clínica profissional.
const item = (display, index) => ({ id: `item-${index + 1}`, quantity: null, display, shoppingKey: display.toLocaleLowerCase('pt-BR'), section: 'Ingredientes' });
const completion = (ingredients, preparation, minutes, equipment, notes = []) => ({
  ingredients, preparation, time: { label: `Aproximadamente ${minutes} minutos`, totalMinutes: minutes, approximate: true, inferred: true }, equipment, notes,
});

const completions = {
  'chocolate-caseiro': completion(
    ['100 ml de óleo de coco', '3 colheres de sopa de cacau alcalino em pó', '1 colher de sopa de mel', '1 scoop de whey (use a medida do fabricante)', 'Coco queimado a gosto', 'Sementes de abóbora, gergelim e linhaça a gosto', 'Amendoim, nozes, castanha-do-Pará e pistache a gosto'],
    ['Se o óleo de coco estiver sólido, derreta em banho-maria e deixe amornar.', 'Misture o cacau, o mel e o whey até ficar homogêneo.', 'Acrescente o coco, as sementes e as oleaginosas picadas.', 'Distribua em forminhas e leve ao freezer por cerca de 30 minutos, até firmar.', 'Mantenha refrigerado: o óleo de coco amolece em ambientes quentes.'], 40, ['Tigela', 'Colher', 'Forminhas', 'Freezer']),
  'maca-cozida-especiarias': completion(
    ['1 maçã grande', '1 xícara de água', '1 canela em pau', 'Cravo e noz-moscada a gosto'],
    ['Lave a maçã, retire o miolo e corte em pedaços; use ou retire a casca conforme sua preferência.', 'Coloque em panela com a água e as especiarias.', 'Cozinhe em fogo baixo por cerca de 15 a 20 minutos, até ficar bem macia, quase desmanchando.', 'Se necessário, acrescente água aos poucos para não secar antes de amaciar. Sirva morna ou fria.'], 25, ['Faca', 'Panela com tampa']),
  'pure-mandioquinha-alecrim': completion(
    ['2 mandioquinhas já cozidas', '1 colher de sopa de azeite de oliva', '1 colher de chá de alecrim fresco ou seco', 'Sal e pimenta a gosto'],
    ['Descasque a mandioquinha cozida, se ainda estiver com casca, e amasse ainda morna com um garfo ou mixer.', 'Misture o azeite, o sal, a pimenta e o alecrim.', 'Aqueça rapidamente, se necessário, e sirva.'], 10, ['Garfo ou mixer', 'Tigela', 'Panela'], ['O tempo considera a mandioquinha já cozida. Para começar com raízes cruas, descasque e cozinhe em água até ficarem macias.']),
  'tamaras-recheadas': completion(
    ['8 tâmaras grandes sem caroço', '8 metades de nozes pecan', '100 g de chocolate branco para banhar', '20 g de chocolate meio amargo ou ao leite para decorar'],
    ['Abra uma fenda nas tâmaras e confira a retirada dos caroços.', 'Coloque uma metade de noz em cada tâmara e pressione levemente para fechar.', 'Derreta o chocolate branco conforme as instruções da embalagem, sem contato com água.', 'Banhe as tâmaras, escorra o excesso e coloque sobre papel-manteiga.', 'Derreta o chocolate de decoração e finalize com fios finos.', 'Refrigere por cerca de 20 minutos, até firmar.'], 40, ['Tigelas', 'Garfo', 'Papel-manteiga', 'Geladeira'], ['Confira soja e outros alergênicos nos rótulos dos chocolates. A quantidade de cobertura foi definida editorialmente e pode sobrar.']),
  'brigadeiro-banana': completion(
    ['1 banana madura amassada', '1 colher de sopa de cacau 100%', '2 colheres de sopa de leite em pó', 'Cacau em pó para finalizar'],
    ['Misture a banana, o cacau e o leite em pó em uma panela.', 'Cozinhe em fogo baixo, mexendo, por cerca de 5 a 10 minutos, até engrossar e desgrudar do fundo.', 'Transfira para um prato e deixe esfriar; refrigere até ficar modelável.', 'Modele pequenas bolinhas e passe no cacau. Mantenha refrigerado.'], 40, ['Garfo', 'Panela', 'Espátula', 'Geladeira']),
  'suco-laranja-cenoura-mamao': completion(
    ['300 ml de suco de laranja', '1/3 de xícara de cenoura picada', '2 fatias médias de mamão sem casca e sementes', '1 pedaço de gengibre descascado de cerca de 1 cm'],
    ['Bata todos os ingredientes no liquidificador até obter uma bebida homogênea.', 'Se estiver muito espesso, acrescente um pouco de água potável.', 'Sirva em seguida.'], 5, ['Liquidificador', 'Copo medidor']),
  'suco-couve-hortela': completion(
    ['3 folhas de couve sem talos grossos', '300 a 400 ml de água de coco', '1 limão descascado, sem sementes e sem a parte branca em excesso', '5 folhas de hortelã'],
    ['Higienize as folhas e descasque o limão.', 'Bata com 300 ml de água de coco até homogeneizar.', 'Ajuste a consistência com o restante da água de coco e sirva imediatamente.'], 5, ['Liquidificador']),
  'vitamina-mamao-ameixa': completion(
    ['Suco de 6 laranjas', '4 fatias médias de mamão sem casca e sementes', '4 ameixas secas sem caroço', '1 colher de sopa de aveia em flocos finos', '1 colher de sopa de chia ou linhaça'],
    ['Se as ameixas estiverem duras, deixe-as por 10 minutos em um pouco do suco de laranja.', 'Bata o mamão, as ameixas, a aveia, as sementes e o suco até ficar homogêneo.', 'Sirva em seguida; a bebida pode engrossar ao repousar.'], 15, ['Liquidificador', 'Espremedor']),
  'bolo-cacau-nozes': completion(
    ['3 ovos', '1 xícara de tâmaras sem caroço', '180 ml de água quente', '1/2 xícara de polvilho doce', '3 colheres de sopa de cacau 100%', '1 xícara de farinha de arroz', '1/2 xícara de nozes picadas (cerca de 60 g)', '1 colher de sopa de fermento químico'],
    ['Preaqueça o forno a 180 °C e unte uma forma pequena de cerca de 20 cm.', 'Deixe as tâmaras na água quente por 10 minutos; bata com a própria água até obter uma pasta e deixe amornar.', 'Misture a pasta com os ovos, o cacau, o polvilho e a farinha de arroz.', 'Incorpore as nozes e, por último, o fermento.', 'Asse por cerca de 30 a 40 minutos, até o centro firmar e o palito sair sem massa crua.', 'Deixe amornar antes de desenformar.'], 55, ['Liquidificador', 'Tigela', 'Forma de 20 cm', 'Forno'], ['A quantidade de nozes e o fermento completam editorialmente os trechos ilegíveis da referência.']),
  'supercoffee-caseiro': completion(
    ['200 g de café solúvel para o lote seco', '60 g de canela em pó', '20 g de gengibre em pó', '1/2 colher de café de pimenta-caiena', 'Para uma xícara: 1 colher de chá rasa da mistura', '150 ml de água quente por xícara', '1 colher de chá de óleo de coco por xícara, opcional'],
    ['Misture apenas café, canela, gengibre e pimenta em um recipiente seco.', 'Guarde a mistura em pote limpo, seco e bem fechado; não acrescente óleo ao lote.', 'Para preparar uma xícara, dissolva 1 colher de chá rasa em 150 ml de água quente.', 'Acrescente o óleo de coco somente à bebida pronta, se desejar, e misture.', 'A bebida contém cafeína; o tamanho da xícara e a frequência de consumo são escolhas individuais.'], 5, ['Pote com tampa', 'Colher de chá', 'Xícara'], ['Os 200 g de café correspondem ao lote inteiro, não a uma bebida. A diluição foi acrescentada editorialmente; esta receita não é orientação de suplementação.']),
  'bombom-banana-cacau': completion(
    ['3 bananas grandes maduras, sem casca', '2 colheres de sopa de cacau 100%', '30 ml de água', '150 g de chocolate para banhar'],
    ['Amasse as bananas e misture com o cacau e a água em uma panela.', 'Cozinhe em fogo baixo, mexendo, por cerca de 10 a 15 minutos, até obter uma pasta espessa que se solte do fundo.', 'Transfira para um prato e refrigere até a massa estar fria e modelável.', 'Modele pequenas porções. Se necessário, resfrie mais um pouco antes de banhar.', 'Derreta o chocolate conforme as instruções da embalagem, sem contato com água.', 'Banhe os bombons, coloque sobre papel-manteiga e refrigere até a cobertura firmar. Mantenha refrigerado.'], 75, ['Panela', 'Espátula', 'Prato', 'Papel-manteiga', 'Geladeira'], ['O preparo e a quantidade de cobertura são complementos editoriais; o vídeo citado na referência não foi fornecido.']),
  'torta-proteica-frango': completion(
    ['4 ovos', '4 colheres de sopa de goma de tapioca hidratada', '1 colher de sopa de farinha de aveia', '400 g de frango completamente cozido, temperado e desfiado', '1 tomate picado, sem sementes', 'Cheiro-verde a gosto', '1 colher de chá de fermento químico', 'Muçarela ralada e orégano a gosto'],
    ['Preaqueça o forno a 180 °C e unte uma forma pequena.', 'Misture ovos, tapioca, aveia, frango, tomate e cheiro-verde.', 'Incorpore o fermento delicadamente e transfira para a forma.', 'Cubra com muçarela e orégano.', 'Asse por cerca de 25 a 35 minutos, até dourar e o centro ficar completamente firme, sem ovo cru.'], 45, ['Tigela', 'Espátula', 'Forma pequena', 'Forno']),
  'pao-aveia-iogurte': completion(
    ['2 xícaras de aveia moída', '2 ovos', '170 g de iogurte natural', '1 colher de café de fermento químico', 'Sal a gosto'],
    ['Preaqueça o forno a 180 °C e unte uma forma pequena de pão.', 'Misture os ovos e o iogurte; incorpore a aveia e o sal.', 'Acrescente o fermento e transfira para a forma.', 'Asse por cerca de 30 a 40 minutos, até dourar e o palito sair sem massa crua.', 'Deixe amornar antes de fatiar; o miolo é mais compacto que o de um pão com fermento biológico.'], 45, ['Tigela', 'Forma pequena de pão', 'Forno']),
  'pao-amendoas-sementes': completion(
    ['2 xícaras de farinha de amêndoas', '3 ovos', '2 colheres de sopa de sementes variadas', '1 colher de café de fermento químico', '2 colheres de sopa de azeite'],
    ['Preaqueça o forno a 180 °C e forre uma forma pequena de pão.', 'Misture os ovos e o azeite; acrescente a farinha e parte das sementes.', 'Incorpore o fermento, transfira para a forma e finalize com as sementes restantes.', 'Asse por cerca de 30 a 40 minutos, até o centro ficar firme.', 'Espere amornar para cortar; o pão tem miolo denso e delicado.'], 45, ['Tigela', 'Forma pequena de pão', 'Forno']),
  'pao-quinoa-chia': completion(
    ['1 xícara de quinoa já cozida e escorrida', '2 ovos', '2 colheres de sopa de chia', '1/2 xícara de aveia moída', '1 colher de café de fermento químico'],
    ['Preaqueça o forno a 180 °C e unte uma forma pequena.', 'Misture quinoa, ovos, chia e aveia; deixe repousar por 5 minutos.', 'Incorpore o fermento e coloque na forma.', 'Asse por cerca de 25 a 35 minutos, até o centro firmar e o palito sair sem massa crua.', 'Espere amornar antes de fatiar.'], 45, ['Tigela', 'Forma pequena', 'Forno']),
  'bolo-coco-tres-ingredientes': completion(
    ['3 ovos', '170 g de iogurte natural', '1 e 1/2 xícara de coco ralado sem açúcar'],
    ['Preaqueça o forno a 180 °C e forre uma forma pequena de cerca de 16 cm.', 'Bata os ovos com o iogurte; incorpore o coco ralado e deixe hidratar por 5 minutos.', 'Transfira para a forma e asse por cerca de 30 a 40 minutos, até dourar e o centro ficar firme.', 'Deixe amornar antes de cortar.'], 50, ['Tigela', 'Batedor', 'Forma de 16 cm', 'Forno'], ['Não leva fermento. A textura é úmida e compacta, semelhante a uma queijadinha, e não a um bolo aerado.']),
  'pao-fuba': completion(
    ['1 xícara de fubá mimoso (medidor de 240 ml)', '1 xícara de farinha de arroz', '1/2 xícara de polvilho doce', '1/2 xícara de fécula de batata ou amido de milho', '1 colher de sopa de açúcar', '1 colher de chá de sal', '8 g de fermento biológico seco', '3 ovos', '70 ml de óleo vegetal', '250 ml de leite'],
    ['Misture fubá, farinha de arroz, polvilho, fécula, açúcar, sal e fermento.', 'Acrescente ovos, óleo e leite aos poucos até formar uma massa homogênea e cremosa.', 'Coloque em forma untada, cubra e deixe crescer em local protegido até aumentar de volume, cerca de 40 a 60 minutos.', 'Asse em forno preaquecido a 180 °C por aproximadamente 40 minutos, até dourar e o centro ficar completamente assado.', 'Deixe amornar antes de desenformar e fatiar.'], 110, ['Tigela', 'Forma de pão', 'Forno'], ['Use 250 ml de leite. A medida em mililitros resolve a divergência de xícaras da referência. O tempo de fermentação depende da temperatura ambiente.']),
  'docinho-uva': completion(
    ['4 colheres de sopa de leite em pó', '1 colher de sopa de leite de coco sem açúcar, com um pouco mais se necessário para dar ponto', '8 uvas verdes sem sementes', 'Leite em pó ou coco ralado para finalizar'],
    ['Higienize e seque completamente as uvas.', 'Misture o leite em pó com o leite de coco até formar uma massa modelável; acrescente gotas de leite de coco se estiver seca.', 'Divida em 8 porções e envolva uma uva em cada uma.', 'Passe no leite em pó ou no coco ralado e mantenha refrigerado.'], 15, ['Tigela', 'Colher', 'Geladeira']),
  'docinho-morango': completion(
    ['3 morangos médios higienizados e secos', '2 colheres de sopa de leite em pó, com um pouco mais se necessário para dar ponto', '2 colheres de sopa de coco ralado sem açúcar', 'Coco ralado para finalizar'],
    ['Amasse os morangos e misture com o leite em pó e o coco.', 'Leve à geladeira por cerca de 20 minutos para firmar.', 'Se a massa ainda estiver muito úmida, incorpore um pouco de leite em pó até conseguir modelar.', 'Modele pequenas bolinhas, passe no coco e mantenha refrigerado.'], 30, ['Tigela', 'Garfo', 'Geladeira'], ['A quantidade de líquido dos morangos varia; ajuste o ponto aos poucos. Contém os açúcares naturais dos ingredientes.']),
  'beijinho-coco': completion(
    ['4 colheres de sopa de leite em pó', '4 colheres de sopa de coco ralado sem açúcar', '1 a 2 colheres de sopa de leite de coco, até dar ponto', 'Coco ralado para finalizar'],
    ['Misture o leite em pó e o coco ralado.', 'Acrescente 1 colher de sopa de leite de coco e misture; adicione o restante aos poucos, somente até formar uma massa modelável.', 'Refrigere por cerca de 20 minutos, modele bolinhas e passe no coco.', 'Mantenha refrigerado.'], 30, ['Tigela', 'Colher', 'Geladeira'], ['A quantidade de leite de coco foi ajustada editorialmente para obter ponto de enrolar. Sem adição de açúcar não significa ausência dos açúcares naturais do leite.']),
  'bolo-banana-aveia': completion(
    ['3 bananas bem maduras', '3 ovos', '2 colheres de sopa de manteiga', '3 colheres de sopa de uvas-passas, opcionais', '200 g de aveia em flocos finos', '1 colher de sopa de fermento químico', 'Castanha-de-caju, chocolate ou amendoim para decorar, opcionais'],
    ['Preaqueça o forno a 180 °C e unte uma forma pequena de cerca de 18 cm.', 'Bata bananas, ovos, manteiga e passas no liquidificador.', 'Misture a aveia com a base batida e incorpore o fermento por último.', 'Coloque na forma e acrescente a decoração escolhida, se utilizada.', 'Asse por cerca de 35 a 45 minutos, até o centro firmar e o palito sair sem massa crua.', 'Deixe amornar antes de cortar.'], 55, ['Liquidificador', 'Tigela', 'Forma de 18 cm', 'Forno'], ['A temperatura e o tamanho da forma foram ajustados editorialmente para um assamento gradual. Confira rótulos e alergênicos da decoração opcional.']),
};

const descriptions = {
  'chocolate-caseiro': 'Pedacinhos de chocolate com crocância de sementes, coco e oleaginosas, para manter refrigerados.',
  'suco-laranja-cenoura-mamao': 'Laranja, cenoura e mamão em uma bebida encorpada, com um toque de gengibre.',
  'suco-couve-hortela': 'Uma bebida verde refrescante de couve, limão, água de coco e hortelã.',
  'vitamina-mamao-ameixa': 'Mamão e ameixas secas dão textura a esta bebida de laranja com aveia e sementes.',
  'bolo-cacau-nozes': 'Um bolo de cacau adoçado com tâmaras, com nozes picadas no miolo.',
  'supercoffee-caseiro': 'Uma mistura seca de café e especiarias, com preparo de uma xícara explicado separadamente.',
  'bombom-banana-cacau': 'Recheio macio de banana e cacau envolvido por uma casquinha de chocolate.',
  'torta-proteica-frango': 'Frango desfiado, tomate e ervas em uma torta de ovos, tapioca e aveia.',
  'kafta-batatas': 'Porções de carne temperada assadas sobre batatas, em uma única travessa.',
  'maca-cozida-especiarias': 'Maçã macia cozida em água, perfumada com canela, cravo e noz-moscada.',
  'pure-mandioquinha-alecrim': 'Purê cremoso de mandioquinha, finalizado com azeite e alecrim.',
  'pao-aveia-iogurte': 'Um pão de preparo direto, com aveia, ovos e iogurte natural.',
  'pao-amendoas-sementes': 'Pão de miolo delicado com farinha de amêndoas e sementes variadas.',
  'pao-quinoa-chia': 'Quinoa cozida, chia e aveia em um pão pequeno de textura compacta.',
  'bolo-coco-tres-ingredientes': 'Um bolo úmido e compacto de coco, feito com ovos e iogurte natural.',
  'pao-australiano-vegano': 'Pão escuro de amêndoas, linhaça e coco, com notas de cacau, café e canela.',
  'pao-fuba': 'Pão dourado de fubá e farinha de arroz, fermentado antes de ir ao forno.',
  'tamaras-recheadas': 'Tâmaras com recheio de nozes, cobertura de chocolate branco e fios de chocolate.',
  'docinho-uva': 'Uvas verdes envolvidas em massa de leite em pó e leite de coco.',
  'docinho-morango': 'Bolinhas de morango, leite em pó e coco, servidas refrigeradas.',
  'beijinho-coco': 'Docinhos de coco e leite em pó, com leite de coco adicionado até dar ponto.',
  'brigadeiro-banana': 'Banana madura, cacau e leite em pó em um docinho de panela.',
  'bolo-banana-aveia': 'Bolo de banana madura e aveia, com passas e decoração opcionais.',
};

export function completeRecipeBook(recipes) {
  for (const recipe of recipes) {
    const additions = completions[recipe.slug];
    if (additions) {
      Object.assign(recipe, additions, { ingredients: additions.ingredients.map(item) });
      recipe.validation.inferredFields = [...new Set([...(recipe.validation.inferredFields || []), 'Medidas, equipamentos e etapas complementados na edição de 04/10/2026.'])];
    }
    if (descriptions[recipe.slug]) recipe.introduction = descriptions[recipe.slug];
    if (recipe.published === false || additions) {
      recipe.validation.status = 'editorially-completed';
      recipe.validation.source += ' Completada editorialmente a pedido do usuário em 04/10/2026; não testada em cozinha.';
      recipe.editorialContext = 'Adaptação culinária com medidas ou etapas complementadas editorialmente. Tempos aproximados; observe o ponto da preparação.';
    }
    recipe.published = true;
  }
  const kafta = recipes.find(recipe => recipe.slug === 'kafta-batatas');
  kafta.equipment = ['Tigela', 'Faca', 'Travessa de forno', 'Forno'];
  const australian = recipes.find(recipe => recipe.slug === 'pao-australiano-vegano');
  australian.equipment = ['Balança', 'Tigela', 'Forma de pão', 'Forno'];
  australian.preparation[2] = 'Modele em formato alongado e deixe fermentar em local protegido por cerca de 45 a 60 minutos, até perceber aumento de volume e atividade. Não é necessário dobrar de tamanho.';
  australian.time = { label: 'Cerca de 45 a 60 minutos de fermentação + 35 a 45 minutos de forno', totalMinutes: 110, approximate: true, inferred: true };
  australian.validation.inferredFields = [...(australian.validation.inferredFields || []), 'Estimativa de fermentação de 45 a 60 minutos.'];
  australian.editorialContext = 'Receita culinária educativa com estimativa editorial de fermentação. O tempo depende da temperatura ambiente.';
  const coconutMuffin = recipes.find(recipe => recipe.id === 'recipe-02');
  coconutMuffin.notes[0] = 'O tempo varia conforme o forno e o tamanho das forminhas.';
  const zucchini = recipes.find(recipe => recipe.id === 'recipe-05');
  zucchini.name = 'Pão de abobrinha com farinha de mandioca';
  zucchini.editorialContext = 'A ausência de glúten depende de ingredientes certificados e do controle de contaminação cruzada.';
  zucchini.allergenIds = zucchini.allergenIds.filter(id => id !== 'almonds');
  zucchini.substitutions = [];
  const variant = {
    ...structuredClone(zucchini), id: 'pao-abobrinha-amendoas', slug: 'pao-abobrinha-amendoas', variantOf: zucchini.id,
    name: 'Pão de abobrinha com farinha de amêndoas',
    introduction: 'A variação do pão de abobrinha com farinha de amêndoas, apresentada com ingredientes e preparo próprios.',
    ingredients: zucchini.ingredients.map(ingredient => ingredient.id === 'cassava-flour'
      ? { ...ingredient, id: 'almond-flour', name: 'de farinha de amêndoas', shoppingKey: 'almond-flour' } : structuredClone(ingredient)),
    allergenIds: [...zucchini.allergenIds, 'almonds'], substitutions: [], alternativeIngredients: [], tags: ['Salgada', 'Abobrinha', 'Amêndoas', 'Variação'],
  };
  zucchini.alternativeIngredients = [];
  zucchini.preparation = zucchini.preparation.map(step => step.replace('farinha escolhida', 'farinha de mandioca'));
  variant.preparation = variant.preparation.map(step => step.replace('farinha escolhida', 'farinha de amêndoas'));
  recipes.splice(recipes.indexOf(zucchini) + 1, 0, variant);
}
