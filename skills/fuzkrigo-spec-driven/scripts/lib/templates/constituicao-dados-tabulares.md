# Constituição — v1.0.0 (preset: dados tabulares)

<!--
  Para projetos que leem, cruzam ou gravam dados em tabela: planilhas, CSV,
  exportações de sistema, bases de dados. Os princípios vieram de defeitos
  reais: identificador que perde zeros, chave longa que o Excel arredonda,
  percentual em unidade ambígua, total que não fecha.
  Remova o que não se aplica ao projeto e registre o motivo no ROADMAP.
  Princípio [DEVE] com verificação(teste): o scaffold gera o teste que falha;
  quem escreve o teste de verdade é você.
-->

## P-001 [DEVE] Identificador é texto, nunca número

Número de nota, chave de acesso, CNPJ, CPF, CEP, código de produto e matrícula
são lidos, guardados, comparados e gravados como texto. Como número, perdem os
zeros à esquerda e, no Excel, guardam só 15 dígitos significativos. O teste
prova que um identificador com zeros à esquerda e uma chave de 44 dígitos
atravessam leitura, processamento e gravação sem mudar.

- verificação(teste): @principle:P-001

## P-002 [DEVE] Unidade declarada e convertida num ponto só

Percentual, moeda e quantidade têm unidade declarada (por exemplo, percentual
sempre como fração: 0,18). A conversão acontece num ponto só, na leitura, e o
resto do código nunca adivinha. O teste prova que as formas aceitas chegam ao
cálculo com o mesmo valor, e que uma entrada ambígua é recusada com mensagem
clara.

- verificação(teste): @principle:P-002

## P-003 [DEVE] Coluna obrigatória ausente para a leitura com mensagem clara

As colunas obrigatórias de cada entrada são declaradas num lugar só. Faltou
uma, a leitura para antes de processar e diz qual coluna falta e em qual
arquivo.

- verificação(teste): @principle:P-003

## P-004 [DEVE] Fechamento nunca é forçado

Total que precisa fechar (percentuais que somam 100%, conciliação entre duas
bases) é conferido no fim do processamento, com tolerância declarada. Diferença
acima da tolerância para o processamento com erro e lista os itens que
quebraram o fechamento. É proibido criar linha de ajuste para forçar o total.

- verificação(teste): @principle:P-004

## P-005 [RECOMENDADO] Registro sem par num vínculo é reportado

Ao cruzar duas bases, os registros sem par dos dois lados aparecem numa lista
ou relatório. Nunca somem em silêncio.

## P-006 [RECOMENDADO] Formato normalizado na leitura

Separador decimal, espaços sobrando, máscara de documento e caixa de texto são
normalizados na leitura, antes de qualquer comparação.
