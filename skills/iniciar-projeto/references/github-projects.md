# Fuzkrigo Projects — Padrão de GitHub Projects

Padrão único de organização para todos os projetos (pessoais e corporativos). O objetivo é que todo repositório siga a mesma lógica de board, labels e fluxo, para não reaprender a cada projeto.

**Estes padrões são sugestões adaptáveis, não regras rígidas.** Ajustar famílias de labels, campos ou views ao contexto de cada projeto sempre que fizer sentido.

**Provisionamento:** ao final da Fase 2 (quando roadmap e milestones já estão definidos e as etapas são concretas), o setup abaixo é aplicado automaticamente via `gh`. As issues nascem das etapas do CHECKLIST.md, todas de uma vez. O que o usuário faz manualmente é apenas commit, branch, PR e release.

## Índice
- [Labels](#labels)
- [Milestones](#milestones)
- [Board (Project)](#board-project)
- [Templates de issue e PR](#templates-de-issue-e-pr)
- [Mapeamento hierarquia → GitHub](#mapeamento-hierarquia--github)
- [Provisionamento via gh](#provisionamento-via-gh)
- [Automações e rituais](#automações-e-rituais)

## Labels

Cada issue recebe **uma label de cada família**. Os pontos de cor são a **única exceção** à proibição de emojis — servem para identificação visual rápida no board.

```yaml
# Família TIPO (o que é)
- type:feature      # verde
- type:bug          # vermelho
- type:tech-debt    # amarelo
- type:docs         # azul
- type:chore        # cinza (manutenção, deps)
- type:refactor     # roxo

# Família PRIORIDADE (quando fazer)
- P0-critical       # quebra producao, fazer agora
- P1-high           # fazer nesta sprint
- P2-medium         # proximas 2-3 sprints
- P3-low            # backlog

# Família STATUS ESPECIAL (marcadores)
- blocked           # travado
- needs-discussion  # precisa decisao antes
- good-first-issue  # entrada facil
- wontfix           # decidido nao fazer

# Família ÁREA (varia por projeto — exemplo)
- area:parser
- area:ui
- area:database
- area:build
- area:docs
```

Exportar para `labels.yml` e aplicar com a action `crazy-max/ghaction-github-labeler`, ou aplicar via `gh` no setup (ver abaixo).

## Milestones

Milestones são as **entregas versionadas** (nível Milestone da hierarquia). Nomear sempre com SemVer:

```
v0.1.0 - MVP Parser (target: 15/Ago/2026)
v0.2.0 - Interface Completa (target: 30/Ago/2026)
v1.0.0 - Producao (target: 30/Out/2026)
```

Toda issue relevante (features, bugs importantes) recebe milestone. Chores e tech-debt pequenas podem ficar sem. Cada milestone concluída vira um Release (ver `releases.md`).

## Board (Project)

Um único Project por repositório.

### Fields

| Field        | Tipo          | Valores                                                    |
| ------------ | ------------- | --------------------------------------------------------- |
| Status       | Single select | Backlog, Ready, In Progress, In Review, Done, Canceled    |
| Priority     | Single select | P0, P1, P2, P3 (espelha as labels)                        |
| Estimate     | Number        | Fibonacci: 1, 2, 3, 5, 8, 13                              |
| Iteration    | Iteration     | Sprints de 2 semanas                                      |
| Area         | Single select | Espelha as labels de área                                 |
| Blocked by   | Text          | Ex.: "#12, #45"                                            |

### Views

```
View 1 — Foco Atual (Board / Kanban)
  Agrupamento: Status
  Filtro: Iteration = @current
  Uso: tela principal do dia-a-dia

View 2 — Backlog (Table)
  Ordenacao: Priority DESC, Estimate ASC
  Filtro: Status = Backlog OR Ready
  Colunas: Title, Priority, Area, Estimate, Milestone
  Uso: planejamento de sprint

View 3 — Roadmap (Roadmap)
  Agrupamento: Milestone
  Zoom: Mes
  Uso: visao macro

View 4 — Fogo (Table)
  Filtro: Priority = P0 OR label = blocked
  Uso: o que esta pegando fogo agora

View 5 — Sprint Fechada (Board)
  Filtro: Iteration = @previous, Status = Done
  Uso: retrospectiva
```

## Templates de issue e PR

Templates prontos ficam em `assets/.github/` desta skill. No setup, copiar essa árvore para a raiz do projeto:

```
.github/
├── ISSUE_TEMPLATE/
│   ├── feature.md      # tambem usado para issues de etapa
│   ├── bug.md
│   └── tech-debt.md
└── PULL_REQUEST_TEMPLATE.md
```

O `feature.md` é o template da issue de **etapa** (caso principal): título no formato `[Fase N] Etapa: <nome>`, contexto curto e as tarefas como checklist. Os templates já vêm sem emojis e sem menção a IA — não editar para reintroduzir nenhum dos dois.

## Mapeamento hierarquia → GitHub

| Nível     | GitHub                                             |
| --------- | -------------------------------------------------- |
| Milestone | Milestone + Release                                |
| Fase      | Prefixo no título da issue e/ou label de fase      |
| Etapa     | **Issue** (uma por etapa), com checklist de tarefas |
| Tarefa    | Checkbox dentro da issue                           |

Integração com os documentos:
- `PLANEJAMENTO.md` = estratégia macro (o quê e por quê)
- `CHECKLIST.md` = fases da metodologia + etapas
- Issues = etapas acionáveis; cada etapa do CHECKLIST vira uma issue
- Milestones = agrupam issues por release

## Provisionamento via gh

Na Fase 1, aplicar o setup via `gh`. Sequência de referência (adaptar nomes ao projeto):

```bash
# 1. Criar labels (repetir por label, ou via loop lendo labels.yml)
gh label create "type:feature" --color 2ea44f --description "Nova funcionalidade"
gh label create "P0-critical"  --color b60205 --description "Quebra producao"
# ... demais labels

# 2. Criar milestones
gh api repos/:owner/:repo/milestones -f title="v0.1.0 - MVP" -f due_on="2026-08-15T00:00:00Z"

# 3. Criar as issues de etapa (uma por etapa do CHECKLIST.md)
gh issue create \
  --title "[Fase 1] Etapa: Setup do ambiente" \
  --body-file /tmp/issue-etapa-1.md \
  --label "type:chore,P1-high,area:build" \
  --milestone "v0.1.0 - MVP"
# ... demais etapas, em bloco

# 4. Criar o Project e vincular ao repo
gh project create --owner "@me" --title "Nome do Projeto"
```

Entregar isto ao usuário como um script `.sh` pronto para rodar de uma vez no Git Bash, com todas as etapas já preenchidas. Os campos e views do Project que não têm cobertura no `gh` CLI ficam como um checklist manual curto na interface web.

## Automações e rituais

**Fechamento de issue via commit** (encaixa na regra de execução manual): as issues de etapa são fechadas quando o commit correspondente entra na `main` usando keyword. Ver `git-conventions.md` para o formato exato. O usuário faz push/merge; o GitHub fecha a issue sozinho.

**Ritual por release:** quando uma milestone termina — todas as issues Done, cria tag, cria Release a partir do CHANGELOG, fecha a milestone (ver `releases.md`).

**Bug durante o dev:**
- Pequeno (menos de 30 min): corrige direto; o commit menciona a origem ("Descoberto durante #23").
- Maior: cria issue nova (template bug), prioriza P0-P3.

**Ideia nova:** abre issue (template feature), fica em Backlog sem prioridade; priorizar no ritual semanal.

**Checklist de setup de projeto novo:**

```
- [ ] Criar repo (privado se corporativo)
- [ ] README.md, CHANGELOG.md, CONTRIBUTING.md
- [ ] docs/ com ARCHITECTURE.md (ou ARCHITECTURE.md na raiz)
- [ ] Copiar .github/ (templates de issue e PR) dos assets da skill
- [ ] Aplicar labels padrao
- [ ] Criar Project vinculado ao repo
- [ ] Configurar os 6 fields
- [ ] Criar as 5 views
- [ ] Criar milestones iniciais
- [ ] Criar primeira Iteration (Sprint 1)
- [ ] Popular issues a partir do CHECKLIST.md
- [ ] Configurar CI basico (.github/workflows/ci.yml)
```
