#!/usr/bin/env bash
# Teste de mutacao de projeto Python no CI, com mutmut: muta as pastas de
# coverage.businessLogicPaths e reprova com nota abaixo de mutation.break,
# os dois do fuzkrigo.config.json.
# Python project mutation testing in CI, with mutmut: mutates the folders of
# coverage.businessLogicPaths and fails with a score below mutation.break,
# both from fuzkrigo.config.json.
#
# O mutmut nao entra nas dependencias do projeto: ele exige fork e nao roda
# no Windows. O CI o instala aqui, sem versao fixa.
# mutmut is not a project dependency: it needs fork and does not run on
# Windows. CI installs it here, unpinned.
#
# Uso, a partir da raiz do projeto / usage, from the project root:
#   bash .github/scripts/mutation-python.sh
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/mutation-config.sh"

skip_without_config mutacao
read_mutation_config

python -m pip install mutmut
python -c 'import importlib.metadata as m; print("mutmut", m.version("mutmut"))'

# O mutmut nao aceita caminho pela linha de comando: as pastas vem do
# [tool.mutmut] do pyproject.toml, que a A3 grava espelhando o
# coverage.businessLogicPaths. Aqui so se confere o espelho.
# mutmut takes no path on the command line: the folders come from
# [tool.mutmut] in pyproject.toml, which A3 writes mirroring
# coverage.businessLogicPaths. This only checks the mirror.
python - "$MUTATION_PATHS" <<'PY'
import sys
import tomllib
from pathlib import Path

expected = sys.argv[1].split(",")


def fail(message):
    print(f"mutacao nao medida: {message} — configure na etapa A3 "
          "(skill iniciar-projeto, references/mutacao.md)", file=sys.stderr)
    sys.exit(1)


if not Path("pyproject.toml").is_file():
    fail("pyproject.toml ausente; o mutmut le a configuracao da secao [tool.mutmut]")
try:
    with open("pyproject.toml", "rb") as f:
        section = tomllib.load(f).get("tool", {}).get("mutmut")
except tomllib.TOMLDecodeError as error:
    fail(f"pyproject.toml invalido ({error})")
if not isinstance(section, dict):
    fail("secao [tool.mutmut] ausente no pyproject.toml")
source_paths = section.get("source_paths")
if not isinstance(source_paths, list) or not source_paths:
    fail("source_paths ausente ou vazio na secao [tool.mutmut]")
only_mutate = section.get("only_mutate")
if not isinstance(only_mutate, list) or set(only_mutate) != set(expected):
    fail(f"only_mutate da secao [tool.mutmut] {only_mutate} diferente de "
         f"coverage.businessLogicPaths {expected}")
PY

# Codigo de saida repassado: suite limpa falhando, ou nenhum teste cobrindo
# os mutantes (only_mutate que nao casa nada), sai 1.
# Exit code passed through: a failing clean suite, or no test covering the
# mutants (only_mutate matching nothing), exits 1.
mutmut run || exit $?

# Sem dados, o export avisa e sai 0 sem gravar o arquivo. Apagar antes
# garante que um arquivo antigo nao passe por resultado novo.
# Without data, export warns and exits 0 without writing the file. Removing
# it first keeps an old file from passing for a new result.
rm -f mutants/mutmut-cicd-stats.json
mutmut export-cicd-stats || exit $?
if [ ! -f mutants/mutmut-cicd-stats.json ]; then
  echo "nenhum mutante gerado — confira source_paths e only_mutate na secao [tool.mutmut]" >&2
  exit 1
fi

# Nota com a definicao do Stryker: detectados / (detectados + nao
# detectados) x 100. Detectado: killed, timeout e segfault (o processo de
# teste morreu por SIGSEGV, ou por SIGKILL depois de estourar o limite de
# CPU). Nao detectado: survived, no_tests e suspicious (codigo de saida que
# o mutmut nao reconhece: nem falha nem sucesso da suite). skipped fica fora,
# como o "ignorado" do Stryker; a linha com "# pragma: no mutate" nem gera
# mutante. Saida 2 do Python: nota abaixo do limite.
# Score with Stryker's definition: detected / (detected + undetected) x 100.
# Detected: killed, timeout and segfault (the test process died by SIGSEGV,
# or by SIGKILL after exceeding the CPU limit). Undetected: survived,
# no_tests and suspicious (an exit code mutmut does not recognize: neither
# suite failure nor success). skipped stays out, like Stryker's "ignored";
# a line with "# pragma: no mutate" generates no mutant at all. Python exit
# 2: score below the limit.
verdict=0
python - "$MUTATION_BREAK" <<'PY' || verdict=$?
import json
import sys

limit = float(sys.argv[1])
with open("mutants/mutmut-cicd-stats.json") as f:
    stats = json.load(f)

DETECTED = ("killed", "timeout", "segfault")
UNDETECTED = ("survived", "no_tests", "suspicious")
INTERRUPTED = "check_was_interrupted_by_user"
missing = [key for key in DETECTED + UNDETECTED + (INTERRUPTED,) if not isinstance(stats.get(key), int)]
if missing:
    print(f"campos ausentes em mutants/mutmut-cicd-stats.json: {missing} — o formato do mutmut mudou",
          file=sys.stderr)
    sys.exit(1)
if stats[INTERRUPTED] > 0:
    print(f"{stats[INTERRUPTED]} mutantes com a suite interrompida ({INTERRUPTED}) — nota nao confiavel",
          file=sys.stderr)
    sys.exit(1)

detected = sum(stats[key] for key in DETECTED)
valid = detected + sum(stats[key] for key in UNDETECTED)
if valid == 0:
    print("nenhum mutante valido para calcular a nota", file=sys.stderr)
    sys.exit(1)
print(f"nota de mutacao: {detected / valid * 100:.2f}% ({detected} detectados de {valid} validos); "
      f"limite: {limit:g}%")
sys.exit(0 if detected * 100 >= limit * valid else 2)
PY
if [ "$verdict" -ne 0 ] && [ "$verdict" -ne 2 ]; then
  exit "$verdict"
fi

# Impressos mesmo com a nota acima do limite: todo sobrevivente nos arquivos
# alterados pelo PR e triado (Portao 3).
# Printed even with the score above the limit: every survivor in the files
# changed by the PR is triaged (Gate 3).
echo "mutantes nao mortos, para a triagem do PR (survived, no tests e suspicious):"
mutmut results || exit $?

if [ "$verdict" -eq 2 ]; then
  echo "nota de mutacao abaixo do limite de $MUTATION_BREAK%" >&2
  exit 1
fi
