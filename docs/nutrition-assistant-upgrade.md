# Assistente de planos — 04/10/2026

A reclamação do vídeo era a ausência de um caminho direto entre selecionar hipertrofia e encontrar uma base de plano para esse objetivo. A interface apresentava modelos por condição clínica e a IA apenas recomendava IDs ou trocava poucos alimentos.

Foram acrescentadas 15 bases com nomes explícitos de hipertrofia/ganho de massa muscular, emagrecimento/controle de peso e ganho de peso. São cinco variações por objetivo, além das 60 bases clínicas existentes. Os repertórios diferem nas combinações de alimentos, não apenas no título. Condições registradas continuam prioritárias; GLP-1 não é inferido a partir do desejo de emagrecer.

O atendimento mostra opções por objetivo imediatamente, com justificativas e seleção direta. A profissional pode orientar a IA por um campo opcional, solicitar uma seleção fundamentada ou montar a semana inteira. A montagem usa somente preparações cadastradas e compatíveis, conserva o trabalho existente e permite comparar, aplicar ao editor e salvar em etapas distintas. Metas continuam sendo definidas pela profissional.

O modelo padrão e a configuração local passaram para Nemotron Ultra 550B, listado com endpoint gratuito no [catálogo NVIDIA](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b). Uma sobrecarga observada na chamada real motivou a alternativa gratuita Nemotron Super 120B. Cada chamada, incluindo a alternativa, reserva uma das 40 vagas por minuto. Há prazo total de 45 segundos e pausa compartilhada conforme `Retry-After`, sem repetir chamadas após HTTP 429.

Verificação: chamadas reais com categorias e preferências fictícias retornaram bases específicas de hipertrofia e uma semana válida de sete dias. Houve resposta com Ultra e uso da alternativa Super na montagem. Testes isolados cobrem seleção por objetivo, restrições, validação das refeições, preservação do rascunho, aplicação manual, bloqueio de cliques repetidos, a 40ª/41ª chamada, expiração da janela e revogação da autorização durante a consulta. Nenhum prontuário real foi enviado à NVIDIA; Playwright não foi executado. Não foi feito push ou deploy.
