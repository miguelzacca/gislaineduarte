# Instruções para agentes

Este projeto usa Vite + React com JavaScript/JSX. Preserve essa stack.

## Testes de navegador legados

O Playwright, os testes E2E e os scripts de inspeção de navegador permanecem no repositório apenas como legado. **Não execute, instale, atualize ou remova o Playwright por iniciativa própria.** Não rode suas suítes, capturas ou inspeções automatizadas durante tarefas comuns, nem repita baterias de testes para uma correção pontual.

Use verificações pequenas e diretamente relacionadas à alteração apenas quando necessárias. Execute Playwright somente se o usuário pedir isso explicitamente na solicitação atual.
