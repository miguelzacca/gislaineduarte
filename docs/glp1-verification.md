# Verificação local — À mesa com GLP-1

Data: 04/10/2026. Edição: outubro de 2026.

## Resultado

- Build Vite + React concluído; prévias e arquivos gerados.
- ESLint dos arquivos envolvidos e `git diff --check` sem erros.
- 39 verificações de conteúdo, acesso por produto, edição no Postgres isolado e funcionamento do HTML passaram. Depois do ajuste do indicador de revisão profissional, as 9 verificações de edição passaram novamente.
- A verificação da prévia e do bundle passou após o build final: o guia integral e os modos de preparo GLP-1 não estão nas páginas públicas ou nos arquivos JavaScript enviados ao visitante.
- PDF com 60 páginas A4, 30 receitas ilustradas, texto extraível, metadados e links. Todos os 30 links das receitas e os 11 links dos capítulos apontam para as páginas corretas. Há 50 destinos internos.
- As 60 páginas foram renderizadas e inspecionadas em folhas de contato, com conferência ampliada da capa, receitas, capítulos e fichas de apoio. Notas isoladas e sobreposição nas fichas foram corrigidas. A inspeção de limites de texto não encontrou conteúdo fora da página.
- HTML com 30 fichas, 11 capítulos e as 8 bebidas; imagens e fontes incorporadas, sem recursos externos obrigatórios nem pedidos de rede para usar o livro.
- Arquivos protegidos dentro de 4,5 MB: PDF com aproximadamente 2,37 MB e HTML com 3,22 MB.
- ZIP com 36 arquivos: PDF, HTML, conteúdo estruturado, dois documentos de apoio, imagem de divulgação e 30 JPGs. CRCs e correspondência dos arquivos PDF/HTML com a entrega local verificados.

## Limites desta verificação

Não foram executados Playwright, E2E ou inspeções automatizadas de navegador, conforme `AGENTS.md`. Não houve pagamento real, envio de mensagens, alteração do banco remoto, deploy ou push.

As verificações técnicas não substituem revisão nutricional ou teste culinário. Essas etapas continuam sem registro e estão indicadas no [roteiro de revisão](glp1-product.md). As imagens são ilustrações geradas com IA.
