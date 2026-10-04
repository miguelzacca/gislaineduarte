export const chatActionLabels = {
  analyze: 'Indicar modelos com IA', 'build-week': 'Montar semana com IA',
  swaps: 'Sugerir trocas com IA', calculators: 'Conferir cálculos e metas',
  templates: 'Explorar modelos de planos',
};

export function planForAssistant(plan) {
  if (!plan) return null;
  return {
    title: 'Plano em edição', templateId: plan.templateId, targets: plan.targets,
    guidance: '', clinicalNotes: '', version: 2,
    days: plan.days.map((day, d) => ({ label: `Dia ${d + 1}`, meals: day.meals.map((meal, m) => ({
      name: `Refeição ${m + 1}`, time: meal.time, note: '', items: meal.items.map(({ foodId, grams }) => ({ foodId, grams, alternatives: [] })),
    })) })),
  };
}
