import { createHmac, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { cookie, isSecureRequest, parseCookieHeader, randomToken, safeEqual, tokenHash } from '../recipes/access.js';
import { readCommerceConfig } from '../recipes/config.js';
import { checkPayment, createPaymentLink } from '../recipes/infinitepay.js';
import { transaction } from '../recipes/store.js';
import { consentVersion } from '../../src/data/nutrition.js';
import { generatePlan, intakeErrors, sanitizeIntake, validatePlan } from '../../src/lib/nutrition.js';
import { dataKey, event, seal, unseal } from './store.js';

export const nutritionCookie = 'gd_nutrition';
// Includes two optional JPEGs encoded as base64 and the intake fields.
export const nutritionIntakeBodyLimit = 650 * 1024;
export class NutritionError extends Error {
  constructor(message, status = 400, fields) { super(message); this.status = status; this.fields = fields; }
}
export function accessCookie(token, request, env) {
  return cookie(nutritionCookie, token, { maxAge: 90 * 86400, secure: isSecureRequest(request, env) }).replace('Path=/', 'Path=/api/nutrition');
}
export function commerceReady(env) {
  const config = readCommerceConfig(env);
  try { dataKey(env); } catch { return false; }
  return Boolean(env.DATABASE_URL && config.origin && /^[a-z0-9_.-]{3,64}$/i.test(config.handle));
}
export function validOffer(offer) {
  return Boolean(offer) && typeof offer.title === 'string' && offer.title.trim().length >= 3 && offer.title.length <= 120 &&
    typeof offer.description === 'string' && offer.description.length <= 1000 &&
    typeof offer.published === 'boolean' && (offer.bristolReviewed === undefined || typeof offer.bristolReviewed === 'boolean') &&
    (offer.priceCents === null || Number.isSafeInteger(offer.priceCents) && offer.priceCents >= 100 && offer.priceCents <= 10000000) &&
    (offer.deliveryDays === null || Number.isInteger(offer.deliveryDays) && offer.deliveryDays >= 1 && offer.deliveryDays <= 90) &&
    (offer.followupDays === null || Number.isInteger(offer.followupDays) && offer.followupDays >= 0 && offer.followupDays <= 365) &&
    (!offer.published || offer.priceCents !== null && offer.deliveryDays !== null && offer.followupDays !== null);
}
export async function readOffer(db) { return (await db.query('SELECT offer FROM nutrition_settings WHERE id = 1')).rows[0].offer; }
export function publicOffer(offer) {
  if (!offer) return null;
  return Object.fromEntries(['title', 'description', 'priceCents', 'deliveryDays', 'followupDays', 'published', 'bristolReviewed'].map(key => [key, key === 'bristolReviewed' ? offer[key] === true : offer[key]]));
}
export function followupStatus(patient, now = Date.now()) {
  const days = Number(patient.offer_snapshot?.followupDays || 0);
  const delivered = patient.first_delivered_at ? new Date(patient.first_delivered_at).getTime() : null;
  const ends = delivered && days > 0 ? delivered + days * 86400000 : null;
  return { firstDeliveredAt: patient.first_delivered_at || null, followupEndsAt: ends ? new Date(ends).toISOString() : null,
    followupAvailable: patient.payment_status === 'paid' && Boolean(ends && now < ends) };
}
export async function readPatient(request, db) {
  const token = parseCookieHeader(request.headers.get('cookie'))[nutritionCookie];
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return (await db.query('SELECT * FROM nutrition_requests WHERE access_hash = $1 AND access_expires_at > now()', [tokenHash(token)])).rows[0] || null;
}

export async function createIntake(body, request, { db, env }) {
  const errors = intakeErrors(body.intake);
  if (Object.keys(errors).length) throw new NutritionError('Confira os campos indicados.', 400, errors);
  if (!/^[a-f0-9-]{36}$/i.test(body.idempotencyKey || '')) throw new NutritionError('Atualize a página e tente novamente.');
  if (!commerceReady(env)) throw new NutritionError('O atendimento online ainda está sendo preparado. Tente novamente mais tarde.', 503);
  const offer = await readOffer(db);
  if (!validOffer(offer) || !offer.published) throw new NutritionError('As solicitações estão temporariamente fechadas.', 423);
  if (body.intake.bristolType != null && body.intake.bristolType !== '' && !offer.bristolReviewed) throw new NutritionError('A escala de Bristol ainda aguarda revisão profissional. Atualize o formulário.', 422, { bristolType: 'Escala ainda não liberada pela nutricionista.' });
  if (['title', 'description', 'priceCents', 'deliveryDays', 'followupDays'].some(key => body.offer?.[key] !== offer[key])) {
    const error = new NutritionError('As condições da oferta foram atualizadas. Confira o resumo e confirme novamente antes de prosseguir.', 409);
    error.offer = publicOffer(offer); throw error;
  }
  const existing = await readPatient(request, db);
  if (existing && existing.payment_status === 'pending') return { id: existing.id };
  const token = randomToken(); const webhookToken = randomToken();
  const id = randomUUID();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ipHash = createHmac('sha256', dataKey(env)).update(ip).digest('hex');
  const idempotencyHash = tokenHash(body.idempotencyKey);
  const config = readCommerceConfig(env);
  const intake = sanitizeIntake(body.intake);
  if (body.intake.photos?.length && body.intake.photosConsent !== true) throw new NutritionError('Confirme a autorização específica antes de anexar fotos opcionais.', 422, { photosConsent: 'Autorize as fotos ou remova os anexos.' });
  intake.photos = await sanitizePhotos(body.intake.photos || []);
  intake.photosConsent = intake.photos.length > 0 && body.intake.photosConsent === true;
  if (intake.bristolType) intake.bristolReview = { at: offer.bristolReviewedAt, by: offer.bristolReviewedBy };
  await transaction(db, async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [ipHash]);
    const count = await client.query("SELECT count(*)::integer AS count FROM nutrition_requests WHERE ip_hash = $1 AND created_at > now() - interval '15 minutes'", [ipHash]);
    if (count.rows[0].count >= 5) throw new NutritionError('Muitas solicitações. Aguarde alguns minutos.', 429);
    const previous = await client.query('SELECT id FROM nutrition_requests WHERE idempotency_hash = $1', [idempotencyHash]);
    if (previous.rowCount) throw new NutritionError('Esta solicitação já foi recebida. Abra o acompanhamento ou fale com Gislaine para recuperar o acesso.', 409);
    await client.query(`INSERT INTO nutrition_requests (id, intake_encrypted, consent_version, access_hash, idempotency_hash, ip_hash, amount_cents, offer_snapshot, merchant_handle, webhook_hash, webhook_encrypted)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id, seal(intake, env), consentVersion, tokenHash(token), idempotencyHash, ipHash, offer.priceCents, JSON.stringify(offer), config.handle, tokenHash(webhookToken), seal(webhookToken, env)]);
    await event(client, id, 'intake_received', 'patient');
  });
  return { id, cookie: accessCookie(token, request, env) };
}

export async function sanitizePhotos(photos) {
  if (!Array.isArray(photos) || photos.length > 2) throw new NutritionError('Envie no máximo duas fotos opcionais.', 422);
  return Promise.all(photos.map(async photo => {
    if (photo?.type !== 'image/jpeg' || photo?.purpose !== 'food-context' || typeof photo?.dataUrl !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.dataUrl)) throw new NutritionError('As fotos opcionais devem estar no formato JPEG.', 422);
    const input = Buffer.from(photo.dataUrl.split(',')[1], 'base64');
    if (!input.length || input.length > 180 * 1024) throw new NutritionError('Cada foto deve ter até 180 KB.', 422);
    try {
      const processor = sharp(input, { limitInputPixels: 20000000, failOn: 'warning' });
      const metadata = await processor.metadata();
      if (metadata.format !== 'jpeg') throw new Error('format');
      // Re-encoding drops EXIF/GPS and any user-provided metadata.
      const output = await processor.rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 76 }).toBuffer();
      if (output.length > 180 * 1024) throw new Error('size');
      return { name: 'Foto opcional da alimentação', type: 'image/jpeg', purpose: 'food-context', dataUrl: `data:image/jpeg;base64,${output.toString('base64')}` };
    } catch { throw new NutritionError('Não foi possível validar a foto. Use outra imagem JPEG de até 180 KB.', 422); }
  }));
}

export async function checkout(patient, { db, env, fetcher = fetch }) {
  if (patient.payment_status === 'paid') return { paid: true };
  // Serializes retries, so a double click reuses the same checkout URL and amount snapshot.
  return transaction(db, async client => {
    const row = (await client.query('SELECT * FROM nutrition_requests WHERE id = $1 FOR UPDATE', [patient.id])).rows[0];
    if (row.payment_status === 'paid') return { paid: true };
    if (row.checkout_url) return { url: row.checkout_url };
    const { email } = unseal(row.intake_encrypted, env);
    const url = await createPaymentLink({ handle: row.merchant_handle, orderId: row.id, title: 'Plano alimentar personalizado · Gislaine Duarte',
      amountCents: row.amount_cents, email, origin: readCommerceConfig(env).origin, webhookToken: unseal(row.webhook_encrypted, env),
      returnPath: '/api/nutrition/return', webhookPath: '/api/nutrition?action=webhook',
    }, fetcher);
    await client.query('UPDATE nutrition_requests SET checkout_url = $1, updated_at = now() WHERE id = $2', [url, row.id]);
    await event(client, row.id, 'checkout_created', 'patient');
    return { url };
  });
}

export async function confirmNutritionPayment({ orderId, transactionNsu, slug, webhookKey }, { db, env = process.env, fetcher = fetch }) {
  if (!/^[a-f0-9-]{36}$/i.test(orderId || '') || !/^[\w-]{6,128}$/.test(transactionNsu || '') || !/^[\w-]{2,128}$/.test(slug || '')) throw new NutritionError('Retorno de pagamento inválido.');
  const order = (await db.query('SELECT * FROM nutrition_requests WHERE id = $1', [orderId])).rows[0];
  if (!order) throw new NutritionError('Pedido não encontrado.', 404);
  if (webhookKey !== undefined && !safeEqual(order.webhook_hash, tokenHash(webhookKey))) throw new NutritionError('Notificação inválida.', 403);
  if (order.payment_status === 'paid') {
    if (order.transaction_nsu !== transactionNsu || order.invoice_slug !== slug) throw new NutritionError('Pagamento divergente.', 409);
    return true;
  }
  const payment = await checkPayment({ handle: order.merchant_handle, orderId, transactionNsu, slug }, fetcher);
  if (!payment || payment.amount !== order.amount_cents || !Number.isSafeInteger(payment.paid_amount) || payment.paid_amount < order.amount_cents) throw new NutritionError('Pagamento ainda não confirmado.');
  await transaction(db, async client => {
    const locked = (await client.query('SELECT * FROM nutrition_requests WHERE id = $1 FOR UPDATE', [orderId])).rows[0];
    if (locked.payment_status === 'paid') {
      if (locked.transaction_nsu !== transactionNsu) throw new NutritionError('Transação divergente.', 409);
      return;
    }
    await client.query("UPDATE nutrition_requests SET payment_status = 'paid', transaction_nsu = $1, invoice_slug = $2, paid_at = now(), updated_at = now() WHERE id = $3", [transactionNsu, slug, orderId]);
    await event(client, orderId, 'payment_confirmed', 'infinitepay');
    if (!locked.plan_encrypted) {
      const intake = unseal(locked.intake_encrypted, env);
      const draft = generatePlan(intake);
      if (!validatePlan(draft, intake).length) {
        await client.query("UPDATE nutrition_requests SET plan_encrypted=$1, stage='draft', revision=revision+1 WHERE id=$2", [seal(draft, env), orderId]);
        await event(client, orderId, 'plan_generated', 'system');
      }
    }
  });
  return true;
}

export async function readBody(request, limit = 180000) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new NutritionError('Envie os dados em JSON.', 415);
  const reader = request.body?.getReader(); let size = 0; const chunks = [];
  if (!reader) throw new NutritionError('Solicitação vazia.');
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new NutritionError('Solicitação muito grande.', 413); }
    chunks.push(Buffer.from(value));
  }
  try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error(); return body; }
  catch { throw new NutritionError('Os dados enviados são inválidos.'); }
}
