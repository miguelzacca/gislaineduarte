# Assets e preservação da fotografia

## Fontes

- `profile_foto.jpeg`: fotografia fornecida no repositório, 960 × 1280.
- `icone.png`: símbolo fornecido, analisado visualmente antes da reconstrução vetorial.
- HTML de identidade: verde `#173F35`, folha `#496B56`, dourado `#B69A58`, sálvia `#A6B49A`, marfim `#F5F1E8`.
- Fontes Cormorant Garamond e Manrope via Fontsource; arquivos WOFF2 locais e licenças OFL incluídas.

## Remoção do cenário

Foi usada a ferramenta integrada de edição de imagem, conforme a habilidade imagegen, para criar uma máscara transparente. O resultado ficou em `src/assets/gislaine-cutout-mask-source.png`. Ele **não é o retrato apresentado**: somente o canal alfa foi extraído, redimensionado e unido aos canais RGB de `profile_foto.jpeg`. Isso mantém os pixels originais do rosto, pele, óculos, cabelo, roupa, mãos, mesa e notebook. Não há reconstrução de rosto na fotografia final.

O script `scripts/prepare-assets.mjs` é reproduzível e mantém a fonte original. O PNG mestre resultante é `src/assets/gislaine-duarte-recorte.png`; os derivados web são comprimidos com perdas em formatos próprios para navegação. A fotografia foi inspecionada na composição final sobre marfim e sálvia.

Verificação dos canais RGB do PNG mestre: 821.351 pixels retidos (alfa maior que zero), **zero canais RGB alterados** em relação à fotografia original. Os hashes Git da fotografia e do ícone originais permanecem idênticos aos arquivos de entrada.

### Prompt efetivamente usado na ferramenta integrada

> Use case: background-extraction. Image 1 is the edit target: the supplied real photograph of Gislaine Duarte. Create a genuinely transparent-background PNG cutout for her professional website hero. Remove ONLY the room background: wall, old logo and all wall text, frame, background shelves and books, chair background, plants. Keep the actual photographed woman absolutely unchanged: exact original face, facial structure, glasses, eyes, skin texture, smile/teeth, hair, white blazer, patterned blouse, jewelry, body proportions, pose, hands, camera angle and lighting. Keep the foreground desk, laptop, notebook and pen in their exact original positions; the plant at bottom right may be removed. Preserve natural fine hair edges. Do not reconstruct, beautify, redraw or change her face. Do not invent additional body or objects. Same original composition and aspect ratio 3:4. Actual transparent alpha outside the retained person and foreground desk, not a checkerboard baked into pixels. No new text, no new logos, no background. Source is 960x1280; retain exact framing.

## Símbolo

Vetorização manual em quatro partes: casca/talo, folha, polpa e semente. Os furos usam `evenodd`, não pixels brancos nem PNG em base64. SVG e Three.js compartilham a geometria; o original está preservado.

## Imagem social

Composição determinística de marca, tipografia e recorte, gerada com Sharp em 1200 × 630. Não acrescenta credenciais, serviços ou fatos profissionais.
