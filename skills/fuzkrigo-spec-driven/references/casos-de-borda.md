# Casos de borda e regras de fechamento — o catálogo

Lido no passo **Especificar**, antes de preencher a seção
`## Casos de borda e regras de fechamento` da spec. O audit não sabe quais
bordas importam para a feature; ele cobra que a decisão sobre cada uma tenha
sido registrada. Quem escolhe as bordas é quem especifica, percorrendo este
catálogo.

## 1. Para que serve

Caso de borda é uma situação **possível**, no limite do esperado: a base que
chega vazia, a nota com zeros à esquerda, a virada do ano. Não é o que "nunca
pode acontecer": isso é invariante, e mora na constituição, com verificação
própria.

| Tipo | O que é | Exemplo | Onde mora |
|---|---|---|---|
| Caminho feliz | O uso esperado, com dado bem formado | Base do mês com notas válidas | Critério de aceite |
| Caso de borda | Possível, no limite do esperado | Nota com zeros à esquerda; base vazia | Critério de aceite próprio, registrado na seção da spec |
| Entrada inválida | Dado que o programa precisa recusar | Coluna obrigatória ausente | Critério de aceite: o programa recusa com mensagem clara |
| Invariante | O que nunca pode acontecer, em feature nenhuma | Identificador perder zeros; total fechado com linha de ajuste | Princípio da constituição (`P-xxx`) com verificação |

Caso de borda que fica só na prosa da história, ou só no código, não tem teste
exigido nem prova. É onde o defeito costuma morar.

## 2. Como usar no passo Especificar

1. Percorra as **categorias gerais** (seção 3) e o **pacote do domínio** da
   feature (seção 4), se houver.
2. Para cada situação relevante, registre uma linha na tabela
   `### Casos de borda` da spec, com a decisão:
   - `AC-xxx`: o critério de aceite desta spec que cobre a borda (o normal);
   - `ASM-xxx`: a suposição desta spec que a assume, quando a borda depende
     de algo ainda não confirmado;
   - `Não se aplica: <motivo>`: a borda não cabe nesta feature. **O motivo é
     obrigatório**; sem ele, o audit acusa caso de borda sem decisão
     (`BORDA_INCOMPLETA`).
3. Relevante se escolhe por **risco**: a situação é possível neste domínio e
   cara se der errado? Então entra. Não precisa listar o catálogo inteiro; o
   que importa é ter passado por ele.
4. Liste os totais que precisam fechar na tabela `### Regras de fechamento`
   (seção 5), ou escreva "Nenhuma." no lugar da tabela.

O código citado precisa existir **nesta** spec. Critério ou suposição de outra
feature não vale aqui: o audit acusa referência inexistente
(`REF_SPEC_INEXISTENTE`, erro mesmo em rascunho).

```markdown
## Casos de borda e regras de fechamento

### Casos de borda

| Categoria | Situação | Decisão |
|---|---|---|
| Identificador | Número da nota com e sem zeros à esquerda | AC-004 |
| Unidade | Alíquota gravada como 18 ou como 0,18 | AC-005 |
| Volume | Base com 200 mil linhas | Não se aplica: a base mensal tem até 5 mil linhas |
| Tempo | Nota de dezembro lançada em janeiro | ASM-002 |

### Regras de fechamento

| Regra | Tolerância | Prova de que fecha | Prova de que para |
|---|---|---|---|
| Percentual de saídas do ICMS efetivo soma 100% | ±0,01 p.p. | AC-006 | AC-007 |
```

## 3. Categorias gerais

| Categoria | Pergunta-guia | Exemplo |
|---|---|---|
| Vazio e ausente | E se não vier nada, ou vier faltando? | Arquivo sem linhas; campo em branco; lista vazia |
| Limites | O que acontece no zero, no um, no máximo e no um acima do máximo? | Prazo às 23:59:59; anexo exatamente no tamanho máximo |
| Formato e codificação | Acento, espaço sobrando, caixa, separador ou texto fora do ASCII mudam o resultado? | "São Paulo" e "SAO PAULO " precisam casar; CSV em ANSI |
| Unidade e escala | O número vem em qual unidade? Pode vir em outra? | Percentual como 18 ou 0,18; valor em reais ou em centavos |
| Identificador com cara de número | Algum código é lido como número e perde zeros ou dígitos? | CEP 01001000 vira 1001000 |
| Tempo e calendário | Virada de mês e de ano, fuso, horário de verão, dia que não existe? | Lançamento de 31/12 no lote de janeiro; 30 de fevereiro |
| Repetição e ordem | E se o mesmo evento chegar duas vezes, ou fora de ordem? | Arquivo importado de novo; estorno antes da venda |
| Volume | E com cem vezes mais dados que o caso normal? | Base anual no lugar da mensal |
| Falha de dependência | E se o arquivo, a rede ou o serviço falhar no meio? | Planilha aberta por outra pessoa; API fora do ar |
| Permissão | E se quem pede não puder ver ou fazer? | Usuário sem acesso à pasta de destino; sessão expirada |
| Ambiente | Sistema operacional, caminho com acento ou ferramenta ausente mudam algo? | Caminho `C:\Relatórios\`; máquina sem Python |

## 4. Pacotes por domínio

Cada pacote acrescenta as bordas típicas de um tipo de projeto. Projetos de
dados tabulares podem trazer os princípios correspondentes já na constituição:
`fuzkrigo-spec init --preset base,dados-tabulares` (ver seção 6).

### Dados tabulares (planilhas, CSV, bases)

- **Identificador com zeros à esquerda:** número de nota, CEP, CNPJ, código de
  produto. Lido como número, perde os zeros.
- **Chave longa:** o Excel guarda no máximo 15 dígitos significativos de um
  número; do 16º em diante, os dígitos viram zero. Chave de acesso da NF-e
  (44 dígitos) e cartão só sobrevivem como texto. Fontes: Microsoft Support,
  [Excel specifications and limits](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3)
  ("Number precision: 15 digits") e
  [Keeping leading zeros and large numbers](https://support.microsoft.com/topic/1bf7b935-36e1-4985-842f-5dfa51f85fe7).
- **Leitura que adivinha o tipo:** sem tipo declarado, o leitor infere pelo
  conteúdo. No pandas, force texto nas colunas de identificador com o
  parâmetro `dtype` (`dtype={"nota": str}`), que existe no
  [`read_csv`](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html)
  e no [`read_excel`](https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html).
- **Percentual em unidade ambígua:** 18, 0,18 e "18%" na mesma coluna.
- **Separador decimal:** "1.234,56" e "1,234.56"; CSV com vírgula decimal e
  ponto e vírgula como separador de campo.
- **Linhas que não são dado:** linhas em branco, cabeçalho repetido no meio da
  base, linha de total ou subtotal misturada aos registros.
- **Coluna faltando ou renomeada:** a exportação mudou de layout; "Valor"
  virou "Valor Total".
- **A mesma chave em duas linhas:** nota duplicada; item repetido na mesma
  nota.
- **Data como texto ou como número de série do Excel:** "05/01/2026", a data
  americana "01/05/2026" e o número 46027 podem ser a mesma data; e o Excel
  tem dois sistemas de data, 1900 e 1904, com números de série diferentes
  para o mesmo dia. Fonte: Microsoft Support,
  [Date systems in Excel](https://support.microsoft.com/en-us/Excel/date-systems-in-excel).
- **Arredondamento:** em que ponto arredonda e com quantas casas; soma de
  valores arredondados que não bate com o total arredondado.
- **Registro sem par dos dois lados de um vínculo:** nota sem item, item sem
  nota; os dois lados precisam ser reportados.

### Interface web

- **Envio duplo:** duplo clique no botão de enviar cria dois registros.
- **Sessão que expira no meio:** formulário longo enviado depois do tempo.
- **Campo só com espaços:** passa no "obrigatório" e grava vazio.
- **Texto muito longo:** nome de 500 caracteres quebra o layout ou o banco.
- **Fuso do usuário:** a data mostrada não é a data gravada.
- **Voltar no navegador:** reenvia o formulário ou mostra dado velho.

### Integração e API

- **Tempo esgotado:** a chamada não responde; quanto esperar e o que fazer
  depois.
- **Resposta parcial:** página 3 de 10 falhou; o que já foi gravado.
- **Repetição da mesma chamada:** a nova tentativa não pode duplicar o efeito
  (idempotência).
- **Limite de requisições:** a API devolve "muitas requisições" no meio do
  lote.
- **Formato inesperado:** campo novo, campo nulo, tipo trocado.
- **Mudança de versão da API:** o contrato mudou sem aviso.

## 5. Regras de fechamento

Regra de fechamento é um **total que precisa fechar**: percentuais que somam
100%, débito igual a crédito, a soma dos itens igual ao total da nota, duas
bases conciliadas. Ela é diferente de um caso de borda: não é uma situação a
tratar, é uma conferência que o programa faz sobre o próprio resultado.

Cada regra registra quatro coisas na tabela `### Regras de fechamento`:

1. **A regra**, em uma frase.
2. **A tolerância declarada:** a folga aceita (`±0,01 p.p.`, `R$ 0,01`) ou
   "exata". Sem tolerância, o audit acusa regra de fechamento incompleta
   (`FECHAMENTO_INCOMPLETO`).
3. **O critério que prova que fecha:** com dado correto, o total fecha dentro
   da tolerância.
4. **O critério que prova que para:** com o total fora da tolerância, o
   programa para com erro e lista os itens que quebraram o fechamento.

Os dois critérios são obrigatórios e **diferentes entre si**. Só o primeiro
prova o caminho feliz; é o segundo que garante que um fechamento quebrado não
passa em silêncio. Mesmo critério nas duas colunas é `FECHAMENTO_INCOMPLETO`.

**Nunca ajuste o resultado para fechar.** Linha de "ajuste", "arredondamento"
ou "diferença" criada para forçar o total esconde o defeito que o fechamento
existe para revelar. A conferência em execução está no `~/.claude/CODIGO.md`.

Exemplo, apuração do ICMS efetivo:

```markdown
#### AC-006 — Percentuais de saída do ICMS efetivo somam 100%

- **Dado** a base de saídas do mês com todas as notas válidas
- **Quando** a apuração calcula o percentual de cada operação
- **Então** a soma dos percentuais fica entre 99,99% e 100,01%

#### AC-007 — Apuração para quando os percentuais não somam 100%

- **Dado** uma base em que uma nota de saída foi gravada sem alíquota
- **Quando** a apuração confere o fechamento no fim do processamento
- **Então** o processamento para com erro
- **E** a mensagem lista a nota que quebrou o fechamento e a diferença encontrada
```

Feature sem total que precise fechar: troque a tabela por uma linha com
"Nenhuma.".

## 6. Quando a borda sobe para a constituição

- **Borda repetida vira princípio.** Se a mesma borda aparece na spec de uma
  segunda feature, ela não é da feature: é do projeto. Proponha ao usuário um
  princípio na constituição, com `verificação(teste)`. Daí em diante, as specs
  registram a linha com a decisão
  `Não se aplica: coberta pelo princípio P-xxx da constituição`, e quem prova
  a regra é o teste do princípio.
- **Regra de fechamento que vale para o projeto inteiro vira princípio** com
  `verificação(teste)`: o teste do princípio prova o fechamento e a parada.
- **Presets de domínio já trazem os princípios mais comuns.**
  `fuzkrigo-spec init --preset base,dados-tabulares` combina o preset base com
  o de dados tabulares: identificador como texto, unidade declarada, coluna
  obrigatória ausente, fechamento nunca forçado. O que não se aplica ao
  projeto é removido da constituição, com o motivo registrado no ROADMAP.

Regras completas dos presets e da renumeração: [constituicao.md](constituicao.md).
