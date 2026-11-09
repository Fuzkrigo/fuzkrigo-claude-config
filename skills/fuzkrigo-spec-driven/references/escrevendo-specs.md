# Escrevendo especificações auditáveis

## Um critério de aceite precisa ser observável

O motor de auditoria não entende prosa — ele entende testes. Então cada
critério de aceite precisa descrever algo que um teste consegue checar.

| Ruim (não testável) | Bom (observável) |
|---|---|
| O sistema deve ser rápido | **Então** a resposta chega em menos de 300ms |
| A senha deve ser segura | **Então** senhas com menos de 8 caracteres são rejeitadas |
| O aluno vê suas notas | **Então** a resposta contém só as notas do aluno autenticado |

## E precisa ser amigável — o dono do produto vai ler

O critério de aceite é o contrato com quem NÃO programa. Escreva o título e o
Então como **resultado que o usuário consegue ver e conferir**, não como
detalhe interno:

| Técnico demais | Amigável (e igualmente testável) |
|---|---|
| **Então** o endpoint retorna 403 | **Então** a tela avisa "você não tem acesso" (e a resposta é 403) |
| **Então** o job grava no Redis | **Então** o aviso de atraso aparece em até 1 minuto |
| AC-004 — flag `is_late` true | AC-004 — Entrega atrasada é sinalizada ao professor |

Regra prática: leia o critério em voz alta para alguém de fora — se a pessoa
não entende o que vai acontecer, reescreva. O detalhe técnico pode ficar entre
parênteses; a frase principal é para gente.

## Dado / Quando / Então — os três são obrigatórios

O audit acusa "critério de aceite incompleto" (`AC_INCOMPLETO`) se faltar
qualquer cláusula. O parser tolera indentação, marcador `-` ou `*` e
maiúsculas/minúsculas no keyword (e arquivos salvos em NFD no macOS) — mas o
formato canônico é `- **Dado** ...`. Use `E` para continuar a última:

```markdown
#### AC-003 — Aviso de atraso

- **Dado** um aluno com tarefa vencida
- **Quando** ele abre a tarefa
- **Então** vê um aviso de atraso
- **E** o botão de envio fica desabilitado
```

## Casos de borda viram critérios de aceite

O audit só cobra o que é critério de aceite: cada critério precisa de um teste
anotado e de uma prova gravada pelo `verify`. Caso de borda que fica na prosa
da história, ou só no código, não tem teste exigido nem prova — e é justamente
onde o defeito costuma morar. Por isso cada caso de borda relevante vira um
critério de aceite próprio.

Lista de verificação, para cada história:

- **Entrada vazia**: campo em branco, lista sem itens, arquivo sem conteúdo.
- **Valor no limite**: o último minuto do prazo, o tamanho máximo, o zero.
- **Erro de dependência**: banco fora do ar, API que não responde, arquivo
  que não abre.
- **Permissão negada**: usuário sem acesso ao recurso, sessão expirada.
- **Dado duplicado**: o mesmo envio duas vezes, cadastro que já existe.

Nem todo item se aplica a toda história: o que importa é ter passado por eles.
O que se aplica ganha critério; o que não se aplica e não é óbvio pode virar
suposição.

```markdown
#### AC-005 — Entrega no último segundo do prazo conta como no prazo

- **Dado** uma tarefa com prazo até as 23:59:59 de hoje
- **Quando** o aluno envia o arquivo às 23:59:59
- **Então** a entrega é registrada com status "no prazo"
```

## Suposições vs. perguntas em aberto

- **Suposição (ASM-xxx)**: você preencheu uma lacuna com um palpite razoável e
  **seguiu em frente**. Ex.: "assumo que o prazo é sempre no fim do dia".
  Status: `aberta` → `confirmada` (o dono do produto validou) ou `invalidada`.
- **Pergunta em aberto (Q-xxx)**: você **parou** porque falta informação.
  Ex.: "qual fuso?". Status: `aberta` → `respondida`.

Regra dura: uma feature não vira `implementada`/`auditada` com suposição
`aberta`. Isso força a conversa "olha, assumi X — é isso mesmo?" antes de
considerar pronto. Se o usuário estiver na conversa, pergunte na hora
(AskUserQuestion) em vez de deixar a suposição envelhecer.

Regra mais dura ainda: a AUSÊNCIA das seções `## Suposições` e
`## Perguntas em aberto` também é problema (`SECAO_AUSENTE` — erro com a spec
madura). Não tem nenhuma? Escreva "Nenhuma." explicitamente — e desconfie:
quase toda feature esconde uma suposição.

## Códigos de rastreio são globais e únicos

`US-xxx` (história de usuário), `AC-xxx` (critério de aceite), `ASM-xxx`
(suposição), `Q-xxx` (pergunta), `T-xxx` (tarefa) e `P-xxx` (princípio) são
únicos no projeto inteiro. `fuzkrigo-spec new` continua a numeração
automaticamente. Se você duplicar uma história, um critério, uma suposição, uma
pergunta, uma tarefa (`T-xxx`, também entre os `tasks.md` de features
diferentes) ou um princípio (`P-xxx`, na constituição), o audit acusa código
duplicado (`ID_DUPLICADO`).

## O ciclo de vida do status da especificação

```
rascunho → pronta → em-implementacao → implementada → auditada
```

- `rascunho`: escrevendo.
- `pronta`: especificação revisada, suposições e perguntas tratadas, pronta
  para implementar.
- `em-implementacao`: código em andamento. Perguntas abertas viram aviso.
- `implementada`: código pronto. Suposições abertas viram **erro**.
- `auditada`: `audit --ci --feature <feature>` saiu 0 com prova de todos os
  critérios de aceite. (O audit do projeto inteiro, sem filtro, é o que vale
  antes de um release — uma feature auditada não garante um projeto íntegro.)

## Cabeçalho, Histórico e Resolução

A spec documenta a própria feature: de onde ela veio, o que mudou depois de
combinada e como foi resolvida. O parser e o audit ignoram essas partes —
elas documentam, não reprovam.

| Parte | O que registra | Quando é preenchida | Por quem |
|---|---|---|---|
| Cabeçalho `> etapa:` e `> issue:` | A etapa do CHECKLIST (`E1`, `E11a`) e a issue (`#12`) de onde a feature veio; `—` quando não há | Na criação: `fuzkrigo-spec new <nome> --issue <n>` grava os dois a partir do prefixo do nome (`e<n>-`, `i<n>-`) e da flag. Etapa criada sem `--issue` fica com `[#<n> da issue]`, que recebe o número antes de a spec ficar `pronta` | O motor grava; o Claude confere e completa |
| `## Histórico` | Uma linha por mudança relevante depois que a spec ficou `pronta` — critério alterado, suposição invalidada, escopo mudado —, com data, mudança e motivo. A primeira linha (data, "Spec criada" e a origem: "Etapa E1", "Issue #42" ou "—") vem do `new` | No momento da mudança, não depois | O Claude, ao mudar a spec |
| `## Resolução` | O PR; a abordagem adotada, em duas ou três frases; as decisões tomadas durante a implementação; o resultado do `audit --ci --feature`; os pontos de atenção que os revisores deixaram registrados | No Portão 3, antes do PR | O Claude, com a saída do audit e os relatórios dos revisores |

O git guarda o que mudou no arquivo, mas não o porquê de negócio nem a ligação
com a etapa e a issue. Quem abrir a pasta da feature meses depois encontra as
três coisas ali, sem precisar escavar o histórico de commits.

## Tarefas: formato dos campos

- `Refs:` — códigos separados por vírgula/espaço. Códigos são GLOBAIS: uma
  tarefa pode referenciar critério de aceite de outra feature.
- `Arquivos:` — caminhos separados por VÍRGULA (espaços dentro do caminho são
  válidos): `Arquivos: src/meu modulo.js, src/outro.js`. Capriche aqui: é este
  campo que decide o que o plano de execução roda EM PARALELO (arquivos
  disjuntos) e o que roda em sequência (arquivo compartilhado).
- `Modelo:` e `Esforço:` (opcionais) — usados por `fuzkrigo-spec plano` para o
  executor da tarefa: `- Modelo: opus` · `- Esforço: alto`
  (baixo|medio|alto|xalto|max). Sem eles, valem os defaults da config
  (`paralelo.model`, `paralelo.esforco`).
- Status: `[pendente]` / `[em-andamento]` / `[concluida]` — acentos e
  maiúsculas tolerados (`[Concluída]` conta); token fora da lista é "status de
  tarefa inválido" (`TASK_STATUS_INVALIDO`, erro), nunca ignorado em silêncio.
  Para atualizar sem editar na mão: `fuzkrigo-spec tarefa <feature> <T-xxx> <status>`.
