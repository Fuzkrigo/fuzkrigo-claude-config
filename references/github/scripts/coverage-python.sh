#!/usr/bin/env bash
# Cobertura de projeto Python no CI: mede com ramos e reprova abaixo dos
# limites do bloco "coverage" do fuzkrigo.config.json.
# Python project coverage in CI: measures with branches and fails below the
# limits of the "coverage" block of fuzkrigo.config.json.
#
# Uso, a partir da raiz do projeto / usage, from the project root:
#   bash .github/scripts/coverage-python.sh
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/coverage-config.sh"

skip_without_config

# Sem pytest-cov nao ha medicao, e sem medicao o build nao passa.
# Without pytest-cov there is no measurement, and without it the build fails.
if ! python -c "import pytest_cov" 2>/dev/null; then
  echo "pytest-cov nao instalado — adicione pytest-cov as dependencias do projeto (requirements.txt ou pyproject.toml)" >&2
  exit 1
fi

read_coverage_config

# Limite global, com ramos. O codigo de saida do pytest e repassado.
# Global limit, with branches. pytest's exit code is passed through.
pytest --cov --cov-branch --cov-report=term-missing --cov-fail-under="$COVERAGE_GLOBAL" || exit $?

# Limite da logica de negocio, sobre os dados que o pytest acabou de gravar.
# Business logic limit, over the data pytest has just written.
echo "logica de negocio ($COVERAGE_INCLUDE): limite de $COVERAGE_BUSINESS%"
coverage report --include="$COVERAGE_INCLUDE" --fail-under="$COVERAGE_BUSINESS" || exit $?
