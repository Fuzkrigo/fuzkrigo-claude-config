#!/usr/bin/env bash
# Diagramas PlantUML do projeto: cada docs/uml/<nome>.puml tem ao lado o
# docs/uml/<nome>.svg, versionados os dois, porque o GitHub mostra SVG mas nao
# desenha PlantUML. Um diagrama por arquivo.
# The project's PlantUML diagrams: each docs/uml/<name>.puml has
# docs/uml/<name>.svg next to it, both versioned, because GitHub shows SVG but
# does not draw PlantUML. One diagram per file.
#
# Uso, a partir da raiz do projeto / usage, from the project root:
#   bash .github/scripts/diagrams-uml.sh render       # gera os SVG / generates the SVGs
#   bash .github/scripts/diagrams-uml.sh pdf <nome>   # PDF fora do repositorio / PDF outside the repository
#   bash .github/scripts/diagrams-uml.sh check        # CI: SVG corresponde ao .puml / SVG matches the .puml
#
# Precisa de Java e do plantuml.jar, que o script nao baixa: o caminho vem de
# PLANTUML_JAR e, sem ela, e ~/plantuml/plantuml.jar.
# Needs Java and plantuml.jar, which the script does not download: the path
# comes from PLANTUML_JAR and, without it, is ~/plantuml/plantuml.jar.
set -euo pipefail

UML_DIR=docs/uml
PLANTUML_JAR=${PLANTUML_JAR:-$HOME/plantuml/plantuml.jar}
JAR_URL=https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar

usage() {
  echo "uso: bash .github/scripts/diagrams-uml.sh render | check | pdf <nome>" >&2
  exit 1
}

mode=${1:-}
case "$mode" in
  render|check) ;;
  pdf) [ -n "${2:-}" ] || usage ;;
  *) usage ;;
esac

shopt -s nullglob
sources=("$UML_DIR"/*.puml)
images=("$UML_DIR"/*.svg)
if [ ${#sources[@]} -eq 0 ] && [ ${#images[@]} -eq 0 ]; then
  echo "sem .puml em $UML_DIR — diagramas PlantUML nao conferidos"
  exit 0
fi

plantuml() {
  java -jar "$PLANTUML_JAR" "$@"
}

require_plantuml() {
  if ! command -v java >/dev/null 2>&1; then
    echo "java nao encontrado — instale um Java 11 ou mais novo (ex.: Temurin 21) e abra um terminal novo" >&2
    exit 1
  fi
  if [ ! -f "$PLANTUML_JAR" ]; then
    echo "plantuml.jar nao encontrado em $PLANTUML_JAR — baixe $JAR_URL para esse caminho, ou aponte PLANTUML_JAR para o arquivo" >&2
    exit 1
  fi
  # Versao so informativa. Sem GraphViz (o Linux do CI nao tem), o --version
  # sai 16 avisando "Dot executable does not exist" (1.2026.9); a conferencia
  # nao desenha e nao precisa dele, entao esse codigo de saida nao reprova.
  # Version is informative only. Without GraphViz (CI's Linux has none),
  # --version exits 16 warning "Dot executable does not exist" (1.2026.9); the
  # check does not draw and does not need it, so that exit code never fails.
  local version
  version=$(plantuml --version 2>&1) || true
  version=${version//$'\r'/}
  echo "${version%%$'\n'*}"
}

# Erro de sintaxe: o PlantUML diz a linha so ao desenhar ("Error line N in
# file: ..."); o --check-syntax so diz que ha erro. --no-error-image impede
# que o desenho do erro vire SVG. Saida dele com erro: 200.
# Syntax error: PlantUML gives the line only when drawing ("Error line N in
# file: ..."); --check-syntax only says there is an error. --no-error-image
# keeps the error drawing from becoming an SVG. Its exit code on error: 200.
syntax_failed() {
  echo "erro de sintaxe em diagrama PlantUML de $UML_DIR — corrija a linha indicada acima" >&2
  exit 1
}

# O nome do SVG vem do arquivo, nunca do "@startuml <nome>".
# The SVG name comes from the file, never from "@startuml <name>".
render() {
  if [ ${#sources[@]} -eq 0 ]; then
    echo "sem .puml em $UML_DIR — nada a desenhar"
    return
  fi
  require_plantuml
  plantuml --svg --no-error-image --ignore-startuml-filename "${sources[@]}" || syntax_failed
  echo "SVG gerados em $UML_DIR: ${#sources[@]} diagrama(s)"
}

# PDF so para apresentacao: vai para uma pasta temporaria, fora do
# repositorio, e nunca e versionado. No Git Bash, o caminho sai no formato do
# Windows, para abrir no Explorer.
# PDF only for presentations: it goes to a temporary folder, outside the
# repository, and is never versioned. On Git Bash, the path is printed in
# Windows format, to open in Explorer.
pdf() {
  local source="$UML_DIR/$1.puml" out
  if [ ! -f "$source" ]; then
    echo "$source nao existe" >&2
    exit 1
  fi
  require_plantuml
  out=$(mktemp -d)
  if command -v cygpath >/dev/null 2>&1; then
    out=$(cygpath -m "$out")
  fi
  plantuml --pdf --no-error-image --ignore-startuml-filename --output-dir "$out" "$source" || syntax_failed
  echo "PDF gerado: $out/$1.pdf"
}

# Confere o fonte, nao o desenho: o SVG traz o .puml codificado em
# <?plantuml-src ...?>, e -computeurl codifica o .puml atual do mesmo jeito.
# Assim a diferenca de GraphViz entre o Windows e o Linux do CI nao reprova.
# A codificacao nao muda com CRLF/LF nem entre Java 17 e 21 (testado no
# PlantUML 1.2026.9).
# Checks the source, not the drawing: the SVG carries the .puml encoded in
# <?plantuml-src ...?>, and -computeurl encodes the current .puml the same
# way. So GraphViz differences between Windows and the CI's Linux never fail
# the check. The encoding does not change with CRLF/LF nor between Java 17
# and 21 (tested on PlantUML 1.2026.9).
check() {
  local problems=() image source svg expected embedded
  for image in "${images[@]}"; do
    [ -f "${image%.svg}.puml" ] || problems+=("$image sem ${image%.svg}.puml — apague o SVG ou recupere o fonte")
  done
  if [ ${#sources[@]} -gt 0 ]; then
    require_plantuml
    if ! plantuml --check-syntax "${sources[@]}" > /dev/null 2>&1; then
      # Desenho numa pasta temporaria so para o PlantUML imprimir a linha do
      # erro; ele sai 200 de proposito, e quem reprova e o syntax_failed.
      # Drawing into a temporary folder only so PlantUML prints the error
      # line; it exits 200 on purpose, and syntax_failed is what fails.
      plantuml --svg --no-error-image --ignore-startuml-filename --output-dir "$(mktemp -d)" "${sources[@]}" || true
      syntax_failed
    fi
  fi
  for source in "${sources[@]}"; do
    svg=${source%.puml}.svg
    expected=$(plantuml -computeurl "$source")
    expected=${expected//$'\r'/}
    if [ "$(printf '%s\n' "$expected" | wc -l)" -ne 1 ]; then
      problems+=("$source tem mais de um diagrama — deixe um diagrama por arquivo")
    elif [ ! -f "$svg" ]; then
      problems+=("$source sem $svg")
    else
      # SVG sem o fonte embutido (nao veio do PlantUML, ou veio com
      # --disable-metadata) fica vazio aqui e reprova como divergente.
      # An SVG without the embedded source (not from PlantUML, or made with
      # --disable-metadata) is empty here and fails as a mismatch.
      embedded=$(grep -o '<?plantuml-src [^?]*?>' "$svg" || true)
      embedded=${embedded#"<?plantuml-src "}
      [ "${embedded%"?>"}" = "$expected" ] || problems+=("$svg nao corresponde ao $source")
    fi
  done
  if [ ${#problems[@]} -gt 0 ]; then
    printf '%s\n' "${problems[@]}" >&2
    echo "rode \"bash .github/scripts/diagrams-uml.sh render\" e commite os SVG" >&2
    exit 1
  fi
  echo "diagramas PlantUML conferidos: ${#sources[@]}"
}

case "$mode" in
  render) render ;;
  pdf) pdf "$2" ;;
  check) check ;;
esac
