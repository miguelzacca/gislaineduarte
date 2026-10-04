# Livro de receitas: imagens e contagem

Atualização local de 04/10/2026, solicitada pelo usuário.

O livro reúne **31 fichas: 30 preparações e uma variação do pão de abobrinha com farinha de amêndoas**. A variação tem ingredientes, alergênicos, lista de compras, preparo e identificação próprios. Substituições avulsas, opções de decoração e referências repetidas não são somadas como receitas adicionais. Site, área adquirida, HTML offline e PDF usam a mesma coleção e calculam o total a partir das fichas disponíveis.

As 21 fichas antes indisponíveis receberam complementos editoriais de medidas ou preparo. Os campos de validação conservam a origem e identificam os complementos; não se afirma teste em cozinha nem aprovação clínica profissional. A coleção GLP-1 conserva seu estado anterior.

Todas as imagens do livro mostram as preparações prontas. Foram geradas 23 imagens novas com a ferramenta imagegen integrada e reutilizadas sete imagens existentes das preparações. A chave OpenRouter não estava configurada no projeto. A imagem da variação de abobrinha compartilha a ilustração da preparação de base. O site e os arquivos identificam as imagens como ilustrações geradas com IA.

- Imagens novas: `public/images/recipes-editorial/`, versões de 480, 800 e 1200 pixels.
- Imagens existentes reutilizadas: `public/images/recipes/`.
- Prompts completos das imagens novas: `src/assets/recipes/editorial-prompts.json`.
- Direção visual: fotografia editorial de pratos prontos, louça clara, pedra e linho, luz natural lateral, texturas realistas, sem texto ou marcas.
- Livro gerado: `artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar.pdf` e HTML offline no mesmo diretório. O nome interno antigo foi preservado para manter compatibilidade.

O cadastro atualiza as fichas originais da edição anterior e suas imagens padrão, preservando receitas e fotografias personalizadas pela profissional. A atualização foi verificada em banco isolado. Foram conferidos o build, os oito testes de conteúdo do produto, o lint dos arquivos alterados, a presença das 31 receitas e imagens no PDF e a paridade com o HTML offline. As imagens e as páginas do PDF foram inspecionadas visualmente, sem testes automatizados de navegador.

Não houve deploy, push ou alteração no banco remoto.
