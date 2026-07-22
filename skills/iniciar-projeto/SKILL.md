---
name: iniciar-projeto
description: Fluxo obrigatório de desenvolvimento em 9 fases, planejamento de projeto, geração de PLANEJAMENTO.md, CHECKLIST.md e ARCHITECTURE.md, e integração com GitHub Projects (padrão "Fuzkrigo Projects"). Use esta skill SEMPRE que o usuário mencionar projeto novo, iniciar desenvolvimento, planejar funcionalidade, criar roadmap, briefing de projeto, ou qualquer pedido que envolva começar a construir algo do zero. Também ativar quando o usuário pedir para gerar documentos de planejamento, checklist, diagramas de arquitetura, configurar labels/board/issues no GitHub, definir padrão de commits ou releases, ou mencionar fases de desenvolvimento. Se o usuário tentar implementar código sem ter passado pelo fluxo de fases, BLOQUEIE e carregue esta skill.
---

# Fluxo de Desenvolvimento e Planejamento

## 1. Fluxo Obrigatório de Desenvolvimento em 9 Fases (RIGOROSO)

**Toda nova funcionalidade ou projeto deve seguir estas fases em ordem. Se o usuário pular uma fase, BLOQUEIE o progresso (ver seção 3) e informe o que está faltando antes de prosseguir.**

Estas são as **9 Fases da Metodologia** — o processo que se repete em todo projeto. Não confundir com as "Fases do produto" da hierarquia de trabalho (seção 2), que descrevem o *que* é construído.

### FASE 1 — Briefing e Diagnóstico
- Receber a ideia inicial
- Fazer perguntas investigativas: escopo, público-alvo, requisitos funcionais e não funcionais
- Validar viabilidade técnica
- Ao final: gerar PLANEJAMENTO.md, CHECKLIST.md e ARCHITECTURE.md (seção 4)
- **NÃO escrever código de produção nesta fase**

### FASE 2 — Documento 1: Resumo Executivo e Roadmap
- Resumo executivo do projeto
- Lista sequencial de todas as etapas de desenvolvimento
- Justificativa de escolha de arquitetura, linguagens e ferramentas
- Cronograma estimado
- Ao final, com roadmap e milestones já definidos: se o projeto usa GitHub, provisionar board, labels, views e as issues de etapa via `gh` (seção 5). As etapas só ficam concretas aqui, por isso o board nasce nesta fase, não na Fase 1.

### FASE 3 — Documento 2: Documentação Técnica e Manual
- Design System (quando aplicável)
- Lógica detalhada e fluxogramas (usar Mermaid — ver `references/architecture-md.md`)
- Seções obrigatórias: Segurança, Logs e Monitoramento, Tratamento de Erros (seguir os padrões de `@.claude/CODIGO.md`, seções 1 e 4, se disponível)
- Manual de uso preliminar

### FASE 4 — Documento 3: Apresentação e Venda
- Apresentação corporativa para supervisores (problema → solução → impacto)
- Apresentação comercial quando aplicável com quantificação de valor e precificação

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
- Seguir o padrão de commits, branches e PRs de `references/git-conventions.md`
- Nunca pedir "o sistema inteiro de uma vez"

### FASE 8 — Refatoração Contínua
- Após cada feature: avaliar extração, simplificação, remoção de duplicação
- Momento de avaliar design patterns: consultar `@.claude/PATTERNS.md` (se disponível) e sugerir um pattern apenas quando resolver dor concreta identificada — nunca na primeira versão, nunca por estética

### FASE 9 — Revisão de Segurança
- Invocar o agente `revisar-seguranca` (ferramenta Agent) para executar a auditoria completa — o próprio agente decide, por triagem, quais módulos carregar (OWASP é quase sempre um deles; LGPD quando o projeto lida com dados pessoais)
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

---

## 4. Documentos de Projeto (na raiz)

Todo projeto novo gera **três** arquivos na raiz, uma única vez, logo ao final da Fase 1:

1. **`PLANEJAMENTO.md`** — plano vivo (estratégia macro: o que e por quê)
2. **`CHECKLIST.md`** — fases da metodologia + itens acionáveis, com checkboxes
3. **`ARCHITECTURE.md`** — diagramas Mermaid da arquitetura (estrutura, fluxo, dados)

Estrutura detalhada de PLANEJAMENTO.md e CHECKLIST.md: ver seção 6.
Estrutura e templates de ARCHITECTURE.md: ver `references/architecture-md.md`.

**Dispensados** em: Modo Tarefa (`#tarefa`), correções pequenas de bug, ajustes estéticos/config.

---

## 5. Integração GitHub (padrão "Fuzkrigo Projects")

Quando o projeto usa GitHub (praticamente todos, pessoais e corporativos), ao final da Fase 2 eu **provisiono automaticamente via `gh`**: repositório, labels, board (Project), campos, views, milestones e as issues de cada etapa geradas a partir do CHECKLIST.md. Isso é setup de organização, não código.

O que permanece **exclusivamente manual do usuário** (eu só aviso a hora certa e entrego o bloco de comandos completo, nunca executo): **commits, branches, Pull Requests e releases**.

- Setup do board, labels, views, issues e automações: `references/github-projects.md`
- Commits semânticos, branches, PRs e o fluxo completo de comandos Git: `references/git-conventions.md`
- Milestones → releases, tags SemVer e changelog: `references/releases.md`

Os padrões do "Fuzkrigo Projects" são **sugestões adaptáveis**, não regras rígidas — ajustar ao contexto de cada projeto quando necessário.

---

## 6. Estrutura dos Documentos de Planejamento

### 6.1. PLANEJAMENTO.md (plano vivo)

Conteúdo obrigatório:
1. **Identidade do projeto** — nome, data de início, responsável, status atual
2. **Resumo do problema** — o que resolve, 2-3 parágrafos
3. **Decisões arquiteturais** — stack, padrões aplicados, justificativa
4. **Skills e configurações ativas** — quais skills e qual CLAUDE.md do projeto se aplicam; quais estão desativados
5. **Roadmap de desenvolvimento** — milestones e fases ordenadas com descrição curta
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

1. Os três arquivos ficam na **raiz** do projeto.
2. Gerados **uma única vez** — atualizações são edições, nunca recriação.
3. Bloquear implementação (Fase 7) se PLANEJAMENTO.md e CHECKLIST.md não existirem.
4. **Nunca deletados** durante o projeto.
5. Ao final, arquivar em `_backups/projeto-concluido-YYYY-MM-DD/`.

---

## 7. Proibições de Estilo (INEGOCIÁVEL)

Estas regras valem para **todo** artefato do projeto — código, documentação, commits, PRs, releases, issues, comentários:

1. **Zero emojis** em qualquer arquivo, documentação, mensagem de commit, PR ou release. Emojis dão cara de conteúdo gerado por IA; o objetivo é o oposto — linguagem humana e sóbria.
   - **Única exceção**: os pontos de cor das labels no GitHub Projects, que são identificação visual funcional do board (ver `references/github-projects.md`).
2. **Nunca mencionar** IA, Claude, assistente, coautoria ou geração automática — em nenhum lugar: nem em commits (`Co-authored-by`), nem em documentação, nem em comentários de código, nem em releases. Todo o trabalho é apresentado como autoria própria do usuário.
3. Escrever com voz humana e direta, evitando construções que soem automáticas ou genéricas.

---

## 8. Quando NÃO aplicar este fluxo

- **Modo Tarefa (`#tarefa`):** tarefas pontuais não geram planejamento nem board
- Pequenas correções de bug em projeto existente
- Ajustes estéticos ou de configuração
