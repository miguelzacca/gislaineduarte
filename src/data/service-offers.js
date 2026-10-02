export const defaultServiceOffers = [
  { id: 'acompanhamento-3-meses', title: 'Plano de 3 meses', description: 'Acompanhamento nutricional personalizado.', priceCents: 29900, originalPriceCents: null, billing: 'month', durationMonths: 3, badge: '', conditions: 'Consulte as condições e a disponibilidade dos atendimentos.', published: false },
  { id: 'acompanhamento-6-meses', title: 'Plano de 6 meses', description: 'Continuidade para acompanhar sua evolução.', priceCents: 23990, originalPriceCents: 24990, billing: 'month', durationMonths: 6, badge: 'Promoção', conditions: 'Consulte as condições e a disponibilidade dos atendimentos.', published: false },
  { id: 'atendimento-em-dupla', title: 'Atendimento em dupla', description: 'Plano de 3 meses para familiares: mãe e filha ou casal.', priceCents: 19700, originalPriceCents: null, billing: 'person', durationMonths: 3, badge: 'Para familiares', conditions: 'Valor por pessoa. Consulte a periodicidade da cobrança e as condições do plano em dupla antes de contratar.', published: false },
];

export function validateServiceOffers(input) {
  if (!Array.isArray(input) || input.length > 12) throw new Error('Informe até 12 opções de acompanhamento.');
  const ids = new Set();
  return input.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Opção inválida.');
    const clean = {};
    for (const [key, max] of [['id', 64], ['title', 100], ['description', 500], ['badge', 40], ['conditions', 600]]) {
      if (typeof item[key] !== 'string' || item[key].length > max) throw new Error(`Revise o campo ${key}.`);
      clean[key] = item[key].trim();
    }
    if (!/^[a-z0-9-]+$/.test(clean.id) || ids.has(clean.id) || clean.title.length < 3) throw new Error('Revise o título e a identificação das opções.');
    ids.add(clean.id);
    if (!['month', 'person', 'person-month', 'person-total', 'total'].includes(item.billing)) throw new Error('Selecione a forma de apresentação do preço.');
    if (item.published && item.billing === 'person') throw new Error('Defina se o valor por pessoa é mensal ou total antes de exibir a oferta.');
    if (!Number.isSafeInteger(item.durationMonths) || item.durationMonths < 1 || item.durationMonths > 24) throw new Error('A duração deve estar entre 1 e 24 meses.');
    if (!Number.isSafeInteger(item.priceCents) || item.priceCents < 100 || item.priceCents > 10000000) throw new Error('Informe um preço válido.');
    if (item.originalPriceCents !== null && (!Number.isSafeInteger(item.originalPriceCents) || item.originalPriceCents <= item.priceCents || item.originalPriceCents > 10000000)) throw new Error('O preço anterior deve ser maior que o preço atual.');
    if (typeof item.published !== 'boolean') throw new Error('Informe a visibilidade da opção.');
    return { ...clean, priceCents: item.priceCents, originalPriceCents: item.originalPriceCents, billing: item.billing, durationMonths: item.durationMonths, published: item.published };
  });
}
