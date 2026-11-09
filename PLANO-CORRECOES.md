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
| 5 | Baixo | Hook de planejamento não cobre `.mjs` / `.cjs` | Trivial | Baixo | **Resolvido** |
| 6 | Baixo | `DOC_EXEMPT` é código morto no hook | Trivial | Nenhum | **Resolvido** |
| 7 | Baixo | Não está escrito quem aplica o princípio devolvido pelo security-reviewer | Trivial | Nenhum | **Resolvido** |
| 8 | Observação | Portão 2 gasta 2-3 subagentes mesmo em feature minúscula | Baixo | Baixo | **Resolvido** |
| 9 | Observação | Proteção das etiquetas de rastreio é textual, não mecânica | Médio | Médio | **Resolvido (opção C)** |
| 10 | Observação | `dataviz` e `DESIGN.md` podem definir paletas conflitantes | Baixo | Nenhum | **Resolvido (08/11/2026) — ver nota** |

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

> **RESOLVIDO.** Em 03/08/2026, `mjs` e `cjs` entraram em `CODE_EXTENSIONS`, testados em projeto
> vazio (pergunta) e com spec (libera). A pergunta que este item deixou em aberto — `vue`,
> `svelte`, `scss` e `css` entram também? — está decidida: `vue`, `svelte` e `astro` entram em
> `CODE_EXTENSIONS`, porque carregam lógica de aplicação junto do template (no código desde o
> commit `adcfd2a`, de 10/08/2026); `css` e `scss` ficam fora, por decisão do usuário registrada
> em 07/11/2026, porque ajuste visual não é implementação de feature, e um hook que pergunta a
> cada retoque de cor é um hook que se aprende a ignorar.

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

> **RESOLVIDO em 08/11/2026.** O `DESIGN.md` passou a ser referência sob demanda: instalado em
> `~/.claude/DESIGN.md` e citado na tabela do §4 do `CLAUDE.md` para trabalho que produz interface
> ou gráfico — a regra no `CLAUDE.md` que a nota abaixo pedia. Antes de gerar um gráfico, o Claude
> consulta o `DESIGN.md` em vez de seguir a paleta de exemplo da dataviz. Qual projeto herda a
> identidade visual (pendência 6 do `DESIGN.md`) continua em aberto, para a sessão de design.
>
> **DIAGNÓSTICO CORRIGIDO em 03/08/2026, item em stand by.**
>
> O caminho citado abaixo (`~/.claude/skills/dataviz/references/palette.md`) **não existe**. Foi
> deduzido do padrão das outras skills em vez de verificado — erro de quem escreveu este plano.
> Verificado depois: `dataviz` não está em `~/.claude/skills/`, nem como arquivo no pacote npm do
> Claude Code. Ela é uma skill **embutida no produto**, disponível por gatilho mas não editável
> pelo usuário. Editar o arquivo dela, como sugerido abaixo, é inviável — e seria desfeito na
> próxima atualização do produto.
>
> O risco em si continua real (uma skill do produto traz paleta de exemplo e não conhece o
> `DESIGN.md`), mas a solução tem de vir do lado do usuário: precedência declarada no próprio
> `DESIGN.md`, ou uma regra no `CLAUDE.md` mandando consultá-lo antes de gerar qualquer gráfico.
>
> **Em stand by por decisão do usuário:** o `DESIGN.md` ainda está em construção e não é carregado
> por nada. Sem um lugar definido para ele no ecossistema, não há onde ancorar a regra.

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

---

## Rodada 2 — 07/11/2026

> Data das decisões: 07/11/2026. Estado auditado: commit `ac873f0` (commit 5 desta rodada,
> `feat(spec-driven): escolher o modelo de cada tarefa pela complexidade`).

| Item | Problema | Decisão | Commit |
| --- | --- | --- | --- |
| 1 | `CLAUDE.md` mandava criar à mão o marcador do Modo Tarefa | Texto aponta para o hook `arm_modo_tarefa.py` | 1 |
| 2 | Manual e README falavam em dois hooks | Três hooks documentados | 1 |
| 4 | Ponteiros `@.claude/` entre crases, caminho ambíguo | `CODIGO.md` importado sempre; `PATTERNS.md` sob demanda | 1 |
| 7 | `project-manager` mandava confirmar com o usuário sem ter canal | Devolve a proposta no relatório | 1 |
| 9 | Item 5 da rodada 1 desatualizado | CSS e SCSS fora do hook, por decisão | 1 |
| 12 | Agentes com modelo fixo | `model: opus` | 1 |
| 13 | Tarefas "implícitas" reprovavam no audit | Toda feature tem `tasks.md` mapeado | 1 |
| 6 | Caminhos absolutos do usuário | `$HOME`, `~/.claude/` e `py -3` | 2 |
| CI | Versões fixas de Node e Python | `lts/*` e `3.x` | 2 |
| Herança | Nomes do projeto de origem no motor | `fuzkrigo.config.json`, `../fuzkrigo-worktrees/`, `x-fuzkrigo-token` | 3 |
| 5 | Exceção do hook de estilo na pasta antiga | Exceção por nome de pasta `fuzkrigo-claude-config` | 4 |
| 10 | Hook de planejamento parava de perguntar após a primeira spec | Confere o mapeamento do arquivo, como o audit | 4 |
| Modelo | Modelo fixo nas faixas paralelas | `opus` padrão e critério de complexidade na skill | 5 |
| 3 e 11 | Arquivos corporativos | Adiados para a etapa corporativa | — |
| 8 | Skills antigas na conta claude.ai | Remoção a cargo do usuário, fora do repositório | — |

O registro completo das opções e dos motivos de cada decisão está no log de decisões do projeto
de desenho do ecossistema (`log-de-decisoes.md`, projeto "Ecosistema de Desenvolvimento").

**Decidido durante a execução, fora da tabela acima:** os hooks `check_planning_docs.py` e
`check_style_prohibitions.py` liam o JSON do harness como texto. No Windows, com Python 3.14 ou
anterior (sem UTF-8 mode), isso decodificava em cp1252: emoji passava pelo hook de estilo e
caminho com acento corrompia a checagem de mapeamento. Os dois passaram a ler bytes
(`sys.stdin.buffer`), com testes que rodam o hook com `-X utf8=0` (commit 4). O
`arm_modo_tarefa.py` lê a entrada do mesmo jeito, mas o efeito nele é estreito: como só procura
textos ASCII (`#tarefa`, "modo normal", "sair do modo tarefa"), continua funcionando, exceto
quando `#tarefa` vem colado a um caractere não ASCII (por exemplo `#tarefa—ajuste`), caso em que
o Modo Tarefa não liga. Ficou de fora porque esta rodada não o altera.

---

## Rodada 2 — pontas soltas (08/11/2026)

> Revisão de todos os documentos depois do merge da rodada 2. Estado auditado: commit `dd2fefc`
> (hooks: 36 testes; motor: 6 suítes, 28 casos).

| Item | Problema | Decisão | Commit |
| --- | --- | --- | --- |
| A1-A8 | Mudanças da rodada 2 sem propagar ao Manual, ao README e à `iniciar-projeto` | Propagadas | `1d7dc19` |
| B9-B12 | Resumo de comandos sem `--agents`/`--feature`, exemplos de `init`, config sem nome, "fases" | Completados | `6dccc03` |
| C13 | "Bilíngue" lido como texto PT e tags EN | Texto nas duas línguas, como o `CLAUDE.md` | `afc7532` |
| C14 | P-004 do preset LGPD só via JavaScript | Regex cobre `print` e logging, glob `src/**` | `0a40d79` |
| C15 | 73% sem fonte e com atribuição errada | Fonte citada (arXiv 2602.02584) e ressalvas | `96a4b00` |
| D16-D17 | Corporativo: board no GitHub, `@.claude/`, `view`, caminhos de usuário | Alinhados ao padrão | `2b47f85` |
| D18 | Distribuição do `DESIGN.md` | Referência sob demanda (fecha o item 10 da rodada 1); pendências 1-7 para sessão de design | `55e2601` |
| E19 | Sem guia de instalação | Seção no README | `2c56f1d` |
| E21 | Marcadores de status bloqueados; hook de estilo quebrava com JSON que não é objeto | Marcadores liberados; falha aberta | `29e6848` |
| E21 | `arm_modo_tarefa.py` em cp1252 | Leitura em bytes | `e661b4b` |
| E21 | Hook de planejamento ignorava o `specDir` | `specDir` respeitado | `3298ac5` |
| E21 | Mensagem do `init` por agente, emoji no motor | Orientação por agente; motor sem emoji bloqueado | `73f15cc`, `dd2fefc` |
| E21 | `Claude outputs/` podia entrar num commit | `.gitignore` | `41a126e` |
| E20 | `gh` ausente nesta máquina | GitHub CLI 2.103.3 instalado e autenticado (conta `Fuzkrigo`) | — |

Pendentes: local de instalação do `CLAUDE_PASTA PROFFISIONAL.md` (etapa corporativa); pendências
1-7 do `DESIGN.md` (sessão de design); instalação e validação no `~/.claude/` real.

---

## Verificação final (08/11/2026)

> Estado auditado: commit `1a6a542` (hooks e status line: 39 testes; motor: 6 suítes, 28 casos).

Os 36 itens dos seis commits do briefing foram conferidos um a um na `main` e estão aplicados. A
instalação descrita no README foi simulada com uma `HOME` temporária, sem tocar no `~/.claude/`
real: o import do `CODIGO.md` resolve, os três hooks respondem certo quando chamados com os
comandos do `settings.json`, e o motor roda a partir do local instalado.

| Achado | Decisão | Commit |
| --- | --- | --- |
| A status line mostrava o custo sempre como `$0,00`: o Git Bash roda em `pt_BR.UTF-8`, e o `printf` recusava `0.5` | `LC_NUMERIC=C` na formatação do custo, com teste | `1a6a542` |
| A status line mostrava um segmento vazio entre separadores com o thinking desligado | O segmento de esforço só aparece quando há valor, com teste | `1a6a542` |
| O README e este plano citavam a "F5", nome de fase de outro projeto | Descrição própria no lugar | este registro |

Observação, sem correção: se o Claude Code entregar `workspace.current_dir` com barras invertidas,
a status line mostra o caminho inteiro em vez do nome da pasta, porque o `__basename` só corta em
`/`. Confirmar o formato numa sessão real antes de mudar.

---

## Rodada 3 — 08/11/2026

> Estado auditado: commit `13135d5`, o commit 5 da rodada (motor: 8 suítes, 40 casos, dos quais
> 37 nas 7 suítes do briefing; hooks e status line: 39 testes).

| Tópico | Problema | Decisão | Commit |
| --- | --- | --- | --- |
| Cobertura | Limites de 80/95 só publicados, nunca cobrados | 95% geral, 98% em lógica de negócio, com ramos; CI reprova, inclusive quando não mede | 1 |
| Ratio | 1,5x media volume, não qualidade | Substituído por cobertura de ramos | 1 |
| Exclusões | Sem regra | Só com `coverage-justification:`, cobrada pelo `code-reviewer` | 1 |
| Diagramas | Sem modelo de classes | `classDiagram` nos modelos de arquitetura | 2 |
| Rastreio | Spec não apontava para etapa e issue | Cabeçalho `etapa` e `issue`, prefixo `e<n>-` e `i<n>-` | 3 e 4 |
| Histórico | Mudanças de spec só no git | Seções Histórico e Resolução no `spec.md` | 3 e 4 |
| Casos de borda | Sem orientação | Viram critérios de aceite | 3 e 4 |
| Issues com spec | Só etapas | Também bug e dívida técnica que mudam comportamento | 4 |
| Nomes | `P<n>` ambíguo, `M<n>` renumerável, regra de avulsa contraditória | `EXT<n>`, `M<n>` fixo, avulsa com prefixo de tipo | 4 e 5 |
| Corporativo | 95% em `processor.py` diverge dos 98% | Adiado para a etapa corporativa | — |
| F3 | Teste de mutação; UML com PlantUML e Java | Registrados como candidatos da F3 | — |

Commits da rodada: 1 = `e66ecd3`, 2 = `14c75f2`, 3 = `a4dba09`, 4 = `b29bd4d`, 5 = `13135d5`.

O registro completo das opções e dos motivos está no log de decisões do projeto de desenho do
ecossistema (`log-de-decisoes.md` do projeto "Ecosistema de Desenvolvimento", seção "Rodada 3").

Achados fora do briefing, durante a execução:

| Achado | Decisão | Commit |
| --- | --- | --- |
| O `new` não continuava a numeração de ASM, Q e T: a segunda feature nascia com `ASM-001` e `Q-001`, e o audit acusava `ID_DUPLICADO` | Os cinco códigos continuam a partir do maior do projeto, com testes (Patch 8) | `de93ffe` |
| `cli.js` passa do limite de 500 linhas: 783 antes da rodada, 826 depois | Registrado; dividir o arquivo é uma refatoração própria | — |
| Um nome que começa com `e2e-` é lido como a etapa "E2e" pela regra do prefixo | Registrado | — |
| O audit não confere `T-xxx` duplicada entre features, embora o `escrevendo-specs.md` diga que duplicar um código é acusado | Registrado | — |

## Rodada 4 — 08/11/2026

> Estado auditado: commit `d9ceae8`, o commit 6 da rodada (motor: 14 suítes, 62 casos; hooks e
> status line: 39 testes; workflow `Testes` verde em `ubuntu-latest` e `windows-latest` no PR #9).

| Item | Problema | Decisão | Commit |
| --- | --- | --- | --- |
| 1 | O audit não confere se o teste de um princípio passou | O audit lê a prova do princípio (achado `PRINCIPIO_SEM_PROVA`) | `b6206e0` |
| 2 | O gate final do executor paralelo roda `audit --ci` sem `--feature` | Gate por feature | `c4e27d2` |
| 3 | O executor força a branch `spec/<feature>` | Trabalhar na branch atual; recusar a `main` | `c4e27d2` |
| 4 | O CI não impede merge | A A3 liga a proteção da `main` (conta Free, repositórios públicos) | `8bf510b` |
| 5a | O audit do CI é pulado quando o motor não foi commitado | Falhar quando o projeto é do fluxo | `ee6ad1c` |
| 5b | `pip install -e . \|\| true` esconde falha | Instalar só quando há pacote, e falhar de verdade | `ee6ad1c` |
| 6 | `scaffold --force` apaga testes já escritos | O scaffold sempre acrescenta, nunca reescreve | `b3023ce` |
| 7 | `cli.js` acima de 500 linhas | Exceção consciente (abaixo) | — |
| 8 | O audit não acusa `T-xxx` duplicada | Tarefas entram na checagem de unicidade | `b6206e0` |
| 9 | Nome `e2e-...` é lido como etapa "E2e" | O `new` imprime a etapa e a issue reconhecidas | `b3023ce` |
| 10 | Relatórios soltos na raiz | Relatórios ficam em `Claude outputs/` (abaixo) | — |
| 11 | Este repositório não tem CI | Workflow `.github/workflows/testes.yml`; depois do merge, a `main` deste repositório também fica protegida | `d9ceae8` |

Commits da rodada: 1 = `b6206e0`, 2 = `c4e27d2`, 3 = `b3023ce`, 4 = `ee6ad1c`, 5 = `8bf510b`,
6 = `d9ceae8`.

**Item 7, exceção consciente.** O `cli.js` passa de 500 linhas (826 antes da rodada, 821 depois) e
fica assim por decisão do usuário, por ser o ponto de entrada essencial do motor. Ele não deve
crescer além do necessário: nesta rodada, a lógica nova do `new` foi para `core/rastreio.js`.

**Item 10.** Os relatórios das rodadas ficam em `Claude outputs/`, que não é versionado
(`.gitignore`). `RELATORIO-RODADA-2.md` e `RELATORIO-RODADA-3.md` saíram da raiz para lá.

O registro completo das opções e dos motivos está no log de decisões do projeto de desenho do
ecossistema (`log-de-decisoes.md` do projeto "Ecosistema de Desenvolvimento", seção "Rodada 4").

Achados fora do briefing, durante a execução:

| Achado | Decisão | Commit |
| --- | --- | --- |
| Dois `## P-001` na constituição passavam sem achado | `ID_DUPLICADO` com as duas linhas (Patch 10), aprovado pelo usuário | `f088d58` |
| No PR, o passo de audit tem `continue-on-error`, então falhar ali pela falta do motor não reprovaria | Passo próprio "Conferir o motor de auditoria", aprovado pelo usuário | `ee6ad1c` |
| Em repositório sem nenhum push, a API de proteção responde `Branch not found` | O agente reporta e deixa a proteção para depois do primeiro push | `8bf510b` |
| As actions oficiais do modelo de CI (`checkout` e `setup-node` v4, `setup-python` v5) usam Node 20, descontinuado nos runners | Atualizadas para v7 (Node 24), com prova num repositório descartável, aprovado pelo usuário | `de37f5d` |
| Os `.sh` de `.github/scripts/`, copiados para projeto sem `.gitattributes`, viram CRLF na cópia de trabalho no Windows | Registrado: só afeta quem rodar os scripts no Windows; o CI roda em Linux | — |
| Este repositório era privado, e a proteção da `main` não existe em repositório privado na conta Free | O usuário tornou o repositório público para o passo final | — |
| O grep de aceite do commit 3 acha a sintaxe antiga num relatório antigo em `Claude outputs/` | Aceito pelo usuário: nos arquivos versionados o grep volta vazio | — |

## Rodada 5 — 09/11/2026

> Estado auditado: commit `ec8eb9c`, o commit 4 da rodada (motor: 62 casos, intocado; hooks,
> lançador e status line: 44 testes no Windows, e 44 no WSL com 3 pulados por falta de `node`).

| Item | Problema | Decisão | Commit |
| --- | --- | --- | --- |
| 1 | Os `.sh` do modelo de CI, copiados para um projeto sem `.gitattributes`, podem virar CRLF no Windows, e o bash quebra com `$'\r': command not found` | Um `.gitattributes` dentro do modelo, que vira `.github/.gitattributes` no projeto, com `*.sh text eol=lf` | `7604259` |
| 2 | Tornar um repositório privado na conta Free derruba a proteção da `main`, e voltar a público não a restaura (aconteceu com este repositório em 09/11/2026) | Aviso no `project-manager`, na skill `iniciar-projeto`, no MANUAL e no README, com o caminho de volta | `2ef0893` |
| 3 | O ecossistema não roda no Linux nem no WSL: hooks chamando `py -3`, `statusline.sh` sem permissão de execução chamado direto, instalação documentada só no Windows | Lançador único `hooks/run-python.sh`; status line chamada por `bash`; seção de instalação no Linux/WSL | `5c6dba7` e `ec8eb9c` |

Commits da rodada: 1 = `7604259`, 2 = `2ef0893`, 3 = `5c6dba7`, 4 = `ec8eb9c`.

Pendência de rodada anterior resolvida:

| Achado | Rodada | Antes | Agora |
| --- | --- | --- | --- |
| Os `.sh` de `.github/scripts/`, copiados para projeto sem `.gitattributes`, viram CRLF na cópia de trabalho no Windows | 4 | Registrado | Resolvido pelo commit 1 (`7604259`) |

Fica para a F5: qual `~/.claude` é o principal, o do Windows ou o do WSL, e se os dois coexistem.
Esta rodada só garante que o ecossistema funciona nos dois, com um único `settings.json`.

O registro completo das opções e dos motivos está no log de decisões do projeto de desenho do
ecossistema (`log-de-decisoes.md` do projeto "Ecosistema de Desenvolvimento", seção "Rodada 5:
decisões").

## F3, item 1 — casos de borda e regras de fechamento — 09/11/2026

> Estado auditado: commit `c6a30c4`, o commit 4 da rodada (motor: 87 casos em 16 suítes; hooks,
> lançador e status line: 44 testes, intocados).

| # | Decisão | O que muda | Commit |
| --- | --- | --- | --- |
| 1 | Catálogo de categorias em arquivo próprio, com pacotes por domínio | `references/casos-de-borda.md` novo, lido no passo Especificar | `cd2a7fb` |
| 2 | Seção obrigatória na spec que registra a decisão para cada borda | Modelo do `spec.md`, parser e audit (achados novos `BORDA_INCOMPLETA` e `REF_SPEC_INEXISTENTE`) | `414c5da` |
| 3 | Regra de fechamento com tolerância e dois critérios: um prova que fecha, outro prova que o programa para quando não fecha | Mesma seção da spec, mesmo audit (`FECHAMENTO_INCOMPLETO`); seção 9 do `CODIGO.md` | `414c5da` e `c6a30c4` |
| 4 | Regras globais na constituição: a A1 pergunta por elas, borda repetida sobe para princípio, presets combináveis entre projetos | `init --preset a,b` e preset novo `dados-tabulares` (`edcfd0e`); `constituicao.md` (`cd2a7fb`); `iniciar-projeto` (`c6a30c4`) | `edcfd0e`, `cd2a7fb` e `c6a30c4` |

Commits da rodada: 1 = `414c5da`, 2 = `edcfd0e`, 3 = `cd2a7fb`, 4 = `c6a30c4`.

**Achado de tamanho, decisão pendente do usuário.** `core/audit.js` (643 linhas antes da rodada,
645 depois: o import e a chamada ao `core/bordas.js`) e `core/plano.js` (742, intocado) passam do
limite de 500 linhas sem exceção registrada. O `cli.js` tem a exceção da rodada 4 e ficou com 821
linhas. As opções são formalizar a exceção, como a do `cli.js`, ou dividir os dois arquivos numa
rodada própria. Até lá, a lógica nova continua indo para módulos próprios: nesta rodada,
`parsers/bordas.js`, `core/bordas.js` e `core/presets.js`.

Registrado durante a execução, sem correção:

| Achado | Decisão |
| --- | --- |
| `parseSpec` (`parsers/spec.js`) já passava de 50 linhas antes da rodada e ganhou as linhas que entregam a seção nova ao `parsers/bordas.js` | Registrado; quebrar a função é refatoração própria |
| A mensagem de constituição ausente (`CONSTITUICAO_AUSENTE`) ainda cita só o preset LGPD/educação | Registrado; não afeta o comportamento |

**Ajuste da conferência (09/11/2026).** Na conferência do PR, o usuário decidiu que a decisão de
uma borda também aceita o princípio da constituição (`P-xxx`), além de `AC-xxx`, `ASM-xxx` e
"Não se aplica:". Princípio que não existe na constituição, ou citado num projeto sem
constituição, é `REF_SPEC_INEXISTENTE` (erro sempre); o rótulo do achado passou a "referência a
código que não existe". As duas provas da regra de fechamento continuam só `AC-xxx`. Motor:
commit `d8a4f45`, com 4 casos novos na suíte `bordas-e-fechamento` (20 ao todo; 91 no motor).
A documentação (catálogo, referências e `SKILL.md` da skill, MANUAL e README) foi ajustada no
mesmo commit deste registro.

O registro completo das opções e dos motivos está no log de decisões do projeto de desenho do
ecossistema (`log-de-decisoes.md` do projeto "Ecosistema de Desenvolvimento", seção "Item 1 da F3:
casos de borda e regras de fechamento").
