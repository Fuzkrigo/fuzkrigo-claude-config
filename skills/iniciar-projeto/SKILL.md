---
name: iniciar-projeto
description: Fluxo obrigatório de desenvolvimento em 9 fases, planejamento de projeto, geração de ROADMAP.md, CHECKLIST.md e ARCHITECTURE.md, e integração com GitHub Projects e Linear (padrão "Fuzkrigo Projects"). Use esta skill SEMPRE que o usuário mencionar projeto novo, iniciar desenvolvimento, planejar funcionalidade, criar roadmap, briefing de projeto, ou qualquer pedido que envolva começar a construir algo do zero. Também ativar quando o usuário pedir para gerar documentos de planejamento, checklist, diagramas de arquitetura, configurar labels/board/issues no GitHub ou no Linear, definir padrão de commits ou releases, ou mencionar fases de desenvolvimento. Se o usuário tentar implementar código sem ter passado pelo fluxo de fases, BLOQUEIE e carregue esta skill.
---

# Fluxo de Desenvolvimento e Planejamento

## 1. Fluxo Obrigatório de Desenvolvimento em 9 Fases (RIGOROSO)

**Toda nova funcionalidade ou projeto deve seguir estas fases em ordem. Se o usuário pular uma fase, BLOQUEIE o progresso (ver seção 3) e informe o que está faltando antes de prosseguir.**

Estas são as **9 Fases da Metodologia** — o processo que se repete em todo projeto. Não confundir com as "Fases do produto" da hierarquia de trabalho (seção 2), que descrevem o *que* é construído.

### FASE 1 — Briefing e Diagnóstico
- Receber a ideia inicial
- Fazer perguntas investigativas: escopo, público-alvo, requisitos funcionais e não funcionais
- Validar viabilidade técnica
- Ao final: gerar ROADMAP.md e CHECKLIST.md diretamente (seção 4) — ficam com o Claude principal, editados com alta frequência ao longo do projeto (mesmo raciocínio de custo que mantém commits do dia a dia com o Claude principal em vez do `project-manager`)
- Invocar o agente `project-documentation` (ferramenta Agent) para gerar a versão inicial de `ARCHITECTURE.md`, a partir do ROADMAP.md recém-criado — muda com menos frequência que ROADMAP/CHECKLIST, por isso fica com o agente
- **NÃO escrever código de produção nesta fase**

### FASE 2 — Resumo Executivo
- Ao final, com roadmap e milestones já definidos: invocar o agente `project-documentation` (ferramenta Agent) para gerar `RESUMO-EXECUTIVO.md`
- Também invocar o agente `project-manager` (ferramenta Agent) para provisionar GitHub e espelhar no Linear (seção 5). As etapas só ficam concretas aqui, por isso o board nasce nesta fase, não na Fase 1

### FASE 3 — Documentação Técnica e Manual do Usuário
- Invocar o agente `project-documentation` (ferramenta Agent) para gerar `DOCUMENTACAO-TECNICA.md` e `MANUAL.md`
- Design System (quando aplicável) entra na Documentação Técnica

### FASE 4 — Apresentação e Venda
- Invocar o agente `project-documentation` (ferramenta Agent) para gerar `APRESENTACAO.md`
- Contexto corporativo: problema → solução → impacto, para equipe/gestão
- Contexto pessoal/externo: mesma estrutura, mais elaborada, com precificação — cliente oficial
- Formato final (`.pptx` x HTML) ainda em aberto — decisão adiada

### FASE 5 — Plan Mode
- Entrar em Plan Mode antes de qualquer implementação
- Refinar o plano com feedback antes de aprovar execução

### FASE 6 — TDD: Testes Primeiro
- Escrever os testes antes da implementação
- Recusar código de produção antes que os testes estejam definidos
- Cobertura mínima: 80% geral, 95% em lógica de negócio (ratio ~1.5x)
- Camadas de teste e estratégia de mocks: consultar `@.claude/CODIGO.md` (seção 8), se disponível

### FASE 7 — Implementação em Small Releases
- Commits pequenos, atômicos, cada um passando no CI (testes + lint + análise de segurança)
- Seguir o padrão de commits, branches e PRs de `~/.claude/references/git-conventions.md`
- Nunca pedir "o sistema inteiro de uma vez"

### FASE 8 — Refatoração Contínua
- Após cada feature: avaliar extração, simplificação, remoção de duplicação
- Invocar o agente `code-reviewer` (ferramenta Agent) para auditoria formal de SOLID/Clean Code/limites de tamanho antes de fechar a fase
- Com a estrutura final estável (depois das correções do `code-reviewer`), invocar o agente `docstrings-manager` (ferramenta Agent) para documentar funções/classes/módulos públicos
- Se a fase introduziu mudança estrutural (novo módulo, integração externa, decisão de arquitetura, modelo de dados), invocar o agente `project-documentation` (ferramenta Agent) para atualizar `ARCHITECTURE.md` — critério completo em `references/architecture-md.md`
- Momento de avaliar design patterns: consultar `@.claude/PATTERNS.md` (se disponível) e sugerir um pattern apenas quando resolver dor concreta identificada — nunca na primeira versão, nunca por estética

### FASE 9 — Revisão de Segurança
- Invocar o agente `security-reviewer` (ferramenta Agent) para executar a auditoria completa — o próprio agente decide, por triagem, quais módulos carregar (OWASP é quase sempre um deles; LGPD quando o projeto lida com dados pessoais)
- Tratar os itens ❌ do relatório antes de finalizar a fase; itens ⚠️ ficam registrados no CHECKLIST.md

---

## 2. Hierarquia de Trabalho do Produto (Nomenclatura Padrão)

Todo projeto organiza o *que* será construído em quatro níveis. Manter estes nomes em toda comunicação, documentação e no GitHub, para nunca haver ambiguidade:

| Nível         | É um conjunto de… | Onde vive                                              |
| ------------- | ----------------- | ------------------------------------------------------ |
| **Milestone** | Fases             | Milestone no GitHub + vira um Release (SemVer)         |
| **Fase**      | Etapas            | Agrupamento lógico (label/campo no board)              |
| **Etapa**     | Tarefas           | **Uma issue** no GitHub, com checklist de tarefas      |
| **Tarefa**    | (unidade atômica) | Um checkbox dentro da issue da etapa                   |

Quando a palavra "Fase" for usada, deixar claro o contexto: **"Fase da Metodologia"** (as 9 da seção 1) ou **"Fase do produto"** (esta hierarquia).

---

## 3. Regra de Bloqueio

Se o usuário pedir para pular uma fase ou começar implementação sem as anteriores concluídas, responder:

> "Antes de prosseguir com [o que foi pedido], ainda preciso de [fase X]. Especificamente, falta: [item concreto]. Quer fazer isso agora, ou tem uma razão específica para pular esta etapa?"

Só prosseguir se o usuário justificar conscientemente o bypass.

> Esta checagem também é reforçada por um hook `PreToolUse` (`~/.claude/hooks/check_planning_docs.py`), que pergunta automaticamente antes de qualquer escrita de código de produção sem `ROADMAP.md`/`CHECKLIST.md` — garante que a pergunta nunca seja esquecida, mesmo que eu não perceba o contexto. O hook procura em `docs/` e aceita a raiz como fallback, para não disparar falso positivo em projeto ainda não migrado. O texto acima continua valendo como orientação de julgamento para a resposta.

---

## 4. Documentos de Projeto (em `docs/`)

**Local canônico: a pasta `docs/` na raiz do projeto.** Criar a pasta se não existir; se já existir, apenas gravar dentro. Vale para os sete documentos desta seção — a raiz fica reservada ao código, ao `README.md`, ao `CHANGELOG.md` e à pasta `.github/`.

Duas exceções que **não** entram em `docs/`, por convenção externa e não por organização:

- **`CHANGELOG.md`** — fica na raiz. É onde o GitHub e as ferramentas de release automation esperam encontrá-lo.
- **`.github/`** — fica na raiz. O GitHub só reconhece templates de issue e PR nesse caminho exato.

**Projeto que já tem os documentos na raiz** (anterior a esta regra): ao detectar, propor a migração com `git mv` para preservar o histórico, e só executar depois da confirmação do usuário. Nunca mover em silêncio. Enquanto a migração não acontece, ler da raiz normalmente — o fallback existe justamente para isso.

```bash
mkdir -p docs
git mv ROADMAP.md CHECKLIST.md ARCHITECTURE.md docs/   # apenas os que existirem
```

Todo projeto novo gera **dois** arquivos em `docs/`, uma única vez, logo ao final da Fase 1 — mantidos pelo Claude principal por serem editados com alta frequência:

1. **`docs/ROADMAP.md`** — plano vivo (estratégia macro: o que e por quê)
2. **`docs/CHECKLIST.md`** — fases da metodologia + itens acionáveis, com checkboxes

Estrutura detalhada de ROADMAP.md e CHECKLIST.md: ver seção 6.

Outros **cinco** documentos são gerados e mantidos pelo agente `project-documentation` (ferramenta Agent) — baixa frequência de edição, por isso não ficam com o Claude principal:

3. **`docs/ARCHITECTURE.md`** — diagramas Mermaid da arquitetura (estrutura, fluxo, dados). Vivo e oficial: gerado na Fase 1, atualizado quando a estrutura muda (Fase 8). Estrutura e templates: ver `references/architecture-md.md`
4. **`docs/RESUMO-EXECUTIVO.md`** — resumo executivo e retrospecto por fase (Fase 2)
5. **`docs/DOCUMENTACAO-TECNICA.md`** — decisões técnicas, API, configuração (Fase 3)
6. **`docs/MANUAL.md`** — manual do usuário final (Fase 3)
7. **`docs/APRESENTACAO.md`** — apresentação corporativa ou comercial, conforme o contexto (Fase 4)

Detalhes de geração de cada um: `~/.claude/agents/project-documentation.md`.

**Dispensados** em: Modo Tarefa (`#tarefa`), correções pequenas de bug, ajustes estéticos/config.

---

## 5. Integração GitHub e Linear (padrão "Fuzkrigo Projects")

Provisionamento de GitHub (board, labels, views, issues, milestones) e o espelho no Linear são feitos pelo agente `project-manager` (ferramenta Agent) — invocar ao final da Fase 2, com roadmap e milestones já definidos. O agente decide sozinho a ordem (GitHub primeiro, Linear só completa lacunas) e o guardrail de duplicidade — não preciso orquestrar isso manualmente.

Quando uma milestone termina, o mesmo agente monta o CHANGELOG.md (na raiz, não em `docs/` — ver seção 4), o texto do release e o bloco de comandos Git — mas a execução da parte Git (commit, tag, release, fechamento de milestone) segue a política de `~/.claude/references/git-conventions.md`: pergunto se você executa ou se eu executo.

- Commits semânticos, branches, PRs, releases e a política de execução: `~/.claude/references/git-conventions.md`
- Detalhes de provisionamento GitHub/Linear e do ritual de release: `~/.claude/agents/project-manager.md`

Os padrões do "Fuzkrigo Projects" são **sugestões adaptáveis**, não regras rígidas — ajustar ao contexto de cada projeto quando necessário.

---

## 6. Estrutura dos Documentos de Planejamento

### 6.1. ROADMAP.md (plano vivo)

Conteúdo obrigatório:
1. **Identidade do projeto** — nome, data de início, responsável, status atual
2. **Resumo do problema** — o que resolve, 2-3 parágrafos
3. **Decisões arquiteturais** — stack, padrões aplicados, justificativa
4. **Skills e configurações ativas** — quais skills e qual CLAUDE.md do projeto se aplicam; quais estão desativados
5. **Roadmap de desenvolvimento** — milestones e fases ordenadas com descrição curta, cronograma estimado
6. **Riscos e pontos de atenção**
7. **Histórico de mudanças do plano** — cada atualização com data e motivo

É **vivo**: sugerir atualização quando uma decisão arquitetural mudar, um risco novo surgir, o escopo mudar, ou uma fase concluir. Cada mudança vai para o histórico.

### 6.2. CHECKLIST.md

Conteúdo obrigatório:
1. **Cabeçalho** — nome do projeto, data, legenda dos marcadores
2. **Uma seção por bloco do Fluxo de 9 Fases**
3. **Uma seção por skill/configuração relevante** — cada skill ativa e o CLAUDE.md do projeto geram um grupo de checkboxes com seus itens aplicáveis
4. **Itens tachados** — skill/seção que não se aplica continua listada, com texto `~~tachado~~` e nota do porquê
5. **Rodapé com progresso** — "X de Y itens concluídos"

Marcadores:

| Marcador              | Significado                              |
| --------------------- | ---------------------------------------- |
| `- [ ]`               | Pendente                                 |
| `- [x]`               | Concluído                                |
| `- [~]` ou `~~item~~` | Não se aplica / dispensado               |
| `- [!]`               | Bloqueado ou com problema                |
| `- [?]`               | Em dúvida, precisa de decisão do usuário |

Explicar a legenda no topo do arquivo. Consultar o CHECKLIST.md **no início de cada sessão** para se orientar sobre o estado do projeto.

### 6.3. Regras Inegociáveis dos Documentos

1. Os três arquivos ficam em **`docs/`** (criar a pasta se não existir). Exceções que permanecem na raiz e o procedimento de migração de projeto legado: seção 4.
2. Gerados **uma única vez** — atualizações são edições, nunca recriação.
3. Bloquear implementação (Fase 7) se ROADMAP.md e CHECKLIST.md não existirem.
4. **Nunca deletados** durante o projeto.
5. Ao final, arquivar em `_backups/projeto-concluido-YYYY-MM-DD/`.

---

## 7. Proibições de Estilo (INEGOCIÁVEL)

Estas regras valem para **todo** artefato do projeto — código, documentação, commits, PRs, releases, issues, comentários:

> Um hook `PreToolUse` (`~/.claude/hooks/check_style_prohibitions.py`) bloqueia automaticamente emoji decorativo e os trailers/frases típicas de commit que atribuem a autoria do trabalho a uma ferramenta de IA (a lista exata de padrões está no código-fonte do hook). Por design, o hook não bloqueia o nome do assistente isolado — banir isso quebraria documentação legítima sobre a própria configuração, este repositório incluído. Julgamento sobre menções indiretas que o hook não cobre continua comigo.

1. **Zero emojis** em qualquer arquivo, documentação, mensagem de commit, PR ou release. Emojis dão cara de conteúdo gerado por IA; o objetivo é o oposto — linguagem humana e sóbria.
   - **Única exceção**: os pontos de cor das labels no GitHub Projects e no Linear, que são identificação visual funcional do board (ver `references/github-projects.md` e `references/linear-projects.md`).
2. **Nunca mencionar** IA, Claude, assistente, coautoria ou geração automática — em nenhum lugar: nem em commits (`Co-authored-by`), nem em documentação, nem em comentários de código, nem em releases. Todo o trabalho é apresentado como autoria própria do usuário.
3. Escrever com voz humana e direta, evitando construções que soem automáticas ou genéricas.

---

## 8. Quando NÃO aplicar este fluxo

- **Modo Tarefa (`#tarefa`):** tarefas pontuais não geram planejamento nem board
- Pequenas correções de bug em projeto existente
- Ajustes estéticos ou de configuração
