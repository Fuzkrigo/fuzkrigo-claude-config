# Leitura do bloco "coverage" do fuzkrigo.config.json, compartilhada pelos
# passos de cobertura do CI (Node e Python). Carregar com source, a partir da
# raiz do projeto.
# Reads the "coverage" block of fuzkrigo.config.json, shared by the CI coverage
# steps (Node and Python). Load it with source, from the project root.

COVERAGE_CONFIG_FILE=fuzkrigo.config.json

# Valida o bloco e imprime tres linhas: limite global, limite da logica de
# negocio e os padroes da logica de negocio unidos por virgula, que e o
# formato do --include do coverage.py. Campo faltando: mensagem e saida 1.
# Validates the block and prints three lines: global limit, business logic
# limit and the business logic patterns joined by commas, which is the
# coverage.py --include format. Missing field: message and exit 1.
COVERAGE_CHECK_JS='
const file = process.argv[1];
const coverage = require("./" + file).coverage;
const isPercent = (value) => typeof value === "number" && value >= 0 && value <= 100;
const isPattern = (value) => typeof value === "string" && value !== "" && !value.includes(",");
const paths = coverage && coverage.businessLogicPaths;
const missing =
  !coverage || typeof coverage !== "object" || Array.isArray(coverage) ? "bloco coverage ausente" :
  !isPercent(coverage.global) ? "coverage.global ausente ou nao e numero de 0 a 100" :
  !isPercent(coverage.businessLogic) ? "coverage.businessLogic ausente ou nao e numero de 0 a 100" :
  !Array.isArray(paths) || paths.length === 0 ? "coverage.businessLogicPaths ausente ou vazio" :
  !paths.every(isPattern) ? "coverage.businessLogicPaths com padrao vazio ou com virgula" : "";
missing
  ? (console.error("cobertura nao medida: " + missing + " no " + file +
      " — declare o bloco na etapa A3 (skill iniciar-projeto, references/cobertura.md)"),
    process.exit(1))
  : [coverage.global, coverage.businessLogic, paths.join(",")].join("\n");
'

# Projeto fora do fluxo, sem fuzkrigo.config.json: nada a medir. E o mesmo
# criterio do passo de testes.
# Project outside the flow, without fuzkrigo.config.json: nothing to measure.
# Same rule as the test step.
skip_without_config() {
  if [ ! -f "$COVERAGE_CONFIG_FILE" ]; then
    echo "sem $COVERAGE_CONFIG_FILE — cobertura nao medida"
    exit 0
  fi
}

# Define COVERAGE_GLOBAL, COVERAGE_BUSINESS e COVERAGE_INCLUDE, ou sai 1.
# Sets COVERAGE_GLOBAL, COVERAGE_BUSINESS and COVERAGE_INCLUDE, or exits 1.
read_coverage_config() {
  local values
  values=$(node -p "$COVERAGE_CHECK_JS" "$COVERAGE_CONFIG_FILE") || exit 1
  { read -r COVERAGE_GLOBAL; read -r COVERAGE_BUSINESS; read -r COVERAGE_INCLUDE; } <<< "$values"
}
