import { randomUUID } from 'node:crypto';
import { allRecipes, recipeProducts, recipeProductById, formatIngredient, buildProtectedProductPayload, buildPublicProductPreview, recipeAllergens } from '../../src/data/recipes-product.js';
import { curatedImageAllowed } from '../../src/lib/nutrition-clinical.js';

export async function initializeRecipeContent(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS recipe_content (
    id text PRIMARY KEY, data jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.query('ALTER TABLE recipe_content ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1');
  await db.query(`INSERT INTO recipe_content(id, data)
    SELECT value->>'id', value FROM jsonb_array_elements($1::jsonb)
    ON CONFLICT (id) DO NOTHING`, [JSON.stringify(allRecipes)]);
}

export async function readRecipeRecords(db) {
  const records = await db.query('SELECT data, revision FROM recipe_content ORDER BY id');
  return records.rows.map(row => ({ ...row.data, revision: row.revision }));
}

export async function readRecipeProduct(db, productId, { publicPreview = false } = {}) {
  const base = recipeProductById(productId);
  if (!base) return null;
  const [metadata, records] = await Promise.all([
    db.query('SELECT title, description FROM recipe_products WHERE id = $1', [productId]),
    readRecipeRecords(db),
  ]);
  const product = { ...base, ...metadata.rows[0], recipes: records.filter(recipe => recipe.productIds.includes(productId) && recipe.published === true) };
  return publicPreview ? buildPublicProductPreview(product) : buildProtectedProductPayload(product);
}

export function editableRecipe(recipe) {
  return { ...recipe, title: recipe.name, summary: recipe.introduction, ingredientsText: recipe.ingredients.map(item => formatIngredient(item)).join('\n'), preparationText: recipe.preparation.join('\n'), imageUrl: recipe.image.src, imageAlt: recipe.image.alt, imageAuthor: recipe.image.credit?.author || '', imageSource: recipe.image.credit?.sourceUrl || '', imageLicense: recipe.image.credit?.license || '', note: recipe.notes.join('\n'), prepMinutes: recipe.time.totalMinutes, servings: recipe.servings || null };
}

const text = (value, limit) => String(value ?? '').trim().slice(0, limit);
const lines = (value, max = 60) => String(value || '').split('\n').map(line => line.trim()).filter(Boolean).slice(0, max);

export function normalizeRecipeEdit(input, previous = null) {
  const id = previous?.id || text(input.id, 100) || `recipe-${randomUUID()}`;
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(id)) throw new Error('Identificador inválido.');
  const name = text(input.title ?? input.name ?? previous?.name, 180);
  const category = input.category ?? previous?.category ?? 'salgada';
  const productIds = input.productIds ?? previous?.productIds ?? [];
  if (name.length < 3 || !['doce', 'salgada', 'bebida'].includes(category)) throw new Error('Informe título e categoria válidos.');
  if (!Array.isArray(productIds) || !productIds.length || productIds.some(value => !recipeProducts.some(product => product.id === value))) throw new Error('Selecione pelo menos um livro válido.');
  const ingredientsText = input.ingredientsText;
  const unchangedIngredients = previous && ingredientsText === editableRecipe(previous).ingredientsText;
  const ingredients = ingredientsText === undefined || unchangedIngredients ? previous?.ingredients || [] : lines(ingredientsText).map((display, index) => ({ id: `ingredient-${index + 1}`, quantity: null, display, shoppingKey: display.toLocaleLowerCase('pt-BR'), section: 'Ingredientes' }));
  const preparation = input.preparationText === undefined ? previous?.preparation || [] : lines(input.preparationText);
  const imageUrl = text(input.imageUrl ?? previous?.image?.src, 1500);
  const imageAlt = text(input.imageAlt ?? previous?.image?.alt, 500);
  if (!imageUrl || !curatedImageAllowed(imageUrl)) throw new Error('Use uma fotografia JPG, PNG ou WebP em /images/ ou HTTPS de images.unsplash.com ou images.pexels.com.');
  const published = input.published === undefined ? Boolean(previous?.published) : input.published === true;
  if (published && (!ingredients.length || !preparation.length || !imageAlt)) throw new Error('Para publicar, complete ingredientes, preparo e descrição da fotografia.');
  const servings = input.servings === undefined ? previous?.servings || null : input.servings === '' || input.servings === null ? null : Number(input.servings);
  if (servings !== null && (!Number.isFinite(servings) || servings <= 0 || servings > 1000)) throw new Error('Rendimento inválido.');
  let nutrition = input.nutrition === undefined ? previous?.nutrition || null : input.nutrition;
  if (nutrition && Object.values(nutrition).some(value => value !== '' && value != null)) {
    nutrition = { kcal: Number(nutrition.kcal), protein: Number(nutrition.protein), carbs: Number(nutrition.carbs), fat: Number(nutrition.fat), source: text(nutrition.source, 1000) };
    if (!servings || !nutrition.source || ['kcal','protein','carbs','fat'].some(key => !Number.isFinite(nutrition[key]) || nutrition[key] < 0 || nutrition[key] > 10000)) throw new Error('Informe rendimento, valores por porção e fonte do cálculo nutricional.');
  } else nutrition = null;
  const prepMinutes = Number(input.prepMinutes ?? previous?.time?.totalMinutes ?? 0);
  if (!Number.isFinite(prepMinutes) || prepMinutes < 0 || prepMinutes > 10080) throw new Error('Tempo de preparo inválido.');
  return {
    ...(previous || {}), id, slug: previous?.slug || id, name, category,
    introduction: text(input.summary ?? previous?.introduction, 2000), ingredients, preparation,
    productIds: [...new Set(productIds)], published, servings, yield: servings ? `${servings} porções` : previous?.yield || null,
    nutrition, time: { label: prepMinutes ? `Aproximadamente ${prepMinutes} minutos` : 'Tempo não informado', totalMinutes: prepMinutes, approximate: true, inferred: false },
    equipment: previous?.equipment || [], notes: input.note === undefined ? previous?.notes || [] : lines(input.note, 30), substitutions: previous?.substitutions || [],
    allergenIds: Array.isArray(input.allergenIds) ? [...new Set(input.allergenIds.filter(value => Object.hasOwn(recipeAllergens, value)))] : previous?.allergenIds || [],
    tags: previous?.tags || [category], editorialContext: previous?.editorialContext || 'Receita educativa revisada pela profissional.',
    image: { ...(imageUrl === previous?.image?.src ? previous.image : { src: imageUrl, width: 960, height: 720, reference: false }), alt: imageAlt, credit: { ...(imageUrl === previous?.image?.src ? previous.image.credit : {}), author: text(input.imageAuthor ?? previous?.image?.credit?.author, 200) || 'Fotografia cadastrada pela profissional', sourceUrl: text(input.imageSource ?? previous?.image?.credit?.sourceUrl, 1500), license: text(input.imageLicense ?? previous?.image?.credit?.license, 300) } },
    validation: { ...(previous?.validation || {}), status: published ? 'professional-reviewed' : 'draft', reviewedAt: published ? new Date().toISOString() : null, source: previous?.validation?.source || 'Cadastro no painel da profissional', inferredFields: previous?.validation?.inferredFields || [] },
  };
}
