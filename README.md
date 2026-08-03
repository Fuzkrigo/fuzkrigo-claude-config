# fuzkrigo-claude-config

Backup e documentação da configuração pessoal do Claude Code (Fuzkrigo) — diretrizes globais, skills e settings usados em todos os projetos.

## Estrutura

```
.
├── CLAUDE.md                        # Diretrizes globais (persona, idioma, TDD, anti-alucinação, modo tarefa)
├── CLAUDE_PASTA PROFFISIONAL.md      # Diretrizes específicas para projetos profissionais (ambiente corporativo, stack VBA+Python)
├── CODIGO.md                        # Referência de padrões de código (SOLID, Clean Code, testes, tratamento de erros)
├── PATTERNS.md                      # Referência de arquitetura e padrões de projeto
├── DESIGN.md                        # Referência de design system (tokens, componentes, acessibilidade)
├── statusline.sh                    # Script da status line, referenciado pelo settings.json
├── settings.json                    # Configuração do Claude Code (modelo, idioma, tema, effort level, hooks, status line)
├── references/                      # Referências globais, fora de qualquer skill (~/.claude/references/)
│   ├── git-conventions.md           # Commits semânticos, branches, PRs, squash das faixas paralelas
│   └── github/                      # Templates de issue e PR, copiados para o .github/ do projeto
├── skills/                          # Skills empacotadas, extraídas para texto legível
│   ├── iniciar-projeto/             # Abertura, documentação e gestão de projeto (Blocos A e C)
│   ├── fuzkrigo-spec-driven/        # Desenvolvimento por feature com prova mecânica (Bloco B), motor node embarcado
│   └── pipeline-corporativo/        # Templates e procedimentos para projetos VBA+Python+PyInstaller (ambiente corporativo)
├── agents/                          # Subagentes globais (.claude/agents/*.md)
│   ├── security-reviewer/           # Auditoria de segurança isolada (OWASP, LGPD, secrets, threat modeling, SDL) — ver agents/security-reviewer.md
│   ├── code-reviewer.md             # Revisão de qualidade de código (SOLID, DRY, KISS, YAGNI, SoC, LoD, POLA) — lê CLAUDE.md §3 e CODIGO.md §1/§7 ao vivo, não duplica conteúdo
│   ├── project-manager.md           # Provisionamento GitHub/Linear + ritual de release (Fuzkrigo Projects) — executa board/labels/issues direto, mas nunca commit/tag/release
│   ├── project-documentation.md     # Gera ARCHITECTURE.md (A2), RESUMO-EXECUTIVO.md, DOCUMENTACAO-TECNICA.md, MANUAL.md e APRESENTACAO.md (C2) — não cobre ROADMAP/CHECKLIST, que ficam com o Claude principal
│   └── docstrings-manager.md        # Gera docstrings e comentários inline em qualquer linguagem (Portão 2, após o code-reviewer) — nunca altera lógica
└── hooks/                           # Scripts Python invocados pelos hooks do settings.json
    ├── check_planning_docs.py       # PreToolUse (Write|Edit) — iniciar-projeto §4, Regra de Bloqueio
    └── check_style_prohibitions.py  # PreToolUse (Write|Edit) — iniciar-projeto §8, Proibições de Estilo
```

Cada skill segue o formato padrão do Claude Code: `SKILL.md` (entrada principal) + `references/` (documentação detalhada carregada sob demanda). A `fuzkrigo-spec-driven` traz também `scripts/`, com o motor de auditoria embarcado (Node, sem dependências externas).

As duas skills principais são complementares, não alternativas: `iniciar-projeto` decide **o que** construir e cuida da documentação, do board e do release; `fuzkrigo-spec-driven` conduz **como** cada feature é construída e provada. A fronteira entre elas está na seção 1 da `iniciar-projeto/SKILL.md`.

Cada agente é um arquivo `.md` com frontmatter (`name`, `description`, `tools`, `model`) + prompt de sistema. `description` funciona como o gatilho — é o que o Claude principal lê para decidir quando invocar o agente via ferramenta `Agent`. `security-reviewer/references/` guarda o conteúdo de referência que o agente lê sob demanda (mesmo padrão de carregamento seletivo que as skills usam, mas aplicado manualmente — agentes não têm esse mecanismo embutido).

Hooks são comandos que o harness executa automaticamente em eventos do ciclo de vida (aqui, `PreToolUse` em `Write`/`Edit`) — não dependem de eu lembrar de aplicar uma regra.

`check_planning_docs.py` pergunta (`permissionDecision: ask`) antes de escrever código de produção sem evidência de planejamento. Duas evidências são aceitas, uma por camada do fluxo: `ROADMAP.md` mais `CHECKLIST.md` (abertura do projeto) **ou** qualquer `.spec/features/<feature>/spec.md` (feature especificada). Basta uma — projeto pequeno que roda só com spec é caso legítimo e não deve ser interrogado a cada arquivo. Hooks não veem histórico de conversa, então não sabem se é `#tarefa`: por isso pergunta em vez de bloquear direto, e quem decide é o usuário. Procura os documentos em `docs/` (local canônico) e aceita a raiz como fallback, para não disparar falso positivo em projeto anterior a essa convenção.

`check_style_prohibitions.py` bloqueia (`permissionDecision: deny`) emoji decorativo e frases de reivindicação de coautoria de máquina — restrito a essas frases especificamente (não à palavra "Claude"/"Anthropic" isolada). Tem uma exceção por caminho: dentro de `~/.claude/` e deste repositório, citar as frases proibidas é necessário para documentar a própria regra. Sem ela o hook impedia editar o texto que o define, incluindo o próprio código-fonte do hook. A exceção vale só para as frases; emoji continua bloqueado em todo lugar.

## Como isso é usado

- `CLAUDE.md` fica em `~/.claude/CLAUDE.md` e se aplica a todas as sessões.
- `CLAUDE_PASTA PROFFISIONAL.md`, `CODIGO.md` e `PATTERNS.md` são carregados por referência (`@arquivo.md`) a partir do `CLAUDE.md`, conforme o contexto da sessão.
- As pastas em `skills/` correspondem a skills instaladas em `~/.claude/skills/` — aqui mantidas como texto para versionamento e documentação.
- `references/` corresponde a `~/.claude/references/`. `git-conventions.md` e os templates de `.github/` viviam dentro da skill `iniciar-projeto`, mas o agente `project-manager` os lia por caminho físico — o que o quebraria em qualquer troca de skill. Saíram para cá justamente para que o agente não dependa de nenhuma skill específica.
- `skills/fuzkrigo-spec-driven/` é uma adaptação de [onp-spec-driven](https://github.com/onovoprogramador/onp-spec-driven), de onovoprogramador, sob licença MIT — preservada aqui. A adaptação (renomeação, integração com o fluxo da `iniciar-projeto` e ajustes locais do motor) é própria. Por herança do projeto original, alguns nomes internos mantêm o prefixo antigo: o arquivo de configuração lido pelo motor é `onpspec.config.json` e os worktrees do plano paralelo nascem em `../onp-worktrees/`. O motor é Node puro, sem dependências, e roda com o `node` do ambiente — não há instalação.
- **Patch local no motor** (reaplique se atualizar a skill a partir do upstream): suporte a Python. São quatro pontos, todos cobertos pela suíte em `skills/fuzkrigo-spec-driven/scripts/test/ponte-python.test.mjs` (`node --test test/ponte-python.test.mjs`, 12 casos):
  1. `verify.js` — reporter `junit-xml`, que lê o `pytest --junitxml` (nativo, sem plugin);
  2. `verify.js` — reconhecimento da etiqueta pelo nome da função (`test_ac_001` vale por `@spec:AC-001`), porque `@` e `:` não cabem num identificador Python e o runner reporta o nome, não a docstring;
  3. `config.js` — `ignoreGlobs` passa a cobrir `__pycache__`, `.venv`, caches de pytest/mypy/ruff; sem isso o audit acusa cada `.pyc` como código órfão;
  4. `cli.js` — o `init` grava `node --test --test-reporter=tap`. Do Node 20 em diante o reporter padrão é o `spec`, que o parser TAP não entende: com o comando antigo, o verify lia zero testes e todo critério ficava sem prova, mesmo com a suíte passando. Este era um defeito do upstream, não da adaptação.
- `agents/security-reviewer.md` corresponde ao agente instalado em `~/.claude/agents/security-reviewer.md` (global, todos os projetos). Era a skill `revisar-seguranca` até esta ter sido convertida em agente isolado (depois renomeado para `security-reviewer` na padronização de nomes) — ver histórico do commit para a análise que motivou a troca.
- `agents/code-reviewer.md` corresponde ao agente instalado em `~/.claude/agents/code-reviewer.md` (global). Diferente do `security-reviewer`, não tem pasta `references/` própria — lê `CLAUDE.md` e `CODIGO.md` diretamente em tempo de execução, porque esses arquivos continuam em uso proativo fora do agente (não fazia sentido duplicar conteúdo que eu já consulto durante implementação normal).
- `agents/project-manager.md` corresponde ao agente instalado em `~/.claude/agents/project-manager.md` (global). Absorveu o conteúdo que antes vivia em `references/github-projects.md`, `references/linear-projects.md` e `references/releases.md` da skill `iniciar-projeto` (removidos de lá — não eram usados fora desse contexto, mesmo raciocínio do `security-reviewer`). Tem acesso a `Write`/`Edit`/`Bash` e às ferramentas MCP do Linear (`mcp__claude_ai_Linear__*`) — nível de confiança bem maior que os outros dois agentes, porque precisa mutar sistemas externos de verdade (GitHub, Linear). Board/labels/issues são executados direto; commit/tag/release nunca são executados pelo agente — ele só monta o bloco de comandos e devolve para o Claude principal perguntar ao usuário se quer executar manualmente ou pedir execução automática (política também documentada em `references/git-conventions.md`). Commits do dia a dia (Bloco B) seguem o mesmo raciocínio de custo — o Claude principal aplica `git-conventions.md` direto, sem invocar um agente a cada commit atômico; o `project-manager` fica reservado para o provisionamento (pouco frequente) e o ritual de release (fim de milestone).
- `agents/project-documentation.md` corresponde ao agente instalado em `~/.claude/agents/project-documentation.md` (global). Centraliza a geração de cinco dos sete documentos de projeto — `ARCHITECTURE.md`, `RESUMO-EXECUTIVO.md`, `DOCUMENTACAO-TECNICA.md`, `MANUAL.md`, `APRESENTACAO.md` — invocado em A2 (Arquitetura inicial), no Portão 3 do Bloco B (Arquitetura, quando a feature muda a estrutura) e em C2 (os quatro documentos de comunicação, no fechamento da milestone). Os outros dois (`ROADMAP.md`, `CHECKLIST.md`) ficam com o Claude principal pelo mesmo motivo do `project-manager`/commits: são editados com alta frequência, então o custo de invocar um subagente a cada mudança pequena não compensa. `ARCHITECTURE.md` mudou de lado nessa mesma lógica: é vivo, mas muda com pouca frequência (só em marcos estruturais), então o subagente compensa. A distinção entre `DOCUMENTACAO-TECNICA.md` (decisões técnicas, stack, API, configuração) e `ARCHITECTURE.md` (estrutura completa, diagramas, System Design) continua a mesma — o primeiro explica o porquê, o segundo documenta o quê; agora os dois só têm o mesmo dono.
- `agents/docstrings-manager.md` corresponde ao agente instalado em `~/.claude/agents/docstrings-manager.md` (global). Agente único e multi-linguagem (detecta a convenção idiomática de cada arquivo — docstring Google-style em Python, JSDoc em JS/TS, godoc em Go, etc. — em vez de um agente por linguagem). Critério de escopo segue o Google Style Guide (obrigatório em função/classe/módulo público, com exceção para trivial). Só tem `Edit`, nunca `Write`: documenta código existente, não cria arquivos novos, e seu mandato é estritamente documentação — nunca corrige lógica, mesmo notando um problema (isso é papel do `code-reviewer`/`security-reviewer`). Invocado depois do `code-reviewer` no Portão 2 do Bloco B, quando a estrutura do código já está estável. Tem uma regra de não interferência: jamais altera o título de um teste que carrega `@spec:AC-xxx` ou `@principle:P-xxx`, porque é por essa etiqueta que o motor da `fuzkrigo-spec-driven` casa a prova do critério.
- `hooks/*.py` correspondem aos scripts instalados em `~/.claude/hooks/`, referenciados pelo bloco `hooks` do `settings.json` global.
- `settings.json` corresponde à configuração global do Claude Code. Ele já sobreviveu a um acidente: a instalação da status line, em 30/07/2026, gravou por cima do arquivo e deixou apenas o bloco `statusLine` — os dois hooks, a supressão do trailer de coautoria e as preferências de modelo/idioma/esforço ficaram inativos até a restauração. Por isso `statusline.sh` passou a ser versionado aqui: instalador que reescreve `settings.json` é risco conhecido, e o backup precisa conter as duas peças para reconstruir o estado.
- `statusline.sh` corresponde a `~/.claude/statusline.sh`. É o script que o bloco `statusLine` do `settings.json` executa a cada render.
- `DESIGN.md` é referência de design system (duas camadas de token, componentes, contraste WCAG). **Ainda não está instalado em `~/.claude/`** — hoje só existe neste repositório e não é carregado por nenhuma skill ou `CLAUDE.md`. Ver a seção 10 do próprio arquivo: falta decidir se vira skill invocável, referência no `CLAUDE.md`, ou os dois.
