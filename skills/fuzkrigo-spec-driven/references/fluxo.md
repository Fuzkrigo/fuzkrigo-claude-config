# Fluxo detalhado — do zero ao audit limpo

## Exemplo completo: "entrega de dever de casa"

> `fuzkrigo-spec <cmd>` abrevia `node <dir-desta-skill>/scripts/fuzkrigo-spec.mjs <cmd>`,
> sempre a partir da RAIZ do projeto (motor embarcado — nada a instalar).

```bash
# 1. inicializa o projeto (uma vez); --agents claude copia o motor para o projeto (o CI precisa)
fuzkrigo-spec init --preset lgpd-educacao --agents claude

# 2. nova feature
fuzkrigo-spec new e1-entrega-dever-casa --issue 12
```

Edite `.spec/features/e1-entrega-dever-casa/spec.md`:

```markdown
# Spec: Entrega de dever de casa

> feature: e1-entrega-dever-casa
> etapa: E1
> issue: #12
> status: em-implementacao

## Histórias

### US-001 — Aluno entrega dentro do prazo

Como aluno, quero enviar meu dever antes do prazo, para que conte como no prazo.

#### AC-001 — Entrega antes do prazo é "no prazo"

- **Dado** um aluno autenticado com uma tarefa aberta
- **Quando** ele envia o arquivo antes do horário-limite
- **Então** a entrega é registrada com status "no prazo"

#### AC-002 — Entrega após o prazo é "atrasada"

- **Dado** um aluno autenticado com uma tarefa aberta
- **Quando** ele envia depois do horário-limite
- **Então** a entrega é registrada com status "atrasada"

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | Trabalho não pode ser reenviado após correção | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | Qual fuso horário define o prazo? | aberta | — |
```

```bash
# 3. cada critério de aceite vira um teste executável (a definição de pronto)
fuzkrigo-spec scaffold e1-entrega-dever-casa
# → cria test/e1-entrega-dever-casa.spec.test.js com testes que FALHAM
#   (inclui esqueletos p/ princípios da constituição com verificação(teste))
```

O scaffold segue a stack do `testCommand`: com `pytest` no comando, ele gera
`tests/test_spec_<feature>.py` com funções `test_ac_001`, `test_p_001` e a
etiqueta na docstring. Configuração por stack e a convenção dupla do Python
(nome da função mais docstring): ver a seção "Configurar a prova por stack"
na SKILL.md.

Projeto Python, config mínima em `fuzkrigo.config.json`, na raiz do projeto:

```json
{
  "testCommand": "pytest --junitxml=.spec/verification/raw.xml",
  "reporter": "junit-xml",
  "reporterOutputFile": ".spec/verification/raw.xml",
  "testGlobs": ["tests/**"],
  "srcGlobs": ["src/**"]
}
```

## Paralelizando: `fuzkrigo-spec plano` (2+ tarefas pendentes)

Com as tarefas escritas em `tasks.md` (com `Arquivos:` honestos), o motor
monta o plano de execução:

```bash
fuzkrigo-spec plano e1-entrega-dever-casa
```

- Tarefas de **arquivos disjuntos** viram **faixas paralelas**: 1 faixa =
  1 git worktree + 1 branch (`spec/<feature>-faixa-N`) + 1 janela de contexto
  limpa. Tarefas que compartilham arquivo caem na mesma faixa, em sequência;
  tarefa sem `Arquivos:` roda sozinha ao final.
- Campos opcionais por tarefa em tasks.md: `- Modelo: sonnet` (tarefa
  simples) ou `- Modelo: opus` (tarefa complexa), e `- Esforço: alto`
  (baixo|medio|alto|xalto|max) — o plano usa nos executores. Sem `Modelo:`,
  vale o padrão `opus`. Critério de classificação: passo "3. Tarefas" da
  [SKILL.md](../SKILL.md).
- Sai sempre `plano-execucao.md` (faixas, ondas, gestão de branches/commits,
  ordem de merge e gate final). Na skill do **Claude Code**, saem também
  `executar-tarefas.sh` (claude headless em paralelo, com `--model`/`--effort`
  por tarefa) e `plano-execucao.html` (visual, com o botão "Executar todas as
  tarefas em janelas limpas e paralelas"). Na skill do **Antigravity**, o
  plano traz um prompt pronto por faixa para os agentes paralelos nativos.
- A gestão de commits é do plano: **1 tarefa = 1 commit** (`T-003 <feature>:
  <título>`), merges `--no-ff` de volta na branch de trabalho `spec/<feature>`,
  e o gate final (verify + audit) roda depois de tudo mesclado.

Regenere o plano sempre que tasks.md ou a config `paralelo` mudarem — os
artefatos avisam que não devem ser editados à mão.

Agora implemente a lógica e preencha os testes (ou deixe o plano executar). Rode:

```bash
# 4. o runner prova (ou não) — teste PULADO não conta como prova
fuzkrigo-spec verify e1-entrega-dever-casa

# 5. o gate desta feature — cole a saída; exit 0 ou não está pronto
fuzkrigo-spec audit --ci --feature e1-entrega-dever-casa

# o gate do PROJETO (sem filtro): é o que vale no CI e antes de um release
fuzkrigo-spec audit --ci
```

## A tabela de status

Rode `fuzkrigo-spec status` a qualquer momento:

```
feature                        status             critérios  com-teste  provados  suposições?  perguntas?
────────────────────────────────────────────────────────────────────────────────────────────────────────
e1-entrega-dever-casa          em-implementacao           2          2         1            1           1
```

Lê-se: 2 critérios de aceite, ambos com teste anotado, mas só 1 provado até
agora; 1 suposição e 1 pergunta ainda abertas. A feature **não pode** ir para
`implementada` com a suposição ASM-001 aberta — o audit vai bloquear com
"suposição em aberto" (`ASM_ABERTA`).

## Integração com CI

No seu pipeline (GitHub Actions, GitLab CI):

No CI você usa o mesmo motor embarcado, commitado junto com a skill:

```yaml
- run: node .claude/skills/fuzkrigo-spec-driven/scripts/fuzkrigo-spec.mjs verify e1-entrega-dever-casa
- run: node .claude/skills/fuzkrigo-spec-driven/scripts/fuzkrigo-spec.mjs audit --ci
```

## Por que isso mata o vibecoding

O agente de IA não consegue dizer "implementei tudo" e passar batido: se um
critério de aceite não tem teste, o audit acusa; se o teste nunca passou, o
audit acusa; se o agente renomeou um requisito e esqueceu o teste, o audit
acusa teste órfão (`TESTE_ORFAO`); se o agente PULOU o teste (skip/todo), o
verify recusa a prova e o audit acusa critério sem prova (`AC_SEM_PROVA`). A
prova não é a palavra do agente — é o exit code.
