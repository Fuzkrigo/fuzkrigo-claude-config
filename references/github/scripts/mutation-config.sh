# Leitura do bloco "mutation" do fuzkrigo.config.json, compartilhada pelos
# passos de mutacao do CI (Node e Python). Carregar com source, a partir da
# raiz do projeto. As pastas mutadas sao as de coverage.businessLogicPaths,
# lidas e validadas pelo coverage-config.sh: a lista nao se repete aqui.
# Reads the "mutation" block of fuzkrigo.config.json, shared by the CI
# mutation steps (Node and Python). Load it with source, from the project
# root. The mutated folders are those of coverage.businessLogicPaths, read and
# validated by coverage-config.sh: the list is not repeated here.

source "$(dirname "${BASH_SOURCE[0]}")/coverage-config.sh"

# Valida mutation.break e o imprime. Bloco ausente ou numero fora de 0 a 100:
# mensagem e saida 1.
# Validates mutation.break and prints it. Missing block or number outside
# 0 to 100: message and exit 1.
MUTATION_CHECK_JS='
const file = process.argv[1];
const mutation = require("./" + file).mutation;
const limit = mutation && mutation.break;
typeof limit === "number" && limit >= 0 && limit <= 100
  ? limit
  : (console.error("mutacao nao medida: mutation.break ausente ou nao e numero de 0 a 100 no " + file +
      " — declare o bloco na etapa A3 (skill iniciar-projeto, references/mutacao.md)"),
    process.exit(1));
'

# Define MUTATION_BREAK e MUTATION_PATHS (os padroes de
# coverage.businessLogicPaths unidos por virgula), ou sai 1.
# Sets MUTATION_BREAK and MUTATION_PATHS (the coverage.businessLogicPaths
# patterns joined by commas), or exits 1.
read_mutation_config() {
  read_coverage_config
  MUTATION_BREAK=$(node -p "$MUTATION_CHECK_JS" "$COVERAGE_CONFIG_FILE") || exit 1
  MUTATION_PATHS=$COVERAGE_INCLUDE
}

# Node: confere o stryker.config.json, que e JSON para o CI conseguir le-lo.
# Em mutate, os padroes sem "!" sao as pastas de coverage.businessLogicPaths;
# os com "!" so podem ser os que tiram os arquivos de teste, porque o Stryker
# muta tambem o teste que mora dentro da pasta (testado na 10.1.1). Outra
# exclusao desligaria codigo de negocio sem justificativa. thresholds.break
# tem de ser o mutation.break: quem reprova abaixo dele e o proprio Stryker.
# Node: checks stryker.config.json, which is JSON so CI can read it. In
# mutate, patterns without "!" are the coverage.businessLogicPaths folders;
# those with "!" may only be the ones that leave test files out, because
# Stryker also mutates a test living inside the folder (tested on 10.1.1).
# Any other exclusion would switch off business code with no justification.
# thresholds.break must be mutation.break: Stryker itself fails below it.
STRYKER_CHECK_JS='
const fs = require("fs");
const file = "stryker.config.json";
const testExclusions = ["!**/*.test.*", "!**/*.spec.*", "!**/__tests__/**"];
const [limit, joinedPaths] = process.argv.slice(1);
const fail = (message) => {
  console.error("mutacao nao medida: " + message +
    " — ajuste na etapa A3 (skill iniciar-projeto, references/mutacao.md)");
  process.exit(1);
};
if (!fs.existsSync(file)) fail(file + " ausente; o CI le a configuracao do Stryker so desse arquivo JSON");
let config;
try {
  config = JSON.parse(fs.readFileSync(file, "utf-8"));
} catch (error) {
  fail(file + " invalido (" + error.message + ")");
}
const expected = joinedPaths.split(",");
const mutate = Array.isArray(config && config.mutate) ? config.mutate.map(String) : [];
const folders = mutate.filter((pattern) => !pattern.startsWith("!"));
const others = mutate.filter((pattern) => pattern.startsWith("!") && !testExclusions.includes(pattern));
const sameSet = (a, b) => a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));
if (!sameSet(folders, expected)) {
  fail("pastas de mutate " + JSON.stringify(folders) + " diferentes de coverage.businessLogicPaths " +
    JSON.stringify(expected));
}
if (others.length > 0) {
  fail("exclusoes de mutate fora das de arquivo de teste " + JSON.stringify(others) +
    " (aceitas: " + JSON.stringify(testExclusions) + ")");
}
const configured = config.thresholds && config.thresholds.break;
if (configured !== Number(limit)) {
  fail("thresholds.break do " + file + " (" + configured + ") diferente de mutation.break (" + limit + ")");
}
'

# Sai 1 com a mensagem do primeiro desvio; exige read_mutation_config antes.
# Exits 1 with the first mismatch message; needs read_mutation_config first.
check_stryker_config() {
  node -e "$STRYKER_CHECK_JS" "$MUTATION_BREAK" "$MUTATION_PATHS" || exit 1
}
