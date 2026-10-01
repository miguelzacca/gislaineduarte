import { teaHabits } from '../data/nutrition-intake-fields.js';

export function TeaPreferences({ intake, field }) {
  return <div className="ni-tea-preferences">
    {field('teaHabit', 'Qual é a sua relação com os chás?', { options: teaHabits.map(item => [item.id, item.label]) })}
    {intake.teaHabit !== 'dislike' && <div className="nutrition-form-grid">
      {field('teasUsed', 'Quais chás você costuma tomar?', { type: 'textarea', help: 'Se souber, conte os ingredientes, a frequência e a quantidade.' })}
      {field('teaPreferences', 'Quais sabores você gostaria de incluir?', { type: 'textarea', help: 'Também vale dizer que prefere não tomar chá.' })}
    </div>}
    {field('teaAvoidances', 'Há algum chá que você evita ou que já causou desconforto?', { type: 'textarea' })}
    <p className="ni-tea-note">Suas respostas ajudam a Gi a personalizar as orientações. A escolha de um chá e a quantidade serão avaliadas na consulta.</p>
  </div>;
}
