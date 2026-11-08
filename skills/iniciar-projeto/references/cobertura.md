# Cobertura — o bloco `coverage` e o que o CI cobra

Lido sob demanda: em A3, ao preencher o `fuzkrigo.config.json`, e no Portão 3, quando a feature cria uma pasta nova de lógica de negócio.

O piso do ecossistema é 95% de cobertura geral e 98% na lógica de negócio, medidas com ramos (`CLAUDE.md`, seção 6). O projeto declara os números e as pastas uma vez, no `fuzkrigo.config.json`. O CI os aplica e reprova o build abaixo deles, e também quando não consegue medir.

## O bloco

```json
"coverage": {
  "global": 95,
  "businessLogic": 98,
  "businessLogicPaths": ["src/dominio/**"]
}
```

| Campo | Significado |
| --- | --- |
| `global` | Cobertura mínima do projeto inteiro, em porcentagem: número de 0 a 100. |
| `businessLogic` | Cobertura mínima dos arquivos que casam com `businessLogicPaths`, no mesmo formato. |
| `businessLogicPaths` | Padrões de caminho das pastas de lógica de negócio, relativos à raiz do projeto. Lista vazia reprova o CI. |

O `fuzkrigo-spec init` já grava o bloco com 95, 98 e a lista vazia, de propósito: o CI reprova até a A3 declarar as pastas. Num projeto que já tinha `fuzkrigo.config.json`, o `init` não toca no arquivo, e o bloco precisa ser acrescentado à mão.

Formato dos padrões, aceito pelo coverage.py e pelo vitest:

- `/` separa pastas; `*` casa qualquer trecho de um nome, sem atravessar `/`; `**` casa qualquer número de pastas e só aparece como componente inteiro do caminho (`src/dominio/**`, nunca `src/dominio**`).
- Pasta inteira se escreve com `/**` no fim. `src/dominio`, sozinho, casa apenas um arquivo com esse nome, e o CI falha por não achar dados.
- Sem vírgula dentro do padrão: o CI une a lista com vírgulas, que é o formato do `--include` do coverage.py ([fonte](https://coverage.readthedocs.io/en/latest/commands/cmd_report.html)).

## Como escolher as pastas de lógica de negócio

A fonte é o `docs/ARCHITECTURE.md`, gerado em A2.

- **Entram:** as pastas onde moram as regras do domínio, ou seja, o código que decide, calcula, valida ou muda estado segundo uma regra que o usuário reconheceria (cálculo de nota, regra de desconto, transição de status). No diagrama de estrutura, costuma ser a camada de domínio, de serviços ou de casos de uso.
- **Ficam de fora:** entrada e saída (rotas, controllers, handlers, CLI), acesso a dados, integração externa, configuração e interface. Esse código continua no limite global.
- **Fronteira confusa:** se o diagrama não separa a regra de negócio do resto, o problema é de arquitetura. Resolva no `ARCHITECTURE.md` antes de declarar o bloco.
- **Pasta nova:** quando uma feature cria uma pasta de lógica de negócio, o Portão 3 acrescenta o padrão dela ao `businessLogicPaths`.

## O que o CI faz em cada stack

Os dois passos de cobertura do `.github/workflows/ci.yml` leem o bloco por `.github/scripts/coverage-config.sh`. Sem `fuzkrigo.config.json`, os dois saem 0 com "cobertura nao medida": é projeto fora do fluxo, o mesmo critério do passo de testes.

| Situação | Python | Node |
| --- | --- | --- |
| Ferramenta ausente | `pytest-cov` não importável: sai 1 | Sem script `coverage` no `package.json`: sai 1 |
| Bloco ausente, número ausente ou lista vazia | Sai 1, citando o campo | Sai 1, citando o campo |
| Medição | `pytest --cov --cov-branch --cov-fail-under=<global>`, depois `coverage report --include=<padrões> --fail-under=<businessLogic>` | `npm run coverage`, com os limites no `vitest.config` |

### Python

O passo roda `.github/scripts/coverage-python.sh`.

- `pytest-cov` precisa estar nas dependências do projeto (`requirements.txt` ou `pyproject.toml`).
- Sem `source` na configuração do coverage.py, o `--cov` mede também os arquivos de teste, que costumam estar em 100% e inflam o número global. Declare a pasta do código: `source = ["src"]` em `[tool.coverage.run]` no `pyproject.toml`, ou `source = src` em `[run]` no `.coveragerc`.
- A exclusão `# pragma: no cover` é respeitada pelas duas medições.

### Node (vitest)

O vitest não aceita, pela linha de comando, limite por padrão de pasta. A documentação lista flags só para os limites globais (`--coverage.thresholds.lines`, `.functions`, `.branches`, `.statements`); o limite por glob aparece só como opção do arquivo de configuração ([CLI](https://vitest.dev/guide/cli), [thresholds](https://vitest.dev/config/coverage)). Testado na versão 5.1.0: a notação de ponto até aceita um glob sem ponto, mas `src/dominio/**/*.js` é ignorado em silêncio e o build passa sem o limite. Por isso não se usa.

A A3 grava os números no `vitest.config`, espelhando o bloco:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: {
        lines: 95, functions: 95, branches: 95, statements: 95,
        'src/dominio/**': { lines: 98, functions: 98, branches: 98, statements: 98 },
      },
    },
  },
})
```

E o `package.json` ganha o script `"coverage": "vitest run --coverage"`, com `@vitest/coverage-v8` nas `devDependencies`.

- **Ao mudar um número ou uma pasta, mude nos dois lugares:** no bloco `coverage` e no `vitest.config`. O CI confere o bloco, mas no Node quem aplica o limite é o `vitest.config`.
- O vitest conta os arquivos das pastas com limite próprio também no limite global. É diferente do Jest.
- O `include` faz entrar na conta os arquivos que nenhum teste importa; sem ele, um arquivo sem teste nenhum fica fora da medição.
- O provider v8 mede ramos sempre; o `branches` dos limites é o que os cobra.

## Exclusões

Toda exclusão precisa de um comentário na linha imediatamente acima dela, começando com `coverage-justification:`, com o motivo em PT-BR e EN. Python usa `# pragma: no cover`; o vitest com provider v8 usa `/* v8 ignore next -- @preserve */` e as variantes `if`, `else` e `start`/`stop` ([fonte](https://vitest.dev/guide/coverage)).

```js
// coverage-justification: só roda no Windows, e o CI é Linux. / Windows only; CI runs on Linux.
/* v8 ignore next -- @preserve */
if (process.platform === 'win32') configureConsole()
```

A medição respeita a exclusão; quem cobra a justificativa é o agente `code-reviewer`, pelo critério de coerência do `~/.claude/CODIGO.md`, seção 8.
