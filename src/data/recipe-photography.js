const legacySlugs = new Set(['bolinho-cacau-curcuma', 'bolinho-coco-maca', 'bolo-maca', 'paozinho-fitness', 'pao-abobrinha', 'paozinho-tapioca', 'torta-frango']);

export function recipePhotograph(slug, name) {
  const photoSlug = slug === 'pao-abobrinha-amendoas' ? 'pao-abobrinha' : slug;
  const legacy = legacySlugs.has(photoSlug);
  const directory = legacy ? 'recipes' : 'recipes-editorial';
  const src = `/images/${directory}/${photoSlug}-${legacy ? '800.webp' : '1200.jpg'}`;
  return {
    src, original: `public${src}`, pdf: `public${src}`,
    width: legacy ? 800 : 1200, height: legacy ? 1200 : 900,
    ...(legacy ? {
      srcSet: [480, 800, 1024].map(width => `/images/recipes/${photoSlug}-${width}.webp ${width}w`).join(', '),
      avifSrcSet: [480, 800, 1024].map(width => `/images/recipes/${photoSlug}-${width}.avif ${width}w`).join(', '),
    } : {
      srcSet: [480, 800, 1200].map(width => `/images/recipes-editorial/${photoSlug}-${width}.jpg ${width}w`).join(', '),
    }),
    alt: `Imagem ilustrativa de ${name.toLocaleLowerCase('pt-BR')}, mostrando a preparação pronta.`,
    generated: true, reference: false,
    credit: { author: 'Imagem ilustrativa gerada com IA', license: 'Uso editorial no projeto' },
  };
}
