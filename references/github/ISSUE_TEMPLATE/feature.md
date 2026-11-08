---
name: Feature ou Etapa
about: Nova funcionalidade ou etapa de desenvolvimento
title: "[M<n>] Etapa E<n>: "
labels: type:feature
---

## Contexto

[Uma ou duas frases: o que esta etapa entrega]

## Especificacao

`.spec/features/e<n>-<nome-da-feature>/` — historias, criterios de aceite e tarefas.
[Se a spec ainda nao existe, escrever: spec ainda nao criada]

## Criterio de conclusao

`fuzkrigo-spec audit --ci --feature e<n>-<nome-da-feature>` com saida 0, revisao de
qualidade aplicada e PR mesclado.

[Complementar aqui apenas o que for especifico desta etapa e nao estiver nos
criterios de aceite da spec]
