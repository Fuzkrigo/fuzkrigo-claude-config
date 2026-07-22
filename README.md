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
└── skills/                          # Skills empacotadas, extraídas para texto legível
    ├── iniciar-projeto/             # Fluxo obrigatório de 9 fases para novos projetos/refatorações grandes
    ├── pipeline-corporativo/        # Templates e procedimentos para projetos VBA+Python+PyInstaller (ambiente corporativo)
    └── revisar-seguranca/           # Checklists de segurança (OWASP, LGPD, secrets, threat modeling, SDL)
```

Cada skill segue o formato padrão do Claude Code: `SKILL.md` (entrada principal) + `references/` (documentação detalhada carregada sob demanda) + `assets/` (templates usados pela skill).

## Como isso é usado

- `CLAUDE.md` fica em `~/.claude/CLAUDE.md` e se aplica a todas as sessões.
- `CLAUDE_PASTA PROFFISIONAL.md`, `CODIGO.md` e `PATTERNS.md` são carregados por referência (`@arquivo.md`) a partir do `CLAUDE.md`, conforme o contexto da sessão.
- As pastas em `skills/` correspondem a skills instaladas em `~/.claude/skills/` — aqui mantidas como texto para versionamento e documentação; a instalação real usa o pacote `.skill` (zip) gerado a partir desse conteúdo.
- `settings.json` corresponde à configuração global do Claude Code.

## Próximos passos

Brainstorm e criação de subagentes globais (`.claude/agents/*.md`), reaproveitando lógica das skills existentes onde fizer sentido.
