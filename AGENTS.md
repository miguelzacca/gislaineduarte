# Instruções para agentes

Este projeto usa Vite + React com JavaScript/JSX. Preserve essa stack.

## Autorização para deploy e push

**Não execute deploy na Vercel nem `git push` sem autorização explícita do usuário para aquela execução.** Essa exigência inclui deploy de preview ou produção, promoção de deployment, rollback e qualquer comando ou ferramenta equivalente que publique alterações remotas.

Pedidos para implementar, corrigir, testar, gerar build ou continuar o trabalho não autorizam deploy nem push. Autorizações de publicações anteriores não se estendem a novas execuções. Conclua as alterações e verificações locais e aguarde a permissão explícita antes de publicar. Ausência de resposta não é autorização.

## Testes de navegador legados

O Playwright, os testes E2E e os scripts de inspeção de navegador permanecem no repositório apenas como legado. **Não execute, instale, atualize ou remova o Playwright por iniciativa própria.** Não rode suas suítes, capturas ou inspeções automatizadas durante tarefas comuns, nem repita baterias de testes para uma correção pontual.

Use verificações pequenas e diretamente relacionadas à alteração apenas quando necessárias. Execute Playwright somente se o usuário pedir isso explicitamente na solicitação atual.
