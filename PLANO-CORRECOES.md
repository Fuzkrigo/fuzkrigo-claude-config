# Plano de correção — furos encontrados na análise de consistência

> Documento de decisão. Nada aqui foi executado. Cada item traz o problema com evidência, as
> opções reais, uma sugestão e o custo. Você decide o que entra.
>
> Data da análise: 03/08/2026. Estado auditado: commit `6871f72`.

## Sumário

| # | Severidade | Furo | Esforço | Risco de mexer | Status |
| - | ---------- | ---- | ------- | -------------- | ------ |
| 1 | Crítico | O audit é global e reprova o gate de uma feature por causa de outra | Médio | Médio (mexe no motor) | **Resolvido (B + A)** |
| 2 | Alto | Contradição: Bloco A é obrigatório ou opcional? | Baixo | Baixo | **Resolvido (opção A)** |
| 3 | Médio | Dependência circular entre A2 e A3 (códigos `P-xxx` no ROADMAP) | Baixo | Nenhum | **Resolvido** |
| 4 | Médio | Frase residual do fluxo antigo sobre onde as etapas nascem | Trivial | Nenhum | **Resolvido** |
| 5 | Baixo | Hook de planejamento não cobre `.mjs` / `.cjs` | Trivial | Baixo | **Resolvido (parcial)** |
| 6 | Baixo | `DOC_EXEMPT` é código morto no hook | Trivial | Nenhum | **Resolvido** |
| 7 | Baixo | Não está escrito quem aplica o princípio devolvido pelo security-reviewer | Trivial | Nenhum | **Resolvido** |
| 8 | Observação | Portão 2 gasta 2-3 subagentes mesmo em feature minúscula | Baixo | Baixo | **Resolvido** |
| 9 | Observação | Proteção das etiquetas de rastreio é textual, não mecânica | Médio | Médio | **Resolvido (opção C)** |
| 10 | Observação | `dataviz` e `DESIGN.md` podem definir paletas conflitantes | Baixo | Nenhum | **Diagnóstico incorreto — ver nota** |

Ordem sugerida de execução: 2, 3, 4 (texto puro, destravam o entendimento do fluxo) → 5, 6, 7
(higiene) → 1 (o único que mexe em código de verdade) → 8, 9, 10 (conforme decisão).

---

## 1. CRÍTICO — O audit é global e reprova o gate de uma feature por causa de outra

> **RESOLVIDO em 03/08/2026 pela opção B, com a A como regra complementar.**
>
> Motor: `audit --feature <nome>` filtra o veredito. Achados de outras features saem; os que não
> pertencem a feature nenhuma permanecem; as estatísticas passam a ser da feature; o relatório
> avisa em amarelo que o escopo estava reduzido; e nome inexistente falha com código 2 listando
> as features existentes — o cenário perigoso (um typo filtrar tudo e sair 0) está coberto por
> teste. Seis casos novos em `test/audit-por-feature.test.mjs`, mais os 12 da ponte Python sem
> regressão.
>
> Processo: a regra "uma spec viva por vez" entrou no passo Especificar da `spec-driven`, agora
> com a justificativa correta — spec parada não reprova mais o portão das outras, mas continua
> reprovando o audit do projeto, que é o que vale antes do release.
>
> Documentação: os dois usos ficaram explícitos em toda a cadeia (skills, referências, agente
> `project-manager`, template de issue, `CLAUDE.md`, manual). O `project-manager` ganhou instrução
> expressa de **não** usar `--feature` na pré-condição de release.
>
> Verificado ponta a ponta no cenário que originou o item: com duas features, o audit global sai
> 1 e o `--feature` da feature pronta sai 0.

### O problema

O Portão 1 do Bloco B diz: "a feature só fecha quando `audit --ci` sai 0". Mas o audit avalia o
**projeto inteiro**, e não existe filtro por feature.

Evidência (teste real, projeto criado do zero):

```
# feature-pronta: spec completa, 1/1 critério provado
audit --ci -> exit 0

# apos rodar apenas `fuzkrigo-spec new feature-futura`, sem escrever nada:
audit --ci -> exit 1
ERRO  critério de aceite sem teste (AC_SEM_TESTE) [feature-futura] AC-002 ...
```

O status `rascunho` não protege: `AC_SEM_TESTE` nasce com severidade de erro, não é um aviso
escalado pelo `--ci`.

### Impacto

Qualquer fluxo com mais de uma feature em aberto trava. Cenários normais que quebram:

- especificar a próxima feature enquanto a atual está em revisão de PR;
- planejar duas ou três specs de uma vez depois do briefing;
- retomar um projeto onde uma feature antiga ficou pela metade — ela impede o fechamento de
  todas as outras, para sempre, até ser resolvida.

Hoje o fluxo só funciona se você mantiver exatamente uma spec viva por vez, e isso não está
escrito em lugar nenhum.

### Opções

**Opção A — Regra de processo, sem tocar em código.**
Escrever na `fuzkrigo-spec-driven/SKILL.md` e na `iniciar-projeto/SKILL.md`: "crie a spec de uma
feature apenas quando for implementá-la; o CHECKLIST registra as etapas futuras com `spec ainda
não criada`".

- A favor: zero risco, zero código, alinhado ao que o CHECKLIST já prevê.
- Contra: proíbe uma prática legítima (especificar à frente). E não resolve o caso da feature
  antiga abandonada, que continua bloqueando o projeto inteiro.

**Opção B — Adicionar `audit --feature <nome>` ao motor.**
O portão da feature passa a rodar `audit --ci --feature <nome>`; o audit global continua sendo o
usado no CI e em C3 (fechamento de milestone).

Detalhe de projeto que precisa ser decidido junto: com o filtro ligado, o que fazer com os
achados que **não pertencem a nenhuma feature** — princípios da constituição violados, código
órfão, código de rastreio duplicado? Sugestão: mantê-los sempre visíveis, porque são problemas
do projeto e não de uma feature; o filtro remove apenas os achados atribuídos a outras features.

- A favor: resolve os três cenários. Preserva o rigor onde ele importa (nada some, só é adiado).
  Mantém o audit global como a palavra final antes do release.
- Contra: mexe no motor (mais um item na lista de patches locais a reaplicar em atualização).
  Estimativa: 30 a 40 linhas em `core/audit.js` e `cli.js`, mais casos na suíte.

**Opção C — Ignorar features em `rascunho` no gate.**
O audit passaria a tratar spec com status `rascunho` como não auditável.

- A favor: mudança pequena, resolve o caso mais comum.
- Contra: cria um bypass silencioso. Bastaria deixar uma spec em `rascunho` para sumir com os
  achados dela — exatamente o tipo de porta dos fundos que a ferramenta existe para fechar.

### Sugestão

**B, com A como regra complementar.** A ferramenta passa a suportar o fluxo real, e o texto
continua recomendando uma feature por vez como prática. Descartar a C: bypass por status é
incompatível com a premissa da skill.

Se você preferir não tocar no motor agora, a A sozinha é aceitável desde que o texto assuma o
custo explicitamente — inclusive avisando que feature abandonada trava o projeto.

### Arquivos afetados

- Opção A: `skills/fuzkrigo-spec-driven/SKILL.md`, `skills/iniciar-projeto/SKILL.md`
- Opção B: `skills/fuzkrigo-spec-driven/scripts/lib/src/core/audit.js`, `.../cli.js`,
  `.../scripts/test/` (casos novos), mais a nota de patch local no `README.md`

---

## 2. ALTO — Contradição: o Bloco A é obrigatório ou opcional?

> **RESOLVIDO em 03/08/2026 pela opção A.** O critério canônico virou a seção 4.1 da
> `iniciar-projeto/SKILL.md`, com tabela de casos, regra de conversão e a distinção entre
> "projeto dispensável" (desliga a gestão) e `#tarefa` (desliga tudo). Os outros três lugares
> passaram a apontar para ela. Durante a aplicação apareceu uma quarta contradição, não prevista
> neste plano: a regra 3 da seção 7.3 mandava bloquear sempre que faltassem ROADMAP e CHECKLIST —
> também corrigida.

### O problema

Quatro fontes, duas posições opostas:

| Fonte | O que diz |
| ----- | --------- |
| `iniciar-projeto/SKILL.md` (description) | "Se o usuário tentar implementar código sem ter passado pela abertura do projeto, BLOQUEIE" |
| `CLAUDE.md` seção 4 | "Início Obrigatório de Todo Projeto" |
| `fuzkrigo-spec-driven/SKILL.md` linha 49 | "Projeto sem `docs/` nem board pode rodar só com esta skill" |
| `hooks/check_planning_docs.py` | Libera a escrita com uma spec em `.spec/`, sem ROADMAP nem CHECKLIST |

As duas últimas foram introduzidas nas Ondas 2 e 4 sem reconciliar com as duas primeiras.

### Impacto

Ambiguidade de comportamento: em um script pessoal, eu posso tanto bloquear e exigir briefing
quanto seguir direto — as duas atitudes são defensáveis pelo texto atual. O resultado é
inconsistência entre sessões, que é exatamente o que o `CLAUDE.md` existe para evitar.

### Opções

**Opção A — Formalizar a exceção com critério objetivo.**
Definir os casos em que o Bloco A é dispensável e escrever isso nos quatro lugares. Critério
sugerido:

- Dispensável: experimento, script de uso próprio, prova de conceito descartável, automação
  pessoal — nada que vá para o portfólio ou que outra pessoa vá usar.
- Obrigatório: qualquer projeto de portfólio, qualquer coisa com usuário final, qualquer coisa
  que vá ganhar release.
- Regra de conversão: se um experimento virar projeto, o Bloco A é executado retroativamente,
  antes do primeiro release.

**Opção B — Manter o Bloco A obrigatório sempre.**
Remover a permissão da `fuzkrigo-spec-driven` e reverter o hook para exigir ROADMAP e CHECKLIST.

- A favor: uma regra só, sem julgamento.
- Contra: obriga briefing e board para um script de 40 linhas. É o over-engineering que o
  `CLAUDE.md` seção 3 proíbe, e na prática leva ao uso de `#tarefa` para tudo, esvaziando o fluxo.

### Sugestão

**A.** O critério "vai para o portfólio ou tem usuário" é objetivo o suficiente para decidir
sozinho na maioria dos casos, e preserva o rigor onde ele tem valor.

### Arquivos afetados

`skills/iniciar-projeto/SKILL.md` (description e seção 4), `CLAUDE.md` (seção 4),
`skills/fuzkrigo-spec-driven/SKILL.md` (seção de fronteira). O hook já está correto para a
Opção A.

---

## 3. MÉDIO — Dependência circular entre A2 e A3

> **RESOLVIDO em 03/08/2026.** O item 4 da seção 7.1 agora descreve as duas passadas
> explicitamente, e A3 ganhou um passo final: fechar o ciclo do ROADMAP anotando os códigos
> `P-xxx` ao lado de cada restrição.

### O problema

`skills/iniciar-projeto/SKILL.md:176` — o ROADMAP, criado em **A2**, tem o item obrigatório
"Restrições inegociáveis — as que viraram princípios da constituição em A3, com o código do
princípio (`P-xxx`) ao lado". Só que a constituição nasce em **A3**, depois. Em A2 esses códigos
ainda não existem.

### Impacto

Quem seguir o documento ao pé da letra trava em A2 ou inventa códigos. É resolvível na prática
(escrever o texto agora, anotar os códigos depois), mas isso não está escrito.

### Opção sugerida

Reescrever o item para explicitar as duas passadas: em A2 a restrição é registrada em texto; em
A3, depois de criada a constituição, o ROADMAP é atualizado com os códigos. Uma frase resolve, e
ela também deixa claro que atualizar o ROADMAP faz parte de A3.

### Arquivo afetado

`skills/iniciar-projeto/SKILL.md` (seção 7.1, item 4; e a lista de A3 na seção 2).

---

## 4. MÉDIO — Frase residual sobre onde as etapas nascem

> **RESOLVIDO em 03/08/2026.** A justificativa passou a ser a real: o board nasce em A3 porque
> depende do repositório provisionado e das etapas já revisadas em A2 — cada issue nasce de uma
> etapa que já existe.

### O problema

`skills/iniciar-projeto/SKILL.md:41` justifica o board nascer em A3 assim: "As etapas só ficam
concretas aqui, por isso o board nasce nesta fase, não em A2".

Isso era verdade no fluxo antigo (Fase 1 gerava documentos, Fase 2 gerava board). Hoje o
CHECKLIST criado em **A2** já lista as etapas, e o `project-manager` cria as issues **a partir
delas**. A justificativa contradiz o próprio CHECKLIST e o agente.

### Opção sugerida

Trocar a justificativa pela real: o board nasce em A3 porque depende de repositório provisionado
e das etapas já revisadas em A2 — não porque as etapas não existiriam antes.

### Arquivo afetado

`skills/iniciar-projeto/SKILL.md` (seção 2, bloco A3).

---

## 5. BAIXO — Hook de planejamento não cobre `.mjs` e `.cjs`

> **RESOLVIDO EM PARTE em 03/08/2026.** `mjs` e `cjs` entraram em `CODE_EXTENSIONS`, testados em
> projeto vazio (pergunta) e com spec (libera). **Continua em aberto** a pergunta que este item
> deixou para você: `vue`, `svelte`, `scss` e `css` entram também? Argumentos: `.vue` e `.svelte`
> carregam lógica de aplicação, então o caso a favor é forte; `.scss` e `.css` são estilo, e
> tratá-los como código de produção faria o hook perguntar ao ajustar uma cor. Enquanto não
> decidir, os quatro seguem fora.

### O problema

`hooks/check_planning_docs.py`, conjunto `CODE_EXTENSIONS`: cobre `js`, `jsx`, `ts`, `tsx`, mas
não `mjs` nem `cjs`. Arquivo ESM ou CommonJS explícito escapa da checagem de planejamento.

### Impacto

Baixo, mas real: em projeto Node moderno, `.mjs` é comum. E foi assim que o teste do próprio
motor (`ponte-python.test.mjs`) passou sem o hook perguntar nada.

### Opção sugerida

Adicionar `mjs` e `cjs` ao conjunto. Considerar também `vue`, `svelte`, `scss` e `css` — decisão
sua: CSS é código de produção para efeito de planejamento, ou não?

### Arquivo afetado

`hooks/check_planning_docs.py`.

---

## 6. BAIXO — `DOC_EXEMPT` é código morto

> **RESOLVIDO em 03/08/2026.** O conjunto e a checagem foram removidos. Regressão confirmada:
> `ROADMAP.md`, `docs/CHECKLIST.md` e qualquer outro `.md` continuam liberados — agora pela
> checagem de extensão, que já os cobria.

### O problema

O mesmo hook mantém `DOC_EXEMPT = {"ROADMAP.md", "CHECKLIST.md", "ARCHITECTURE.md"}` e checa esse
conjunto antes da extensão. Só que `.md` não está em `CODE_EXTENSIONS` — nenhum arquivo `.md`
chega a ser interrogado. A verificação nunca muda o resultado.

### Opções

Remover o bloco (menos código morto) ou manter com um comentário explicando que é uma defesa
redundante caso `md` entre em `CODE_EXTENSIONS` um dia. Sugiro remover: defesa contra um cenário
que não existe é ruído.

### Arquivo afetado

`hooks/check_planning_docs.py`.

---

## 7. BAIXO — Não está escrito quem aplica o princípio devolvido pelo security-reviewer

> **RESOLVIDO em 03/08/2026.** O Portão 2 agora diz explicitamente que o agente não tem permissão
> de escrita, devolve o bloco pronto no relatório, e que quem cola em `.spec/constituicao.md` é o
> Claude principal, após aprovação do usuário.

### O problema

A `iniciar-projeto/SKILL.md` (Portão 2) diz "todo achado aceito vira princípio verificável na
constituição". O agente `security-reviewer` tem apenas `Read, Grep, Glob, Bash` — corretamente,
ele não escreve. O agente sabe disso e devolve o bloco pronto; a skill não diz quem cola.

### Opção sugerida

Uma frase no Portão 2: o `security-reviewer` devolve o bloco do princípio no relatório, e o
Claude principal o aplica em `.spec/constituicao.md` após sua aprovação.

### Arquivo afetado

`skills/iniciar-projeto/SKILL.md` (seção 2, Portão 2).

---

## 8. OBSERVAÇÃO — Portão 2 gasta 2 a 3 subagentes mesmo em feature minúscula

> **RESOLVIDO em 03/08/2026.** O Portão 2 ganhou tabela de dimensionamento: em feature pequena
> (até 3 arquivos, sem lógica de negócio nova) o `code-reviewer` é opcional e o
> `docstrings-manager` só entra se nasceu função, classe ou módulo público. O `security-reviewer`
> ficou fora da tabela de propósito — o gatilho dele é o que a feature toca, não o tamanho.

### O problema

O Portão 2 invoca `code-reviewer`, depois `docstrings-manager`, e às vezes `security-reviewer`.
Para uma feature de dois arquivos, isso é caro em tempo e em tokens — e o peso é o motivo mais
comum de um processo ser abandonado na prática.

A `fuzkrigo-spec-driven` já resolve esse problema para si com auto-dimensionamento por escopo. O
Portão 2 não tem equivalente.

### Opção sugerida

Critério de dispensa por tamanho, espelhando a tabela de auto-dimensionamento:

- Feature pequena (até 3 arquivos, sem lógica de negócio nova): `code-reviewer` opcional,
  `docstrings-manager` só se houve função ou classe pública nova.
- Feature média ou grande: os dois, sempre.
- `security-reviewer`: independe do tamanho, depende do que a feature toca (o critério atual já
  está correto).

### Arquivo afetado

`skills/iniciar-projeto/SKILL.md` (seção 2, Portão 2).

---

## 9. OBSERVAÇÃO — Proteção das etiquetas de rastreio é textual, não mecânica

> **RESOLVIDO em 03/08/2026 pela opção C.** O Portão 2 passa a fechar rodando
> `audit --ci --feature <feature>` mais uma vez, depois do `docstrings-manager` e antes do PR.
> Custa segundos e transforma um estrago silencioso em falha imediata, sem engenharia nova.

### O problema

O `docstrings-manager` tem `Edit` e trabalha exatamente sobre arquivos de teste. Se ele alterar o
título de um teste que carrega `@spec:AC-xxx` — ou renomear `test_ac_001` em Python — a prova
daquele critério some. Hoje isso é impedido por uma regra escrita no prompt do agente e em
`CODIGO.md`. Regra escrita é o mesmo tipo de garantia que o TDD tinha antes desta integração.

### Opções

**A — Aceitar o risco.** O audit acusa na próxima execução (`AC_SEM_TESTE` ou `AC_SEM_PROVA`),
então o dano é detectado, não silencioso. É o argumento mais forte a favor de não fazer nada.

**B — Hook `PostToolUse`** que compara as etiquetas antes e depois de uma edição em arquivo de
teste e bloqueia a remoção. Custo real: precisa ler o arquivo antes da edição, o que o
`PreToolUse` permite, mas exige guardar estado entre eventos.

**C — Rodar `audit` logo após o `docstrings-manager`** no Portão 2, antes do PR. Custo quase
zero, detecção imediata, sem código novo.

### Sugestão

**C.** Transforma um risco silencioso em falha imediata sem nenhuma engenharia nova.

### Arquivo afetado

`skills/iniciar-projeto/SKILL.md` (Portão 2 e 3).

---

## 10. OBSERVAÇÃO — `dataviz` e `DESIGN.md` podem definir paletas conflitantes

### O problema

A skill `dataviz` (instalada, ativa por gatilho) traz a própria paleta em `references/palette.md`,
com instrução explícita de trocar os valores pelos da sua marca. O `DESIGN.md` define a paleta da
marca. Nenhum dos dois sabe da existência do outro.

Resultado provável: um gráfico dentro de um projeto seu sai com as cores de exemplo da `dataviz`,
não com as suas — e o problema só aparece quando você olhar a tela.

### Opções

- Substituir os valores em `references/palette.md` da `dataviz` pelos da sua marca (resolve, mas
  precisa ser refeito a cada projeto de marca diferente).
- Ou, na decisão do `DESIGN.md` (documento separado), definir que a paleta de dados é uma seção
  do próprio design system, e a `dataviz` passa a apontar para lá.

Este item depende da decisão sobre o `DESIGN.md`. Fica registrado para não se perder.

### Arquivos afetados

`~/.claude/skills/dataviz/references/palette.md` e, eventualmente, `DESIGN.md`.

---

## Nota sobre o que não está nesta lista

Foram verificados e estão corretos: todos os caminhos citados em skills, agentes e hooks; todas
as referências de seção cruzadas; a numeração A/B/C (sem resíduo); a sincronia entre o
repositório e a instalação em `~/.claude/`; a coerência entre as ferramentas de cada agente e o
mandato dele; e o comportamento dos dois hooks, testado em nove cenários.

A espinha do fluxo está correta e as responsabilidades não se sobrepõem. O item 1 é o único que
impede o fluxo de rodar exatamente como está escrito.
