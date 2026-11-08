# Spec: {{TITULO}}

> feature: {{FEATURE}}
> etapa: {{ETAPA}}
> issue: {{ISSUE}}
> status: rascunho

<!--
  Como ler este arquivo (o formato é verificado por `fuzkrigo-spec audit`):
  - US-xxx = história de usuário · AC-xxx = critério de aceite
    ASM-xxx = suposição · Q-xxx = pergunta em aberto
    São códigos de rastreio: ligam a especificação às tarefas e aos testes.
  - Toda história de usuário precisa de pelo menos um critério de aceite.
  - Todo critério de aceite precisa de Dado/Quando/Então completos.
  - Os códigos são únicos no projeto inteiro (nunca reutilize um número).
  - Suposições e Perguntas em aberto são OBRIGATÓRIAS: se não há nenhuma,
    escreva "Nenhuma." — mas desconfie: quase toda feature esconde uma.
  - "etapa" e "issue" ligam a spec ao CHECKLIST e ao board. Na issue, o
    marcador entre colchetes é pendência: troque pelo número da issue antes
    de a spec ficar `pronta`.
-->

## Contexto

Uma frase sobre o problema que esta feature resolve e para quem.

## Histórias

<!-- História de usuário: quem precisa, o que precisa e por quê. -->

### US-001 — {{TITULO_HISTORIA}}

Como [papel], quero [ação], para que [valor].

<!-- Critério de aceite: o resultado observável que um teste consegue checar.
     Escreva para GENTE: título e Então descrevem o que o usuário vê
     ("a tela avisa X"), não o detalhe técnico ("endpoint retorna 403") —
     o detalhe pode ir entre parênteses. -->

#### AC-001 — [título do critério de aceite]

- **Dado** [estado inicial]
- **Quando** [ação]
- **Então** [resultado esperado e observável]

<!-- Casos de borda relevantes (entrada vazia, valor no limite, erro de
     dependência, permissão negada, dado duplicado) viram critérios de aceite
     próprios: só assim ganham teste e prova. -->

## Fora de escopo

- O que esta feature explicitamente NÃO faz.

## Suposições

<!-- O que estamos ASSUMINDO sem confirmação. Status: aberta | confirmada | invalidada -->

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | [o que está sendo assumido em silêncio?] | aberta | — |

## Perguntas em aberto

<!-- O que ainda não sabemos. Status: aberta | respondida -->

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | [o que precisa ser decidido pelo dono do produto?] | aberta | — |

## Histórico

<!-- Uma linha por mudança relevante depois que a spec ficou `pronta`
     (critério alterado, suposição invalidada, escopo mudado). -->

| Data | Mudança | Motivo |
|---|---|---|
| {{HOJE}} | Spec criada | {{ORIGEM}} |

## Resolução

<!-- Preenchida no Portão 3, antes do PR, com:
     - o PR;
     - a abordagem adotada, em duas ou três frases;
     - as decisões tomadas durante a implementação;
     - o resultado do `audit --ci --feature <feature>`;
     - os pontos de atenção que os revisores deixaram registrados. -->
