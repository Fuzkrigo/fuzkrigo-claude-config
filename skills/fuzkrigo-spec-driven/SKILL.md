---
name: fuzkrigo-spec-driven
description: Desenvolvimento spec-anchored — a especificação continua verdadeira porque é auditada mecanicamente contra o código. Fluxo Especificar → Projetar → Tarefas → Plano → Executar → Auditar → Aprender, com rastreabilidade história→critério de aceite→tarefa→teste, definição de pronto executável (cada critério de aceite vira teste anotado), suposições e perguntas como cidadãs de primeira classe, constituição de princípios verificáveis (preset LGPD/educação), lições aprendidas com lastro mecânico (o motor recusa lição sem sinal real de audit/verify; promoção por recorrência entre features) e plano de execução PARALELA (tarefas de arquivos disjuntos viram faixas em git worktrees, executadas por claude headless com modelo e esforço por tarefa — inclui script pronto e artefato visual com botão). Motor mecânico EMBARCADO na skill (zero instalação — roda com o node do ambiente). Use ao planejar features, implementar com verificação, ou auditar uma implementação contra a spec. Gatilhos "especificar feature", "nova feature", "implementar", "auditar spec", "verificar", "plano de execução", "executar em paralelo", "o que não tem teste", "lições aprendidas". NÃO use para abertura de projeto, briefing, roadmap, documentação de gestão, board ou release — isso é da skill `iniciar-projeto`.
license: MIT
metadata:
  author: "Bruno Krieger [Fuzkrigo] (adaptação)"
  origem: "onovoprogramador/onp-spec-driven — https://github.com/onovoprogramador/onp-spec-driven (MIT)"
  version: 3.2.0
  agent: claude
---

# fuzkrigo-spec-driven — a especificação que continua verdadeira

A maioria das ferramentas de SDD é **spec-first**: a especificação gera código,
o código evolui, e a especificação vira mentira. Esta é **spec-anchored**: a
especificação é auditada mecanicamente contra o código, o tempo todo. Você não
confia que o agente obedeceu — **a máquina prova, via exit code**.

```
┌───────────┐  ┌────────┐  ┌───────┐  ┌───────┐  ┌────────┐  ┌───────┐
│ESPECIFICAR│→ │PROJETAR│→ │TAREFAS│→ │ PLANO │→ │EXECUTAR│→ │AUDITAR│
└───────────┘  └────────┘  └───────┘  └───────┘  └────────┘  └───────┘
   sempre      se preciso    sempre    2+ tarefas   sempre    SEMPRE (gate)
```

## De onde vem a feature — fronteira com a `iniciar-projeto`

Esta skill conduz o **Bloco B** (ciclo de feature) do fluxo definido na skill
`iniciar-projeto`. A divisão é rígida, e cada artefato tem um dono só:

| | `iniciar-projeto` | esta skill |
|---|---|---|
| Território | `docs/`, `.github/`, `CHANGELOG.md`, board | `.spec/` |
| Decide | qual feature construir, e quando | o que a feature faz, e se está provada |

Na prática:

- **A feature nasce de uma Etapa do `docs/CHECKLIST.md`** — que também é uma issue
  no board. O nome da pasta em `.spec/features/<kebab>/` casa com o nome da etapa.
  Se não existe etapa, pergunte antes de criar a feature: o escopo do projeto é
  decidido lá, não aqui.
- **Ao terminar** (audit com saída 0), o estado da spec é copiado de volta para a
  linha da etapa no CHECKLIST, e a issue é fechada pelo PR. Você não inventa
  status no CHECKLIST — `fuzkrigo-spec status` é a fonte.
- **Commits das faixas paralelas são efêmeros.** O `T-xxx <feature>: título` vale
  dentro da faixa; o histórico permanente sai por squash no PR, no formato
  `<tipo>(<escopo>): <descrição> (T-003, T-004)`. Regra completa em
  `~/.claude/references/git-conventions.md`.
- **Projeto sem `docs/` nem board** (experimento, prova de conceito, script de uso
  próprio): pode rodar só com esta skill — a especificação e o gate continuam
  valendo, o que cai fora é a camada de gestão. Diga isso ao usuário uma vez, para
  ele saber que não há roadmap nem release por trás. Mas **isso não vale para
  projeto de portfólio, com usuário final ou que vá ganhar release**: nesses, a
  abertura (Bloco A) é obrigatória, e o critério completo está na seção 4.1 da
  skill `iniciar-projeto`. Na dúvida sobre em qual caso o projeto está, pergunte
  antes de seguir.

## Vocabulário — fale sempre em português simples

Os arquivos usam **códigos de rastreio** curtos (é o que liga especificação,
tarefas e testes na máquina). Mas com o usuário você fala **sempre o nome por
extenso** — o código vai entre parênteses quando precisar dele:

| Código | Nome que você usa com o usuário |
|---|---|
| US-xxx | **história de usuário** — quem precisa, o que precisa e por quê |
| AC-xxx | **critério de aceite** — resultado observável que um teste checa |
| T-xxx | **tarefa** — passo de implementação |
| ASM-xxx | **suposição** — lacuna preenchida com palpite, ainda sem confirmação |
| Q-xxx | **pergunta em aberto** — decisão que falta o dono do produto tomar |
| P-xxx | **princípio** (da constituição) — restrição inegociável do projeto |
| DoD | **definição de pronto** — o conjunto de critérios de aceite com prova |

Exemplo: diga "o critério de aceite AC-003 (aviso de atraso) ainda não tem
teste", nunca "o AC-003 falta @spec tag". Nunca exija que o usuário conheça
as siglas para entender o que você disse.

## Interação — use o harness a favor do usuário

Esta skill roda dentro do Claude Code. Use os recursos nativos para deixar o
fluxo visível e interativo, sem virar burocracia:

- **Explique o que fez e onde está**: depois de CADA ação, diga em português
  simples (1) o que foi feito, (2) o caminho de cada arquivo criado ou
  alterado, (3) qual é o próximo passo. O usuário nunca deveria precisar
  perguntar "cadê o arquivo?" nem "e agora?".
- **Lista de tarefas nativa (TodoWrite)**: ao iniciar uma feature, crie um
  todo por fase ("Especificar entrega-dever", "Escrever testes", "Implementar",
  "Auditar"...). Em features grandes, um todo por tarefa (T-xxx) na fase
  Executar. Mantenha o status atualizado a cada passo — é assim que o usuário
  acompanha onde você está sem precisar perguntar.
- **Perguntas interativas (AskUserQuestion)**: quando surgir uma pergunta em
  aberto ou uma suposição que precisa de confirmação e o usuário estiver
  presente, pergunte na hora com opções concretas — e registre a resposta na
  especificação (status `respondida`/`confirmada`). Não acumule perguntas em
  silêncio nem decida sozinho o que é do dono do produto.
- **Traduza a saída do motor**: depois de cada comando, resuma em 1–3 frases
  de português simples o que a máquina disse e qual o próximo passo. Cole a
  saída bruta também (a prova é ela), mas nunca a entregue sozinha.
- **Respeite o usuário avançado**: se o usuário demonstra conhecer o fluxo
  (usa os códigos, pede comandos diretos), corte as explicações didáticas e
  vá direto ao ponto. A tradução encurta; o rigor (verify + audit) nunca.

## O motor embarcado (zero instalação)

O motor mecânico mora DENTRO desta skill, em `scripts/fuzkrigo-spec.mjs` — resolvido
**relativo ao diretório desta SKILL.md** (o harness informa o base directory da
skill ao carregá-la; nunca assuma um caminho fixo de instalação). Não existe
nada para instalar: sem npm, sem npx, sem CLI global.

Todos os comandos rodam **a partir da raiz do projeto do usuário**:

```bash
node <dir-desta-skill>/scripts/fuzkrigo-spec.mjs <comando>
```

Comandos: `init [--preset base|lgpd-educacao]` · `new <feature>` ·
`plano <feature> [--agents claude]` · `painel <feature> [--porta N] [--sem-abrir]` ·
`tarefa <feature> <T-xxx> <status>` ·
`scaffold <feature> [--force]` · `verify <feature>` ·
`audit [--ci] [--json] [--md <arquivo>]` · `status` · `assumptions` ·
`licoes <add|list|sugerir|penalizar|status>`.

Abaixo, `fuzkrigo-spec <comando>` é abreviação dessa invocação.

## Configurar a prova por stack (faça isso no `init`)

O `verify` lê a saída do SEU test runner. Sem o par certo de `testCommand` e
`reporter` em `fuzkrigo.config.json`, ele lê zero testes e todo critério fica
sem prova — mesmo com os testes passando:

| Stack | `testCommand` | `reporter` |
|---|---|---|
| Node nativo | `node --test --test-reporter=tap` | `tap` |
| Vitest | `npx vitest run --reporter=json --outputFile=.spec/verification/raw.json` | `vitest-json` |
| Jest | `npx jest --json` | `jest-json` |
| pytest | `pytest --junitxml=.spec/verification/raw.xml` | `junit-xml` |
| outro | qualquer comando | `exitcode` (prova fraca, sem granularidade) |

Os reporters que gravam em arquivo (`vitest-json`, `jest-json`, `junit-xml`)
exigem também `reporterOutputFile` apontando para o MESMO caminho do comando.

O `--test-reporter=tap` do Node não é opcional: do Node 20 em diante o padrão
é o reporter `spec`, que o parser TAP não entende.

### Python: a etiqueta vive no nome da função

`@` e `:` são inválidos num identificador Python, então a etiqueta não cabe no
nome do teste. A convenção é dupla, e o `scaffold` já gera assim:

```python
def test_ac_001():
    """AC-001: Entrega antes do prazo e "no prazo" @spec:AC-001"""
```

- A **docstring** com `@spec:AC-001` é o que o audit lê no arquivo para saber
  que o critério tem teste.
- O **nome** `test_ac_001` é o que o runner reporta, e é por ele que o verify
  casa a prova.

Renomear a função quebra a prova; apagar a docstring faz o critério parecer sem
teste. Mantenha os dois. Vale o mesmo para princípios: `test_p_001`.

**Degradação graciosa** — se `node` não existir no ambiente: execute a
auditoria manualmente (releia especificação/tarefas/testes cruzando cada
problema do catálogo abaixo) e rotule o resultado, textualmente, como
**`PROVA FRACA (auditoria manual)`**. Nunca apresente auditoria manual como se
fosse o gate mecânico.

## Contrato de execução — inegociável

1. **Todo critério de aceite vira um teste anotado** com `@spec:AC-xxx` no
   título. Sem teste anotado, o critério não existe para a máquina.
2. **Quem decide se um critério de aceite passou é o test runner**, nunca
   você. `fuzkrigo-spec verify` roda os testes e grava a prova. Você não pode
   declarar vitória. **Teste pulado (skip/todo) não é prova** — o motor recusa
   e o audit acusa.
3. **A feature só fecha quando `fuzkrigo-spec audit --ci --feature <feature>` sai
   com código 0.** Rodar o audit e **colar a saída** é o último passo, sempre.
   O filtro tira do veredito os achados de OUTRAS features (a próxima ainda em
   rascunho não reprova esta); o que é do projeto — constituição violada,
   código órfão — continua contando. **Antes de um release, rode sempre sem
   `--feature`:** ali a palavra final é a do projeto inteiro.
4. **Suposições e perguntas em aberto são obrigatórias.** Preencheu lacuna sem
   confirmar? É uma suposição. Faltou informação? É uma pergunta em aberto. A
   seção ausente também é problema (`SECAO_AUSENTE`) — se não houver nenhuma,
   escreva "Nenhuma." e desconfie.
5. **A constituição manda.** Princípios [DEVE] são verificados; violá-los
   quebra o audit. Nunca conserte o princípio para "fazer passar" — conserte o
   código.
6. **Nunca enfraqueça, pule ou apague um teste para passar.** Se o audit
   falhar 3 vezes seguidas no mesmo problema, PARE e apresente os achados ao
   usuário — não itere para sempre nem contorne o gate.

## Auto-dimensionamento

| Escopo | Especificar | Projetar | Tarefas | Plano | Executar |
|---|---|---|---|---|---|
| Pequeno (≤3 arquivos) | spec enxuta | pular | `tasks.md` mínimo (1 tarefa com `Arquivos:`) | pular | implementar + verify + audit |
| Médio (<10 tarefas) | spec completa | inline | `tasks.md` enxuto | se 2+ tarefas | implementar + verify + audit |
| Grande (multi-componente) | spec + design | design.md | tasks.md | sempre | por faixa + verify + audit |

Toda feature, de qualquer tamanho, mapeia seus arquivos de `src/` no `Arquivos:` de alguma
tarefa: `audit --ci` trata código órfão como erro, e o hook de planejamento pergunta antes de
escrever arquivo não mapeado.

**Sempre obrigatórios:** Especificar, Tarefas e Auditar.
**Válvula de segurança:** na feature pequena, comece o Executar listando os passos
atômicos e confira-os contra o `tasks.md` mínimo. Se aparecerem >5 passos ou
dependências entre eles, PARE e quebre o `tasks.md` em mais tarefas — a feature
foi subdimensionada.

## Passo a passo

### 1. Especificar

- **Antes de escrever, leia o contexto do projeto**: a etapa correspondente em
  `docs/CHECKLIST.md` e, no `docs/ROADMAP.md`, o problema, as decisões
  arquiteturais e as restrições inegociáveis (elas já viraram princípios da
  constituição — não recriar como critério de aceite). Projeto sem esses
  documentos: siga em frente, mas registre a suposição de escopo.
- **Depois, carregue o guia aprendido**: `fuzkrigo-spec licoes list`
  (em projeto grande, filtre: `--escopo <dominio>`). São regras confirmadas
  por falhas reais de features anteriores — aplique-as na spec.
- `fuzkrigo-spec new <feature>` cria `.spec/features/<feature>/spec.md` e `tasks.md`
  com códigos de rastreio contínuos (únicos no projeto inteiro).
- **Uma spec viva por vez, como prática.** Crie a spec quando for implementar a
  feature, não antes: as etapas futuras já estão registradas no CHECKLIST com
  "spec ainda não criada". Spec aberta e parada vira dívida — ela não reprova
  mais o portão das outras (o `--feature` resolveu isso), mas continua
  reprovando o audit do projeto, que é o que vale antes do release.
- Escreva as **histórias de usuário (US-xxx)** e, para cada uma, os
  **critérios de aceite (AC-xxx)** em Dado/Quando/Então. O critério precisa
  ser observável — algo que um teste checa. "Deve ser rápido" não é critério;
  "responde em < 300ms" é.
- **Registre suposições (ASM-xxx) e perguntas em aberto (Q-xxx)** com status
  honesto (`aberta`). Usuário presente? Pergunte na hora (AskUserQuestion) e
  registre a resposta.
- Rode `fuzkrigo-spec audit` e leia os problemas apontados (critério incompleto,
  história sem critério, seção ausente...) — eles dizem o que falta.
- Detalhes de escrita: [escrevendo-specs.md](references/escrevendo-specs.md).

### 2. Projetar (features grandes)

Crie `design.md` com arquitetura e componentes. Cada decisão não-óbvia vira ou
uma suposição (você assumiu) ou uma pergunta em aberto (precisa do dono do
produto).

### 3. Tarefas

- Em `tasks.md`, quebre em **tarefas (T-xxx)**. Cada tarefa tem `Refs:` (as
  histórias/critérios que atende — códigos são globais, pode referenciar
  critério de outra feature) e `Arquivos:` (separados por VÍRGULA; espaços em
  caminhos são permitidos). Campos opcionais por tarefa: `Modelo:` e
  `Esforço:` (baixo|medio|alto|xalto|max) — o plano de execução usa os dois.
- **Classifique cada tarefa pela complexidade** ao escrever o `tasks.md`; é
  esse critério que preenche `Modelo:` e `Esforço:`:
  - **Simples: `Modelo: sonnet`, `Esforço: baixo` ou `medio`.** Até 2
    arquivos, sem regra de negócio nova, mudança mecânica: renomear,
    configuração, texto, fixture de teste, ajuste que segue um padrão já
    existente no código.
  - **Complexa: `Modelo: opus`, `Esforço: alto`.** Qualquer um destes: 3 ou
    mais arquivos ou mudança que atravessa camadas; regra de negócio ou
    cálculo novo; toca autenticação, permissão, dinheiro ou dado pessoal;
    decisão de design não registrada; migração de dados ou integração
    externa.
  - **Na dúvida: complexa.** Errar para o Opus custa cota; errar para o
    Sonnet custa qualidade.
  - Tarefa sem `Modelo:` usa o padrão `opus`.
  - O critério só vale na execução paralela. Quando o Claude da sessão
    implementa tarefa por tarefa, quem trabalha é o modelo da sessão.
- Status entre colchetes: `[pendente]`, `[em-andamento]`, `[concluida]`
  (acentos e maiúsculas são tolerados; token desconhecido é erro).
- **Fechou o tasks.md? Anuncie o paralelismo.** Rode `fuzkrigo-spec plano <feature>`
  e conte ao usuário, sem ele pedir: *"X destas Y tarefas podem rodar EM
  PARALELO, em N faixas — quer que eu execute? Dá para acompanhar tudo ao
  vivo no navegador."* Nunca deixe o paralelismo como segredo do motor.

### 4. Plano de execução (2+ tarefas pendentes)

- `fuzkrigo-spec plano <feature>` agrupa tarefas de **arquivos disjuntos** em
  **faixas paralelas** — 1 faixa = 1 git worktree + 1 branch + 1 janela de
  contexto limpa — e gera três artefatos em `.spec/features/<feature>/`:
  - `plano-execucao.md` — faixas, ondas, gestão de branches/commits e gate;
  - `executar-tarefas.sh` — executor headless: roda `claude -p` por faixa,
    em paralelo, com `--model` e `--effort` já definidos por tarefa, mescla
    as branches de volta, marca as tarefas e fecha com verify + audit;
  - `plano-execucao.html` — visual do plano com o botão **"Executar todas as
    tarefas em janelas limpas e paralelas"** (copia o comando do script).
- **Apresente o plano ao usuário antes de executar**: resuma as faixas,
  incluindo o modelo e o esforço de cada tarefa (para o usuário revisar a
  classificação antes de rodar), diga onde estão os arquivos e ofereça as
  rotas — automática
  (`bash .spec/features/<feature>/executar-tarefas.sh` ou o botão do html) ou
  manual (você mesmo implementa faixa a faixa, seguindo branches e commits do
  plano).
- **Acompanhamento ao vivo (ofereça sempre)**: rode `fuzkrigo-spec painel <feature>`
  em background (Bash com run_in_background) e entregue a URL ao usuário —
  abre um painel local no navegador com as faixas em tempo real, o log de
  cada janela rolando, as provas e o gate; o botão **"Executar todas as
  tarefas em janelas limpas e paralelas"** de lá dispara o script DE VERDADE.
  É assim que o usuário acompanha sem digitar comando nenhum.
- Mudou tasks.md ou a config (`paralelo` no fuzkrigo.config.json)? **Regenere
  o plano** — nunca edite os artefatos à mão.

### 5. Executar

- Espelhe as tarefas na lista de tarefas nativa e vá atualizando o status —
  o usuário acompanha o progresso em tempo real. No tasks.md mecânico, use
  `fuzkrigo-spec tarefa <feature> <T-xxx> <status>`.
- `fuzkrigo-spec scaffold <feature>` gera o esqueleto de teste **que falha** para
  cada critério de aceite sem teste — e também para cada princípio da
  constituição com `verificação(teste)` ainda sem tag. A definição de pronto
  nasce executável.
- Implemente até os testes passarem. **1 tarefa = 1 commit atômico** (a
  mensagem cita a tarefa: `T-003 <feature>: ...`). Marque `[concluida]` só
  com prova PASS.
- Um teste por critério de aceite no mínimo; o teste assere o resultado da
  especificação, não o formato do seu código.

### 6. Verificar e Auditar (o gate)

- `fuzkrigo-spec verify <feature>` — roda os testes, grava a prova por critério de
  aceite em `.spec/verification/<feature>.json`. Só PASS conta (skip não é
  prova).
- `fuzkrigo-spec audit --ci --feature <feature>` — o veredito desta feature.
  Exit 0 = alinhada. Exit 1 = leia cada problema e resolva. **Cole a saída
  final na conversa** e traduza em uma frase o que ela significa. O relatório
  avisa, em amarelo, que o escopo estava filtrado — não omita isso ao resumir.
- `fuzkrigo-spec audit --ci` (sem filtro) — o veredito do projeto. É o que vale
  no CI e antes de qualquer release. Rode também sempre que quiser saber se o
  projeto inteiro está íntegro, não só a feature da vez.
- Nome de feature errado é recusado com código 2 e a lista das existentes —
  nunca sai 0 por engano.
- Falhou? Corrija e re-audite — no máximo **3 iterações**; persistindo, pare e
  escale ao usuário com os problemas ranqueados.
- Fluxo completo com exemplo: [fluxo.md](references/fluxo.md).

### 7. Aprender (fecha o ciclo)

Depois que o audit sai 0: o caminho até aqui ficou registrado sozinho no
histórico de sinais (todo problema de audit e toda falha/skip de verify).

- `fuzkrigo-spec licoes sugerir` — o motor aponta sinais que recorreram em
  features distintas e ainda não têm lição.
- Registre **no máximo 3 lições** com `fuzkrigo-spec licoes add --sinal <CODIGO>
  --feature <f> --fonte <AC-xxx> --texto "regra geral em uma frase"
  [--escopo <dominio>]`. O motor RECUSA lição sem sinal real registrado
  (`LICAO_SEM_LASTRO`) — se recusar, a lição não existe; não force.
- **Caminho limpo → nenhuma lição.** Isso é correto, não é omissão.
- Fraseado, promoção, penalização e escala: [licoes.md](references/licoes.md).

## Catálogo de problemas que o audit aponta

O audit imprime cada problema com o nome legível na frente e o código estável
entre parênteses (o código serve para CI e para `licoes add --sinal`). Ao
conversar com o usuário, use o nome legível.

| Problema (código) | O que significa | O que fazer |
|---|---|---|
| critério de aceite sem teste (AC_SEM_TESTE) | requisito sem prova | escreva o teste com `@spec:AC-xxx` no título |
| critério de aceite sem prova (AC_SEM_PROVA) | teste existe, nunca passou (ou foi PULADO) | rode `verify`; skip não é prova |
| teste órfão (TESTE_ORFAO) | teste aponta pra critério que sumiu (drift!) | a especificação mudou — atualize o teste |
| referência quebrada (REF_QUEBRADA) | tarefa cita história/critério inexistente | corrija a referência |
| tarefa concluída sem prova (TASK_CONCLUIDA_SEM_PROVA) | tarefa [concluida] sem critério provado | verifique ou reabra a tarefa |
| status de tarefa inválido (TASK_STATUS_INVALIDO) | status não reconhecido | use pendente/em-andamento/concluida |
| suposição em aberto (ASM_ABERTA) | suposição aberta numa feature "pronta" | confirme/invalide com o usuário |
| seção obrigatória ausente (SECAO_AUSENTE) | spec sem seção Suposições/Perguntas | registre-as ou escreva "Nenhuma." |
| princípio violado (PRINCIPIO_VIOLADO) | quebrou a constituição | conserte o código, não o princípio |
| verificação não olha nenhum arquivo (GLOB_SEM_ARQUIVOS) | glob da constituição não casa nada | corrija o glob |
| nível de princípio inválido (NIVEL_INVALIDO) | nível desconhecido | use [DEVE]/[RECOMENDADO]/[PODE] |
| código órfão (ARQUIVO_ORFAO) | código que nenhuma tarefa mapeia | mapeie na tarefa ou questione o código |
| nome da feature divergente (FEATURE_DIVERGENTE) | `> feature:` difere do diretório | alinhe os dois |
| prova fraca (PROVA_FRACA) | prova só por exit code global | prefira reporter tap/vitest-json/jest-json |
| código de rastreio curto/duplicado (ID_CURTO / ID_DUPLICADO) | fora da gramática / repetido | use 3+ dígitos, códigos únicos |

Também: história sem critério (`US_SEM_AC`), critério incompleto
(`AC_INCOMPLETO`), critério sem tarefa (`AC_SEM_TASK`), pergunta em aberto
(`Q_ABERTA`), princípio sem verificação (`PRINCIPIO_SEM_VERIFICACAO`), prova
desatualizada (`VERIFY_OBSOLETO`), verificação malformada
(`VERIFICACAO_MALFORMADA`, inclui regex que excede o tempo limite), arquivo
não existe (`ARQUIVO_INEXISTENTE`), status inválido (`STATUS_INVALIDO`),
especificação sem história (`SPEC_SEM_US`), critério fora de história
(`AC_FORA_DE_US`).

## Perguntas que o motor responde por você

- **"Qual requisito não tem teste?"** → `fuzkrigo-spec audit` → critério de aceite
  sem teste (`AC_SEM_TESTE`).
- **"Que teste não mapeia pra requisito?"** → teste órfão (`TESTE_ORFAO`).
- **"Que código não atende requisito nenhum?"** → código órfão
  (`ARQUIVO_ORFAO`).
- **"O que estamos assumindo?"** → `fuzkrigo-spec assumptions`.
- **"O que dá pra fazer em paralelo?"** → `fuzkrigo-spec plano <feature>`.
- **"Como acompanho a execução ao vivo?"** → `fuzkrigo-spec painel <feature>`.
- **"Onde estamos?"** → `fuzkrigo-spec status`.

## Carregamento de contexto

Carregue referências sob demanda (na fase que precisa delas), nunca todas de
uma vez. Nunca carregue especificações de duas features ao mesmo tempo.
Constituição: [constituicao.md](references/constituicao.md).

## Regra de ouro

Se você está prestes a dizer "pronto", rode
`fuzkrigo-spec audit --ci --feature <feature>` e cole a saída. Se não saiu 0,
não está pronto. Aqui, "pronto" é uma coisa que a máquina verifica — não uma
frase sua.

E se você está prestes a dizer "o projeto está pronto", tire o `--feature`.

---

## Origem e licença

Esta skill é uma adaptação de **onp-spec-driven**, de onovoprogramador —
<https://github.com/onovoprogramador/onp-spec-driven> — distribuída sob licença
MIT, que se mantém aqui. A adaptação (renomeação, integração com o fluxo da
skill `iniciar-projeto` e ajustes locais do motor) é de Bruno Krieger
[Fuzkrigo].

Os nomes funcionais herdados do projeto original foram trocados pelos
próprios: o arquivo de configuração lido pelo motor é `fuzkrigo.config.json`,
os worktrees do plano paralelo nascem em `../fuzkrigo-worktrees/` e o painel
autentica o botão de executar com o cabeçalho `x-fuzkrigo-token`. A troca foi
feita de uma vez, sem compatibilidade com os nomes antigos, porque nenhum
projeto os usava.
