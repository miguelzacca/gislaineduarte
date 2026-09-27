# Jornada de planos alimentares — 27/09/2026

## Referências e diagnóstico antes da implementação

Requisitos e anotações transcritos na solicitação de 27/09/2026. Imagens locais conferidas: `WhatsApp Image 2026-09-27 at 16.31.16.jpeg` (escala de Bristol, em espanhol) e `WhatsApp Image 2026-09-27 at 16.43.12.jpeg` (formulário atual com GLP-1, outra condição e alergias). Não foi fornecido um documento de anotações separado. A imagem de Bristol orienta a seleção visual; seus rótulos de diagnóstico não serão reproduzidos.

Fluxo existente: `/plano-alimentar` → anamnese em cinco etapas → pagamento InfinitePay → `/meu-plano` → revisão profissional no `/painel` → download após aprovação → acompanhamento. Há 36 bases de organização, 60 alimentos TACO com fotos locais, edição dos sete dias, trocas, metas, IA opcional e versões cifradas. A base escolhida não é uma prescrição validada para um diagnóstico.

Dados existentes: identificação/contato, idade/peso/altura/referência fisiológica/atividade/objetivo, gestação, condições, alergias, sintomas, medicamentos e GLP-1 em texto, rotina/dieta/preferências/desgostos/exclusões, sono/intestino/orçamento e consentimentos. Faltavam condicionais obrigatórias, intolerâncias separadas, escolhas visuais por intenção, Bristol, anexos e resumo público rastreável.

`src/lib/nutrition.js` contém cálculos e validação. `api/admin/nutrition.js` controla rascunho, revisão, aprovação e versões; `server/nutrition/store.js` cifra dados. `server/nutrition/html.js` + `offline.js` geram HTML autônomo. `server/nutrition/export.js` gera PDFKit. Ambos usam os mesmos alimentos e totais, mas tinham apresentação de porções duplicada e não entregavam a fundamentação do plano.

## Mapa proposto de telas

| Tela | Campos e ações |
| --- | --- |
| Cliente / Você | Nome, contato, idade; explicação de uso dos dados. |
| Cliente / Momento | Objetivo, medidas com unidade, atividade, referência da equação, gestação e história de peso. |
| Cliente / Saúde | Condições; descrição de outra condição; alergias e reações; intolerâncias separadas; substância/medicamento identificado; sintomas. |
| Cliente / Rotina | Rotina e orçamento; cartões de alimentos de que gosta, não gosta ou quer excluir; temperos; Bristol opcional; fotos opcionais de refeições/rotina. |
| Cliente / Revisão | Restrições e respostas em texto, edição por etapa, autorizações separadas, oferta atualizada. |
| Profissional / Biblioteca | Pesquisa textual sem distinção de acento, objetivo e contexto independentes, bases e modelos próprios, prévia da semana. |
| Profissional / Atendimento | Resumo persistente de restrições, editor da semana, porções e macros em gramas, seleção pesquisável de bases. |
| Profissional / Cálculos e justificativa | Entradas editáveis, método, fórmula, resultado, unidade; aplicação explícita das metas; resumo e critérios destinados ao cliente. |
| Profissional / Conteúdo | Ideias de receitas/alimentos/temperos e módulos opcionais de chá/suplemento; redação e revisão individual antes de incluir. |
| Profissional / Revisão e entrega | Requisitos de aprovação, registro privado, prévias HTML/PDF, aprovação, versões e restauração. |
| Cliente / Entrega | Mesmas porções, resumo, cálculos e módulos aprovados no HTML e no PDF; HTML permite trocas aprovadas e atualiza totais. |

## Regras de dados

- Preservar Vite + React JavaScript/JSX e os pedidos existentes. Campos novos ausentes usam estado vazio; dados ausentes não geram resultados clínicos.
- Alergia, intolerância, desgosto e exclusão são conceitos distintos. Alergias, intolerância à lactose, dieta e exclusões estruturadas filtram itens e alternativas; desgostos estruturados também são evitados. `foodExclusionNotes` preserva exclusões livres separadamente de `dislikes`, inclusive no resumo crítico e na avaliação. Textos livres exigem conferência e não são interpretados como diagnóstico pelo sistema.
- Outra condição exige descrição. GLP-1 exige identificação. Outro medicamento/substância pode ser identificado livremente; nomes não são intercambiáveis nem motivam prescrição automática.
- Escolhas e restrições permanecem resumidas fora da busca. Nenhuma restrição crítica depende apenas de cor, foto ou filtro.
- Bristol aceita vazio ou um tipo de 1 a 7. Texto e ilustrações só são disponibilizados ao cliente após revisão registrada pela profissional. Referência descritiva: [NHS Bristol Stool Chart](https://www.england.nhs.uk/wp-content/uploads/2015/04/07-cdi-diarrhoea.pdf). Seleção não produz diagnóstico ou recomendação automática.
- Fotos opcionais servem para contextualizar refeições e rotina. Até duas imagens com limite de tamanho, reprocessamento e remoção de metadados; consentimento específico. Fotos de rosto, pescoço ou corpo não são requisitos. Nova finalidade exige explicação e decisão profissional antes de coleta.
- Gramas são a quantidade de referência; a medida caseira é estimada e explicita quanto pesa uma unidade. Fotos identificam o alimento. Diagramas representam massa, sem prometer volume ou escala fotográfica.
- A avaliação pública e as entradas dos cálculos pertencem à versão cifrada do plano. O servidor recalcula os registros; fórmulas não executadas ficam ausentes. Metas escolhidas manualmente têm origem profissional e justificativa; não são falsamente atribuídas à equação de repouso.
- Resumo público é separado do registro clínico privado. Contato, anexos e textos clínicos privados não vão nos exports, modelos ou IA. Modelos reutilizáveis removem informações específicas da pessoa.
- Módulos de conteúdo exigem inclusão e revisão pela profissional, levando em conta medicamentos, condições, alergias e preferências. Ideias sem composição verificada não acrescentam nutrientes calculados ao plano. Chás e suplementos não são gerados como conduta automática.
- Manter autenticação, autorização por atendimento, AES-256-GCM, cookies privados, tokens com hash, controle de origem, ausência de cache e de logs de saúde. Rascunho local permanece opcional e expira; fotos não ficam no rascunho do navegador.

## Critérios de aceite

1. Buscar emagrecimento/hipertrofia e combinar com diabetes/GLP-1; busca aceita acentos e termos equivalentes e comunica resultado vazio.
2. Outra condição, outra intolerância e GLP-1 abrem seus campos; envio inválido é rejeitado também pelo servidor, com erro associado ao campo.
3. Alergias, intolerâncias e exclusões impedem seleção em itens e trocas, incluindo aplicação de modelos; preferências não apagam restrições.
4. Quantidade, unidade, medida caseira e nutrientes usam os mesmos dados nos dois formatos. Ovo inteiro é nome do alimento, separado da contagem de unidades. Trocas HTML atualizam porção, nutrientes e diagrama.
5. Cada cálculo entregue identifica entradas, método, fórmula, resultado e unidade; entradas ausentes não geram resultado. Valores enviados pelo navegador não substituem o cálculo no servidor.
6. Aprovação exige resumo/critério, revisão clínica e módulos revisados. Editar conteúdo demanda nova revisão; a versão anterior continua preservada.
7. Uso por teclado, labels visíveis, erros associados, foco após mudança de etapa, controles com área adequada, textos além de cor e respeito a redução de movimento.
8. Formulário e editor acomodam tela estreita, textos longos e cartões sem rolagem horizontal da página; PDF permanece estático e legível.
9. Anexos só são coletados com consentimento específico, são cifrados e não aparecem em exports/modelos/IA/logs. Atendimento e downloads continuam privados.
10. Receitas, alimentos e temperos aparecem como conteúdo selecionado pela profissional; chás/suplementos não são prescritos automaticamente por condição.

## Decisões que dependem da profissional

- Aprovar textos e ilustrações de Bristol antes de habilitar a coleta.
- Validar objetivos e classificação das bases; definir as metas, equações e sua aplicabilidade em cada atendimento.
- Definir porções/medidas caseiras e orientar o uso de balança quando necessário; validar a apresentação visual com pacientes.
- Curar receitas, temperos, chás e suplementos, composição, preparo, contraindicações/interações e linguagem individual.
- Definir finalidade adicional de fotos caso se deseje avaliação corporal, sem reutilizar o consentimento de fotos de refeições.
- Confirmar os dados apropriados para o resumo do cliente, política de retenção/exclusão, responsáveis com acesso e operação de backups. Criptografia não substitui essas decisões de governança.

## Verificação e publicação

Verificações locais concluídas:

| Verificação | Resultado e alcance |
| --- | --- |
| `nutrition-journey.test.js` | 9 testes de condicionais, saneamento, exclusões, busca, porções, rastreio, curadoria e Bristol. |
| `nutrition-intake-ui.test.js` | 6 testes SSR de labels, seleção de alimentos, resumo crítico, Bristol, fotos e autorizações; nenhum navegador executado. |
| `nutrition-professional-ui.test.js` | 6 testes SSR de restrições, memória de cálculo, contagem de ovos, biblioteca e revisão de alérgenos nos módulos. |
| Fluxo privado, offline e exports | Testes de API em banco isolado, versões, aprovação, proteção da oferta pública, remoção de dados em modelos, fotos e trocas offline aprovados. Última verificação dos exports: 4 testes, incluindo precisão de fatores e razões. |
| ESLint | Lint do projeto aprovado; arquivos ajustados depois também passaram pela verificação de escopo. |
| Geração estática e build Vite | Aprovados. Compilação local; sem executar o build do produto independente de receitas. |
| PDF de exemplo | Renderização estática inspecionada com PyMuPDF; 30 páginas, aproximadamente 2,04 MB, sem glifos ausentes. Quantidade de páginas varia com a semana, trocas e textos. |
| Responsividade e acessibilidade | CSS revisado para telas estreitas, controles e leitura; SSR verifica estrutura semântica. Não foi realizada validação visual em navegador/celular nem teste com leitor de tela. Esses critérios precisam de conferência manual no ambiente de uso. |

Exemplos locais fictícios, explicitamente marcados como rascunho: `tmp/nutrition/jornada-exemplo.html` e `tmp/nutrition/jornada-exemplo.pdf`. Eles demonstram a entrega e não são uma prescrição.

Playwright e scripts legados de inspeção não foram executados. Nenhum push, deploy, cobrança real, mensagem ou transmissão de dados reais de pacientes foi realizado. Push e deploy exigem autorização explícita para sua execução, conforme `AGENTS.md`.
