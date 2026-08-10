---
name: iniciar-projeto
description: Abertura, documentação e gestão de projeto — briefing investigativo, geração de ROADMAP.md, CHECKLIST.md e ARCHITECTURE.md, integração com GitHub Projects e Linear (padrão "Fuzkrigo Projects"), ritual de release e padrão de commits. Use esta skill SEMPRE que o usuário mencionar projeto novo, iniciar desenvolvimento, planejar funcionalidade, criar roadmap, briefing de projeto, ou qualquer pedido que envolva começar a construir algo do zero. Também ativar quando o usuário pedir para gerar documentos de planejamento, checklist, diagramas de arquitetura, configurar labels/board/issues no GitHub ou no Linear, definir padrão de commits ou releases, ou fechar uma milestone. O desenvolvimento de cada feature (especificação, testes, implementação e auditoria) NÃO é conduzido aqui — é da skill `fuzkrigo-spec-driven`. Se o usuário tentar implementar código de um projeto que vai para o portfólio, tem usuário final ou vai ganhar release sem ter passado pela abertura (Bloco A), BLOQUEIE e carregue esta skill. Experimento descartável, script de uso próprio e correção pequena são exceção declarada — critério completo na seção 4.1 da skill.
---

# Abertura, Documentação e Gestão de Projeto

## 1. Fronteira: esta skill e a `fuzkrigo-spec-driven`

O trabalho se divide em duas camadas, com dono único para cada artefato. Nada é mantido nos dois lados.

| | `iniciar-projeto` (esta) | `fuzkrigo-spec-driven` |
| --- | --- | --- |
| Escopo | O projeto, e a gestão contínua | Cada feature |
| Responde | O que construir, por quê, em que ordem, como se comunica e se entrega | O que exatamente esta feature faz, e como isso é provado |
| Autoridade | Escopo, prioridade, documentação, board, release, padrão de estilo e de Git | O "pronto" técnico: `audit --ci` com saída 0 |
| Território | `docs/`, `.github/`, `CHANGELOG.md`, board do GitHub e Linear | `.spec/` |

Regra prática: quando esta skill precisa saber **se uma feature está pronta**, ela não julga — consulta o resultado do audit. Quando a outra skill precisa saber **qual feature construir agora**, ela não decide — consulta o `CHECKLIST.md`.

---

## 2. Blocos e Fases

Três blocos. O Bloco A roda uma vez, na abertura. O Bloco B roda a cada feature. O Bloco C roda a cada milestone concluída.

### BLOCO A — Abertura do projeto

#### A1 — Briefing e Diagnóstico
- Receber a ideia inicial
- Fazer perguntas investigativas: escopo, público-alvo, requisitos funcionais e não funcionais
- Validar viabilidade técnica
- Identificar as **restrições inegociáveis** do projeto (regras de negócio que não podem ser violadas, exigências legais, limites de segurança) — elas viram princípios verificáveis da constituição em A3, não prosa esquecida no roadmap
- **NÃO escrever código de produção nesta fase**

#### A2 — Documentos-base
- Gerar `docs/ROADMAP.md` e `docs/CHECKLIST.md` diretamente (seção 5) — ficam com o Claude principal, editados com alta frequência ao longo do projeto (mesmo raciocínio de custo que mantém commits do dia a dia com o Claude principal em vez do `project-manager`)
- Invocar o agente `project-documentation` (ferramenta Agent) para gerar a versão inicial de `docs/ARCHITECTURE.md`, a partir do ROADMAP.md recém-criado — muda com menos frequência que ROADMAP/CHECKLIST, por isso fica com o agente

#### A3 — Provisionamento e Constituição
- Invocar o agente `project-manager` (ferramenta Agent) para provisionar GitHub e espelhar no Linear (seção 6). O board nasce aqui, e não em A2, porque depende do repositório já provisionado e das etapas já revisadas no CHECKLIST — cada issue nasce de uma etapa que já existe
- Inicializar a camada de desenvolvimento: `fuzkrigo-spec init` (ver a skill `fuzkrigo-spec-driven`), e escrever a constituição do projeto a partir das restrições levantadas em A1. Princípio `[DEVE]` sem verificação executável é acusado pelo próprio audit — a constituição nasce com dente ou não nasce
- **Fechar o ciclo do ROADMAP:** com a constituição escrita, voltar ao `docs/ROADMAP.md` e anotar o código de cada princípio (`P-xxx`) ao lado da restrição correspondente. É a segunda passada do documento — em A2 a restrição é texto, aqui ela ganha o código que a verifica (seção 7.1, item 4)

### BLOCO B — Ciclo de feature

**Conduzido pela skill `fuzkrigo-spec-driven`, não por esta.** Uma Etapa do CHECKLIST equivale a uma issue, a uma feature em `.spec/features/<nome-kebab>/` e a uma branch. O fluxo (Especificar, Projetar, Tarefas, Plano, Executar, Auditar, Aprender) está documentado lá.

O que esta skill exige na saída do Bloco B, em ordem:

1. **Portão 1 — prova mecânica.** `fuzkrigo-spec audit --ci --feature <feature>` com saída 0. Sem isso a feature não avança, e nenhum subagente de qualidade é gasto. O filtro tira do veredito os achados de outras features — a próxima etapa, ainda em rascunho, não reprova esta — mas mantém os do projeto, como princípio violado. O audit **sem** filtro é o que vale em C3, antes do release.
2. **Portão 2 — qualidade.** Invocar o agente `code-reviewer` (auditoria de SOLID, Clean Code e limites de tamanho); com a estrutura já estável, invocar o agente `docstrings-manager`. Invocar o agente `security-reviewer` quando a feature tocar autenticação, autorização, permissões, dinheiro ou dados pessoais — não esperar C1 para isso. Todo achado aceito vira princípio verificável na constituição, para nunca mais voltar em silêncio: o agente não tem permissão de escrita e devolve o bloco do princípio pronto no relatório; **quem cola em `.spec/constituicao.md` é o Claude principal, depois da sua aprovação**.
3. **Portão 3 — entrega.** PR e merge conforme `~/.claude/references/git-conventions.md`, incluindo o squash das faixas de execução paralela. Se a feature introduziu mudança estrutural (novo módulo, integração externa, decisão de arquitetura, modelo de dados), invocar o agente `project-documentation` para atualizar `docs/ARCHITECTURE.md` — critério completo em `references/architecture-md.md`. Marcar a Etapa concluída no CHECKLIST.

Momento de avaliar design patterns: consultar `@.claude/PATTERNS.md` (se disponível) e sugerir um pattern apenas quando resolver dor concreta identificada — nunca na primeira versão, nunca por estética.

### BLOCO C — Fechamento de milestone

#### C1 — Revisão de Segurança
- Invocar o agente `security-reviewer` (ferramenta Agent) para a auditoria completa da milestone — o próprio agente decide, por triagem, quais módulos carregar (OWASP é quase sempre um deles; LGPD quando o projeto lida com dados pessoais)
- Tratar os itens ❌ antes de fechar; itens ⚠️ ficam registrados no CHECKLIST.md
- Não se documenta nem se lança o que ainda tem falha de segurança em aberto — por isso C1 vem antes de C2 e C3

#### C2 — Documentação
Invocar o agente `project-documentation` (ferramenta Agent) para gerar ou atualizar, nesta ordem:
- `docs/DOCUMENTACAO-TECNICA.md` — decisões técnicas, API, configuração. Design System (quando aplicável) entra aqui
- `docs/RESUMO-EXECUTIVO.md` — resumo e retrospecto da milestone
- `docs/MANUAL.md` — manual do usuário final
- `docs/APRESENTACAO.md` — contexto corporativo: problema, solução, impacto, para equipe e gestão. Contexto pessoal ou externo: mesma estrutura, mais elaborada, com precificação
- `docs/ARCHITECTURE.md` — consolidação, se as atualizações do Bloco B deixaram lacuna

Estes documentos descrevem o que existe, não o que se pretende construir. Por isso nascem depois da primeira milestone entregue, e são atualizados a cada milestone seguinte.

#### C3 — Release
- Invocar o agente `project-manager` para montar `CHANGELOG.md` (na raiz), o texto do release e o bloco de comandos Git
- A milestone só fecha com todas as suas features em estado `auditada`
- A execução da parte Git segue a política de `~/.claude/references/git-conventions.md`: pergunto se você executa ou se eu executo

---

## 3. Hierarquia de Trabalho do Produto (Nomenclatura Padrão)

Todo projeto organiza o *que* será construído em quatro níveis:

| Nível         | É um conjunto de… | Onde vive                                                        |
| ------------- | ----------------- | ---------------------------------------------------------------- |
| **Milestone** | Fases             | Milestone no GitHub + vira um Release (SemVer)                    |
| **Fase**      | Etapas            | Agrupamento lógico (label ou campo no board)                      |
| **Etapa**     | Tarefas           | **Uma issue** no GitHub + **uma feature** em `.spec/features/`    |
| **Tarefa**    | (unidade atômica) | Uma tarefa `T-xxx` no `tasks.md` da feature                       |

A ambiguidade antiga acabou: "Fase" agora significa apenas o nível do produto desta tabela. O processo se organiza em **blocos** (A, B, C), não em fases.

---

## 4. Regra de Bloqueio

O critério não é mais "existe documento?", e sim "este código está sob uma especificação?".

### 4.1. Quando o Bloco A é obrigatório, e quando não é

Nem todo código nasce projeto. Exigir briefing e board para um script de quarenta linhas é o
over-engineering que a seção 3 do `CLAUDE.md` proíbe — e, na prática, empurra tudo para o
`#tarefa`, esvaziando o fluxo inteiro. O critério é o destino do que está sendo construído:

| Situação | Bloco A |
| -------- | ------- |
| Vai para o portfólio | **Obrigatório** |
| Tem usuário final, mesmo que seja só você usando todo dia | **Obrigatório** |
| Vai ganhar release, tag ou versão | **Obrigatório** |
| Experimento, prova de conceito descartável | Dispensável |
| Script de uso próprio, automação pessoal | Dispensável |
| Correção pequena, ajuste de configuração ou estética | Dispensável |

**Dispensável não significa sem rigor.** O projeto pode rodar só com a skill
`fuzkrigo-spec-driven`: a especificação e o gate continuam valendo, o que cai fora é a camada de
gestão (roadmap, board, documentos de comunicação, release). Ao seguir por esse caminho, dizer
isso em voz alta uma vez — o usuário precisa saber que optou por um projeto sem roadmap nem
release por trás, e não descobrir isso depois.

**Regra de conversão:** experimento que vira projeto executa o Bloco A retroativamente, antes do
primeiro release. O momento de perguntar é quando aparecer a primeira dessas três coisas: um
segundo usuário, uma tag de versão, ou a intenção de mostrar o trabalho.

Na dúvida, pergunte ao usuário em qual dos dois casos ele está — a resposta leva um segundo e
evita tanto a burocracia inútil quanto o projeto de portfólio sem documentação.

### 4.2. As falas do bloqueio

Se o usuário pedir para implementar um projeto da coluna "obrigatório" sem a abertura, responder:

> "Antes de prosseguir com [o que foi pedido], ainda preciso de [A1/A2/A3]. Especificamente, falta: [item concreto]. Quer fazer isso agora, ou tem uma razão específica para pular esta etapa?"

Se o projeto já está aberto mas o código pedido não corresponde a nenhuma feature especificada:

> "Este código não está coberto por nenhuma especificação. Quer que eu crie a feature com `fuzkrigo-spec new <nome>` antes, ou isso é um ajuste pontual fora do fluxo?"

Só prosseguir se o usuário justificar conscientemente o bypass.

> Esta checagem também é reforçada por um hook `PreToolUse` (`~/.claude/hooks/check_planning_docs.py`), que pergunta automaticamente antes de qualquer escrita de código de produção sem evidência de planejamento — `docs/ROADMAP.md` e `docs/CHECKLIST.md`, ou uma spec em `.spec/features/`. O hook procura em `docs/` e aceita a raiz como fallback, para não disparar falso positivo em projeto ainda não migrado. O texto acima continua valendo como orientação de julgamento para a resposta.

---

## 5. Documentos de Projeto (em `docs/`)

**Local canônico: a pasta `docs/` na raiz do projeto.** Criar a pasta se não existir; se já existir, apenas gravar dentro. A raiz fica reservada ao código, ao `README.md`, ao `CHANGELOG.md` e à pasta `.github/`.

Duas exceções que **não** entram em `docs/`, por convenção externa e não por organização:

- **`CHANGELOG.md`** — fica na raiz. É onde o GitHub e as ferramentas de release automation esperam encontrá-lo.
- **`.github/`** — fica na raiz. O GitHub só reconhece templates de issue e PR nesse caminho exato.

A pasta `.spec/` também fica na raiz, e é território da skill `fuzkrigo-spec-driven` — não mover, não duplicar em `docs/`.

**Projeto que já tem os documentos na raiz** (anterior a esta regra): ao detectar, propor a migração com `git mv` para preservar o histórico, e só executar depois da confirmação do usuário. Nunca mover em silêncio. Enquanto a migração não acontece, ler da raiz normalmente — o fallback existe justamente para isso.

```bash
mkdir -p docs
git mv ROADMAP.md CHECKLIST.md ARCHITECTURE.md docs/   # apenas os que existirem
```

Dois documentos ficam com o Claude principal, por serem editados com alta frequência:

1. **`docs/ROADMAP.md`** — plano vivo (estratégia macro: o que e por quê), criado em A2
2. **`docs/CHECKLIST.md`** — índice de etapas do projeto, criado em A2

Estrutura detalhada dos dois: ver seção 7.

Outros **cinco** são gerados e mantidos pelo agente `project-documentation` (ferramenta Agent) — baixa frequência de edição, por isso não ficam com o Claude principal:

3. **`docs/ARCHITECTURE.md`** — diagramas Mermaid da arquitetura (estrutura, fluxo, dados). Vivo e oficial: gerado em A2, atualizado no Portão 3 do Bloco B quando a estrutura muda, consolidado em C2. Estrutura e templates: `references/architecture-md.md`
4. **`docs/DOCUMENTACAO-TECNICA.md`** — decisões técnicas, API, configuração (C2)
5. **`docs/RESUMO-EXECUTIVO.md`** — resumo executivo e retrospecto por milestone (C2)
6. **`docs/MANUAL.md`** — manual do usuário final (C2)
7. **`docs/APRESENTACAO.md`** — apresentação corporativa ou comercial, conforme o contexto (C2)

Detalhes de geração de cada um: `~/.claude/agents/project-documentation.md`.

**Dispensados** em: Modo Tarefa (`#tarefa`), correções pequenas de bug, ajustes estéticos ou de configuração.

---

## 6. Integração GitHub e Linear (padrão "Fuzkrigo Projects")

Provisionamento de GitHub (board, labels, views, issues, milestones) e o espelho no Linear são feitos pelo agente `project-manager` (ferramenta Agent) — invocar em A3, com roadmap e milestones já definidos. O agente decide sozinho a ordem (GitHub primeiro, Linear só completa lacunas) e o guardrail de duplicidade — não preciso orquestrar isso manualmente.

Cada issue de etapa nasce apontando para a pasta da feature correspondente em `.spec/features/`, e é fechada pelo PR do Portão 3.

Quando uma milestone termina, o mesmo agente monta o CHANGELOG.md e o texto do release (C3).

- Commits semânticos, branches, PRs, releases e a política de execução: `~/.claude/references/git-conventions.md`
- Templates de issue e PR: `~/.claude/references/github/`
- Detalhes de provisionamento GitHub/Linear e do ritual de release: `~/.claude/agents/project-manager.md`

Os padrões do "Fuzkrigo Projects" são **sugestões adaptáveis**, não regras rígidas — ajustar ao contexto de cada projeto quando necessário.

---

## 7. Estrutura dos Documentos de Planejamento

### 7.1. ROADMAP.md (plano vivo)

Conteúdo obrigatório:
1. **Identidade do projeto** — nome, data de início, responsável, status atual
2. **Resumo do problema** — o que resolve, 2-3 parágrafos
3. **Decisões arquiteturais** — stack, padrões aplicados, justificativa
4. **Restrições inegociáveis** — preenchido em duas passadas: em **A2** entram as restrições em texto, como saíram do briefing; em **A3**, depois que a constituição existe, cada uma recebe ao lado o código do princípio (`P-xxx`) que passou a verificá-la. Nunca inventar código de princípio antes de A3 — enquanto a constituição não existe, o item fica só com o texto. O texto explica; o princípio verifica
5. **Skills e configurações ativas** — quais skills e qual CLAUDE.md do projeto se aplicam; quais estão desativados
6. **Roadmap de desenvolvimento** — milestones e fases ordenadas com descrição curta, cronograma estimado
7. **Riscos e pontos de atenção**
8. **Histórico de mudanças do plano** — cada atualização com data e motivo

É **vivo**: sugerir atualização quando uma decisão arquitetural mudar, um risco novo surgir, o escopo mudar, ou uma milestone concluir. Cada mudança vai para o histórico.

### 7.2. CHECKLIST.md (índice de etapas)

O CHECKLIST **não lista tarefas atômicas** — elas vivem no `tasks.md` de cada feature, sob a skill `fuzkrigo-spec-driven`. Aqui ficam os níveis de Milestone, Fase e Etapa, e o estado de cada um.

Conteúdo obrigatório:
1. **Cabeçalho** — nome do projeto, data, legenda dos marcadores
2. **Uma seção por Milestone**, subdividida por Fase
3. **Uma linha por Etapa**, com o caminho da feature e o status vindo da spec
4. **Itens tachados** — etapa que deixou de fazer sentido continua listada, com texto `~~tachado~~` e nota do porquê
5. **Rodapé com progresso** — "X de Y etapas concluídas"

Formato de uma etapa:

```markdown
## Milestone 1 — MVP

### Fase 1 — Autenticação
- [x] E1: Login por e-mail — `.spec/features/login-email/` (auditada)
- [ ] E2: Recuperação de senha — `.spec/features/recuperacao-senha/` (em-implementacao)

### Fase 2 — Perfil
- [ ] E3: Editar perfil — spec ainda não criada

Progresso: 1 de 3 etapas
```

O status entre parênteses é o da especificação (`rascunho`, `pronta`, `em-implementacao`, `implementada`, `auditada`) — copiado de lá, nunca inventado aqui. Em caso de divergência, `fuzkrigo-spec status` é a fonte da verdade.

Marcadores:

| Marcador              | Significado                              |
| --------------------- | ---------------------------------------- |
| `- [ ]`               | Pendente                                 |
| `- [x]`               | Concluído                                |
| `- [~]` ou `~~item~~` | Não se aplica / dispensado               |
| `- [!]`               | Bloqueado ou com problema                |
| `- [?]`               | Em dúvida, precisa de decisão do usuário |

Explicar a legenda no topo do arquivo. Consultar o CHECKLIST.md **no início de cada sessão** para se orientar sobre o estado do projeto.

### 7.3. Regras Inegociáveis dos Documentos

1. Os documentos ficam em **`docs/`** (criar a pasta se não existir). Exceções que permanecem na raiz e o procedimento de migração de projeto legado: seção 5.
2. Gerados **uma única vez** — atualizações são edições, nunca recriação.
3. Em projeto da coluna "obrigatório" da seção 4.1, bloquear implementação enquanto ROADMAP.md e CHECKLIST.md não existirem. Em projeto dispensável, esta regra não se aplica — lá a evidência de planejamento é a spec da feature.
4. **Nunca deletados** durante o projeto.
5. Ao final, arquivar em `_backups/projeto-concluido-YYYY-MM-DD/`.

---

## 8. Proibições de Estilo (INEGOCIÁVEL)

Estas regras valem para **todo** artefato do projeto — código, documentação, commits, PRs, releases, issues, comentários, e também os arquivos de `.spec/`:

> Um hook `PreToolUse` (`~/.claude/hooks/check_style_prohibitions.py`) bloqueia automaticamente emoji decorativo e os trailers ou frases típicas de commit que atribuem a autoria do trabalho a uma ferramenta automatizada (a lista exata de padrões está no código-fonte do hook). Por design, o hook não bloqueia o nome do assistente isolado — banir isso quebraria documentação legítima sobre a própria configuração, este repositório incluído. Julgamento sobre menções indiretas que o hook não cobre continua comigo.

1. **Zero emojis** em qualquer arquivo, documentação, mensagem de commit, PR ou release. Emoji dá cara de texto de máquina; o objetivo é o oposto — linguagem humana e sóbria.
   - **Única exceção**: os pontos de cor das labels no GitHub Projects e no Linear, que são identificação visual funcional do board (ver `~/.claude/agents/project-manager.md`).
2. **Nunca mencionar** ferramenta de IA, Claude, assistente, coautoria ou autoria de máquina — em nenhum lugar: nem em commits (`Co-authored-by`), nem em documentação, nem em comentários de código, nem em releases. Todo o trabalho é apresentado como autoria própria do usuário.
3. Escrever com voz humana e direta, evitando construções que soem automáticas ou genéricas.

---

## 9. Quando NÃO aplicar este fluxo

- **Modo Tarefa (`#tarefa`):** tarefas pontuais não geram planejamento nem board
- Pequenas correções de bug em projeto existente
- Ajustes estéticos ou de configuração
- **Projeto da coluna "dispensável" da seção 4.1** (experimento, script de uso próprio, prova de
  conceito): o Bloco A não se aplica, mas o Bloco B continua valendo — a feature é especificada e
  provada normalmente, só não há roadmap, board nem release por trás

A diferença entre as duas últimas linhas importa: `#tarefa` desliga **tudo**, inclusive a
especificação e o gate; projeto dispensável desliga só a camada de gestão.
