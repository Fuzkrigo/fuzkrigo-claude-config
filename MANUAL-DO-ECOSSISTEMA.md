# Manual do ecossistema de desenvolvimento

> O que é cada peça, quando ela entra e o que digitar.
> Se você só quer os comandos, pule para "Cheat sheet".

---

## Antes de tudo: onde se digita cada coisa

Este manual mostra comandos de dois mundos diferentes. Confundir os dois é o erro mais comum de
quem começa, então: **cada bloco de código aqui é marcado com o lugar a que pertence.**

| Marca | Onde | O que é |
| ----- | ---- | ------- |
| **[chat]** | Na conversa com o Claude Code | Linguagem natural, comandos com barra (`/skill`) e o prefixo `#tarefa` |
| **[terminal]** | No seu terminal (Git Bash) | `fspec`, `git`, `gh`, `node` — coisas que o sistema operacional executa |

E o ponto mais importante, que muda como você lê o resto deste manual:

**No uso normal, você não digita os comandos do motor.** Você conversa; eu é que rodo `new`,
`scaffold`, `verify` e `audit`, e colo a saída na conversa. Eles estão documentados aqui para você
**entender e conferir** o que está sendo feito em seu nome — não porque você precise decorá-los.

Você roda um comando à mão quando quiser conferir algo sozinho, sem sessão aberta. E existe um
meio-termo útil: começando a mensagem do chat com `!`, o comando roda no terminal e a saída entra
na conversa, onde eu consigo ler.

| O que você quer | Onde | O que digita |
| --------------- | ---- | ------------ |
| Abrir projeto, implementar feature, fechar milestone | chat | Linguagem natural |
| Forçar uma skill específica | chat | `/iniciar-projeto` |
| Desligar o fluxo para algo pontual | chat | `#tarefa ...` no início da mensagem |
| Conferir o estado por conta própria | terminal | `fspec status` |
| Rodar algo e me mostrar o resultado | chat | `!fspec audit --ci` |
| Commit, PR, release | chat | Eu monto o bloco e pergunto quem executa |

---

## 1. A ideia em um minuto

O ecossistema responde duas perguntas diferentes, e por isso tem duas camadas:

- **O que vamos construir, por quê, e como isso é comunicado e entregue?** — skill
  `iniciar-projeto`.
- **Este código faz mesmo o que foi pedido, e como sabemos disso?** — skill
  `fuzkrigo-spec-driven`.

A primeira produz documentos e organiza o trabalho. A segunda produz **prova**: cada requisito
vira um teste anotado, o teste roda de verdade, e um comando decide se a feature está pronta.
"Pronto" deixa de ser opinião e passa a ser código de saída zero.

Nada aqui impede você de trabalhar rápido. O que ele impede é você **achar** que terminou.

---

## 2. As cinco peças

| Peça | O que é | Quem dispara |
| ---- | ------- | ------------ |
| `CLAUDE.md` | As regras que valem em toda sessão: persona, idioma, TDD, anti-alucinação, proibições. Importa o `CODIGO.md` (padrões de código), que entra junto em toda sessão | Carregado automaticamente, sempre |
| `references/` | Padrões consultáveis: convenções de Git, templates de issue e PR, workflow de CI | Lido quando o assunto aparece; o `github/` é copiado para o projeto em A3 |
| `skills/` | Fluxos completos: abertura de projeto, desenvolvimento de feature, ambiente corporativo | Você chama (`/iniciar-projeto`) ou o gatilho da descrição dispara |
| `agents/` | Especialistas que rodam isolados e devolvem um relatório: revisão de código, segurança, documentação, gestão de projeto, docstrings | Chamados em pontos fixos do fluxo, ou quando você pede |
| `hooks/` | Três scripts: um a cada mensagem sua, dois antes de cada escrita de arquivo | Automático, você não controla |

Sobre os agentes: eles rodam em uma janela de contexto separada e **não veem a conversa**. Por
isso devolvem relatórios completos em vez de conversar. Dois deles não têm permissão de escrita
de propósito — `code-reviewer` e `security-reviewer` só leem e apontam.

Sobre os hooks, que são a parte que ninguém pode desligar sem querer:

- `check_planning_docs.py` — antes de escrever código de produção, confere o planejamento. Sem
  nenhuma tarefa no projeto, verifica se existe `docs/ROADMAP.md` + `docs/CHECKLIST.md`, **ou** uma
  spec em `.spec/features/`, como antes. Com tarefas, aplica a regra do "código órfão" do audit:
  arquivo de `srcGlobs` que não está no `Arquivos:` de nenhuma tarefa. Nos dois casos, quando falta
  algo, ele **pergunta** (não bloqueia): quem decide é você.
- `check_style_prohibitions.py` — bloqueia emoji e frases que atribuem autoria do trabalho a uma
  ferramenta. Esse **bloqueia mesmo**, e é intencional. Tem uma exceção por caminho: dentro de
  `~/.claude/` e de qualquer pasta chamada `fuzkrigo-claude-config` (este repositório, onde quer que
  esteja clonado), citar as frases proibidas é permitido, porque é onde a regra precisa ser
  documentada. Emoji continua bloqueado em todo lugar — exceto os marcadores funcionais de status
  (ok, atenção, falha) dos relatórios dos agentes e da saída do motor, que não são decoração.
- `arm_modo_tarefa.py` — roda a cada mensagem sua, não antes de escrita. Mensagem que começa com
  `#tarefa` cria o marcador do Modo Tarefa da sessão; "modo normal" ou "sair do modo tarefa" o
  apagam. É por esse marcador que o hook de planejamento sabe que deve ficar quieto: você não
  precisa fazer nada além de escrever o `#tarefa`.

### Não confunda com as ferramentas que já vêm no Claude Code

Além do que é seu, o produto traz skills próprias, acionadas por barra. Duas têm nome parecido com
os seus agentes, e fazem coisas diferentes:

| Você digita | O que roda | Não confundir com |
| ----------- | ---------- | ----------------- |
| `/code-review` | Skill do produto: revisa o diff atual, um PR ou uma branch, com critérios genéricos | Seu agente `code-reviewer`, que aplica o seu `CLAUDE.md` e o seu `CODIGO.md` |
| `/security-review` | Skill do produto: revisa as mudanças pendentes da branch | Seu agente `security-reviewer`, que faz triagem entre dez módulos (OWASP, LGPD, secrets, supply chain) e devolve princípios para a constituição |

Os nomes diferem por uma letra (`review` contra `review**er**`), e os dois mundos não se
atropelam: os seus são invocados pelo fluxo, pela ferramenta de agentes; os do produto, só quando
você digita a barra. O risco não é técnico, é de dedo: digitar `/security-review` esperando a
auditoria completa e receber uma revisão de diff.

Nada impede usar as duas de propósito. A do produto é uma boa segunda opinião antes de um PR
grande, justamente porque aplica critérios diferentes dos seus.

---

## 3. O mapa do fluxo

```
BLOCO A - abertura do projeto (uma vez)
   A1 Briefing e diagnostico
   A2 Documentos-base: ROADMAP, CHECKLIST, ARCHITECTURE
   A3 Provisionamento: GitHub/Linear, .github/ (templates + CI), main protegida, constituicao

BLOCO B - ciclo de feature (repete a cada etapa)
   Especificar -> Projetar -> Tarefas -> Plano -> Executar
   Portao 1  audit --ci --feature <f> = 0   (a maquina prova)
   Portao 2  code-reviewer -> docstrings-manager -> security (se sensivel)
   Portao 3  PR, merge, CHECKLIST atualizado

BLOCO C - fechamento de milestone
   C1 Revisao de seguranca
   C2 Documentacao (tecnica, executiva, manual, apresentacao)
   C3 Release: CHANGELOG, tag, milestone fechada
```

Uma **Etapa** do CHECKLIST equivale a uma issue no GitHub, a uma feature em `.spec/features/` e a
uma branch. Esse é o elo que amarra tudo: se você entender só uma coisa deste manual, entenda essa.

---

## 4. Antes de começar

**[terminal]** Confira uma vez que o ambiente tem o necessário:

```bash
node --version     # o motor de auditoria roda nele
py -3 --version    # Windows: os tres hooks rodam com o lancador do Python
python3 --version  # Linux/WSL: no lugar do py -3; o run-python.sh escolhe sozinho
git --version
gh auth status     # so se voce for criar repositorio, labels e issues no GitHub
```

### O que é o `fspec` deste manual

O motor mora dentro da skill e não tem instalação, então o comando completo é este monstro:

```bash
node ~/.claude/skills/fuzkrigo-spec-driven/scripts/fuzkrigo-spec.mjs status
```

Ninguém digita isso dez vezes por dia. A saída é criar um **alias**: um apelido curto que o
terminal expande para o comando longo. Você digita `fspec status`, o shell entende
`node ~/.claude/.../fuzkrigo-spec.mjs status`. É só economia de digitação — não instala nada, não
muda nada no projeto, e sem ele tudo funciona igual (só mais longo).

**[terminal]** No Git Bash, criar o apelido só para a janela aberta:

```bash
alias fspec='node ~/.claude/skills/fuzkrigo-spec-driven/scripts/fuzkrigo-spec.mjs'
```

Fechou o terminal, o apelido some. Para ele existir sempre, a linha precisa entrar no arquivo que
o Git Bash lê ao abrir — o seu `~/.bashrc`:

```bash
echo "alias fspec='node ~/.claude/skills/fuzkrigo-spec-driven/scripts/fuzkrigo-spec.mjs'" >> ~/.bashrc
```

**[terminal]** No PowerShell a sintaxe é outra (`Set-Alias` não aceita comando com argumentos, então
se usa uma função):

```powershell
function fspec { node "$HOME/.claude/skills/fuzkrigo-spec-driven/scripts/fuzkrigo-spec.mjs" @args }
```

Para valer sempre no PowerShell, essa linha vai no arquivo indicado por `$PROFILE` (no seu caso,
`Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` — pode não existir ainda; criar é
suficiente).

Neste manual, `fspec` significa o comando completo. Todos rodam **a partir da raiz do projeto** —
o motor procura o `.spec/` na pasta onde você está.

---

## 5. Abrindo um projeto (Bloco A)

### Este bloco se aplica ao seu caso?

Nem todo código nasce projeto. O critério é o destino do que você está construindo:

| Se o que você está fazendo... | Bloco A |
| ----------------------------- | ------- |
| vai para o portfólio | Obrigatório |
| tem usuário final, mesmo que seja só você usando todo dia | Obrigatório |
| vai ganhar release, tag ou versão | Obrigatório |
| é experimento ou prova de conceito descartável | Dispensável |
| é script de uso próprio, automação pessoal | Dispensável |

**Dispensável não é sem rigor.** Você pula a camada de gestão (roadmap, board, documentos de
comunicação, release) e vai direto para o Bloco B: a feature continua sendo especificada e o gate
continua valendo. É diferente do `#tarefa`, que desliga tudo, inclusive a prova.

Se um experimento virar projeto de verdade, o Bloco A é feito retroativamente, antes do primeiro
release. O sinal de que chegou a hora é um destes três: apareceu um segundo usuário, você quer
marcar uma versão, ou quer mostrar o trabalho.

### O passo a passo

**[chat]** Você diz, em linguagem normal:

> "Quero começar um projeto novo: um app para controlar minhas leituras."

A skill `iniciar-projeto` entra sozinha. O que acontece:

**A1 — Briefing.** Você é entrevistado: escopo, público, requisitos, o que está fora. Também são
levantadas as **restrições inegociáveis** — regras que o sistema nunca pode violar ("nota de um
aluno nunca aparece para outro", "senha nunca vai para log"). Guarde-as: elas viram lei em A3.

Nenhuma linha de código é escrita aqui. Se você pedir código, será interrompido — de propósito.

**A2 — Documentos-base.** São gerados:

- `docs/ROADMAP.md` — o plano vivo: problema, decisões de arquitetura, riscos, milestones.
- `docs/CHECKLIST.md` — o índice de etapas. Não lista tarefas miúdas; lista Milestones, Fases e
  Etapas, cada uma apontando para a pasta da sua feature.
- `docs/ARCHITECTURE.md` — diagramas Mermaid, gerado pelo agente `project-documentation`.

Assim fica uma etapa no CHECKLIST:

```markdown
### Fase 1 — Autenticação
- [x] E1: Login por e-mail — `.spec/features/e1-login-email/` (auditada)
- [ ] E2: Recuperação de senha — `.spec/features/e2-recuperacao-senha/` (em-implementacao)
- [ ] E3: Editar perfil — spec ainda não criada
```

**A3 — Provisionamento e constituição.** O agente `project-manager` cria labels, milestones e as
issues (uma por etapa) no GitHub, e monta a gestão no Linear — Project, Milestones e as issues já
sincronizadas, com prioridade nativa. Se o repositório ainda não existe, ele não o cria: devolve o
comando `gh repo create` montado, eu te pergunto, e ele é invocado de novo com o repositório
pronto. O GitHub Projects não entra: o board é o do Linear. O agente também protege a `main`:
dali em diante, mudança só entra por PR com o CI verde e a branch atualizada, inclusive a sua, e
até os arquivos da própria A3 seguem esse caminho. Em repositório privado na conta Free o GitHub
não oferece a proteção; o agente devolve a recusa, e o risco vai para o ROADMAP. Cuidado com a
volta: tornar o repositório privado na conta Free derruba a proteção, e voltar a público não a
restaura. Invoque o `project-manager` de novo para reaplicá-la. E o projeto ganha sua
constituição:

**[terminal]** (na prática, quem roda sou eu, durante A3)

```bash
fspec init --agents claude                                   # projeto generico
fspec init --agents claude --preset lgpd-educacao            # com dados de aluno
fspec init --agents claude --preset base,dados-tabulares     # planilhas, CSV, bases
```

Isso cria `.spec/` e `.spec/constituicao.md`. Os presets combinam com vírgula: sai um arquivo só,
com os princípios de cada preset renumerados em sequência (o `P-001` do preset de dados vira
`P-003` depois dos dois do `base`). O que não se aplica ao projeto sai da constituição, com o
motivo no ROADMAP. Agora traduza as restrições de A1 em princípios que a máquina verifica. Entram
também as bordas que valem para o projeto inteiro e os totais que precisam fechar sempre, que a A1
pergunta junto com as restrições: viram princípios com `verificação(teste)`.

```markdown
## P-002 [DEVE] Senha nunca aparece em log
- verificação(proibido): `log.*(senha|password)` em `src/**`
```

Um princípio `[DEVE]` sem verificação executável é acusado pelo próprio audit. Aqui, regra sem
dente não existe.

**O CI nasce aqui também.** Junto com os templates, o projeto ganha `.github/workflows/ci.yml`: a
cada pull request e a cada push na `main`, o GitHub roda os testes, mede a cobertura e reprova
abaixo do limite, e audita a especificação — sozinho, sem sessão aberta. É o que garante que nada
entre na `main` sem passar pelo mesmo crivo, mesmo quando você mescla às pressas de outra máquina.
O `.github/` traz também um `.gitattributes` que mantém os scripts do CI em LF: com CRLF, vindo de
uma cópia no Windows, o bash quebraria em cada linha.

Duas coisas fazem o CI funcionar, e as duas acontecem em A3:

- `fspec init --agents claude` — o `--agents claude` copia o motor para `.claude/skills/` dentro do
  projeto. O servidor do GitHub não enxerga o `~/.claude/` da sua máquina; sem essa cópia
  commitada, o CI reprova no passo "Conferir o motor de auditoria", no PR e na `main`, porque
  passar sem auditar seria um verde falso. Projeto sem `fuzkrigo.config.json` está fora do fluxo e
  não é auditado.
- O `fuzkrigo.config.json` preenchido: o workflow lê o `testCommand` e o bloco `coverage` de lá,
  então a configuração vive num lugar só e o CI acompanha se você trocar de runner.

Em projeto Python, o CI instala o `requirements.txt` e, só quando há pacote declarado (`setup.py`,
ou `[project]` ou `[build-system]` no `pyproject.toml`), o próprio projeto com `pip install -e .`.
Um `pyproject.toml` só com configuração de ferramentas não tem pacote para instalar. Se a
instalação falhar, o build reprova, sem `|| true` escondendo o erro.

**A cobertura também tem dente.** O bloco `coverage` do `fuzkrigo.config.json` declara 95% para o
projeto inteiro e 98% para as pastas de lógica de negócio, listadas em `businessLogicPaths` a
partir do `docs/ARCHITECTURE.md`. A medição é sempre com ramos: cada lado de cada condição precisa
de teste, não basta a linha ter rodado. O CI reprova abaixo do limite e também quando não consegue
medir: sem a ferramenta, sem o bloco ou com a lista de pastas vazia. Em projeto Node, os mesmos
números ficam também no `vitest.config`. Excluir um trecho da medição só vale com um comentário
`coverage-justification:` logo acima, e o `code-reviewer` recusa justificativa como "difícil de
testar". Detalhes em `references/cobertura.md`, na skill `iniciar-projeto`.

No pull request a auditoria é informativa, e na `main` ela bloqueia. O motivo é o mesmo do
`--feature`: auditar o projeto inteiro num PR reprovaria por causa de uma spec de outra feature
ainda em rascunho, o que não é problema daquele PR.

**Configure a prova antes de sair de A3.** Sem isso o `verify` lê zero testes:

| Sua stack | `testCommand` | `reporter` |
| --------- | ------------- | ---------- |
| Node | `node --test --test-reporter=tap` | `tap` |
| pytest | `pytest --junitxml=.spec/verification/raw.xml` | `junit-xml` |
| Vitest | `npx vitest run --reporter=json --outputFile=.spec/verification/raw.json` | `vitest-json` |
| Jest | `npx jest --json` | `jest-json` |

Reporters que gravam arquivo exigem também `reporterOutputFile` no mesmo caminho. Tudo isso fica
em `fuzkrigo.config.json`, na raiz.

---

## 6. Desenvolvendo uma feature (Bloco B)

Este é o ciclo que você vai repetir. Exemplo: a etapa E2, "Recuperação de senha".

### Passo 1 — Especificar

Você abre a etapa no chat ("vamos fazer a E2, recuperação de senha") e o ciclo começa. Os comandos
abaixo são os que eu rodo — acompanhe a saída, não precisa digitar.

**[terminal]**

```bash
fspec new e2-recuperacao-senha --issue 7
```

Cria `.spec/features/e2-recuperacao-senha/` com `spec.md` e `tasks.md`, já com a etapa e a issue
no cabeçalho da spec. Antes de escrever, o contexto do projeto é lido (ROADMAP e a etapa no
CHECKLIST) e as lições já confirmadas:

```bash
fspec licoes list
```

No `spec.md` você escreve **histórias** e, para cada uma, **critérios de aceite** observáveis:

```markdown
### US-002 — Recuperar acesso por e-mail

Como usuário, quero redefinir minha senha, para voltar a acessar a conta.

#### AC-003 — Link de redefinição expira em 30 minutos

- **Dado** um link de redefinição gerado há mais de 30 minutos
- **Quando** o usuário abre esse link
- **Então** vê a mensagem de link expirado (e nenhuma senha é alterada)
```

Regra de ouro do critério: se um teste não consegue checar, não é critério. "Deve ser seguro" não
serve; "senha com menos de 8 caracteres é rejeitada" serve.

Três seções são obrigatórias, e a ausência delas é erro a partir da spec `pronta` (em rascunho, é
aviso):

- **Casos de borda e regras de fechamento** — a decisão sobre cada borda relevante e cada total
  que precisa fechar.
- **Suposições (ASM-xxx)** — você preencheu uma lacuna com um palpite e seguiu.
- **Perguntas em aberto (Q-xxx)** — você parou porque falta informação.

Não tem suposição nem pergunta? Escreva "Nenhuma." e desconfie de si mesmo.

Os casos de borda saem do catálogo da skill (`references/casos-de-borda.md`): categorias gerais
(vazio, limites, formato, unidade, identificador com cara de número, tempo, repetição, volume,
falha de dependência, permissão, ambiente) e pacotes por domínio (dados tabulares, interface web,
integração e API). Cada borda relevante ganha uma linha com a decisão: o critério de aceite que a
cobre, a suposição que a assume, ou "Não se aplica:" com o motivo. Cada total que precisa fechar
ganha tolerância e dois critérios diferentes, um que prova que fecha e outro que prova que o
programa para quando não fecha:

```markdown
## Casos de borda e regras de fechamento

### Casos de borda

| Categoria | Situação | Decisão |
|---|---|---|
| Limites | Link aberto exatamente aos 30 minutos | AC-004 |
| Repetição e ordem | Dois pedidos de redefinição seguidos | ASM-003 |
| Volume | Mil pedidos por minuto | Não se aplica: o sistema tem 40 usuários |

### Regras de fechamento

Nenhuma.
```

O código citado precisa existir nesta spec; critério de outra feature é erro, mesmo em rascunho.

**A spec também documenta a própria feature.** O nome da pasta diz de onde ela veio: `e2-` para a
etapa E2 do CHECKLIST, `i42-` para a issue avulsa 42, nenhum prefixo em projeto descartável. O
`new` grava a etapa e a issue no cabeçalho (`> etapa: E2`, `> issue: #7`) e mostra na saída o que
reconheceu, para você conferir: um nome como `e2e-testes` é lido como a etapa "E2e", então não
comece o nome com `e<n><letra>-` sem ser uma etapa. Casos de borda que se aplicam viram critérios
de aceite próprios, porque só critério ganha teste e prova. Se a spec mudar depois de `pronta`, a
mudança e o motivo entram no `## Histórico`. Antes do PR, a `## Resolução` registra o PR, a
abordagem, as decisões, o resultado do audit e os pontos de atenção dos revisores. Bug ou dívida
técnica que muda comportamento também ganha spec, numa pasta `i<n>-` com o número da issue: o
critério de aceite reproduz o defeito, e o teste dele vira teste de regressão. Correção trivial
fica só na issue e no PR.

### Passo 2 — Tarefas

No `tasks.md`, quebre em tarefas com os arquivos que cada uma toca:

```markdown
## T-004 — Gerar e validar token de redefinição [pendente]

- Refs: US-002, AC-003
- Arquivos: src/auth/token.py, src/auth/rotas.py
```

O campo `Arquivos` decide o que pode rodar em paralelo. Capriche nele.

Toda feature tem `tasks.md`, mesmo a pequena: no mínimo uma tarefa com o campo `Arquivos`. Cada
arquivo de `src/` precisa estar no `Arquivos` de alguma tarefa — o audit acusa como código órfão o
que não estiver, e o hook de planejamento pergunta antes de eu escrever um arquivo assim.

### Passo 3 — O teste nasce falhando

```bash
fspec scaffold e2-recuperacao-senha
```

Gera o esqueleto de teste para cada critério sem teste — todos **falhando**. Essa é a definição de
pronto, executável desde o primeiro minuto. Se o arquivo de testes da feature já existe, o
scaffold acrescenta no fim só os esqueletos que faltam e nunca reescreve o que você escreveu;
rode de novo sempre que a spec ganhar um critério.

Em Python, a etiqueta vive em dois lugares e os dois importam:

```python
def test_ac_003():
    """AC-003: Link de redefinicao expira em 30 minutos @spec:AC-003"""
```

O **nome** é o que o runner reporta (é por ele que a prova é casada); a **docstring** é o que o
audit lê para saber que o critério tem teste. Renomear a função quebra a prova; apagar a docstring
faz o critério parecer sem teste.

### Passo 4 — Implementar

Escreva o código até os testes passarem. Uma tarefa, um commit. Marque `[concluida]` só com prova.

Se houver duas ou mais tarefas pendentes, dá para paralelizar:

```bash
fspec plano e2-recuperacao-senha  # agrupa tarefas de arquivos disjuntos em faixas
fspec painel e2-recuperacao-senha # painel ao vivo no navegador, com botao de executar
```

Cada tarefa recebe `Modelo:` e `Esforço:` pelo critério da skill: tarefa simples usa `sonnet`,
tarefa complexa usa `opus`, e na dúvida ela é complexa (tarefa sem `Modelo:` também fica com o
`opus`). O resumo do plano mostra essa classificação para você revisar antes de executar. Isso só
vale na execução paralela: quando eu implemento tarefa por tarefa na conversa, quem trabalha é o
modelo da sessão.

Cada faixa roda em um worktree próprio, com contexto limpo. O executor trabalha na branch da issue
e recusa a `main`: as faixas saem dela e voltam para ela, e o gate final é o
`audit --ci --feature` da feature.

### Passo 5 — Portão 1: a máquina decide

```bash
fspec verify e2-recuperacao-senha                 # roda os testes e grava a prova
fspec audit --ci --feature e2-recuperacao-senha   # o veredito desta feature
```

O `--feature` limita o veredito à feature da vez: a spec da próxima etapa, ainda em rascunho, não
reprova esta. O que é do **projeto** — princípio da constituição violado, código órfão — continua
contando, porque esconder isso transformaria o filtro numa porta dos fundos.

Antes de fechar uma milestone ou lançar qualquer coisa, rode **sem** o filtro:

```bash
fspec audit --ci                  # o veredito do projeto inteiro
```

Um relatório filtrado sempre avisa, em amarelo, que o escopo estava reduzido. Se você errar o nome
da feature, o comando falha com código 2 e lista as existentes — nunca sai 0 por engano.

Teste pulado **não** conta como prova — o motor recusa e o audit acusa. Se o audit sair 1, ele
diz exatamente o que falta. Corrija e repita, no máximo três vezes; persistindo, pare e reavalie
o problema em vez de insistir.

### Passo 6 — Portão 2: qualidade

Com o audit em zero, entram os especialistas, nesta ordem:

1. `code-reviewer` — SOLID, DRY, KISS, tamanho de função e arquivo, tratamento de erro.
2. `docstrings-manager` — documenta o que ficou público, sem tocar em lógica.
3. `security-reviewer` — só se a feature toca autenticação, permissão, dinheiro ou dado pessoal.

O portão é dimensionado ao tamanho da feature: em feature pequena (até três arquivos, sem lógica
de negócio nova) o `code-reviewer` é opcional e o `docstrings-manager` só entra se nasceu algo
público. O `security-reviewer` não segue essa regra — o gatilho dele é o que a feature toca, não
o tamanho dela.

**Depois do `docstrings-manager`, rode o audit de novo.** Esse agente edita arquivos, inclusive os
de teste; se um título anotado ou um nome `test_ac_001` mudar, a prova daquele critério some. O
audit devolve isso na hora, em vez de você descobrir depois.

Achado de segurança que você aceitar vira **princípio na constituição**. É assim que o mesmo erro
não volta: da próxima vez, o audit acusa sozinho. O agente não escreve nada — ele devolve o bloco
do princípio pronto no relatório, e quem cola em `.spec/constituicao.md` é o Claude principal,
depois da sua aprovação.

### Passo 7 — Portão 3: entrega

PR seguindo `~/.claude/references/git-conventions.md`. Se a feature rodou em faixas paralelas, o
histórico sai por squash.

**[terminal]** — aqui vale a política de sempre: eu monto o bloco completo e pergunto se você
digita ou se eu executo. Nunca decido isso sozinho.

```bash
gh pr merge --squash --delete-branch \
  --subject "feat(auth): adicionar recuperacao de senha (T-004, T-005)" \
  --body "Closes #14"
```

Depois, marque a etapa no CHECKLIST e registre o aprendizado, se houver:

```bash
fspec licoes sugerir              # o motor aponta onde vale uma licao
```

Lição só entra se estiver ancorada em uma falha real registrada. Caminho limpo não gera lição, e
isso é o resultado certo — não uma omissão.

---

## 7. Fechando uma milestone (Bloco C)

**C1 — Segurança.** O `security-reviewer` faz a varredura completa. Itens críticos são resolvidos
antes de qualquer outra coisa: não se documenta nem se lança o que tem falha aberta.

**C2 — Documentação.** O `project-documentation` gera ou atualiza a documentação técnica, o
resumo executivo, o manual e a apresentação. Esses documentos descrevem o que **existe** — por
isso vêm depois da entrega, não antes.

**C3 — Release.** O `project-manager` monta CHANGELOG, texto do release e os comandos Git. Antes,
ele confere que todas as features estão `auditada` — issue fechada não é prova — e que a proteção
da `main` está ativa. Com ela, nem o CHANGELOG vai por push direto: entra por PR, numa branch
`docs/changelog-vX.Y.Z`, e a tag só é criada depois do merge. A execução do Git é sempre uma
escolha sua: você digita ou pede para executarem.

---

## 8. Quando você não quer nada disso

**[chat]** Comece a mensagem com `#tarefa`. Isso desliga as duas skills, o TDD e a regra de bloqueio pelo
resto da sessão. Serve para: corrigir um bug pequeno, mexer em configuração, escrever um script
descartável.

Continua valendo, sempre: não inventar API, não expor segredo, não engolir erro, alertar risco de
segurança, PT-BR na conversa e inglês no código.

Para sair: comece uma conversa nova, ou diga "modo normal" ou "sair do modo tarefa".

**Não confunda com projeto dispensável** (seção 5). São dois níveis diferentes de desligamento:

| | O que desliga | O que sobra |
| - | ------------- | ----------- |
| Projeto dispensável | A camada de gestão: roadmap, board, documentos, release | Especificação, testes, audit — o rigor técnico inteiro |
| `#tarefa` | Tudo: as duas skills, o TDD, a regra de bloqueio | Só o piso: anti-alucinação, segredos, tratamento de erro, idioma |

Use `#tarefa` para o que é pontual e não vai crescer. Use projeto dispensável para o que é pequeno
mas continua sendo software.

---

## 9. Cheat sheet

**[terminal]** — lembrando: no fluxo normal quem roda estes comandos sou eu. Use-os à mão quando
quiser conferir algo sozinho, ou com `!` no chat para eu ver a saída.

```bash
# projeto
fspec init --agents claude [--preset base|lgpd-educacao|dados-tabulares[,...]]
                                           # cria .spec/, a constituicao e
                                           # copia o motor para o projeto (o CI precisa);
                                           # presets combinam com virgula
fspec status                               # onde cada feature esta
fspec assumptions                          # o que estamos assumindo

# feature
fspec new <feature>                        # cria spec.md e tasks.md
fspec scaffold <feature>                   # acrescenta os testes que falham
fspec tarefa <feature> <T-xxx> <status>    # pendente | em-andamento | concluida
fspec plano <feature>                      # agrupa tarefas em faixas paralelas
fspec painel <feature>                     # acompanhamento ao vivo no navegador

# prova
fspec verify <feature>                     # roda os testes, grava a prova
fspec audit                                # relatorio legivel (projeto inteiro)
fspec audit --ci --feature <feature>       # o gate da feature: exit 0 ou 1
fspec audit --ci                           # o gate do projeto (CI e release)
fspec audit --md relatorio.md              # salva o relatorio

# aprendizado
fspec licoes list | sugerir | add | status
```

---

## 10. O audit acusou algo. E agora?

Os mais comuns:

| Mensagem | Significa | O que fazer |
| -------- | --------- | ----------- |
| critério de aceite sem teste | Requisito sem prova nenhuma | `fspec scaffold` e escreva o teste |
| critério de aceite sem prova | Existe teste, mas nunca passou (ou foi pulado) | Rode `verify`; skip não é prova |
| teste órfão | O teste aponta para um critério que sumiu | A spec mudou: atualize o teste |
| tarefa concluída sem prova | Você marcou `[concluida]` sem o critério provado | Verifique de novo, ou reabra a tarefa |
| suposição em aberto | A feature quer fechar com um palpite não confirmado | Confirme com quem decide, ou invalide |
| princípio violado | O código quebrou a constituição | Conserte o código. Nunca o princípio |
| princípio sem prova | O teste do princípio falhou, foi pulado ou nunca rodou num verify | Rode `verify` e conserte o código até o teste passar |
| verificação não olha nenhum arquivo | O glob do princípio não casa nada | Corrija o glob: a regra estava inerte |
| código órfão | Existe código que nenhuma tarefa mapeia | Mapeie na tarefa, ou questione por que ele existe |
| prova fraca | A prova veio só do código de saída global | Configure um reporter com granularidade |
| caso de borda sem decisão | Uma borda sem decisão válida, "Não se aplica" sem motivo, ou nenhuma borda registrada | Decida: o critério, a suposição ou "Não se aplica:" com o motivo |
| regra de fechamento incompleta | Total a fechar sem tolerância, sem os dois critérios ou com o mesmo critério nos dois | Declare a tolerância e escreva o critério que fecha e o que para |
| referência a critério ou suposição que não existe nesta especificação | A seção de bordas cita um código que não está nesta spec | Corrija o código ou crie o critério aqui |

---

## 11. Glossário

| Código | Nome | O que é |
| ------ | ---- | ------- |
| US-xxx | História de usuário | Quem precisa, do que precisa e por quê |
| AC-xxx | Critério de aceite | Resultado observável que um teste consegue checar |
| T-xxx | Tarefa | Passo de implementação, com arquivos declarados |
| ASM-xxx | Suposição | Lacuna preenchida com palpite, ainda sem confirmação |
| Q-xxx | Pergunta em aberto | Decisão que falta a quem é dono do produto |
| P-xxx | Princípio | Restrição inegociável, com verificação executável |
| DoD | Definição de pronto | O conjunto de critérios com prova gravada |

Na conversa, use o nome por extenso. O código vai entre parênteses quando precisar.

---

## 12. Armadilhas conhecidas

Coisas que vão te morder e não são culpa sua:

1. **O audit sem filtro é do projeto inteiro.** No portão de uma feature, use
   `--feature <nome>`; sem ele, a spec da próxima etapa ainda em rascunho reprova a feature que
   você acabou de terminar. E vale o contrário: não use `--feature` para decidir se o projeto está
   pronto para release, porque aí ele esconde exatamente o que você precisa ver. Boa prática que
   continua valendo: uma spec viva por vez.
2. **`node --test` sozinho não gera prova.** Do Node 20 em diante o formato padrão mudou; sem
   `--test-reporter=tap` o verify lê zero testes e reprova tudo, com a suíte inteira verde.
3. **Nunca renomeie um teste com etiqueta** (`@spec:` ou `test_ac_001`). A prova é casada por ela.
4. **Skip não é prova.** `@pytest.mark.skip` ou `test.skip` fazem o critério continuar sem prova,
   por mais verde que o terminal pareça.
5. **Glob de princípio que não casa arquivo** vira regra inerte. O audit avisa; não ignore.
6. **`init` sem `--agents claude` reprova o CI.** Sem a flag, o motor não é copiado para dentro
   do projeto, e o servidor do GitHub não tem o que executar: o passo "Conferir o motor de
   auditoria" falha, no PR e na `main`. Rode o `init` de novo com a flag e commite a pasta
   `.claude/skills/`.

---

## 13. Mantendo o ecossistema

A configuração vive em dois lugares que precisam andar juntos:

- `~/.claude/` — o que o Claude Code realmente carrega.
- Este repositório — o backup versionado.

Para instalar numa máquina nova, siga a seção "Instalação no `~/.claude/`" do `README.md`: o que
vai para onde, os comandos e como validar.

Mudou um, espelhe no outro. Isso não é burocracia: os dois já saíram de sincronia uma vez, e a
instalação de uma status line chegou a sobrescrever o `settings.json` global, deixando os dois
hooks desligados por dias sem ninguém notar.

Se você atualizar a skill `fuzkrigo-spec-driven` a partir do projeto de origem, releia a lista de
**patches locais** no `README.md`: são catorze conjuntos de ajustes no motor — o suporte a Python, o
audit com escopo de feature, os nomes próprios, o modelo padrão por alias, o preset LGPD para
Python e JavaScript, as mensagens e a saída do motor, a spec rastreável, a numeração contínua no
`new`, a prova do princípio com a unicidade das tarefas, o princípio repetido na constituição, o
executor na branch da issue com o gate por feature, o scaffold que acrescenta com o `new` que
mostra o rastreio, os casos de borda e regras de fechamento na spec, e os presets de constituição
combináveis. As dezesseis suítes que os protegem rodam assim:

```bash
cd ~/.claude/skills/fuzkrigo-spec-driven/scripts
node --test test/*.test.mjs
```

O glob pega suíte nova sem mudar o comando. São 87 casos. Se algum falhar depois de uma atualização, um patch se perdeu — o `README.md` diz
qual e onde.

Os hooks e a status line têm testes próprios, que rodam a partir da raiz deste repositório:

```bash
py -3 -m unittest discover -s hooks/tests -v      # Windows
python3 -m unittest discover -s hooks/tests -v    # Linux/WSL
```

São 44 casos. Três deles comparam o hook de planejamento com o próprio motor e precisam do `node`
no PATH, e os três da status line e os cinco do lançador `run-python.sh` precisam do `bash`; sem
eles, ficam pulados (skip), não reprovados. No WSL, sem `node` instalado no Linux, os três de
paridade com o motor ficam pulados.

No GitHub, o workflow `.github/workflows/testes.yml` roda as duas suítes a cada push na `main` e
a cada pull request, em Linux e em Windows, com `node` e `bash` presentes, então nenhum caso fica
pulado. Ele é o CI deste repositório e não se confunde com o `references/github/workflows/ci.yml`,
que é o modelo copiado para cada projeto em A3.
