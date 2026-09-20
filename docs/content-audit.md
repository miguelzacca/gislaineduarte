# Auditoria de conteúdo, SEO e entidades

Fontes lidas integralmente: `briefing-site-gislaine-duarte (3).md` e `gislaine-duarte-identidade-visual_ainda_sem_icone.html`. Nenhum `AGENTS.md` encontrado no caminho do projeto. Dados pessoais e profissionais reproduzem o material da cliente; não houve verificação externa das credenciais.

## Fatos e dados configurados

- Nome: Gislaine Duarte; profissão: nutricionista; forma próxima: Nutri Gi.
- Domínio informado diretamente pelo usuário: `https://gislaineduarte.com.br`.
- WhatsApp final confirmado pelo usuário na conversa, substituindo o contato anterior: `47991913588`, normalizado como número brasileiro de 11 dígitos com DDD 47. Link internacional: `https://wa.me/5547991913588`. A normalização foi comunicada ao usuário.
- E-mail confirmado pelo usuário: `duartegisarte@gmail.com`.
- Formação informada: bacharel em Nutrição. Nutrição Estética e Nutrição Aplicada à Saúde da Mulher são pós-graduações em andamento.
- Biografia preserva origem gaúcha, fé cristã, casamento e empreendimento em produtos naturais, sem inferir localização de atendimento ou associar a consulta a compras.
- Serviços: consulta individual e ciclos de acompanhamento. Listas `confirmedDeliverables` permanecem vazias. Os blocos `steps` descrevem somente a proposta de cuidado já presente no briefing, sem anunciar procedimentos, encontros ou suporte.

Os dados estão em `src/data/site.js`, módulo ESM usado pelo gerador de HTML. `PUBLIC_WHATSAPP` (número brasileiro com DDD ou internacional completo), `PUBLIC_EMAIL` e `PUBLIC_INSTAGRAM` permitem substituir contatos por dados oficiais. A geração lê `.env` da raiz, e `envDir` mantém o mesmo diretório no Vite e na hidratação. Variáveis de contato vazias mantêm os contatos confirmados. Número ou e-mail com formato inválido interrompem o build para evitar um CTA quebrado. Instagram só é exposto quando existe URL HTTPS configurada. O `.env` local fornecido configura `https://www.instagram.com/nutri_gislaineduarte`; nenhum perfil foi inventado.

## Pendências da cliente

1. Aprovação editorial final da biografia, abordagem e textos de serviço; o próprio briefing os qualifica como propostas.
2. Região e identificação completa do CRN. O número recebido é 22562; `site.registration` continua `null` até confirmação. Não deduzir região pela origem gaúcha.
3. Denominação definitiva das duas formações em andamento.
4. Duração dos ciclos: mensagem escrita informa 3 ou 5 meses; referência em vídeo menciona 3 ou 6 meses. Nenhuma duração aparece como oferta.
5. Inclusões, frequência, quantidade de encontros, suporte, preços, pagamento e modalidades. Nenhum plano alimentar, exame ou avaliação instrumental foi presumido.
6. Cidade, endereço e área de atendimento. SEO local não é inferido. `sameAs` usa somente o Instagram explicitamente configurado, quando houver.
7. Materiais: aprovar títulos, conteúdo, arquivos, capas, destinos e disponibilidade. Arrays `materials` e `articles` estão vazios; nenhum download ou artigo simulado.
8. Revisão do material originalmente chamado “Desparasitação Natural” e dos textos sobre chás, suplementos e emagrecimento antes de qualquer publicação.

## Conteúdo e indexação

Sete URLs institucionais reais previstas: `/`, `/sobre/`, `/atendimentos/`, `/atendimentos/consulta-nutricional/`, `/atendimentos/ciclos-de-acompanhamento/`, `/contato/`, `/privacidade/`. Nenhuma rota de materiais vazios, artigos fictícios, busca interna ou localização não confirmada. A página 404 é excluída do sitemap.

`buildMetadata` gera canonical absoluto com barra final, título por página, descrição, locale, robots e dados da imagem social. `PUBLIC_SITE_NOINDEX=true`, modo dev, previews Vercel e previews/branches Netlify produzem `noindex, nofollow`. O robots mantém rastreamento permitido para que o robô possa ler o `noindex`; nos previews omite o sitemap. A hospedagem de preview também pode exigir autenticação se o conteúdo precisar ser privado.

O sitemap tem somente as rotas públicas configuradas, sem datas artificiais de atualização. A imagem social esperada é `/images/og-gislaine-duarte.jpg` (1200 × 630). A fotografia nos dados estruturados é `/images/gislaine-duarte-960.webp`. Ambos os arquivos devem existir na verificação de build.

## Dados estruturados

`buildJsonLd` conecta `Person`, `WebSite`, `WebPage` (ou `AboutPage`/`ContactPage`), `Service`, `BreadcrumbList` e `FAQPage` quando as perguntas forem fornecidas e estiverem visíveis. Usa IDs estáveis no domínio canônico. O provider de `Service` é `Person`, tipo aceito pelo Schema.org. Não há entidade de clínica ou organização presumida, preços, localização, reviews, notas, titulação concluída indevida ou alegação de resultado.

O FAQ usa as mesmas respostas exibidas na interface. Sua marcação melhora a estrutura sem prometer rich results. Renderizar JSON-LD com `serializeJsonLd`, que escapa caracteres com significado HTML antes de inserir o conteúdo no `<script type="application/ld+json">`.

Referências técnicas consultadas: [Person](https://schema.org/Person), [Service](https://schema.org/Service) e [documentação de robots do Google](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

### Verificação realizada em 20 de setembro de 2026

- `node --check` passou nos três módulos JavaScript.
- Asserções Node passaram para sete rotas únicas, contatos reais, mensagens contextuais por serviço, canonical sem parâmetros/fragmentos, omissão de CRN incompleto, arrays de entregas vazios, FAQ, sitemap, preview `noindex` e escaping de JSON-LD.
- [Schema.org Validator](https://validator.schema.org/): uma amostra produzida por `buildJsonLd`, reunindo os tipos usados pela aplicação, retornou **0 erros e 0 avisos**. Person, WebSite e WebPage/FAQPage aparecem como itens de topo; Service e BreadcrumbList são entidades ligadas.
- [Google Rich Results Test](https://search.google.com/test/rich-results/result?id=yQPfzVEWxgRkVVNcuiz6OQ): o mesmo código retornou **1 item válido**, relativo a BreadcrumbList.

Os testes externos acima validam o código gerado, não uma página já publicada nem a elegibilidade editorial para aparição na busca. Após integração, a auditoria local do build final confirmou que o grafo foi inserido corretamente e que perguntas, breadcrumbs e informações correspondentes permanecem visíveis no HTML. O telefone atualizado e o perfil social configurado também foram conferidos pelo audit.

## AEO e GEO

Perguntas naturais e respostas diretas usam HTML visível. Definições dos serviços não prometem benefícios clínicos. `/llms.txt` resume identidade, escopo, formação em andamento e URLs canônicas; não cria páginas indexáveis duplicadas nem promete presença em respostas de IA. O contrato de conteúdo documentado junto a `articles` exige autoria, publicação, revisão profissional e referências para futuros conteúdos aprovados.

`src/lib/discovery.js` exporta `buildRobots()`, `buildSitemap()` e `buildLlms()`, todas retornando strings que o gerador salva nos arquivos públicos correspondentes. Esses módulos são JavaScript. A interface usa Vite + React com componentes JSX reais, pré-renderizados no build e hidratados no navegador.

## Limites de lançamento

Os canais de contato estão confirmados e permitem pedidos contextuais de orçamento. O registro completo e a aprovação editorial permanecem pendentes; construir e testar o site não equivale a aprovação profissional ou autorização para deploy. Não publicar credenciais incompletas para preencher essa ausência.
