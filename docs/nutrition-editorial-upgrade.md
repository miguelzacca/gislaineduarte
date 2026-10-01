# Painel clínico e biblioteca editorial · outubro de 2026

## Anamnese e avaliação

A anamnese inclui preferências e aversões a chás, líquidos, frequência intestinal, atividade física, histórico familiar, rotina profissional, saúde hormonal, exames e medidas opcionais. Esses campos são autorrelatos e não substituem a avaliação. Fotos opcionais contextualizam refeições; não são usadas para estimar composição corporal.

IMC, gasto em repouso, fatores, água, proteína e composição possuem memória de cálculo. A classificação do IMC considera a faixa etária e deixa de aplicar a tabela geral quando há gestação/amamentação. As equações de dobras exigem método, idade compatível, data e médias efetivamente registradas. Percentual de gordura e massa livre de gordura não são apresentados como medida de massa muscular. As referências e limitações estão junto às fórmulas.

O prato ilustrado usa fotografias reais dos alimentos e identifica porções em gramas. Os percentuais editáveis correspondem a grupos culinários; não são percentuais de macronutrientes. O HTML mantém as imagens disponíveis offline e atualiza a ilustração nas trocas de alimentos.

## Modelos e revisão profissional

O painel oferece 60 bases, com imagens, contexto, objetivos e calorias calculadas. A Gi pode copiar, editar e salvar modelos próprios; a reutilização remove os dados de avaliação da pessoa original. Bibliotecas de chás, alimentos, receitas, temperos e suplementos são editáveis e persistidas. Conteúdos novos exigem conferência dos ingredientes e adequação ao paciente antes da aprovação.

A seleção automática considera objetivos e restrições; a assistência da NVIDIA NIM respeita a autorização de IA. Sugestões continuam como rascunho até a revisão. A prévia do paciente permite conferir a entrega antes de aprovar. O compartilhamento pelo WhatsApp abre uma mensagem para revisão e envio, sem enviar automaticamente.

## Livros de receitas

O nome público passa a ser Livro de receitas. O identificador e o caminho antigos permanecem para preservar compras e links existentes. A coleção GLP-1 tem produto e autorização de acesso próprios. O conteúdo editorial pode ser criado, revisado, ocultado e atualizado no painel; os downloads são gerados a partir da versão publicada.

Receitas incompletas nas imagens fornecidas ficam em rascunho com observação editorial. Não foram inventadas etapas ausentes do vídeo nem temperaturas, tempos ou medidas não informados. Fotos reais de ingredientes são identificadas como referência quando não mostram o prato pronto. Créditos ficam em `public/images/foods`, `public/images/teas` e `public/images/recipes-real`.

## Valores dos acompanhamentos

O editor fica em Produtos → Valores dos acompanhamentos. A configuração pública é independente dos preços dos livros e do plano alimentar digital. Há controle de versão para impedir que uma aba antiga sobrescreva outra edição. Se o banco estiver indisponível, o site não exibe uma promoção antiga como se ainda estivesse vigente.

As referências iniciais são 3 meses por R$ 299/mês, 6 meses por R$ 239,90/mês (anterior R$ 249,90) e dupla familiar de 3 meses por R$ 197/pessoa. A periodicidade desta última precisa ser definida pela profissional no campo de condições.

## Operação

As tabelas e colunas adicionais são criadas de forma aditiva; registros de pacientes e compras permanecem preservados. O build usa Vite + React em JavaScript e PDFKit para os livros. Novos campos da anamnese passam pela validação do servidor antes de serem criptografados. Publicação de conteúdo e alterações de preço exigem sessão administrativa e origem válida.

Execute verificações locais com `npm run lint`, `npm run test:unit`, `npm run build` e `npm run audit`. As instruções de `AGENTS.md` continuam vigentes: não executar Playwright por iniciativa própria e não publicar sem autorização específica para a execução.

## Verificação desta entrega

Foram feitas três revisões: cálculos e exportação clínica; painel, persistência e controle de acesso; integração do catálogo, conteúdo público e documentos finais. O conjunto final passou em 332 testes unitários, lint, build de produção e auditoria estática de 13 páginas/9 URLs do sitemap, sem erros. O HTML offline foi exercitado em DOM local, incluindo busca, favoritos, progresso, trocas e lista de compras, sem executar navegador ou Playwright.

Os PDFs foram renderizados e inspecionados: exemplo de plano com 41 páginas, livro principal com 21 páginas e GLP-1 com 13 páginas. Os livros mantêm 14 e 8 receitas disponíveis respectivamente; 16 referências incompletas adicionais permanecem em rascunho no editor. O produto GLP-1 começa sem preço e sem publicação comercial. A verificação não realizou cobranças reais nem enviou mensagens a pacientes.
