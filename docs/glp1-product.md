# À mesa com GLP-1 — entrega do produto

Produto educativo de Gislaine Muller Duarte, nutricionista, CRN-2 nº 22562. Primeira edição: outubro de 2026.

## O que está pronto

- 30 fichas originais: 22 preparações e 8 bebidas, com ingredientes quantificados, rendimento culinário, tempo aproximado, equipamentos, preparo, alternativas, conservação e alergênicos.
- 30 imagens ilustrativas geradas com IA, com identidade visual comum.
- 11 capítulos: acolhimento; funcionamento do tratamento; adequação alimentar; náusea e saciedade precoce; refluxo; constipação e diarreia; hidratação; sinais de alerta; segurança na cozinha; organização semanal; preparação para a consulta.
- Mapa de escolhas, roteiro de combinações, planejador semanal, fichas de observação, perguntas frequentes, lista de compras e 15 referências identificadas.
- PDF A4 com sumários clicáveis, fotos, receitas e materiais imprimíveis.
- HTML independente com imagens e fontes incorporadas, busca, filtros, favoritos, etapas marcáveis, multiplicador de ingredientes e lista de compras. Funciona depois de baixado, sem consultar um servidor.
- Página pública própria `/receitas-glp-1`, com apresentação e índice dos capítulos.
- Entrega protegida em `/minhas-receitas?product=receitas-glp1`, usando o acesso já existente no projeto. O conteúdo integral vem do endpoint autorizado, separado da prévia pública.
- Exportações HTML e PDF do servidor usam o conteúdo atual das receitas, incluindo ajustes feitos no painel.
- Kit comercial em `docs/glp1-kit-comercial.md` e pacote de entrega em `output/glp1`.

## O posicionamento

**Comer, beber e cuidar da rotina durante o tratamento.** O produto oferece repertório culinário e educação alimentar para adultos acompanhados por profissionais. Não promete eliminar efeitos adversos, substituir consultas, produzir uma perda de peso específica ou definir doses de medicamentos.

As porções são rendimentos culinários, e não uma dieta individual. Não foram inventados valores de calorias, proteína ou outras análises nutricionais. As fichas podem receber cálculos da profissional no painel, com fonte e rendimento definidos.

## O que a Gislaine precisa revisar antes da venda

O conteúdo foi elaborado para esta entrega. **Ainda não há registro de revisão profissional nem de teste em cozinha.** O PDF, o HTML e as fichas informam esse estado de forma transparente; não atribuem à Gislaine uma aprovação que não aconteceu.

1. Ler os capítulos e validar o público, as orientações, os sinais de alerta e as referências. Dar atenção especial a diabetes, doença renal, restrição de líquidos, gastroparesia, gestação e alergias.
2. Revisar fórmulas, rendimentos, conservação, alternativas e alergênicos das 30 fichas. Conferir quais preparações deseja manter ou retirar da edição.
3. Testar os preparos que pretende validar na prática e registrar os ajustes de tempo, textura e rendimento. A apresentação nas imagens é ilustrativa.
4. Confirmar nome profissional, registro, canais de atendimento e redação comercial.
5. Depois da revisão, registrar alterações reais nas fichas pelo painel. O guia está em `src/data/glp-guide.js`; mudanças nos capítulos precisam ser aplicadas nesse arquivo e receber uma nova geração dos artefatos.
6. Definir o preço e a disponibilidade do produto no painel administrativo. A entrega não definiu preço nem alterou publicação no banco remoto.

Não marque uma ficha como revisada ou testada se essa etapa ainda não aconteceu. Se houver alteração de conteúdo, gere os arquivos novamente; os arquivos locais não se atualizam por edição no banco remoto.

## Publicação e operação

Nenhum deploy ou push faz parte desta entrega. As mudanças estão locais. O projeto exige autorização explícita para cada execução de publicação remota.

Após a revisão e a autorização de publicação, usar o fluxo existente do projeto. Antes de abrir as vendas, confirmar o valor, as credenciais já usadas pelo checkout, o recebimento do pagamento, a concessão do acesso específico `receitas-glp1` e o download com uma conta de teste. Essas verificações dependem do ambiente publicado; não foram declaradas como pagamentos reais nesta entrega.

O livro anterior continua sendo outro produto. A compra dele não concede automaticamente o acesso ao GLP-1. Os PDFs e HTMLs completos não são copiados para `public` ou para `dist`.

## Arquivos e reprodução

- `output/pdf/a-mesa-com-glp1.pdf`: edição completa em PDF.
- `output/glp1/a-mesa-com-glp1-offline.html`: edição independente em HTML; abrir no navegador.
- `output/glp1/conteudo-editorial.json`: conteúdo estruturado para revisão e futuras versões.
- `output/glp1/kit-comercial.md`: textos comerciais para adaptar e usar.
- `output/glp1/LEIA-ME.md`: este roteiro da entrega.
- `output/glp1/a-mesa-com-glp1-entrega.zip`: PDF, HTML, conteúdo estruturado e documentos de apoio.
- `src/data/glp-recipes.js`: fonte das fichas e dos metadados editoriais.
- `src/data/glp-guide.js`: fonte do guia e das referências.
- `src/assets/glp-recipes/prompts.json`: direção visual, descrição de cada imagem e origem dos PNGs.
- `public/images/glp-recipes`: JPGs preparados para o site e para exportação.

`npm run product:build` gera as duas edições, as prévias públicas e os arquivos do produto. `npm run build` também prepara as páginas e o site. Não publica alterações remotas.

`node scripts/prepare-glp-assets.mjs` refaz os JPGs a partir dos PNGs locais registrados no manifesto, quando esses originais estiverem disponíveis. Para construir em outro computador, bastam os JPGs já incluídos no projeto.

## Revisões futuras

Ao revisar, atualizar a edição e o histórico de mudanças. Não usar uma data de consulta das fontes para insinuar certificação médica. Se novas orientações mudarem o conteúdo, revisar a coleção com a profissional antes de divulgar a nova edição.

Os favoritos e as marcações são locais ao navegador. O livro não sincroniza esses dados entre dispositivos nem coleta o diário de saúde. O PDF não é um prontuário.
