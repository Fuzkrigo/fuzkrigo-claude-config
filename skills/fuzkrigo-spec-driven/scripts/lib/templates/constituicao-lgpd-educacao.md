# Constituição — v1.0.0 (preset: LGPD + Educação)

<!--
  Princípios para produtos educacionais que guardam dados pessoais de
  alunos — inclusive menores de idade (LGPD art. 14: melhor interesse
  da criança; consentimento de ao menos um dos pais/responsável).

  Níveis: [DEVE] obrigatório · [RECOMENDADO] forte · [PODE] permitido/explícito.
  Todo [DEVE] precisa de verificação executável. Formatos aceitos:
    - verificação(teste): @principle:P-xxx
    - verificação(proibido): `regex` em `glob`
    - verificação(obrigatório): `regex` em `glob`

  Ajuste os globs/regex à sua stack — estes são pontos de partida REAIS,
  não decoração: o audit roda cada um deles.
-->

## P-001 [DEVE] Nota de um aluno nunca é exposta a outro aluno

Todo endpoint/consulta que retorna nota, correção ou feedback filtra pelo
aluno autenticado. Listagens agregadas (média da turma) não identificam
indivíduos.

- verificação(teste): @principle:P-001

## P-002 [DEVE] Acesso a nota é registrado (trilha de auditoria)

Toda leitura de nota/correção registra quem acessou, o quê e quando.
LGPD art. 37: registro das operações de tratamento.

- verificação(teste): @principle:P-002

## P-003 [DEVE] Dados de menores só com base legal explícita

Cadastro de aluno menor de idade exige consentimento de responsável
registrado (quem, quando, como). Nenhum dado de menor é usado para
marketing.

- verificação(teste): @principle:P-003

## P-004 [DEVE] Dados pessoais nunca aparecem em logs

CPF, e-mail, telefone e nota nunca vão para console, print ou log em texto puro.
A verificação cobre JavaScript (`console.*`) e Python (`print`, `logging.*`,
`logger.*`, `log.*`); só os métodos de registro contam, então criar o logger
(`logging.getLogger("notas")`) não é violação.

- verificação(proibido): `(console\.(log|info|warn|error|debug)|\bprint|\b(logging|logger|log)\.(debug|info|warning|warn|error|exception|critical|log))\(.*(cpf|nota|email|telefone)` em `src/**`

## P-005 [RECOMENDADO] Minimização: só coletar o que a pedagogia exige

Cada campo pessoal coletado tem justificativa pedagógica escrita na spec
da feature que o coleta (LGPD art. 6º, III — necessidade).

## P-006 [RECOMENDADO] Erro pedagógico não é dado punitivo

Histórico de erros/tentativas do aluno serve para ensinar, não para
ranquear publicamente. Rankings públicos só com opt-in.

## P-007 [PODE] Exclusão a pedido do titular

O titular (ou responsável) pode pedir exclusão dos dados; o sistema PODE
manter o mínimo legal (registros fiscais) com prazo documentado.

## P-008 [PODE] Portabilidade dos dados do aluno

O aluno PODE exportar seu histórico (tarefas, notas, feedback) em formato
legível por máquina.
