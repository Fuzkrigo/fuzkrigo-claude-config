# fuzkrigo-claude-config

Backup e documentação da configuração pessoal do Claude Code (Fuzkrigo) — diretrizes globais, skills e settings usados em todos os projetos.

A `main` deste repositório é protegida: toda mudança entra por pull request, com os testes verdes nos dois sistemas (os checks `testes (ubuntu-latest)` e `testes (windows-latest)` do `.github/workflows/testes.yml`), inclusive as do administrador. Se o repositório passar por privado na conta Free, a proteção cai e não volta ao torná-lo público de novo: precisa ser reaplicada com os dois checks do `testes.yml`.

## Estrutura

```
.
├── .github/workflows/testes.yml     # CI deste repositório: suítes do motor e dos hooks, em Linux e Windows (não é o modelo de references/github/)
├── CLAUDE.md                        # Diretrizes globais (persona, idioma, TDD, anti-alucinação, modo tarefa)
├── CLAUDE_PASTA PROFFISIONAL.md      # Diretrizes específicas para projetos profissionais (ambiente corporativo, stack VBA+Python)
├── CODIGO.md                        # Referência de padrões de código (SOLID, Clean Code, testes, tratamento de erros)
├── PATTERNS.md                      # Referência de arquitetura e padrões de projeto
├── DESIGN.md                        # Referência de design system (tokens, componentes, acessibilidade)
├── statusline.sh                    # Script da status line, referenciado pelo settings.json
├── settings.json                    # Configuração do Claude Code (modelo, idioma, tema, effort level, hooks, status line)
├── references/                      # Referências globais, fora de qualquer skill (~/.claude/references/)
│   ├── git-conventions.md           # Commits semânticos, branches, PRs, squash das faixas paralelas
│   └── github/                      # Copiado para o .github/ do projeto: templates de issue e PR + workflow de CI + scripts de cobertura + .gitattributes (scripts em LF)
├── skills/                          # Skills empacotadas, extraídas para texto legível
│   ├── iniciar-projeto/             # Abertura, documentação e gestão de projeto (Blocos A e C)
│   ├── fuzkrigo-spec-driven/        # Desenvolvimento por feature com prova mecânica (Bloco B), motor node embarcado
│   └── pipeline-corporativo/        # Templates e procedimentos para projetos VBA+Python+PyInstaller (ambiente corporativo)
├── agents/                          # Subagentes globais (.claude/agents/*.md)
│   ├── security-reviewer/           # Auditoria de segurança isolada (OWASP, LGPD, secrets, threat modeling, SDL) — ver agents/security-reviewer.md
│   ├── code-reviewer.md             # Revisão de qualidade de código (SOLID, DRY, KISS, YAGNI, SoC, LoD, POLA) — lê CLAUDE.md §3 e CODIGO.md §1/§7 ao vivo, não duplica conteúdo
│   ├── project-manager.md           # Provisionamento GitHub/Linear + ritual de release (Fuzkrigo Projects) — executa labels/issues/board do Linear direto; repositório novo e commit/tag/release, nunca: devolve os comandos montados
│   ├── project-documentation.md     # Gera ARCHITECTURE.md (A2), RESUMO-EXECUTIVO.md, DOCUMENTACAO-TECNICA.md, MANUAL.md e APRESENTACAO.md (C2) — não cobre ROADMAP/CHECKLIST, que ficam com o Claude principal
│   └── docstrings-manager.md        # Gera docstrings e comentários inline em qualquer linguagem (Portão 2, após o code-reviewer) — nunca altera lógica
└── hooks/                           # Scripts Python invocados pelos hooks do settings.json
    ├── arm_modo_tarefa.py           # UserPromptSubmit — cria/apaga o marcador do Modo Tarefa (CLAUDE.md §7)
    ├── check_planning_docs.py       # PreToolUse (Write|Edit) — iniciar-projeto §4, Regra de Bloqueio
    ├── check_style_prohibitions.py  # PreToolUse (Write|Edit) — iniciar-projeto §8, Proibições de Estilo
    ├── run-python.sh                # Lançador dos três hooks: py -3 no Windows, python3 no Linux/WSL
    └── tests/                       # testes dos hooks, do lançador e da status line (unittest): py -3 -m unittest discover -s hooks/tests no Windows, python3 no lugar de py -3 no Linux/WSL
```

Cada skill segue o formato padrão do Claude Code: `SKILL.md` (entrada principal) + `references/` (documentação detalhada carregada sob demanda). A `fuzkrigo-spec-driven` traz também `scripts/`, com o motor de auditoria embarcado (Node, sem dependências externas).

As duas skills principais são complementares, não alternativas: `iniciar-projeto` decide **o que** construir e cuida da documentação, da gestão e do release; `fuzkrigo-spec-driven` conduz **como** cada feature é construída e provada. A fronteira entre elas está na seção 1 da `iniciar-projeto/SKILL.md`.

Cada agente é um arquivo `.md` com frontmatter (`name`, `description`, `tools`, `model`) + prompt de sistema. `description` funciona como o gatilho — é o que o Claude principal lê para decidir quando invocar o agente via ferramenta `Agent`. `security-reviewer/references/` guarda o conteúdo de referência que o agente lê sob demanda (mesmo padrão de carregamento seletivo que as skills usam, mas aplicado manualmente — agentes não têm esse mecanismo embutido).

Hooks são comandos que o harness executa automaticamente em eventos do ciclo de vida (aqui, `UserPromptSubmit` a cada mensagem e `PreToolUse` em `Write`/`Edit`) — não dependem de eu lembrar de aplicar uma regra.

`check_planning_docs.py` pergunta (`permissionDecision: ask`) antes de escrever código de produção, e nunca bloqueia. **Sem nenhuma tarefa no projeto**, pergunta se não houver evidência de planejamento, como antes: `ROADMAP.md` mais `CHECKLIST.md` (abertura do projeto) **ou** qualquer `.spec/features/<feature>/spec.md` (feature especificada). Basta uma — projeto pequeno que roda só com spec é caso legítimo e não deve ser interrogado a cada arquivo. **Com tarefas**, pergunta antes de escrever arquivo de `srcGlobs` que não esteja no `Arquivos:` de nenhuma tarefa em `.spec/features/*/tasks.md` — a mesma regra do "código órfão" do audit, aplicada no momento da escrita, com os `srcGlobs`, `testGlobs` e `ignoreGlobs` do `fuzkrigo.config.json` (ou os padrões do motor) e a mesma semântica de glob do motor. A raiz do projeto é o `CLAUDE_PROJECT_DIR` (ou o diretório atual), e a pasta `.spec` segue o `specDir` do `fuzkrigo.config.json` quando ele define outro nome, como no motor. Como hooks não veem histórico de conversa, o `#tarefa` chega ao hook pelo marcador do `arm_modo_tarefa.py`, e com o marcador ativo ele libera tudo; fora disso, não sabe se a escrita é uma correção pequena, por isso pergunta em vez de bloquear, e quem decide é o usuário. Procura os documentos em `docs/` (local canônico) e aceita a raiz como fallback, para não disparar falso positivo em projeto anterior a essa convenção.

`check_style_prohibitions.py` bloqueia (`permissionDecision: deny`) emoji decorativo e frases de reivindicação de coautoria de máquina — restrito a essas frases especificamente (não à palavra "Claude"/"Anthropic" isolada). Tem uma exceção por caminho: dentro de `~/.claude/` e de qualquer pasta chamada exatamente `fuzkrigo-claude-config` (este repositório, onde quer que esteja clonado), citar as frases proibidas é necessário para documentar a própria regra. Sem ela o hook impedia editar o texto que o define, incluindo o próprio código-fonte do hook. A exceção vale só para as frases; emoji continua bloqueado em todo lugar. Marcadores funcionais de status não contam como emoji decorativo e passam: U+2705, U+26A0 e U+274C (os dos relatórios dos agentes) e as marcas tipográficas U+2713, U+2714, U+2717 e U+2718 (o ok/falha que o motor e a status line imprimem). O resto da faixa continua bloqueado.

`arm_modo_tarefa.py` roda a cada mensagem (`UserPromptSubmit`) e cuida do marcador do Modo Tarefa (`CLAUDE.md` §7): mensagem que começa com `#tarefa` cria `<temp>/claude-modo-tarefa/<session_id>.flag`, e "sair do modo tarefa" ou "modo normal" o apagam. É por esse arquivo que o `check_planning_docs.py`, que não vê a conversa, sabe que a Regra de Bloqueio foi desligada na sessão. Antes, o marcador dependia de o Claude lembrar de criá-lo, o que quase nunca acontecia. Falha aberta: um erro no hook nunca trava a mensagem.

## Como isso é usado

- `CLAUDE.md` fica em `~/.claude/CLAUDE.md` e se aplica a todas as sessões.
- `CODIGO.md` é importado pelo `CLAUDE.md` (seção 10, linha `@CODIGO.md` fora de crase) e entra em toda sessão. `PATTERNS.md` não é importado: é lido sob demanda, em `~/.claude/PATTERNS.md`, nas discussões de arquitetura. O local de instalação de `CLAUDE_PASTA PROFFISIONAL.md` está em aberto, adiado para a etapa corporativa.
- As pastas em `skills/` correspondem a skills instaladas em `~/.claude/skills/` — aqui mantidas como texto para versionamento e documentação.
- `references/` corresponde a `~/.claude/references/`. `git-conventions.md` e os templates de `.github/` viviam dentro da skill `iniciar-projeto`, mas o agente `project-manager` os lia por caminho físico — o que o quebraria em qualquer troca de skill. Saíram para cá justamente para que o agente não dependa de nenhuma skill específica.
- `skills/fuzkrigo-spec-driven/` é uma adaptação de [onp-spec-driven](https://github.com/onovoprogramador/onp-spec-driven), de onovoprogramador, sob licença MIT — preservada aqui. A adaptação (renomeação, integração com o fluxo da `iniciar-projeto` e ajustes locais do motor) é própria. Os nomes funcionais herdados do projeto original foram trocados pelos próprios (Patch 3, abaixo): o motor lê `fuzkrigo.config.json` e os worktrees do plano paralelo nascem em `../fuzkrigo-worktrees/`. O motor é Node puro, sem dependências, e roda com o `node` do ambiente — não há instalação.
- **Patches locais no motor** (reaplique se atualizar a skill a partir do upstream). São catorze conjuntos, cobertos por dezesseis suítes em `skills/fuzkrigo-spec-driven/scripts/test/` — 87 casos ao todo, rodáveis com `node --test test/*.test.mjs` a partir de `scripts/`; o glob pega suíte nova sem mudar o comando. O workflow `.github/workflows/testes.yml` roda essas suítes e as dos hooks (44 casos) a cada push na `main` e a cada pull request, em Linux e em Windows.
- **Patch 14 — presets de constituição combináveis e o preset `dados-tabulares`** (`test/presets-combinados.test.mjs`, 9 casos): o `init` aceitava um preset só, e juntar dois à mão deixaria dois `P-001` no arquivo, que o audit acusa como `ID_DUPLICADO`. Agora `--preset` aceita uma lista separada por vírgula (`--preset base,dados-tabulares`): sai uma constituição única, com um cabeçalho que nomeia os presets e as versões, o comentário explicativo do primeiro, o marcador `<!-- preset: <nome> -->` antes de cada preset seguinte e os `P-xxx` renumerados em sequência, inclusive nas etiquetas `@principle:`, que o `scaffold` usa nos esqueletos. Com um preset só, o arquivo sai igual ao de antes, byte a byte. Preset desconhecido ou repetido sai 2 sem criar nada e lista os disponíveis; constituição existente continua mantida. O preset novo `dados-tabulares` traz seis princípios tirados de defeitos reais (identificador como texto, unidade declarada, coluna obrigatória ausente, fechamento nunca forçado, registro sem par reportado, formato normalizado). Tocou `cli.js` (o `cmdInit` chama o módulo; o arquivo não cresceu), `core/presets.js` (novo) e `templates/constituicao-dados-tabulares.md` (novo).
- **Patch 13 — casos de borda e regras de fechamento na spec** (`test/bordas-e-fechamento.test.mjs`, 16 casos): a regra "caso de borda vira critério de aceite" existia só como instrução, e o audit saía 0 com uma spec só de caminho feliz; total que precisa fechar não aparecia em lugar nenhum. A spec ganhou a seção `## Casos de borda e regras de fechamento`, entre `## Fora de escopo` e `## Suposições`, com duas tabelas: cada borda com a decisão (`AC-xxx`, `ASM-xxx` ou `Não se aplica: motivo`) e cada regra de fechamento com tolerância, o critério que prova que fecha e o que prova que o programa para, diferentes entre si ("Nenhuma." no lugar da tabela vale). Achados novos: `BORDA_INCOMPLETA` e `FECHAMENTO_INCOMPLETO`, com a severidade do `SECAO_AUSENTE` (aviso em rascunho, erro de `pronta` em diante; a falta da seção também é `SECAO_AUSENTE`), e `REF_SPEC_INEXISTENTE`, erro sempre, quando a seção cita código que não existe nesta spec. Os achados têm feature e saem com o `--feature` de outra. O modelo do `spec.md` nasce com a seção e linhas de exemplo entre colchetes, que dão só aviso enquanto a spec é rascunho; o catálogo de categorias fica em `references/casos-de-borda.md`. A fixture `test/fixture-projeto.mjs` ganhou a seção na spec dela, sem mudar asserção. Tocou `parsers/spec.js` (reconhece a seção e entrega as linhas), `parsers/bordas.js` (novo, lê as tabelas), `core/bordas.js` (novo, julga), `core/audit.js` (só a chamada), `core/labels.js`, `cli.js` (uma mensagem do `new`, sem crescer) e `templates/spec.md`.
- **Patch 12 — scaffold que acrescenta e `new` que mostra o rastreio** (`test/scaffold-acrescenta.test.mjs`, 4 casos, e `test/new-mostra-rastreio.test.mjs`, 2 casos): com o arquivo de testes da feature existente, o `scaffold` recusava, e o `--force` reescrevia o arquivo inteiro, apagando os testes escritos à mão. Agora ele acrescenta ao fim só os esqueletos dos critérios (e princípios) sem teste, depois de uma linha em branco, sem cabeçalho nem imports; arquivo novo continua nascendo igual, byte a byte. O `--force` é aceito, mas só avisa que não é mais necessário, e a mensagem final diz se o arquivo foi criado ou recebeu N esqueletos. O `new` passou a imprimir a etapa e a issue que reconheceu (`etapa: E1 · issue: #12`), porque um nome como `e2e-testes` é lido como a etapa "E2e". Tocou `core/scaffold.js` (a função principal foi quebrada em partes menores, abaixo de 50 linhas), `core/rastreio.js` e `cli.js`, que ficou 5 linhas menor.
- **Patch 11 — executor na branch da issue e gate por feature** (`test/executor-plano.test.mjs`, 5 casos): o `executar-tarefas.sh` criava a branch `spec/<feature>` e fechava com `audit --ci` sem `--feature`; o gate de uma feature reprovava por causa de outra, e o trabalho saía da branch da issue. Agora o script trabalha na branch atual e recusa `main`, `master` e a branch padrão do remoto antes de qualquer commit, emite o evento `branch|<nome>`, que o painel usa no banner do gate, e fecha com `audit --ci --feature`. O `plano.json`, o `plano-execucao.md` (inclusive o modo manual) e o html deixaram de fixar `spec/<feature>`; as faixas continuam `spec/<feature>-faixa-N`. Tocou `core/plano.js` e `core/painel.js`.
- **Patch 10 — princípio repetido na constituição** (`test/unicidade-principios.test.mjs`, 3 casos): dois `## P-001` na constituição passavam sem achado, e o segundo era auditado como se fosse outro princípio. Agora o parser da constituição acusa `ID_DUPLICADO` com as duas linhas; o achado é do projeto e sobrevive ao `--feature`. Tocou só `parsers/constitution.js`.
- **Patch 9 — prova do princípio e unicidade das tarefas** (`test/prova-de-principio.test.mjs`, 6 casos, e `test/unicidade-tarefas.test.mjs`, 2 casos, com a fixture compartilhada `test/fixture-projeto.mjs`): a `verificação(teste)` só conferia se existia teste com `@principle:P-xxx`, nunca se ele tinha passado. Agora o audit lê o resultado na prova — com `--feature`, a dessa feature; sem filtro, a mais recente do projeto — e acusa `PRINCIPIO_SEM_PROVA`: erro quando o teste de um `[DEVE]` falhou ou foi pulado, aviso quando nenhum verify gravou o resultado, que vira erro no `--ci`. O achado não tem feature, então sobrevive ao filtro. As tarefas (`T-xxx`) entraram na checagem de unicidade: `T-001` em duas features passa a ser `ID_DUPLICADO`. Tocou `core/audit.js`, `core/prova-principio.js` (novo) e `core/labels.js`.
- **Patch 8 — numeração contínua no `new`** (`test/numeracao-continua.test.mjs`, 3 casos): o `new` continuava US e AC a partir do maior código do projeto, mas toda feature nova nascia com `ASM-001`, `Q-001` e `T-001`; a partir da segunda, o audit acusava `ID_DUPLICADO`. Agora os cinco códigos continuam a partir do maior existente — ASM e Q lidos das specs, T dos `tasks.md`. Os testes fixam a continuação depois de um salto na numeração e o audit sem código duplicado com duas features recém-criadas. Tocou só `cli.js`.
- **Patch 7 — spec rastreável** (`test/spec-rastreavel.test.mjs`, 9 casos): o `new` reconhece o prefixo do nome da feature, sem exigi-lo — `e<n>-` para etapa do CHECKLIST (`e1-login-email`, `e11a-migracao-legado`), `i<n>-` para issue avulsa de bug ou dívida técnica (`i42-corrige-encoding`) e nenhum para projeto descartável — e aceita `--issue <n>`, só com dígitos. O título sai da parte depois do prefixo. Prefixo `i<n>` e `--issue` diferentes, ou `--issue` que não é número, saem com código 2 sem criar nada. O template do `spec.md` ganhou as linhas de cabeçalho `> etapa:` e `> issue:` (etapa sem issue fica com o marcador visível `[#<n> da issue]`), o lembrete de que casos de borda viram critérios de aceite e, no fim, as seções `## Histórico` (a primeira linha registra a data, "Spec criada" e a origem) e `## Resolução` (preenchida no Portão 3). O parser e o audit não mudaram: as linhas e seções novas já eram ignoradas, e spec antiga audita igual. O `init` passou a gravar o bloco `coverage` (95, 98 e `businessLogicPaths` vazio, que o CI reprova até a A3 declarar as pastas) e continua sem tocar num `fuzkrigo.config.json` existente. Tocou `cli.js`, `core/rastreio.js` (novo) e `templates/spec.md`.
- **Patch 6 — mensagens e saída do motor** (`test/saida-do-motor.test.mjs`, 4 casos): o `init --agents antigravity` mandava copiar a skill do Claude para `~/.claude/skills/`; agora a orientação depende do agente, porque esta distribuição só traz a variante do Claude Code. A instalação da skill saiu do `cmdInit` para uma função própria (`installAgentSkill`), sem mudar comportamento — um dos testes protege isso. O `plano-execucao.md` gerado perdeu o emoji decorativo do título, a lição promovida passou da estrela U+2605 para a seta U+2191, e um teste varre o `lib/` inteiro atrás de caractere que o hook de estilo bloqueia; e um comentário do `config.js` deixou de citar um pacote npm que não existe. Tocou `cli.js`, `core/plano.js` e `config.js`.
- **Patch 5 — preset LGPD para Python e JavaScript** (`test/preset-lgpd.test.mjs`, 2 casos): o P-004 do preset `lgpd-educacao` ("dados pessoais nunca aparecem em logs") olhava só `src/**/*.js` e só `console.*`, então num projeto Python não verificava nada. Passou a olhar `src/**` e a reconhecer `print`, `logging.*`, `logger.*` e `log.*`, mas só nos métodos de registro (criar o logger com `getLogger("notas")` não é violação). Os testes rodam o template real pelo audit real. Tocou só `templates/constituicao-lgpd-educacao.md`.
- **Patch 4 — modelo padrão por alias** (`test/modelo-padrao.test.mjs`, 2 casos): o `paralelo.model` padrão, usado pelo executor paralelo em cada `claude -p --model` quando a tarefa não declara `Modelo:`, passou de um modelo fixo para o alias `opus`, que acompanha sempre o Opus mais recente. Os testes fixam o padrão e que o `paralelo.model` do projeto continua vencendo. A escolha entre `sonnet` e `opus` por tarefa é um critério escrito na `SKILL.md` (passo "3. Tarefas"), não uma heurística do motor. Tocou só `config.js`.
- **Patch 3 — nomes próprios** (`test/nomes-fuzkrigo.test.mjs`, 2 casos): os nomes funcionais herdados do projeto de origem viraram os do fuzkrigo — o arquivo de configuração passou a `fuzkrigo.config.json`, os worktrees a `../fuzkrigo-worktrees/` e o cabeçalho do painel a `x-fuzkrigo-token`; a mensagem do `init --agents` que mandava instalar um pacote npm inexistente passou a dar a instrução local. Sem compatibilidade com os nomes antigos, porque nenhum projeto os usava. Os testes fixam as duas pontas visíveis: o motor lê `fuzkrigo.config.json`, e o `init` grava esse nome e nunca o antigo. Tocou `config.js`, `cli.js`, `core/verify.js`, `core/plano.js` e `core/painel.js`.
- **Patch 2 — audit com escopo de feature** (`test/audit-por-feature.test.mjs`, 6 casos): `audit --feature <nome>` limita o veredito a uma feature. Sem ele, o audit é sempre do projeto inteiro, e criar a spec da próxima feature reprovava o portão da anterior. Regras fixadas pelos testes: achados de outras features saem; achados que não pertencem a feature nenhuma (constituição, projeto inválido) permanecem, senão o filtro viraria bypass; e nome inexistente falha com código 2, nunca com auditoria vazia e código 0. Tocou `core/audit.js`, `core/report.js` (aviso de escopo) e `cli.js`.
- **Patch 1 — suporte a Python** (`test/ponte-python.test.mjs`, 12 casos). São quatro pontos:
  1. `verify.js` — reporter `junit-xml`, que lê o `pytest --junitxml` (nativo, sem plugin);
  2. `verify.js` — reconhecimento da etiqueta pelo nome da função (`test_ac_001` vale por `@spec:AC-001`), porque `@` e `:` não cabem num identificador Python e o runner reporta o nome, não a docstring;
  3. `config.js` — `ignoreGlobs` passa a cobrir `__pycache__`, `.venv`, caches de pytest/mypy/ruff; sem isso o audit acusa cada `.pyc` como código órfão;
  4. `cli.js` — o `init` grava `node --test --test-reporter=tap`. Do Node 20 em diante o reporter padrão é o `spec`, que o parser TAP não entende: com o comando antigo, o verify lia zero testes e todo critério ficava sem prova, mesmo com a suíte passando. Este era um defeito do upstream, não da adaptação.
- `agents/security-reviewer.md` corresponde ao agente instalado em `~/.claude/agents/security-reviewer.md` (global, todos os projetos). Era a skill `revisar-seguranca` até esta ter sido convertida em agente isolado (depois renomeado para `security-reviewer` na padronização de nomes) — ver histórico do commit para a análise que motivou a troca.
- `agents/code-reviewer.md` corresponde ao agente instalado em `~/.claude/agents/code-reviewer.md` (global). Diferente do `security-reviewer`, não tem pasta `references/` própria — lê `CLAUDE.md` e `CODIGO.md` diretamente em tempo de execução, porque esses arquivos continuam em uso proativo fora do agente (não fazia sentido duplicar conteúdo que eu já consulto durante implementação normal).
- `agents/project-manager.md` corresponde ao agente instalado em `~/.claude/agents/project-manager.md` (global). Absorveu o conteúdo que antes vivia em `references/github-projects.md`, `references/linear-projects.md` e `references/releases.md` da skill `iniciar-projeto` (removidos de lá — não eram usados fora desse contexto, mesmo raciocínio do `security-reviewer`). Tem acesso a `Write`/`Edit`/`Bash` e às ferramentas MCP do Linear (`mcp__claude_ai_Linear__*`) — nível de confiança bem maior que os outros dois agentes, porque precisa mutar sistemas externos de verdade (GitHub, Linear). Labels, milestones e issues no GitHub, e a gestão no Linear, são executados direto — com duas exceções que voltam como proposta no relatório, porque o agente não tem canal com o usuário: repositório que ainda não existe (ele devolve o `gh repo create` montado, sem executar) e issues de projeto sem `CHECKLIST.md` (ele devolve a lista de etapas para confirmação). Commit/tag/release nunca são executados pelo agente — ele só monta o bloco de comandos e devolve para o Claude principal perguntar ao usuário se quer executar manualmente ou pedir execução automática (política também documentada em `references/git-conventions.md`). Commits do dia a dia (Bloco B) seguem o mesmo raciocínio de custo — o Claude principal aplica `git-conventions.md` direto, sem invocar um agente a cada commit atômico; o `project-manager` fica reservado para o provisionamento (pouco frequente) e o ritual de release (fim de milestone).
- `agents/project-documentation.md` corresponde ao agente instalado em `~/.claude/agents/project-documentation.md` (global). Centraliza a geração de cinco dos sete documentos de projeto — `ARCHITECTURE.md`, `RESUMO-EXECUTIVO.md`, `DOCUMENTACAO-TECNICA.md`, `MANUAL.md`, `APRESENTACAO.md` — invocado em A2 (Arquitetura inicial), no Portão 3 do Bloco B (Arquitetura, quando a feature muda a estrutura) e em C2 (os quatro documentos de comunicação, no fechamento da milestone). Os outros dois (`ROADMAP.md`, `CHECKLIST.md`) ficam com o Claude principal pelo mesmo motivo do `project-manager`/commits: são editados com alta frequência, então o custo de invocar um subagente a cada mudança pequena não compensa. `ARCHITECTURE.md` mudou de lado nessa mesma lógica: é vivo, mas muda com pouca frequência (só em marcos estruturais), então o subagente compensa. A distinção entre `DOCUMENTACAO-TECNICA.md` (decisões técnicas, stack, API, configuração) e `ARCHITECTURE.md` (estrutura completa, diagramas, System Design) continua a mesma — o primeiro explica o porquê, o segundo documenta o quê; agora os dois só têm o mesmo dono.
- `agents/docstrings-manager.md` corresponde ao agente instalado em `~/.claude/agents/docstrings-manager.md` (global). Agente único e multi-linguagem (detecta a convenção idiomática de cada arquivo — docstring Google-style em Python, JSDoc em JS/TS, godoc em Go, etc. — em vez de um agente por linguagem). Critério de escopo segue o Google Style Guide (obrigatório em função/classe/módulo público, com exceção para trivial). Só tem `Edit`, nunca `Write`: documenta código existente, não cria arquivos novos, e seu mandato é estritamente documentação — nunca corrige lógica, mesmo notando um problema (isso é papel do `code-reviewer`/`security-reviewer`). Invocado depois do `code-reviewer` no Portão 2 do Bloco B, quando a estrutura do código já está estável. Tem uma regra de não interferência: jamais altera o título de um teste que carrega `@spec:AC-xxx` ou `@principle:P-xxx`, porque é por essa etiqueta que o motor da `fuzkrigo-spec-driven` casa a prova do critério.
- `hooks/*.py` correspondem aos scripts instalados em `~/.claude/hooks/`, referenciados pelo bloco `hooks` do `settings.json` global.
- `settings.json` corresponde à configuração global do Claude Code. Ele já sobreviveu a um acidente: a instalação da status line, em 30/07/2026, gravou por cima do arquivo e deixou apenas o bloco `statusLine` — os dois hooks, a supressão do trailer de coautoria e as preferências de modelo/idioma/esforço ficaram inativos até a restauração. Por isso `statusline.sh` passou a ser versionado aqui: instalador que reescreve `settings.json` é risco conhecido, e o backup precisa conter as duas peças para reconstruir o estado.
- `statusline.sh` corresponde a `~/.claude/statusline.sh`. É o script que o bloco `statusLine` do `settings.json` executa a cada render.
- **`~/.claude/settings.local.json` não é versionado**, de propósito (está no `.gitignore`). Ele é reescrito pelo Claude Code toda vez que uma permissão é aprovada, então versioná-lo produziria ruído permanente de diff. A regra é: permissão que vale sempre vai para o bloco `permissions` do `settings.json`, que é versionado; o `settings.local.json` fica como rascunho descartável, específico da máquina. Se ele se perder, nada de importante vai junto.
- `DESIGN.md` é referência de design system (duas camadas de token, componentes, contraste WCAG). Corresponde a `~/.claude/DESIGN.md` e é lido sob demanda: a tabela do §4 do `CLAUDE.md` manda consultá-lo em trabalho que produz interface ou gráfico — decisão de 08/11/2026, que também resolveu o conflito com a paleta de exemplo da skill dataviz (item 10 do `PLANO-CORRECOES.md`). Não é importado, então não ocupa contexto fixo. As pendências 1 a 7 da seção 10 do próprio arquivo seguem abertas, para uma sessão de design.

## Instalação no `~/.claude/` (Windows)

Este repositório é o backup versionado; o que o Claude Code carrega é o `~/.claude/`. O procedimento abaixo instala a configuração em qualquer usuário do Windows, porque nenhum caminho depende do nome do usuário. Ele foi validado numa instalação simulada, com uma `HOME` temporária, em 08/11/2026, mas ainda não foi executado no `~/.claude/` real: valide cada passo ao fazê-lo.

**Pré-requisitos** — confira no Git Bash:

```bash
git --version      # Git for Windows: traz o Git Bash, que roda os hooks (shell: bash)
py -3 --version    # lancador do Python: o run-python.sh dos hooks usa py -3 no Windows e python3 no Linux
node --version     # Node LTS: o motor da fuzkrigo-spec-driven
gh auth status     # GitHub CLI autenticado: o agente project-manager usa em A3 e C3
jq --version       # opcional: a status line usa o jq e, sem ele, o python3/python do PATH
```

**O que vai para onde:**

| Do repositório | Para | Observação |
| --- | --- | --- |
| `CLAUDE.md`, `CODIGO.md`, `PATTERNS.md`, `DESIGN.md`, `statusline.sh` | `~/.claude/` | O `CLAUDE.md` importa o `CODIGO.md`; `PATTERNS.md` e `DESIGN.md` são lidos sob demanda |
| `settings.json` | `~/.claude/settings.json` | **Mesclar, não sobrescrever** (ver abaixo) |
| `hooks/*.py`, `hooks/run-python.sh` | `~/.claude/hooks/` | O `run-python.sh` é o lançador que os três hooks chamam; a pasta `hooks/tests/` fica só neste repositório |
| `agents/` | `~/.claude/agents/` | Inclui `security-reviewer/references/` |
| `skills/iniciar-projeto/`, `skills/fuzkrigo-spec-driven/` | `~/.claude/skills/` | |
| `skills/pipeline-corporativo/` | `~/.claude/skills/` | Só na máquina corporativa |
| `references/` | `~/.claude/references/` | |

Não vão para o `~/.claude/`: `README.md`, `MANUAL-DO-ECOSSISTEMA.md` e `PLANO-CORRECOES.md`, que documentam este repositório, e o `CLAUDE_PASTA PROFFISIONAL.md`, cujo local de instalação está em aberto (etapa corporativa).

**Comandos** — no Git Bash, na raiz deste repositório:

```bash
cp ~/.claude/settings.json ~/.claude/settings.json.bak-$(date +%Y%m%d) 2>/dev/null
mkdir -p ~/.claude/hooks ~/.claude/agents ~/.claude/skills ~/.claude/references
cp CLAUDE.md CODIGO.md PATTERNS.md DESIGN.md statusline.sh ~/.claude/
cp hooks/*.py hooks/run-python.sh ~/.claude/hooks/
cp -r agents/. ~/.claude/agents/
cp -r skills/iniciar-projeto skills/fuzkrigo-spec-driven ~/.claude/skills/
cp -r references/. ~/.claude/references/
```

Para atualizar uma instalação antiga, apague antes a pasta de cada skill em `~/.claude/skills/`: o `cp -r` sobrescreve, mas não remove arquivos que saíram do repositório.

**`settings.json`:** o Claude Code grava no arquivo da máquina preferências próprias, como o modelo escolhido em `/model` e o canal de atualização. Leve deste repositório os blocos `attribution`, `permissions`, `statusLine` e `hooks`, mais as preferências que quiser, sem apagar as chaves que só existem na máquina. O backup do primeiro comando é a volta, se algo der errado — instalador que sobrescreve o `settings.json` já custou os hooks uma vez.

**Validar:**

1. Testes: `py -3 -m unittest discover -s hooks/tests` (neste repositório; no Linux/WSL, `python3` no lugar de `py -3`) e as suítes do motor a partir de `~/.claude/skills/fuzkrigo-spec-driven/scripts` (comando na seção 13 do `MANUAL-DO-ECOSSISTEMA.md`).
2. Numa sessão nova, `/context all` lista o `~/.claude/CLAUDE.md` e o `CODIGO.md` importado em **Memory files**.
3. Hooks: uma mensagem que começa com `#tarefa` cria `claude-modo-tarefa/<session_id>.flag` na pasta temporária do Windows; pedir a gravação de um arquivo com emoji, fora deste repositório, é negado pelo hook de estilo.
4. A status line aparece no rodapé da sessão.

## Instalação no `~/.claude/` (Linux e WSL)

O procedimento é o da seção do Windows, com as diferenças abaixo. O `settings.json` é o mesmo, sem variante por sistema: o `run-python.sh` escolhe `py -3` no Windows e `python3` no Linux, e a status line é chamada por `bash`, então não depende da permissão de execução do arquivo, que se perde ao copiar entre Windows e WSL.

**Pré-requisitos:**

```bash
bash --version     # roda os hooks (shell: bash) e a status line
git --version
python3 --version  # os tres hooks rodam com ele, pelo run-python.sh
node --version     # Node LTS: o motor da fuzkrigo-spec-driven
gh auth status     # GitHub CLI autenticado: o agente project-manager usa em A3 e C3
jq --version       # opcional: a status line usa o jq e, sem ele, o python3
```

**No WSL, clone dentro do Linux**, e não em `/mnt/c`: o acesso ao disco do Windows é lento e mistura permissões e finais de linha.

```bash
mkdir -p ~/code
gh repo clone Fuzkrigo/fuzkrigo-claude-config ~/code/fuzkrigo-claude-config
cd ~/code/fuzkrigo-claude-config
```

**O que vai para onde, comandos e `settings.json`:** iguais aos da seção do Windows, num terminal bash na raiz do clone. A cópia dos hooks inclui o lançador: `cp hooks/*.py hooks/run-python.sh ~/.claude/hooks/`. O `settings.json` é o mesmo arquivo, mesclado do mesmo jeito.

**Validar:**

1. Testes: `python3 -m unittest discover -s hooks/tests -v` (neste repositório). Sem `node` no Linux, os três casos de paridade com o motor ficam pulados, não reprovados.
2. Numa sessão nova, `/context all`, como no Windows.
3. Hooks: uma mensagem que começa com `#tarefa` cria `/tmp/claude-modo-tarefa/<session_id>.flag`.
4. A status line aparece no rodapé da sessão.

**Dois `~/.claude`:** o Claude Code do WSL tem o próprio `~/.claude`, separado do `~/.claude` do Windows. Uma instalação num não chega ao outro. Qual dos dois é o principal, e se os dois coexistem, ainda está em aberto (F5).
