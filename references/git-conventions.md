# Convenções Git — Commits, Branches, PRs e Fluxo

Padrão único para todos os projetos. Toda escrita em português BR. Sem emojis. Sem menção a IA, Claude, coautoria ou `Co-authored-by` em qualquer commit, PR ou descrição.

**Execução com escolha a cada vez.** Eu sempre monto o bloco de comandos completo, do início ao fim — commits, branches, PRs e releases. Depois de montado, pergunto: você digita (ritmo normal, é treino deliberado) ou eu executo (dias de correria)? Só executo depois da sua resposta — nunca decido sozinho, e nunca presumo a partir de uma resposta anterior na mesma sessão (a escolha vale só para aquela ocorrência).

## Índice
- [Commits semânticos](#commits-semânticos)
- [Commits de tarefa e execução paralela](#commits-de-tarefa-e-execução-paralela)
- [Branches](#branches)
- [Pull Requests](#pull-requests)
- [Fluxo completo de comandos](#fluxo-completo-de-comandos)
- [Fechamento de issue via commit](#fechamento-de-issue-via-commit)

## Commits semânticos

Conventional Commits: `<tipo>(<escopo>): <descrição>`

- **tipo**: um dos abaixo
- **escopo**: área afetada, opcional mas recomendado (ex.: `parser`, `ui`, `auth`)
- **descrição**: imperativo, minúscula, sem ponto final, em português

Tipos:

| Tipo       | Uso                                                     |
| ---------- | ------------------------------------------------------- |
| `feat`     | nova funcionalidade                                     |
| `fix`      | correção de bug                                         |
| `docs`     | documentação apenas                                     |
| `refactor` | refatoração sem mudar comportamento                     |
| `test`     | adição ou ajuste de testes                              |
| `chore`    | manutenção, dependências, config                        |
| `style`    | formatação, sem efeito em lógica                        |
| `perf`     | melhoria de performance                                 |
| `build`    | sistema de build ou empacotamento (ex.: PyInstaller)    |
| `ci`       | pipeline de integração contínua                         |

**Exemplos:**

Input: adicionar parser de eventos R-4010 do REINF
Output: `feat(parser): adicionar leitura de eventos R-4010`

Input: corrigir encoding UTF-8 na exportação no Windows
Output: `fix(export): corrigir encoding utf-8 no windows`

Input: extrair cálculo de estorno para módulo próprio
Output: `refactor(icms): extrair calculo de estorno para modulo dedicado`

Corpo do commit (opcional), para contexto extra — nunca mencionar IA:

```
fix(export): corrigir encoding utf-8 no windows

O arquivo era gravado em cp1252, quebrando acentos.
Descoberto durante #23.
```

Breaking change: adicionar `!` após o tipo/escopo e uma seção `BREAKING CHANGE:` no corpo.

## Commits de tarefa e execução paralela

O plano de execução da skill `fuzkrigo-spec-driven` quebra uma feature em faixas paralelas, cada uma numa branch própria (`spec/<feature>-faixa-N`), com um commit por tarefa no formato do motor:

```
T-003 e1-login-email: validar formato do e-mail
```

**Esses commits são efêmeros.** Eles existem para rastrear a execução dentro da faixa, não para virar histórico da `main`. A regra:

| Onde | Formato | Por quê |
| ---- | ------- | ------- |
| Dentro da faixa | `T-xxx <feature>: <título>` | É o que o executor gera; mexer nisso exigiria alterar o motor |
| Branch da feature e `main` | `<tipo>(<escopo>): <descrição> (T-003, T-004)` | O histórico permanente segue Conventional Commits, com os códigos de tarefa preservados para rastreabilidade |

Na prática, ao integrar uma feature que foi executada em faixas, usar squash:

```bash
gh pr merge --squash --delete-branch \
  --subject "feat(auth): adicionar login por e-mail (T-003, T-004)" \
  --body "Closes #12"
```

Feature implementada à mão, sem faixas paralelas, não precisa de squash: os commits já nascem semânticos e o merge normal preserva cada um (ver o passo 6 do fluxo completo).

Os códigos entre parênteses são o elo com o `tasks.md` da feature: quem lê o histórico consegue voltar à tarefa, à especificação e ao critério de aceite que ela atende.

## Branches

Nome amarrado ao tipo do commit e ao número da issue:

`<tipo>/<numero-issue>-<descricao-curta-kebab>`

**Exemplos:**
- `feat/42-parser-reinf`
- `fix/57-encoding-windows`
- `refactor/61-estorno-icms`

`main` é a branch estável. Sem trabalho direto na `main`.

## Pull Requests

- Título segue o mesmo padrão do commit: `<tipo>(<escopo>): <descrição>`
- Corpo usa o `PULL_REQUEST_TEMPLATE.md` (pronto em `~/.claude/references/github/`, copiado para o projeto no setup): o que muda, por que, como testar
- Referenciar a issue com keyword de fechamento (`Closes #42`) para fechar automaticamente no merge
- Sem emojis, sem menção a IA

## Fluxo completo de comandos

Montar sempre o ciclo inteiro, do início ao fim, antes de perguntar quem executa. Modelo (issue #42, tipo feat, escopo parser):

```bash
# 1. Partir da main atualizada
git checkout main
git pull origin main

# 2. Criar e entrar na branch da etapa
git checkout -b feat/42-parser-reinf

# 3. Trabalhar e commitar (repetir por commit atomico)
git add caminho/do/arquivo.py
git commit -m "feat(parser): adicionar leitura de eventos R-4010"

# 4. Enviar a branch para o remoto
git push -u origin feat/42-parser-reinf

# 5. Abrir o PR (via gh, ou pela interface web)
gh pr create \
  --base main \
  --title "feat(parser): adicionar leitura de eventos R-4010" \
  --body "Implementa o parser de R-4010. Closes #42"

# 6. Apos aprovacao, fazer merge (merge normal preserva os commits semanticos)
gh pr merge --merge --delete-branch

# 7. Voltar para main e atualizar
git checkout main
git pull origin main

# 8. Apagar a branch local (se o merge nao removeu)
git branch -d feat/42-parser-reinf
```

Se o usuário preferir abrir o PR e fazer o merge pela interface web, os passos 5-6 viram cliques; os passos 7-8 continuam no terminal. Sempre oferecer as duas rotas.

## Fechamento de issue via commit

Para fechar a issue da etapa automaticamente ao integrar na `main`, usar uma keyword de fechamento na mensagem do commit final ou no corpo do PR:

`Closes #42` (ou `Fixes #42`, `Resolves #42`)

Ao dar merge na `main`, o GitHub fecha a issue #42 sozinho — seja o merge feito por você ou por mim, conforme sua resposta à pergunta de praxe.

Para vincular sem fechar (referência apenas), usar só `#42` sem keyword.
