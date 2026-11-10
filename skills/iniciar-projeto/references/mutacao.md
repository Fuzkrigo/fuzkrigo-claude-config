# Teste de mutação — o bloco `mutation` e o que o CI cobra

Lido sob demanda: em A3, ao preencher o `fuzkrigo.config.json` e a configuração da ferramenta, e no Portão 3, quando a feature cria uma pasta nova de lógica de negócio.

## O que mede, e por que não é cobertura

A cobertura de 95%/98% com ramos prova que cada linha rodou, não que algum teste confere o que ela calcula. O teste de mutação altera o código de propósito (troca `<=` por `<`, `0.01` por `1.01`, apaga uma chamada) e roda a suíte contra cada alteração, o mutante. Se algum teste falha, o mutante morreu. Se todos passam, ele sobreviveu, e o sobrevivente aponta um defeito que a suíte não pegaria.

O piso do ecossistema é 80% de mutantes detectados nas pastas de lógica de negócio, medido no CI de todo pull request (`CLAUDE.md`, seção 6).

## O bloco

```json
"mutation": { "break": 80 }
```

| Campo | Significado |
| --- | --- |
| `break` | Nota mínima de mutação, em porcentagem: número de 0 a 100. Nota abaixo dele reprova o PR; nota igual passa. |

O bloco não tem lista de pastas: o teste de mutação usa as mesmas do `coverage.businessLogicPaths` (`references/cobertura.md`). O `fuzkrigo-spec init` já grava o bloco com 80. Num projeto que já tinha `fuzkrigo.config.json`, o `init` não toca no arquivo, e o bloco precisa ser acrescentado à mão.

## A nota

Nota = detectados / (detectados + não detectados) × 100, a definição do StrykerJS ([fonte](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/)). O CI calcula a do mutmut com a mesma conta.

| Conta como | mutmut | StrykerJS |
| --- | --- | --- |
| Detectado | `killed`; `timeout`; `segfault` (o processo de teste morreu por SIGSEGV, ou por SIGKILL depois de estourar o limite de CPU) | Killed, Timeout |
| Não detectado | `survived`; `no tests` (nenhum teste chama a função mutada); `suspicious` (a suíte saiu com um código que o mutmut não reconhece: nem falha nem sucesso) | Survived, NoCoverage |
| Fora da nota | `skipped`, `caught by type check`, `not checked` | Ignored (desligado por comentário), CompileError, RuntimeError |

O significado dos estados do mutmut vem do código da versão 3.8.1 (`mutmut/stats.py` e `mutmut/workers/isolation.py`): a documentação não os define. A linha com `# pragma: no mutate` não gera mutante nenhum, então não aparece em estado algum.

## O que o CI faz em cada stack

Os dois passos de mutação do `.github/workflows/ci.yml` rodam **só no pull request**, depois dos de cobertura, e leem o bloco por `.github/scripts/mutation-config.sh`, que reaproveita a leitura do `businessLogicPaths` do `coverage-config.sh`. No push da `main` não rodam: a nota não é reconferida depois do merge.

| Situação | Python (mutmut) | Node (StrykerJS) |
| --- | --- | --- |
| Sem `fuzkrigo.config.json` | Sai 0, "mutacao nao medida" | Sai 0, "mutacao nao medida" |
| Bloco ausente ou `break` fora de 0 a 100 | Sai 1, citando `mutation.break` | Sai 1, citando `mutation.break` |
| Ferramenta | O CI instala o mutmut, sem versão fixa | Sem script `mutation` no `package.json`: sai 1 |
| Configuração da ferramenta | Sem `[tool.mutmut]`, sem `source_paths` ou `only_mutate` diferente do `businessLogicPaths`: sai 1, com as duas listas | Sem `stryker.config.json`, pastas de `mutate` diferentes do `businessLogicPaths`, exclusão que não é de arquivo de teste ou `thresholds.break` diferente do `mutation.break`: sai 1 |
| Medição | `mutmut run` e `mutmut export-cicd-stats`; o script calcula a nota e sai 1 abaixo do limite | `npm run mutation`; o próprio Stryker sai 1 abaixo de `thresholds.break` |
| Sobreviventes no log | `mutmut results`: todo mutante não morto, com o estado | Reporter `clear-text`: cada sobrevivente com o mutador e o diff |

Os sobreviventes saem no log mesmo com a nota acima do limite, porque todo sobrevivente nos arquivos alterados pelo PR é triado no Portão 3.

A ferramenta só aceita as pastas na própria configuração: o mutmut não aceita caminho pela linha de comando. A A3 espelha as pastas e o limite lá, e o CI confere o espelho.

### Python (mutmut)

O passo roda `.github/scripts/mutation-python.sh`. A configuração fica no `pyproject.toml`:

```toml
[tool.mutmut]
source_paths = ["src"]
only_mutate = ["src/dominio/**"]
pytest_add_cli_args_test_selection = ["tests/"]
```

- `source_paths`: as pastas do código. O mutmut as copia para `mutants/` e muta lá.
- `only_mutate`: igual, como conjunto, ao `coverage.businessLogicPaths`. O padrão termina em `*` ou `.py` e é casado com `fnmatch`, em que o `*` atravessa `/`: `src/dominio/**` muta a pasta inteira.
- `pytest_add_cli_args_test_selection`: os argumentos do pytest que escolhem os testes, como a pasta deles.
- Com a seção `[tool.mutmut]` no `pyproject.toml`, o `setup.cfg` é ignorado. O CI exige o `pyproject.toml`.
- O mutmut **não** entra nas dependências do projeto: ele exige `fork` e, no Windows, só roda dentro do WSL ([fonte](https://mutmut.readthedocs.io/en/latest/index.html)). O CI o instala na hora, na versão mais recente.
- `mutmut run` sai 0 mesmo com sobreviventes; quem reprova é o script, pela nota. Suíte que já falha sem mutante nenhum, ou `only_mutate` que não casa arquivo, faz o `mutmut run` sair 1.

Testado com mutmut 3.8.1, Python 3.15 e pytest 9.2, com `pythonpath = ["src"]` em `[tool.pytest.ini_options]` e os testes importando `from dominio.fechamento import ...`.

### Node (StrykerJS)

O passo roda `npm run mutation`. A configuração fica no `stryker.config.json`, um dos nomes que o Stryker procura sozinho ([fonte](https://stryker-mutator.io/docs/stryker-js/config-file/)). É JSON, e não `.mjs`, para o CI conseguir lê-lo:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "mutate": ["src/dominio/**", "!**/*.test.*"],
  "thresholds": { "high": 80, "low": 80, "break": 80 },
  "reporters": ["clear-text", "progress", "html"]
}
```

- `mutate`: os padrões sem `!` são iguais, como conjunto, ao `coverage.businessLogicPaths`. Testado na versão 10.1.1: o Stryker aceita `src/dominio/**`, mas muta também o arquivo de teste que mora dentro da pasta, o que gera mutantes no próprio teste e derruba a nota. Por isso o `mutate` pode ter as exclusões de arquivo de teste, e só elas: `!**/*.test.*`, `!**/*.spec.*` e `!**/__tests__/**`. Use as que o projeto precisa; a que não exclui nada gera um aviso no log. Qualquer outra exclusão reprova o CI, porque tiraria código de negócio da mutação sem justificativa: mutante se desliga por comentário, na linha, conforme `~/.claude/CODIGO.md`, seção 8.
- `thresholds`: o Stryker exige os três valores; os três iguais ao `mutation.break`. Nota abaixo de `break` faz o Stryker sair com código 1 ([fonte](https://stryker-mutator.io/docs/stryker-js/configuration/)).
- `reporters`: o `clear-text` imprime os sobreviventes no log do CI; o `html` grava `reports/mutation/mutation.html`, para ver localmente.
- `package.json`: script `"mutation": "stryker run"`, com `@stryker-mutator/core` e `@stryker-mutator/vitest-runner` nas `devDependencies`.

Testado com StrykerJS 10.1.1, vitest 5.1.0 e Node 26.

## O que entra no `.gitignore`

```gitignore
mutants/
.stryker-tmp/
reports/mutation/
```

- `mutants/`: a cópia mutada do código e os resultados do mutmut.
- `.stryker-tmp/`: a pasta de trabalho do Stryker (`tempDirName`, padrão `.stryker-tmp`). Nas execuções testadas ele a apagou ao fim; a documentação pede que ela fique fora do repositório.
- `reports/mutation/`: o relatório html do Stryker.

## Ao mudar um número ou uma pasta, mude nos dois lugares

No `fuzkrigo.config.json` (`mutation.break` e `coverage.businessLogicPaths`) e na configuração da ferramenta (`only_mutate` no `[tool.mutmut]`; `mutate` e `thresholds` no `stryker.config.json`). O CI confere o espelho e reprova quando os dois divergem.

## Rodar localmente

- **mutmut:** só em Linux ou no WSL. Num ambiente virtual dentro do WSL, com `node` instalado nele, `bash .github/scripts/mutation-python.sh` roda o mesmo que o CI (e instala o mutmut no ambiente ativo). Depois, `mutmut results` lista os não mortos, `mutmut show <mutante>` mostra o diff de um deles e `mutmut browse` abre a navegação interativa.
- **StrykerJS:** roda também no Windows: `npm run mutation`.

## Outra stack

Sob demanda, quando um projeto usar. Até lá, o projeto em outra stack não tem passo de mutação: o CI não mede nem reprova.

## Exclusões

Mutante desligado sai da nota, então toda exclusão precisa de um comentário na linha imediatamente acima dela, começando com `mutation-justification:`, com o motivo em PT-BR e EN. Python usa `# pragma: no mutate` no fim da linha; o StrykerJS usa `// Stryker disable next-line <Mutador>: motivo` ([fonte](https://stryker-mutator.io/docs/stryker-js/disable-mutants/)). Formato, exemplos e critério de coerência: `~/.claude/CODIGO.md`, seção 8. Quem cobra a justificativa é o agente `code-reviewer`.
