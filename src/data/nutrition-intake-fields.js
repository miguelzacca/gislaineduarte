export const teaHabits = [
  { id: '', label: 'Prefiro responder depois' },
  { id: 'daily', label: 'Tomo chá no dia a dia' },
  { id: 'sometimes', label: 'Tomo de vez em quando' },
  { id: 'interested', label: 'Ainda não tomo, mas gostaria de experimentar' },
  { id: 'dislike', label: 'Não gosto ou prefiro não incluir chás' },
];

export const extraIntakeTextFields = {
  occupation: 'Trabalho e rotina', familyHistory: 'Histórico familiar',
  activityDetails: 'Atividade física', womenHealth: 'Saúde hormonal e reprodutiva',
  labResults: 'Exames recentes', lifestyle: 'Hábitos e bem-estar',
  waterIntake: 'Água e outras bebidas', bowelFrequency: 'Frequência intestinal',
  teasUsed: 'Chás que já consome', teaPreferences: 'Chás de que gosta', teaAvoidances: 'Chás que prefere evitar',
};
export const extraIntakeMeasurements = {
  usualWeight: { label: 'Peso habitual', unit: 'kg', min: 25, max: 350 },
  waist: { label: 'Circunferência da cintura', unit: 'cm', min: 31, max: 250 },
  hip: { label: 'Circunferência do quadril', unit: 'cm', min: 31, max: 250 },
  bodyFat: { label: 'Gordura corporal informada', unit: '%', min: 0.1, max: 69.9 },
};
export const extraIntakeDefaults = Object.fromEntries([...Object.keys(extraIntakeTextFields), ...Object.keys(extraIntakeMeasurements), 'teaHabit'].map(key => [key, '']));

export function extraIntakeErrors(input = {}) {
  input ||= {};
  const errors = {};
  for (const key of Object.keys(extraIntakeTextFields)) if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 2000)) errors[key] = 'Use até 2.000 caracteres.';
  if (input.teaHabit !== undefined && !teaHabits.some(item => item.id === input.teaHabit)) errors.teaHabit = 'Confira sua preferência sobre chás.';
  for (const [key, { label, min, max, unit }] of Object.entries(extraIntakeMeasurements)) {
    const value = input[key];
    if (value === undefined || value === null || value === '') continue;
    if (!['string', 'number'].includes(typeof value) || !String(value).trim() || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) errors[key] = `${label}: informe um valor entre ${min} e ${max} ${unit}, ou deixe em branco.`;
  }
  return errors;
}

export function sanitizeExtraIntake(input = {}) {
  return {
    ...Object.fromEntries(Object.keys(extraIntakeTextFields).map(key => [key, String(input[key] || '').trim()])),
    ...Object.fromEntries(Object.keys(extraIntakeMeasurements).map(key => [key, input[key] === '' || input[key] === null || input[key] === undefined ? null : Number(input[key])])),
    teaHabit: teaHabits.some(item => item.id === input.teaHabit) ? input.teaHabit : '',
  };
}
