// A photo can identify an ingredient without depicting its prescribed preparation.
// Keep that distinction beside the food, rather than only in the credits appendix.
export function foodPhotoNote(food, { compact = false } = {}) {
  const caption = String(food?.photo?.caption || '');
  if (/\bcru[ao]?s?\b|antes do (?:preparo|cozimento)/i.test(caption)) return compact ? 'Foto do ingrediente antes do preparo.' : 'Foto do ingrediente antes do preparo; siga a orientação.';
  if (/não faz parte dos valores/i.test(caption)) return compact ? 'Acompanhamento da foto não integra a porção.' : 'Foto com acompanhamento ilustrativo; use apenas os itens do plano.';
  if (/outr[ao] (?:preparo|variedade)|variedade representativa|referência de variedade|sem identificação da variedade|não identifica.*variedade|não representa.*preparo|consistência diferente/i.test(caption)) return compact ? 'Foto de referência do ingrediente.' : 'Foto de referência; siga o alimento e o preparo indicados.';
  return '';
}
