# fuzkrigo-claude-config

Backup e documentação da configuração pessoal do Claude Code (Fuzkrigo) — diretrizes globais, skills e settings usados em todos os projetos.

## Estrutura

```
.
├── CLAUDE.md                        # Diretrizes globais (persona, idioma, TDD, anti-alucinação, modo tarefa)
├── CLAUDE_PASTA PROFFISIONAL.md      # Diretrizes específicas para projetos profissionais (ambiente corporativo, stack VBA+Python)
├── CODIGO.md                        # Referência de padrões de código (SOLID, Clean Code, testes, tratamento de erros)
├── PATTERNS.md                      # Referência de arquitetura e padrões de projeto
├── settings.json                    # Configuração do Claude Code (modelo, idioma, tema, effort level)
├── skills/                          # Skills empacotadas, extraídas para texto legível
│   ├── iniciar-projeto/             # Fluxo obrigatório de 9 fases para novos projetos/refatorações grandes
│   └── pipeline-corporativo/        # Templates e procedimentos para projetos VBA+Python+PyInstaller (ambiente corporativo)
└── agents/                          # Subagentes globais (.claude/agents/*.md)
    └── revisar-seguranca/           # Auditoria de segurança isolada (OWASP, LGPD, secrets, threat modeling, SDL) — ver agents/revisar-seguranca.md
```

Cada skill segue o formato padrão do Claude Code: `SKILL.md` (entrada principal) + `references/` (documentação detalhada carregada sob demanda) + `assets/` (templates usados pela skill).

Cada agente é um arquivo `.md` com frontmatter (`name`, `description`, `tools`, `model`) + prompt de sistema. `description` funciona como o gatilho — é o que o Claude principal lê para decidir quando invocar o agente via ferramenta `Agent`. `revisar-seguranca/references/` guarda o conteúdo de referência que o agente lê sob demanda (mesmo padrão de carregamento seletivo que as skills usam, mas aplicado manualmente — agentes não têm esse mecanismo embutido).

## Como isso é usado

- `CLAUDE.md` fica em `~/.claude/CLAUDE.md` e se aplica a todas as sessões.
- `CLAUDE_PASTA PROFFISIONAL.md`, `CODIGO.md` e `PATTERNS.md` são carregados por referência (`@arquivo.md`) a partir do `CLAUDE.md`, conforme o contexto da sessão.
- As pastas em `skills/` correspondem a skills instaladas em `~/.claude/skills/` — aqui mantidas como texto para versionamento e documentação; a instalação real usa o pacote `.skill` (zip) gerado a partir desse conteúdo.
- `agents/revisar-seguranca.md` corresponde ao agente instalado em `~/.claude/agents/revisar-seguranca.md` (global, todos os projetos). Era a skill `revisar-seguranca` até esta ter sido convertida em agente isolado — ver histórico do commit para a análise que motivou a troca.
- `settings.json` corresponde à configuração global do Claude Code.
