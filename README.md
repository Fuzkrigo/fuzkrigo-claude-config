# fuzkrigo-claude-config

Backup e documentação da configuração pessoal do Claude Code (Fuzkrigo) — diretrizes globais, skills e settings usados em todos os projetos.

## Estrutura

```
.
├── CLAUDE.md                        # Diretrizes globais (persona, idioma, TDD, anti-alucinação, modo tarefa)
├── CLAUDE_PASTA PROFFISIONAL.md      # Diretrizes específicas para projetos profissionais (ambiente corporativo, stack VBA+Python)
├── CODIGO.md                        # Referência de padrões de código (SOLID, Clean Code, testes, tratamento de erros)
├── PATTERNS.md                      # Referência de arquitetura e padrões de projeto
├── settings.json                    # Configuração do Claude Code (modelo, idioma, tema, effort level, hooks)
├── skills/                          # Skills empacotadas, extraídas para texto legível
│   ├── iniciar-projeto/             # Fluxo obrigatório de 9 fases para novos projetos/refatorações grandes
│   └── pipeline-corporativo/        # Templates e procedimentos para projetos VBA+Python+PyInstaller (ambiente corporativo)
├── agents/                          # Subagentes globais (.claude/agents/*.md)
│   ├── security-reviewer/           # Auditoria de segurança isolada (OWASP, LGPD, secrets, threat modeling, SDL) — ver agents/security-reviewer.md
│   ├── code-reviewer.md             # Revisão de qualidade de código (SOLID, DRY, KISS, YAGNI, SoC, LoD, POLA) — lê CLAUDE.md §3 e CODIGO.md §1/§7 ao vivo, não duplica conteúdo
│   ├── project-manager.md           # Provisionamento GitHub/Linear + ritual de release (Fuzkrigo Projects) — executa board/labels/issues direto, mas nunca commit/tag/release
│   ├── project-documentation.md     # Gera ARCHITECTURE.md, RESUMO-EXECUTIVO.md, DOCUMENTACAO-TECNICA.md, MANUAL.md e APRESENTACAO.md (Fases 1/2/3/4/8) — não cobre ROADMAP/CHECKLIST, que ficam com o Claude principal
│   └── docstrings-manager.md        # Gera docstrings e comentários inline em qualquer linguagem (Fase 8, após o code-reviewer) — nunca altera lógica
└── hooks/                           # Scripts Python invocados pelos hooks do settings.json
    ├── check_planning_docs.py       # PreToolUse (Write|Edit) — iniciar-projeto §3, Regra de Bloqueio
    └── check_style_prohibitions.py  # PreToolUse (Write|Edit) — iniciar-projeto §7, Proibições de Estilo
```

Cada skill segue o formato padrão do Claude Code: `SKILL.md` (entrada principal) + `references/` (documentação detalhada carregada sob demanda) + `assets/` (templates usados pela skill).

Cada agente é um arquivo `.md` com frontmatter (`name`, `description`, `tools`, `model`) + prompt de sistema. `description` funciona como o gatilho — é o que o Claude principal lê para decidir quando invocar o agente via ferramenta `Agent`. `security-reviewer/references/` guarda o conteúdo de referência que o agente lê sob demanda (mesmo padrão de carregamento seletivo que as skills usam, mas aplicado manualmente — agentes não têm esse mecanismo embutido).

Hooks são comandos que o harness executa automaticamente em eventos do ciclo de vida (aqui, `PreToolUse` em `Write`/`Edit`) — não dependem de eu lembrar de aplicar uma regra. `check_planning_docs.py` pergunta (`permissionDecision: ask`) antes de escrever código de produção sem `ROADMAP.md`/`CHECKLIST.md`; hooks não veem histórico de conversa, então não sabem se é `#tarefa` — por isso pergunta em vez de bloquear direto, e quem decide é o usuário. `check_style_prohibitions.py` bloqueia (`permissionDecision: deny`) emoji decorativo e frases de reivindicação de coautoria de IA — restrito a essas frases especificamente (não à palavra "Claude"/"Anthropic" isolada) para não quebrar a edição deste próprio repositório.

## Como isso é usado

- `CLAUDE.md` fica em `~/.claude/CLAUDE.md` e se aplica a todas as sessões.
- `CLAUDE_PASTA PROFFISIONAL.md`, `CODIGO.md` e `PATTERNS.md` são carregados por referência (`@arquivo.md`) a partir do `CLAUDE.md`, conforme o contexto da sessão.
- As pastas em `skills/` correspondem a skills instaladas em `~/.claude/skills/` — aqui mantidas como texto para versionamento e documentação; a instalação real usa o pacote `.skill` (zip) gerado a partir desse conteúdo.
- `agents/security-reviewer.md` corresponde ao agente instalado em `~/.claude/agents/security-reviewer.md` (global, todos os projetos). Era a skill `revisar-seguranca` até esta ter sido convertida em agente isolado (depois renomeado para `security-reviewer` na padronização de nomes) — ver histórico do commit para a análise que motivou a troca.
- `agents/code-reviewer.md` corresponde ao agente instalado em `~/.claude/agents/code-reviewer.md` (global). Diferente do `security-reviewer`, não tem pasta `references/` própria — lê `CLAUDE.md` e `CODIGO.md` diretamente em tempo de execução, porque esses arquivos continuam em uso proativo fora do agente (não fazia sentido duplicar conteúdo que eu já consulto durante implementação normal).
- `agents/project-manager.md` corresponde ao agente instalado em `~/.claude/agents/project-manager.md` (global). Absorveu o conteúdo que antes vivia em `references/github-projects.md`, `references/linear-projects.md` e `references/releases.md` da skill `iniciar-projeto` (removidos de lá — não eram usados fora desse contexto, mesmo raciocínio do `security-reviewer`). Tem acesso a `Write`/`Edit`/`Bash` e às ferramentas MCP do Linear (`mcp__claude_ai_Linear__*`) — nível de confiança bem maior que os outros dois agentes, porque precisa mutar sistemas externos de verdade (GitHub, Linear). Board/labels/issues são executados direto; commit/tag/release nunca são executados pelo agente — ele só monta o bloco de comandos e devolve para o Claude principal perguntar ao usuário se quer executar manualmente ou pedir execução automática (política também documentada em `skills/iniciar-projeto/references/git-conventions.md`). Commits do dia a dia (Fase 7) seguem o mesmo raciocínio de custo — o Claude principal aplica `git-conventions.md` direto, sem invocar um agente a cada commit atômico; o `project-manager` fica reservado para o provisionamento (pouco frequente) e o ritual de release (fim de milestone).
- `agents/project-documentation.md` corresponde ao agente instalado em `~/.claude/agents/project-documentation.md` (global). Centraliza a geração de cinco dos sete documentos de projeto — `ARCHITECTURE.md`, `RESUMO-EXECUTIVO.md`, `DOCUMENTACAO-TECNICA.md`, `MANUAL.md`, `APRESENTACAO.md` — invocado nas Fases 1 (Arquitetura inicial), 2, 3, 4 e 8 (Arquitetura, quando a estrutura muda). Os outros dois (`ROADMAP.md`, `CHECKLIST.md`) ficam com o Claude principal pelo mesmo motivo do `project-manager`/commits: são editados com alta frequência, então o custo de invocar um subagente a cada mudança pequena não compensa. `ARCHITECTURE.md` mudou de lado nessa mesma lógica: é vivo, mas muda com pouca frequência (só em marcos estruturais), então o subagente compensa. A distinção entre `DOCUMENTACAO-TECNICA.md` (decisões técnicas, stack, API, configuração) e `ARCHITECTURE.md` (estrutura completa, diagramas, System Design) continua a mesma — o primeiro explica o porquê, o segundo documenta o quê; agora os dois só têm o mesmo dono.
- `agents/docstrings-manager.md` corresponde ao agente instalado em `~/.claude/agents/docstrings-manager.md` (global). Agente único e multi-linguagem (detecta a convenção idiomática de cada arquivo — docstring Google-style em Python, JSDoc em JS/TS, godoc em Go, etc. — em vez de um agente por linguagem). Critério de escopo segue o Google Style Guide (obrigatório em função/classe/módulo público, com exceção para trivial). Só tem `Edit`, nunca `Write`: documenta código existente, não cria arquivos novos, e seu mandato é estritamente documentação — nunca corrige lógica, mesmo notando um problema (isso é papel do `code-reviewer`/`security-reviewer`). Invocado depois do `code-reviewer` na Fase 8, quando a estrutura do código já está estável.
- `hooks/*.py` correspondem aos scripts instalados em `~/.claude/hooks/`, referenciados pelo bloco `hooks` do `settings.json` global.
- `settings.json` corresponde à configuração global do Claude Code.
