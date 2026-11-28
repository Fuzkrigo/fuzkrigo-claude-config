# Catálogo de problemas que o audit aponta

O audit imprime cada problema com o nome legível na frente e o código estável
entre parênteses (o código serve para CI e para `licoes add --sinal`). Ao
conversar com o usuário, use o nome legível.

| Problema (código) | O que significa | O que fazer |
|---|---|---|
| critério de aceite sem teste (AC_SEM_TESTE) | requisito sem prova | escreva o teste com `@spec:AC-xxx` no título |
| critério de aceite sem prova (AC_SEM_PROVA) | teste existe, nunca passou (ou foi PULADO) | rode `verify`; skip não é prova |
| teste órfão (TESTE_ORFAO) | teste aponta pra critério que sumiu (drift!) | a especificação mudou — atualize o teste |
| referência quebrada (REF_QUEBRADA) | tarefa cita história/critério inexistente | corrija a referência |
| tarefa concluída sem prova (TASK_CONCLUIDA_SEM_PROVA) | tarefa [concluida] sem critério provado | verifique ou reabra a tarefa |
| status de tarefa inválido (TASK_STATUS_INVALIDO) | status não reconhecido | use pendente/em-andamento/concluida |
| suposição em aberto (ASM_ABERTA) | suposição aberta numa feature "pronta" | confirme/invalide com o usuário |
| seção obrigatória ausente (SECAO_AUSENTE) | spec sem seção Suposições, Perguntas ou Casos de borda e regras de fechamento | registre-as ou escreva "Nenhuma." (nas bordas, uma linha por borda) |
| caso de borda sem decisão (BORDA_INCOMPLETA) | borda sem categoria, situação ou decisão válida, "Não se aplica" sem motivo, ou subseção de bordas vazia | decida: `AC-xxx`, `ASM-xxx`, `P-xxx` ou `Não se aplica: motivo` |
| regra de fechamento incompleta (FECHAMENTO_INCOMPLETO) | total a fechar sem tolerância, sem os dois critérios ou com o mesmo critério nas duas provas; subseção sem regra e sem "Nenhuma." | declare a tolerância e escreva o critério que fecha e o que para |
| referência a código que não existe (REF_SPEC_INEXISTENTE) | a seção de bordas cita critério ou suposição que não existe nesta spec (inclusive o de outra feature), ou princípio que não existe na constituição; erro mesmo em rascunho | corrija o código, ou crie o critério nesta spec |
| princípio violado (PRINCIPIO_VIOLADO) | quebrou a constituição | conserte o código, não o princípio |
| princípio sem prova (PRINCIPIO_SEM_PROVA) | o teste do princípio falhou, foi PULADO ou nunca rodou num verify | rode `verify`; conserte o código até o teste passar |
| verificação não olha nenhum arquivo (GLOB_SEM_ARQUIVOS) | glob da constituição não casa nada | corrija o glob |
| nível de princípio inválido (NIVEL_INVALIDO) | nível desconhecido | use [DEVE]/[RECOMENDADO]/[PODE] |
| código órfão (ARQUIVO_ORFAO) | código que nenhuma tarefa mapeia | mapeie na tarefa ou questione o código |
| nome da feature divergente (FEATURE_DIVERGENTE) | `> feature:` difere do diretório | alinhe os dois |
| prova fraca (PROVA_FRACA) | prova só por exit code global | prefira reporter tap/vitest-json/jest-json |
| código de rastreio curto/duplicado (ID_CURTO / ID_DUPLICADO) | fora da gramática / repetido | use 3+ dígitos, códigos únicos |

Também: história sem critério (`US_SEM_AC`), critério incompleto
(`AC_INCOMPLETO`), critério sem tarefa (`AC_SEM_TASK`), pergunta em aberto
(`Q_ABERTA`), princípio sem verificação (`PRINCIPIO_SEM_VERIFICACAO`), prova
desatualizada (`VERIFY_OBSOLETO`), verificação malformada
(`VERIFICACAO_MALFORMADA`, inclui regex que excede o tempo limite), arquivo
não existe (`ARQUIVO_INEXISTENTE`), status inválido (`STATUS_INVALIDO`),
especificação sem história (`SPEC_SEM_US`), critério fora de história
(`AC_FORA_DE_US`).
