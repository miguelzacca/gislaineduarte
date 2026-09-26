# Consultório e planos alimentares

Implementação em Vite + React, JavaScript/JSX, Functions Node e no Postgres já utilizado pelo projeto. O design mantém verde, marfim, dourado, Cormorant e Manrope. A gestão anterior de produtos e vendas continua disponível no painel.

## Fluxo da pessoa atendida

1. A página inicial e o menu levam a `/plano-alimentar`. A oferta só aceita solicitações quando a nutricionista define e publica preço, prazo em dias corridos e acompanhamento em `/painel` → **Minha oferta**. Não há valores comerciais fictícios publicados.
2. A anamnese para adultos tem cinco etapas: identificação, medidas/objetivo, saúde, rotina/preferências e revisão/consentimento. Dados não enviados ficam apenas na memória da página. IA tem autorização opcional, separada do atendimento.
3. O servidor valida e cifra a anamnese. Confere se os termos exibidos ainda são atuais antes de gravar o pedido; alterações de oferta exigem nova confirmação, preservando as respostas. Cada pedido conserva sua oferta e a InfiniteTag original.
4. O checkout hospedado da InfinitePay recebe e-mail, valor e identificação do pedido, sem informações de saúde. Pix e outras modalidades dependem da conta InfinitePay. Tentativas repetidas reutilizam o mesmo link.
5. Webhook e retorno consultam `payment_check` no servidor. Parâmetros do navegador nunca bastam para marcar pagamento. Após a confirmação, uma semana de rascunho é montada com o modelo inicial e os filtros compatíveis com os dados estruturados.
6. O retorno chega a `/meu-plano`. Após consultar pagamento confirmado, a página abre o WhatsApp configurado em cinco segundos, oferecendo a opção de permanecer. A mensagem é preparada no WhatsApp; o aplicativo não a envia automaticamente. Nas visitas seguintes, não há novo redirecionamento automático.
7. Os downloads aparecem somente depois da aprovação profissional. O paciente pode enviar relatos durante os dias de acompanhamento contratados, contados da primeira liberação. Novas revisões não reiniciam o prazo. Links privados de recuperação valem sete dias e são consumidos uma vez, substituindo o acesso anterior.
8. O paciente pode desativar novas solicitações de IA. Encerrar o acesso invalida a sessão no banco e apaga o cookie.

## Fluxo no painel

**Atendimentos** reúne anamneses, situação do pagamento, rascunhos, planos liberados, relatos e histórico de eventos. A busca e os filtros atuam sobre a página de 40 registros carregada.

Há 36 bases de organização: 12 contextos × três variações de rotina. Os contextos são rotina equilibrada, diabetes, cardiovascular, hipertensão, renal, oncologia, intestinal, gástrico, H. pylori, lactose, doença celíaca e GLP-1. São pontos de partida para revisão clínica; não são protocolos terapêuticos validados nem garantias de adequação a um diagnóstico.

O editor permite trabalhar os sete dias, horários, refeições, gramas, orientações e até três alternativas por item. Inclui troca por energia, proteína ou carboidrato, duplicação de um dia, ajuste proporcional da semana à meta energética, lista de compras e modelos próprios reutilizáveis. Filtros consideram dieta vegetariana/vegana, alérgenos, glúten, lactose e alimentos excluídos. Restrições escritas em texto livre precisam de conferência profissional. Os modelos próprios preservam refeições e orientações; removem metas e registro clínico. É necessário retirar informações pessoais das orientações antes de reutilizá-las.

O catálogo tem 60 alimentos com ilustrações autorais locais e valores da TACO por 100 g: energia, macronutrientes, fibras, sódio, potássio e fósforo. Página, número e nome na fonte acompanham cada item. Valores ausentes de minerais aparecem como soma parcial, não como zero garantido. Medidas caseiras são aproximações; preparos, rótulos e sal adicionado podem alterar a composição. As imagens são ilustrações, não fotografias nem representações da porção.

As calculadoras incluem IMC, repouso por Mifflin–St Jeor, gasto com fator de atividade, mudança relativa de peso, relações cintura/quadril e cintura/altura, massa livre de gordura a partir do percentual informado, proteína em g/kg, água em ml/kg e distribuição energética de macros. Metas são escolhidas pela profissional. Nenhum déficit, meta hídrica ou proteína é prescrito automaticamente.

**Revisão e entrega** exige pagamento confirmado, plano válido, metas de energia/proteína, registro clínico e confirmação dos alertas aplicáveis. Registro clínico é privado. Reabrir uma versão suspende novos downloads até aprovação; arquivos já baixados não podem ser recolhidos. Revisões concorrentes são recusadas pelo número da versão, e mudanças não salvas têm proteção de navegação.

## NVIDIA NIM

- Modelo configurado: `nvidia/nemotron-3-super-120b-a12b`, com inferência no servidor, timeout e limite de solicitações.
- **Analisar com IA:** resume categorias estruturadas, sugere até três modelos e perguntas/pontos de personalização.
- **Sugerir variações:** usa resposta JSON com esquema para selecionar trocas em alimentos permitidos, do mesmo grupo. O servidor valida IDs, posições, repetição e restrições; calcula as porções por energia usando a TACO. A candidata pode ser inspecionada, descartada ou aplicada ao rascunho antes de salvar.
- Nome, contato, idade/medidas exatas, medicamentos, textos livres e registro clínico não são enviados. Mesmo sem IA, editor, modelos, cálculos e exportações funcionam.
- A disponibilidade gratuita é sujeita à conta e aos termos do serviço de prototipagem NVIDIA. Não há garantia de gratuidade ilimitada em produção. Erros ou respostas inválidas preservam o plano salvo.

Referências: [API do modelo](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b-infer), [model card e termos](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b), [NVIDIA NIM](https://developer.nvidia.com/nim).

## Arquivos de entrega

O HTML contém CSS, JavaScript, fontes e imagens base64. Símbolos SVG reutilizam cada imagem incorporada, reduzindo o arquivo. Tem navegação pelos dias, refeições concluídas por data, hidratação, compras e diário local. Funciona sem rede, não transmite marcações e respeita redução de movimento. Para usar a interatividade, abra o arquivo em um navegador; alguns visualizadores de anexos não executam JavaScript. Armazenamento local pode ser indisponível em alguns navegadores, e nesse caso o aviso informa que as marcações duram apenas durante a abertura.

O PDF é gerado no servidor com PDFKit, fontes incorporadas, ilustrações, porções, trocas e compras. Refeições extensas podem continuar em outra página. Ambos omitem o registro clínico, medicamentos, contato e anamnese; incluem o nome e as orientações destinadas à pessoa.

`npm run nutrition:preview` cria exemplos **fictícios e explicitamente marcados como rascunho** em `tmp/nutrition/exemplo-plano.html` e `.pdf`. Não são prescrições. O exemplo verificado tem 10 páginas, HTML de aproximadamente 398 KiB e PDF de 228 KiB.

## Dados e configuração

As tabelas `nutrition_settings`, `nutrition_requests`, `nutrition_events`, `nutrition_checkins` e `nutrition_templates` são criadas de modo idempotente sob transação e trava no primeiro acesso à funcionalidade. A aplicação cifra anamnese, plano, relatos e modelos com AES-256-GCM. Tokens de acesso são opacos e armazenados como hashes. Metadados comerciais não são cifrados pela aplicação. As rotas privadas são `noindex`, e APIs/downloads usam `no-store`.

Variáveis exclusivamente do servidor:

| Variável | Uso |
| --- | --- |
| `NVIDIA_NIM_API_KEY` | Credencial NVIDIA, sem prefixo `PUBLIC_` ou `VITE_`. |
| `NVIDIA_NIM_MODEL` | Identificador do modelo hospedado. |
| `NUTRITION_DATA_KEY` | Chave de 32 bytes em base64. Deve ser preservada com o backup do banco; trocar sem migração torna os dados existentes ilegíveis. |
| `DATABASE_URL` | Postgres persistente já usado pelo projeto. |
| `INFINITEPAY_HANDLE`, `RECIPES_SITE_URL` | Conta recebedora e origem HTTPS, já existentes. |
| `RECIPES_ADMIN_*` | Autenticação administrativa existente. |
| `PUBLIC_WHATSAPP` | Número público já configurado no site. |

Nesta implementação, as três variáveis novas foram configuradas em `.env.local` e em **Production** no projeto Vercel vinculado. Os dois segredos foram salvos como Secret. Não houve deploy nem push; um novo deployment autorizado é necessário para executar o código e carregar as variáveis novas. Preview não recebeu as variáveis novas.

A oferta inicia fechada. A nutricionista define preço, título, descrição, prazo e acompanhamento no próprio painel e decide quando abrir as solicitações. Alterações comerciais não exigem novo deploy. O desenvolvimento local lê `.env.local`; as chamadas da aplicação usam o banco indicado por `DATABASE_URL`. Os testes de fluxo usam exclusivamente um Postgres PGlite isolado em memória.

Rotas: `/api/nutrition?action=...`, `/api/admin/nutrition?action=...`; retorno da InfinitePay em `/api/nutrition/return`. O webhook usa segredo próprio do pedido e confirmação independente com o provedor. A implementação não gera cobranças reais durante testes automatizados, não envia mensagens WhatsApp e não manda notificações por e-mail para os planos personalizados.

## Verificações e fontes

- Lint, build de produção, pré-renderização e auditoria estática de links/SEO.
- Testes unitários existentes e testes específicos de cálculos, 36 bases, restrições, criptografia, IA, exportações e fluxo com banco isolado.
- Fluxo cobre oferta, consentimento, mudanças de preço, repetição de checkout/webhook, valor divergente, pagamento pendente, aprovação, concorrência, links de uso único, acompanhamento e revogação de acesso/IA.
- Chamadas reais à NVIDIA usaram apenas categorias fictícias; análise e variação estruturada válidas foram recebidas. Não foi realizado pagamento real na InfinitePay.
- Todas as páginas do PDF fictício foram renderizadas e inspecionadas. A reutilização de imagens foi conferida sem alteração visual. Não foram executados Playwright nem inspeções automatizadas de navegador, conforme `AGENTS.md`.

Dados nutricionais: [TACO, 4ª edição, NEPA/UNICAMP](https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf). Equação de repouso: [Mifflin et al., 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/). Integração financeira: [documentação InfinitePay](https://www.infinitepay.io/checkout-documentacao).

Fontes tipográficas seguem as licenças OFL em `public/fonts`. `scripts/build-nutrition-fonts.py` gera os TTF estáticos utilizados no PDF, e `scripts/build-food-art.mjs` reproduz as ilustrações. O catálogo pode ser reproduzido com `scripts/import-nutrition-foods.py` a partir do PDF oficial.
