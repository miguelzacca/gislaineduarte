# Consultório e planos alimentares

> Atualização de 27/09/2026: o mapa detalhado, campos, regras, critérios de aceite e decisões profissionais estão em [nutrition-journey-upgrade.md](nutrition-journey-upgrade.md).

Implementação em Vite + React, JavaScript/JSX, Functions Node e no Postgres já utilizado pelo projeto. O design mantém verde, marfim, dourado, Cormorant e Manrope. A gestão anterior de produtos e vendas continua disponível no painel.

## Fluxo da pessoa atendida

1. A página inicial e o menu levam a `/plano-alimentar`. A oferta só aceita solicitações quando a nutricionista define e publica preço, prazo em dias corridos e acompanhamento em `/painel` → **Minha oferta**. Não há valores comerciais fictícios publicados.
2. A anamnese para adultos tem cinco etapas: identificação, medidas/objetivo, saúde, rotina/preferências e revisão/consentimento. Por padrão, dados não enviados ficam na memória. A pessoa pode optar por salvar um rascunho no `sessionStorage` da aba, com expiração em 12 horas, botão para apagar e remoção após o envio. A revisão exibe alergias, sintomas e alimentos excluídos antes de continuar. A IA profissional permanece habilitada e o formulário informa seu uso; a pessoa pode pedir ajuda no chat para preencher cada etapa.
3. O servidor valida e cifra a anamnese. Confere se os termos exibidos ainda são atuais antes de gravar o pedido; alterações de oferta exigem nova confirmação, preservando as respostas. Cada pedido conserva sua oferta e a InfiniteTag original.
4. O checkout hospedado da InfinitePay recebe e-mail, valor e identificação do pedido, sem informações de saúde. Pix e outras modalidades dependem da conta InfinitePay. Tentativas repetidas reutilizam o mesmo link.
5. Webhook e retorno consultam `payment_check` no servidor. Parâmetros do navegador nunca bastam para marcar pagamento. Após a confirmação, uma semana de rascunho é montada com o modelo inicial e os filtros compatíveis com os dados estruturados.
6. O retorno chega a `/meu-plano`. Após consultar pagamento confirmado, a página abre o WhatsApp configurado em cinco segundos, oferecendo a opção de permanecer. A mensagem é preparada no WhatsApp; o aplicativo não a envia automaticamente. Nas visitas seguintes, não há novo redirecionamento automático.
7. Os downloads aparecem somente depois da aprovação profissional. O paciente pode enviar relatos durante os dias de acompanhamento contratados, contados da primeira liberação. Novas revisões não reiniciam o prazo. Links privados de recuperação valem sete dias e são consumidos uma vez, substituindo o acesso anterior.
8. O paciente pode desativar novas solicitações de IA. Encerrar o acesso invalida a sessão no banco e apaga o cookie.

## Fluxo no painel

**Atendimentos** reúne anamneses, situação do pagamento, rascunhos, planos liberados, relatos e histórico de eventos. A busca e os filtros atuam sobre a página de 40 registros carregada.

Há 36 bases de organização: 12 contextos × três variações de rotina, construídas a partir de 43 módulos culinários. Os contextos são rotina equilibrada, diabetes, cardiovascular, hipertensão, renal, oncologia, intestinal, gástrico, H. pylori, lactose, doença celíaca e GLP-1. O motor combina preparos e famílias culinárias, varia os sete dias e oferece até duas trocas iniciais compatíveis por alimento, quando disponíveis. A rotina prática reaproveita um conjunto menor de ingredientes; a variada amplia o repertório. São pontos de partida para revisão clínica; não são protocolos terapêuticos validados nem garantias de adequação a um diagnóstico.

O editor permite trabalhar os sete dias, horários, refeições, gramas, orientações e até três alternativas por item. A visão semanal compara energia, proteína, variedade e distância da meta. Condições, alergias e preferências ficam visíveis durante a montagem. A biblioteca mostra uma prévia real dos sete dias de cada base antes da escolha.

As ações incluem troca por energia, proteína ou carboidrato; seleção de trocas da mesma família culinária; duplicação e reordenação de refeições; cópia de um dia para os dias escolhidos; ajuste proporcional da semana à meta energética; e lista de compras. É possível desfazer/refazer até 30 alterações locais antes de salvar. A barra de edição permanece acessível durante a rolagem. A biblioteca de alimentos permite comparar composição por 100 g ou medida caseira e ordenar por energia, proteína ou fibras.

**Gerar outra combinação** avança entre as sementes 0–96 do motor para a mesma base. A profissional confirma a substituição das refeições; metas, orientações e registro clínico podem ser preservados, mas a revisão é reiniciada. Aplicar uma base diferente limpa essas definições e avisa antes de substituir. Alterações não salvas exigem confirmação explícita de descarte; a versão salva anterior permanece no histórico.

Filtros consideram dieta vegetariana/vegana, alérgenos, glúten, lactose e alimentos excluídos. Restrições escritas em texto livre precisam de conferência profissional. As trocas automáticas preservam a função culinária, o estado de preparo e limites de porção definidos por família; não tratam todo alimento do mesmo grupo como equivalente. Restrições muito amplas podem deixar um rascunho incompleto, que precisa ser corrigido antes de salvar ou liberar.

Os modelos próprios preservam a estrutura e as quantidades das refeições; removem metas, avaliação, cálculos, conteúdos adicionais e textos personalizados. Rótulos dos dias e refeições são normalizados. Objetivos e contexto organizam a pesquisa sem definir conduta clínica. Modelos próprios incompatíveis com as restrições da nova pessoa são rejeitados para revisão, em vez de serem aplicados silenciosamente. Depois de salvar um modelo, ele já aparece no seletor do atendimento.

A busca de modelos e o seletor do atendimento consideram título, descrição, objetivos declarados, palavras-chave, rotina e dados do contexto clínico. Reconhecem expressões relacionadas como “ganhar massa”, “perder gordura” e “pressão alta”, aceitam acentos, plurais, digitação parcial e pequenos erros, e ordenam as bases por relevância. Cada resultado indica o que motivou a correspondência. Compatibilidade genérica com todos os objetivos não torna uma base clínica um modelo específico de hipertrofia; emagrecimento não implica GLP-1. Os filtros escolhidos continuam válidos e podem ser ampliados pelo controle mostrado quando não há resultados. A pesquisa usa o catálogo já carregado, sem chamar a NVIDIA a cada tecla e sem migration adicional.

O catálogo tem 60 alimentos com fotografias reais locais e valores da TACO por 100 g: energia, macronutrientes, fibras, sódio, potássio e fósforo. Página, número e nome na fonte acompanham cada item. Valores ausentes de minerais aparecem como soma parcial, não como zero garantido. Medidas caseiras são aproximações; preparos, rótulos e sal adicionado podem alterar a composição.

As fotografias foram selecionadas visualmente no Wikimedia Commons e ficam em `public/images/foods`, sem hotlink em tempo de uso. As licenças CC/CC0/domínio público, autoria, fonte, descrição e transformações estão em `CREDITS.md` e `credits.json`; cada arquivo JPEG tem SHA-256 e tamanho registrados. As fotos de ingredientes crus ou de variedades representativas têm legenda específica; nenhuma foto representa uma porção prescrita. O gerador anterior de ilustrações foi removido. Uma nova importação nutricional preserva os créditos aprovados. O teste de fotografias confere cobertura de todos os alimentos, integridade, licenciamento registrado e orçamento de tamanho dos arquivos offline.

As calculadoras incluem IMC, repouso por Mifflin–St Jeor, gasto com fator de atividade, mudança relativa de peso, relações cintura/quadril e cintura/altura, massa livre de gordura a partir do percentual informado, proteína em g/kg, água em ml/kg e distribuição energética de macros. Metas são escolhidas pela profissional. Nenhum déficit, meta hídrica ou proteína é prescrito automaticamente. Aplicar as metas registra as entradas para recomputação no servidor e preservação na versão cifrada. Resumo e critérios públicos são exigidos antes da aprovação.

**Revisão e entrega** mostra sete requisitos objetivos e exige pagamento confirmado, plano válido, metas de energia/proteína, registro clínico e confirmação dos alertas aplicáveis. Registro clínico é privado. Os alertas também consideram o contexto da base selecionada e diferenças relevantes de energia/proteína. Reabrir uma versão suspende novos downloads até aprovação; arquivos já baixados não podem ser recolhidos. Revisões concorrentes são recusadas pelo número da versão, e mudanças não salvas têm proteção de navegação.

**Acompanhamento** reúne relatos, eventos e versões persistidas. Depois de salvar, gerar, aprovar ou restaurar, o painel atualiza esse histórico e o prazo de acompanhamento sem desmontar o editor. Falhas ao recarregar não substituem o rascunho aberto. Uma versão anterior pode ser restaurada como novo rascunho; planos aprovados precisam ser reabertos primeiro e a restauração sempre exige nova revisão.

## NVIDIA NIM

- Modelo padrão: `nvidia/nemotron-3-ultra-550b-a55b`. Sob sobrecarga ou falha de conexão, há uma única tentativa no endpoint gratuito `nvidia/nemotron-3-super-120b-a12b`, dentro do prazo total de 45 segundos. O modelo principal é fixo no código e não depende de `NVIDIA_NIM_MODEL`. A chave `NVIDIA_NIM_API_KEY` continua exclusivamente no servidor.
- A IA profissional fica sempre habilitada, inclusive nos atendimentos antigos com `aiConsent: false`. O campo legado não é alterado nem usado como bloqueio. A anamnese e o espaço do paciente não oferecem um botão para desativá-la. A autorização geral de atendimento e a autorização específica para fotos continuam presentes. Ao abrir um atendimento ou mudar o objetivo, a seleção da NVIDIA é consultada uma vez; uma análise compatível em cache é reaproveitada.
- **Chat Seu assistente:** botão flutuante no canto inferior direito. Para clientes, aparece somente quando a área da anamnese estiver visível ou em uso; permanece oculto no início, na apresentação da oferta e nas demais páginas públicas. Usa contexto estruturado da tela, objetivo, base e refeições em edição, inclusive metas ainda não salvas. As mensagens são processadas pela NVIDIA. Há atalhos explícitos para indicar modelos, montar a semana, sugerir trocas e conferir cálculos. Não salva nem aprova planos pela conversa. Na anamnese, explica a etapa e ajuda a formular respostas; não inventa dados ou envia o formulário. O histórico fica em memória e é limpo ao trocar de paciente.
- **Indicar modelos com IA:** considera o objetivo explícito, condições, dieta, alergias, intolerâncias e alimentos preferidos/excluídos. Explica até três escolhas. Contextos clínicos ausentes, como GLP-1 sem uso informado, não entram no catálogo enviado.
- **Montar semana com IA:** organiza todas as refeições dos sete dias com preparações cadastradas e permitidas. A aplicação calcula porções e alternativas e, quando houver meta energética profissional, ajusta a semana a ela. Título, metas, cálculos, orientações e registro profissional existentes são preservados. A montagem também aceita o rascunho ainda em edição, sem exigir salvamento prévio.
- **Sugerir trocas com IA:** varia alimentos da mesma função culinária. Ambas as ações mostram uma comparação antes de aplicar ao editor. Aplicar marca o rascunho como não salvo; nenhuma sugestão é aprovada ou entregue automaticamente.
- O limite compartilhado é de **40 requisições reais por janela móvel de 60 segundos**, com reserva transacional no PostgreSQL antes de cada chamada. O chat profissional, a ajuda pública e a montagem compartilham essa mesma cota. A alternativa conta como outra requisição. A ajuda pública tem também um limite de seis chamadas por minuto por origem, registrada como hash, para preservar capacidade. HTTP 429 não provoca nova tentativa: o `Retry-After` é propagado ao painel e pausa consultas em todas as instâncias, sem impedir a edição local.
- Nome, contato, idade/medidas exatas, nomes de medicamentos, fotografias, textos livres da anamnese e registro clínico não são enviados. O campo opcional escrito pela profissional orienta a montagem e deve omitir identificação. Mesmo sem IA, bases por objetivo, editor, cálculos e exportações funcionam. Respostas recebidas após mudança da revisão ou da anamnese são descartadas.
- A disponibilidade gratuita é sujeita à conta e aos termos do serviço de prototipagem NVIDIA. Não há garantia de gratuidade ilimitada em produção. Erros ou respostas inválidas preservam o plano salvo.

Referências: [endpoint gratuito Nemotron Ultra](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b), [API do modelo](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-ultra-550b-a55b-infer), [alternativa Nemotron Super](https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b), [NVIDIA NIM](https://developer.nvidia.com/nim).

## Arquivos de entrega

O HTML contém CSS, JavaScript, fontes e imagens base64. Símbolos SVG reutilizam cada fotografia incorporada, reduzindo o arquivo; eles são contêineres das fotos reais, não desenhos dos alimentos. Tem navegação pelos dias, refeições concluídas por data, hidratação e diário local. A pessoa pode escolher somente as trocas revisadas pela nutricionista: fotografia, porção, macronutrientes, totais do dia e compras são recalculados conforme essas escolhas. As compras podem ser consultadas por dia ou pela semana e baixadas em texto.

**Salvar cópia com meu progresso** gera outro HTML completo com escolhas, marcações por data, água e diário incorporados. A cópia permite continuar em outro aparelho sem rede. As marcações também ficam no navegador quando o armazenamento local está disponível; se não estiver, o arquivo avisa e a cópia continua sendo uma opção para preservar o progresso. Dados corrompidos e escolhas fora das opções aprovadas são tratados sem impedir a abertura do plano.

O arquivo não transmite marcações, não faz conexões externas automáticas e respeita redução de movimento. Para usar a interatividade, abra o HTML em um navegador; alguns visualizadores de anexos não executam JavaScript. O diário offline não é enviado à nutricionista. O compartilhamento entre aparelhos é feito pela cópia exportada, sem sincronização em nuvem. As cópias contêm informações pessoais e precisam ser guardadas pela pessoa em local privado.

O PDF é gerado no servidor com PDFKit, fontes incorporadas, fotografias, porções, trocas e compras. Alimentos que aparecem apenas nas alternativas também recebem fotos em uma galeria própria. Refeições extensas podem continuar em outra página. Ambos omitem registro clínico privado, medicamentos livres, contatos e fotos anexadas; incluem nome, orientações e resumo público revisado. Este resumo traz as categorias estruturadas consideradas, critérios, entradas e resultados dos cálculos aplicados, método e origem das metas. Dados não calculados permanecem explicitamente ausentes. Autoria, fonte e licença das fotos acompanham as duas entregas.

`npm run nutrition:preview` cria exemplos **fictícios e explicitamente marcados como rascunho** em `tmp/nutrition/exemplo-plano.html` e `.pdf`. Não são prescrições. Tamanho e quantidade de páginas variam conforme alimentos, trocas e orientações; as prévias devem ser regeneradas após mudanças nas fotos ou nos modelos.

## Dados e configuração

As tabelas `nutrition_settings`, `nutrition_requests`, `nutrition_events`, `nutrition_checkins`, `nutrition_templates`, `nutrition_plan_versions`, `nutrition_ai_limit` e `nutrition_ai_chat_requests` são criadas de modo idempotente sob transação e trava no primeiro acesso à funcionalidade. A aplicação cifra anamnese, plano, relatos, modelos e versões com AES-256-GCM. Tokens de acesso são opacos e armazenados como hashes. Metadados comerciais não são cifrados pela aplicação. As rotas privadas são `noindex`, e APIs/downloads usam `no-store`.

Cada snapshot em `nutrition_plan_versions` tem chave composta `(request_id, revision, stage)`, motivo (`reason`), data (`created_at`) e o plano completo cifrado (`plan_encrypted`). A inserção é idempotente e acontece na mesma transação da alteração relevante. Rascunho e aprovação podem coexistir para a mesma revisão, preservando o registro de revisão profissional. O histórico não sobrescreve uma versão antiga.

O detalhe administrativo retorna apenas os metadados dos 40 snapshots mais recentes, além dos 30 eventos e 20 relatos mais recentes. `POST action=restore` recebe `id`, `revision` atual, `sourceRevision` e `sourceStage`; consulta o snapshot apenas dentro daquele atendimento, valida o plano para a pessoa e salva uma nova revisão em estado `draft`. O registro clínico continua privado, e a aprovação não é herdada. O desfazer local não substitui esse histórico persistente; ele é apagado ao salvar ou sair do atendimento.

Variáveis exclusivamente do servidor:

| Variável | Uso |
| --- | --- |
| `NVIDIA_NIM_API_KEY` | Credencial NVIDIA, sem prefixo `PUBLIC_` ou `VITE_`. |
| `NVIDIA_NIM_MODEL` | Legado; ignorado. Ultra e a alternativa Super são definidos no código. |
| `NUTRITION_DATA_KEY` | Chave de 32 bytes em base64. Deve ser preservada com o backup do banco; trocar sem migração torna os dados existentes ilegíveis. |
| `DATABASE_URL` | Postgres persistente já usado pelo projeto. |
| `INFINITEPAY_HANDLE`, `RECIPES_SITE_URL` | Conta recebedora e origem HTTPS, já existentes. |
| `RECIPES_ADMIN_*` | Autenticação administrativa existente. |
| `PUBLIC_WHATSAPP` | Número público já configurado no site. |

As três variáveis novas foram configuradas em `.env.local` e em **Production** no projeto Vercel vinculado. Os dois segredos foram salvos como Secret. Preview não recebeu as variáveis novas. O fluxo de publicação é branch → PR → verificações verdes → merge em `main`; a integração Git da Vercel publica o commit integrado. As credenciais não fazem parte do repositório nem do código entregue ao navegador.

A oferta inicia fechada. A nutricionista define preço, título, descrição, prazo e acompanhamento no próprio painel e decide quando abrir as solicitações. Alterações comerciais não exigem novo deploy. O desenvolvimento local lê `.env.local`; as chamadas da aplicação usam o banco indicado por `DATABASE_URL`. Os testes de fluxo usam exclusivamente um Postgres PGlite isolado em memória.

Rotas: `/api/nutrition?action=...`, `/api/admin/nutrition?action=...`; retorno da InfinitePay em `/api/nutrition/return`. O webhook usa segredo próprio do pedido e confirmação independente com o provedor. A implementação não gera cobranças reais durante testes automatizados, não envia mensagens WhatsApp e não manda notificações por e-mail para os planos personalizados.

## Verificações e fontes

- Lint, build de produção, pré-renderização e auditoria estática de links/SEO.
- CI em `.github/workflows/quality.yml`: Node 22/Python 3.12, instalação reproduzível pelo lockfile npm, lint, testes unitários, build e auditoria estática. Não executa Playwright.
- Testes unitários existentes e testes específicos de cálculos, 36 bases, variedade culinária, filtros combinados, equivalências e limites de porção, criptografia, IA, exportações e fluxo com banco isolado.
- Fluxo cobre oferta, consentimento, mudanças de preço, repetição de checkout/webhook, valor divergente, pagamento pendente, aprovação, concorrência, links de uso único, acompanhamento, revogação de acesso/IA e restauração de snapshots cifrados vinculados à pessoa correta.
- Testes do HTML em DOM isolado cobrem troca de alimentos e atualização de totais/compras, exportação e reabertura de progresso sem armazenamento local, dados corrompidos e escolha inválida. Não usam navegador ou Playwright.
- Verificação SSR isolada do painel cobriu a renderização do editor, 36 cartões de modelos, os sete dias, comparação de IA, seletor de trocas e bloqueio de restauração enquanto aprovado. Lint do JSX e verificação de espaços do diff também passaram.
- Chamadas reais à NVIDIA usaram apenas categorias fictícias; análise e variação estruturada válidas foram recebidas. Não foi realizado pagamento real na InfinitePay.
- Todas as páginas do PDF fictício foram renderizadas e inspecionadas. A reutilização de imagens foi conferida sem alteração visual. Não foram executados Playwright nem inspeções automatizadas de navegador, conforme `AGENTS.md`.

Limites atuais: a busca administrativa opera nos 40 atendimentos da página; eventos, relatos e snapshots exibem apenas os limites recentes descritos acima. Não há sincronização em nuvem do diário offline, prescrição de doses de medicamentos, importação de exames ou adaptação clínica automática de um modelo pessoal incompatível. O motor e a IA reduzem o trabalho de montagem, mas não substituem a revisão da nutricionista.

Dados nutricionais: [TACO, 4ª edição, NEPA/UNICAMP](https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf). Equação de repouso: [Mifflin et al., 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/). Integração financeira: [documentação InfinitePay](https://www.infinitepay.io/checkout-documentacao).

Fontes tipográficas seguem as licenças OFL em `public/fonts`. `scripts/build-nutrition-fonts.py` gera os TTF estáticos utilizados no PDF. O catálogo nutricional pode ser reproduzido com `scripts/import-nutrition-foods.py` a partir do PDF oficial; ele preserva os metadados das fotos já aprovadas. Consulte o manifesto fotográfico para origem e licença de cada imagem.
