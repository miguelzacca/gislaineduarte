# Retrato da Gislaine para o Hero de receitas

- Modo: ferramenta integrada `imagegen`, edição com preservação de identidade.
- Referência: `profile_foto.jpeg`.
- Original editado: `gislaine-cozinheira.png` (1086 × 1448, transparência real).
- Derivados: `public/images/recipes/gislaine-cozinheira-{360,540,720,960}.{webp,avif}`.
- Regeneração dos derivados: `npm run assets`.

## Primeira edição: roupa de cozinha

Use case: identity-preserve.
Asset type: transparent portrait cutout for an existing recipe collection website hero.
Input image 1 is the edit target, the original photograph of Gislaine Duarte.
Primary request: Edit her clothing to look like a cook. Replace the white business blazer and patterned blouse with a natural sand-beige kitchen shirt with sleeves to the wrists and a clearly visible dark forest-green cotton bib apron, with realistic neck strap, seams, soft fabric folds and a plain practical front pocket. Keep her exact identity, face, glasses, smile, teeth, skin texture and skin tone, age, long hair, head angle, body proportions, arm position and visible hand unchanged. Preserve the original photographic light and natural realism; do not beautify or reinterpret her face.
Scene/backdrop: Isolate the same woman onto a truly transparent RGBA background, carefully retaining hair edges. Remove the office background and foreground objects (desk, notebook, laptop and plant) so only Gislaine is present. Keep the original head-to-waist portrait crop and enough of the apron to read immediately as cooking attire. No added props, hats, jewelry, text, logos, watermark or extra people. Do not create a kitchen scene. Deliver one high-quality portrait PNG with genuine alpha transparency.

## Edição final: bolinho na mão

Referência adicional: `src/assets/recipes/original/bolinho-coco-maca.png`.

Use case: identity-preserve.
Asset type: transparent portrait cutout for the existing recipe collection website hero.
Input image 1: EDIT TARGET — current finished transparent portrait of Gislaine Duarte in a beige kitchen shirt and dark forest-green apron. Input image 2: SUPPORTING FOOD REFERENCE ONLY — photo of the collection's little coconut-and-apple cake.
Primary request: Keep image 1 the same except adapt the visible hand and forearm naturally so Gislaine holds ONE small homemade coconut-and-apple bolinho from image 2, clearly and gently in her hand in front of the left/central part of her apron, raised to about lower chest or upper waist height. The cake should be golden brown with a little coconut on top, bite-sized, physically resting in her hand with believable fingers, contact shadows and scale. Keep the cake and hand away from the far right side because recipe cards will overlap there in the website layout.
Invariants: Gislaine's exact identity, face, glasses, smile, teeth, skin texture and tone, hair, head position, beige shirt, dark green apron, seams, cloth texture, lighting, photographic realism and overall portrait framing must remain the same. Her other arm remains unchanged. Do not add a plate, cupcake paper, other food, props, text, logos or other people. Preserve the genuinely transparent RGBA background and natural hair edges. Deliver a high-quality portrait PNG with true alpha transparency.
