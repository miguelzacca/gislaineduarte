# Auditoria da experiência de planos alimentares

> Revisão de 2 de outubro de 2026: a [auditoria atual do briefing](auditoria-briefing-2026-10-02.md) corrige e delimita conclusões deste registro. O texto abaixo preserva a execução anterior; suas contagens e verificações não comprovam o estado atual.

A primeira versão tinha lacunas concretas: fotografias substituídas por ilustrações, pouca diversidade real entre bases, trocas que compartilhavam um grupo nutricional mas não a função na refeição e acompanhamento offline que não recalculava compras. Esta revisão corrige esses pontos e verifica o fluxo existente.

| Pedido | Resultado desta revisão | Evidência |
| --- | --- | --- |
| Fotografias reais de todos os alimentos | 60 JPEG locais, selecionados visualmente; fonte, autor, licença e legenda por alimento. Removido o gerador de ilustrações. | `public/images/foods/credits.json`, hashes e teste `nutrition-photos.test.js`. |
| Vários modelos e variações | 36 contextos de organização, compostos por 43 módulos culinários; sete dias diferentes e até duas alternativas iniciais compatíveis por alimento. | Testes das 36 bases, filtros combinados, diversidade e cesta de compras. |
| Montagem prática pela doutora | Prévia dos modelos, comparação semanal, contexto da pessoa sempre visível, trocas por função culinária, reordenação/duplicação, cópia seletiva, desfazer/refazer e histórico persistente. | Renderização SSR, lint e testes da API de versões. |
| Recuperar trabalho e reutilizar modelos | Snapshots cifrados e restauração como novo rascunho; novas combinações da mesma base preservam a avaliação quando solicitado. A categoria de um modelo próprio determina os alertas na reutilização. | Fluxo em Postgres isolado, concorrência por revisão, categoria renal e aprovação obrigatória. |
| IA NVIDIA útil | Análise estruturada, sugestões de modelos/perguntas e trocas para a semana; comparação antes de aplicar, validação de função culinária e restrições. | Chamadas reais com dados fictícios para análise e variação; testes de consentimento, resposta inválida e indisponibilidade. |
| Calculadoras | IMC, repouso Mifflin–St Jeor, gasto estimado, mudança de peso, cintura/quadril, cintura/altura, massa livre de gordura e conversões de metas. | Testes de unidades, limites e dados ausentes; fonte da equação no painel. |
| Anamnese simples | Cinco etapas, revisão de alergias/sintomas/exclusões, preço e prazo visíveis antes de começar, rascunho opcional nesta aba e prevenção de envio duplicado. | Validação do formulário/servidor, testes de consentimento e de alteração dos termos comerciais. |
| Pix/checkout e WhatsApp | Checkout InfinitePay existente, oferta imutável no pedido, confirmação independente no servidor, retomada e encaminhamento ao WhatsApp após pagamento confirmado. | Testes com provedor simulado: repetição, subpagamento, retorno e webhook forjado. |
| Preço, prazo e acompanhamento definidos pela profissional | Configuração no painel; oferta fechada até publicação e integração disponível. Período contado da primeira entrega. | Testes de configuração incompleta, termos modificados e duração do acompanhamento. |
| HTML offline completo | Fontes e fotos incorporadas, trocas que recalculam porções/totais/compras, navegação diária, marcações, água, diário e cópia portátil com progresso. | Testes do próprio JavaScript em DOM isolado, sem rede ou navegador automatizado. |
| PDF com fotos e apresentação própria | Capa, dias/refeições, porções, trocas, compras, fotos das alternativas e créditos incorporados. | PDFKit; geração e inspeção visual de todas as páginas do exemplo fictício. |
| Acesso restrito e dados privados | Administração autenticada, dados de saúde e histórico cifrados, downloads vinculados à pessoa e aprovação, links de recuperação de uso único e revogação. | Testes do fluxo privado e de criptografia; busca de segredos nos arquivos versionáveis. |
| Publicação com CI | Workflow de lint, build, testes unitários e auditoria estática; integração por PR após os checks. | `.github/workflows/quality.yml`; sem execução de Playwright. |

## Limites que permanecem explícitos

- Os contextos clínicos são bases de organização, não protocolos terapêuticos validados. Metas e adequação dependem da avaliação da nutricionista; nenhuma entrega clínica é liberada apenas pela IA.
- A biblioteca inicial tem 60 alimentos. Algumas fotos mostram o ingrediente cru ou uma variedade representativa; a legenda explica isso. Composição e porção vêm do alimento/preparo da TACO, não da fotografia.
- Texto livre de alergias, exames e particularidades clínicas precisa ser conferido. Um modelo pessoal incompatível é recusado para revisão; o sistema não inventa uma adaptação terapêutica.
- A busca de atendimentos atua sobre a página atual de 40 registros. O painel mostra até 40 versões, 30 eventos e 20 relatos recentes por atendimento.
- O diário offline não sincroniza automaticamente com o consultório. O paciente pode transferir a cópia HTML com progresso e enviar seu relato pelo acompanhamento.
- Alguns visualizadores de anexos não executam JavaScript. O HTML orienta abrir no navegador e o PDF continua disponível para leitura/impressão.
- A gratuidade da NVIDIA depende da conta e dos termos vigentes. A montagem local funciona sem o provedor. A chave fica exclusivamente no servidor.
- O checkout foi validado com respostas simuladas em banco isolado. Não houve cobrança real, envio de mensagem de WhatsApp ou uso de prontuário real nos testes.

Os detalhes de configuração, dados, fontes e manutenção estão em [nutrition-workspace.md](nutrition-workspace.md).
