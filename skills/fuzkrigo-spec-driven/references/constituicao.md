# Constituição — princípios que a máquina verifica

A constituição (`.spec/constituicao.md`) codifica restrições **inegociáveis** do
projeto. Não é estilo; é lei. E, diferente de outras ferramentas, aqui todo
princípio [DEVE] tem uma **verificação executável** — senão o audit acusa
"princípio sem verificação" (`PRINCIPIO_SEM_VERIFICACAO`).

## Níveis de obrigação

- `[DEVE]` — obrigatório. Precisa de verificação. Violação = erro no audit.
- `[RECOMENDADO]` — forte. Verificação opcional. Violação = aviso.
- `[PODE]` — permitido/explícito. Documenta uma escolha consciente.

## Quatro formas de verificação

```markdown
## P-001 [DEVE] Todo requisito tem prova executável
- verificação(gate): intrínseca ao audit
```
→ satisfeita pelo próprio mecanismo do audit (critério sem teste, critério sem
prova, tarefa concluída sem prova). Só para princípios "meta" sobre o processo
— regras de domínio usam as formas abaixo.

```markdown
## P-001 [DEVE] Nota de aluno nunca exposta a outro aluno
- verificação(teste): @principle:P-001
```
→ exige o teste **e** a prova: pelo menos um teste com `@principle:P-001` no
título, e a prova de que ele passou no último verify. Você escreve o teste que
prova o princípio. Sem a tag, o audit acusa "princípio violado"
(`PRINCIPIO_VIOLADO`). Com a tag e sem a prova, acusa "princípio sem prova"
(`PRINCIPIO_SEM_PROVA`): erro se o teste falhou ou foi pulado (aviso fora do
[DEVE]), e aviso se nenhum verify gravou o resultado — que vira erro no
`audit --ci`. Com `--feature`, vale a prova dessa feature; sem filtro, a mais
recente do projeto.

```markdown
## P-004 [DEVE] Dados pessoais nunca em log
- verificação(proibido): `console\.log\(.*cpf` em `src/**/*.js`
```
→ o audit faz grep do padrão nos arquivos do glob. Qualquer ocorrência = violação,
com arquivo e linha exatos (rastreabilidade princípio → arquivo → linha).

```markdown
## P-010 [DEVE] Toda rota de nota passa por checarDono()
- verificação(obrigatório): `checarDono\(` em `src/rotas/notas/**/*.js`
```
→ se existem arquivos no glob mas nenhum contém o padrão, é violação.

## Preset LGPD + educação

`fuzkrigo-spec init --preset lgpd-educacao --agents claude` já vem com princípios reais para produtos
que guardam dados de alunos (inclusive menores):

- **P-001** nota nunca exposta a outro aluno (teste)
- **P-002** acesso a nota é registrado — trilha de auditoria (teste)
- **P-003** dados de menores só com base legal explícita (teste)
- **P-004** dados pessoais nunca em log (proibido, grep; cobre `console.*` do JavaScript e
  `print`/`logging`/`logger` do Python)
- **P-005** minimização de coleta (recomendado)
- **P-006** erro pedagógico não é dado punitivo (recomendado)
- **P-007** exclusão a pedido do titular (pode)
- **P-008** portabilidade dos dados do aluno (pode)

Ajuste os globs/regex à sua stack — eles rodam de verdade no audit, então
precisam apontar pros seus arquivos. Guard-rails do motor:

- glob que não casa NENHUM arquivo → "verificação não olha nenhum arquivo"
  (`GLOB_SEM_ARQUIVOS` — verificação inerte, provável typo);
- nível fora de [DEVE]/[RECOMENDADO]/[PODE] → "nível de princípio inválido"
  (`NIVEL_INVALIDO` — o princípio é tratado como DEVE, nunca ignorado);
- regex rodam em subprocesso com tempo limite (5s) — padrão patológico
  (catastrophic backtracking) vira "verificação malformada"
  (`VERIFICACAO_MALFORMADA`), não trava o gate;
- o esqueleto dos testes de princípio (`verificação(teste)`) nasce no
  `scaffold`, junto com os testes dos critérios de aceite.

## Preset dados tabulares

`fuzkrigo-spec init --preset dados-tabulares` traz princípios para projetos que
leem, cruzam ou gravam dados em tabela (planilhas, CSV, exportações de
sistema, bases), tirados de defeitos reais:

- **P-001** identificador é texto, nunca número (teste)
- **P-002** unidade declarada e convertida num ponto só (teste)
- **P-003** coluna obrigatória ausente para a leitura com mensagem clara (teste)
- **P-004** fechamento nunca é forçado (teste)
- **P-005** registro sem par num vínculo é reportado (recomendado)
- **P-006** formato normalizado na leitura (recomendado)

## Presets combináveis

`--preset` aceita uma lista separada por vírgula, na ordem em que os presets
entram no arquivo:

```bash
fuzkrigo-spec init --preset base,dados-tabulares
fuzkrigo-spec init --preset base,lgpd-educacao
```

- **Um preset só:** o arquivo sai exatamente como o modelo do preset.
- **Mais de um:** sai uma constituição única, com:
  - um cabeçalho que nomeia os presets e a versão de cada um
    (`# Constituição (presets: base v1.1.0, dados-tabulares v1.0.0)`);
  - o comentário explicativo do primeiro preset;
  - cada preset seguinte precedido do marcador `<!-- preset: <nome> -->`, com
    os comentários dele preservados;
  - os códigos `P-xxx` **renumerados em sequência**, inclusive dentro das
    etiquetas `@principle:`. Em `base,dados-tabulares`, o `P-001` do preset
    de dados vira `P-003`, e a verificação dele passa a pedir
    `@principle:P-003`. Sem a renumeração, dois `P-001` no mesmo arquivo
    dariam código duplicado (`ID_DUPLICADO`).
- Preset desconhecido ou repetido na lista: o `init` sai com código 2, não
  cria nada e lista os presets disponíveis.
- Constituição que já existe é mantida, com ou sem lista de presets.

O que não se aplica ao projeto é removido da constituição gerada, com o motivo
registrado no ROADMAP. Os princípios restantes não precisam ser renumerados:
a sequência com buracos é válida; código repetido é que não é.

## Quando uma borda sobe para a constituição

O catálogo de casos de borda ([casos-de-borda.md](casos-de-borda.md)) é por
feature. Duas situações o levam para o projeto:

- **Borda repetida vira princípio.** Se a mesma borda aparece na spec de uma
  segunda feature, ela é do projeto, não da feature. Proponha ao usuário um
  princípio com `verificação(teste)`; daí em diante, as specs registram a
  linha da borda com o código do princípio na decisão (`P-xxx`). O audit
  confere que o princípio existe nesta constituição (senão, referência a
  código que não existe, `REF_SPEC_INEXISTENTE`), e quem prova a regra é o
  teste do princípio.
- **Regra de fechamento global vira princípio.** Total que precisa fechar em
  todo o projeto (débito igual a crédito, conciliação entre duas bases) vira
  princípio [DEVE] com `verificação(teste)`. O teste do princípio prova as
  duas coisas que a spec exigiria: que fecha dentro da tolerância declarada e
  que o processamento para, listando os itens, quando não fecha.

## Rastreabilidade que dá diferencial de segurança

Um estudo de caso em microsserviços bancários relatou 73% menos defeitos de
segurança com uma constituição de princípios de segurança embutida na
especificação, em comparação com geração de código por IA sem essas restrições;
no mesmo trabalho, cada princípio é rastreado até o artefato de código que o
cumpre. Fonte: Srinivas Rao Marri, *Constitutional Spec-Driven Development:
Enforcing Security by Construction in AI-Assisted Code Generation*, arXiv
2602.02584, v1, 31/01/2026 — <https://arxiv.org/abs/2602.02584>. É um preprint de
um único autor, com um único estudo de caso e sem revisão por pares: vale como
indício, não como prova.

O rastreio até o código é o que `verificação(proibido)` e
`verificação(obrigatório)` fazem: cada violação sai com `arquivo:linha`, não com
"reveja o código".
