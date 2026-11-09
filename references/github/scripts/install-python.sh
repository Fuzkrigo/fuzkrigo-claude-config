#!/usr/bin/env bash
# Dependencias Python do projeto no CI. Instala o requirements.txt e, quando
# ha pacote declarado (setup.py, ou [project] / [build-system] no
# pyproject.toml), o proprio projeto em modo editavel. Falha de instalacao
# reprova o build: nada de "|| true".
# Python dependencies of the project in CI. Installs requirements.txt and,
# when a package is declared (setup.py, or [project] / [build-system] in
# pyproject.toml), the project itself in editable mode. An install failure
# fails the build: no "|| true".
#
# Uso, a partir da raiz do projeto / usage, from the project root:
#   bash .github/scripts/install-python.sh
set -euo pipefail

python -m pip install --upgrade pip

if [ -f requirements.txt ]; then
  python -m pip install -r requirements.txt
fi

# Um pyproject.toml so com [tool.*] (pytest, coverage) nao declara pacote.
# Instalar o projeto mesmo assim faria o setuptools adivinhar os pacotes, e
# com mais de uma pasta no nivel de cima ele recusa o build.
# A pyproject.toml holding only [tool.*] (pytest, coverage) declares no
# package. Installing the project anyway would make setuptools guess the
# packages, and with more than one top-level folder it refuses to build.
if [ -f setup.py ] || grep -qE '^\[(project|build-system)\]' pyproject.toml 2>/dev/null; then
  python -m pip install -e .
elif [ -f pyproject.toml ]; then
  echo "pyproject.toml so tem configuracao de ferramentas, sem pacote para instalar — instalacao do pacote pulada"
fi
