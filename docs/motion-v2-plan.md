# Deuxième mouvement — auditoria e integração

## Base preservada

Branch atual, baseline `4401df1`. Sem AGENTS.md aplicável. Oito rotas percorridas em Chromium a 1440 e 390 px antes da edição; nenhum erro de página. Foto e ícone originais novamente inspecionados. Conteúdo, dados, privacidade, contatos, metadados e gerador de HTML fora do escopo de alteração.

## Lacuna observada

O único canvas aparece após entrar na abordagem no desktop; nas outras páginas e no mobile não há WebGL. Rotação e separação menores que um componente do próprio símbolo não criam progressão narrativa. A câmera é ortográfica e quase fixa. O percurso é um path local, de baixo contraste; não encontra serviços nem final. A fotografia apenas se desloca até 20 px. Loading é uma barra e quatro fades. Transições de documento são fade/slide. Menu abre por inset e fecha sem coreografia reversa.

## Nova arquitetura

- Um modelo puro de progresso e capacidade em `src/motion/model.js`.
- Um controlador central mede âncoras DOM, calcula estados e agenda o único RAF; Three e SVG não têm relógios concorrentes.
- Um canvas transportado entre hero, pin, história, bifurcação dos serviços e recomposição. A geometria não desaparece automaticamente por ser celular.
- Quatro partes reais extrudadas, câmera perspectiva, separação ampla e shader narrativo de revelação/varredura/Fresnel.
- Uma linha SVG medida a partir das seções, com ramificação, contorno e retorno. Lite mantém seus estágios e máscara.
- Pin nativo com sticky: espaço deriva de viewport, altura real do cabeçalho/cena e leitura dos quatro pilares. Reduced motion não alonga nem prende seções.
- Construção dos paths vinculada à fotografia/fontes realmente carregadas; foto revela-se a partir da área do rosto, sem alterar pixels ou aplicar displacement.
- Transições multipágina nativas com símbolo compartilhado e cobertura de segurança; URLs e histórico permanecem nativos.
- Menu com máscara orgânica reversível, planos tipográficos e foco imediato.

## Responsabilidades sem conflito

Principal: arquitetura/modelo/controlador, JSX existente, CSS de composição, foto, carregamento, menu/rotas e integração.
Agente WebGL: apenas `sculpture.js`/shaders. Agente SVG: novos componentes/módulo/estilos vetoriais. Agente direção/qualidade: motion bible, depois testes e inspeção visual.

## Verificação

Comparar estados reais da geometria/câmera, comprimento desenhado do SVG, pixels do canvas, modo mobile/lite/reduced e restauração após resize/navegação. Preservar testes anteriores e ampliar os contratos. Medir frames, ociosidade, recursos, heap e rede sem confundir RAF com apresentação real no monitor. Capturas e gravação de scroll complementam a inspeção, não são seu substituto.
