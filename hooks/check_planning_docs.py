#!/usr/bin/env python3
"""Hook PreToolUse (Write|Edit) - iniciar-projeto SKILL.md secao 4, Regra de Bloqueio.

Nunca bloqueia: so libera ou pergunta (permissionDecision "ask"). Hooks nao
veem a conversa, entao nao sabem se a escrita e uma correcao pequena ou um
ajuste fora do fluxo; quem decide e o usuario.
Never denies: it only allows or asks. Hooks cannot see the conversation, so
the user decides.

Ordem da decisao:

  1. Marcador de Modo Tarefa desta sessao ativo: libera. O marcador e criado
     e apagado pelo hook arm_modo_tarefa.py (UserPromptSubmit) ao ler
     "#tarefa", "modo normal" ou "sair do modo tarefa" - nao pelo Claude.
  2. Extensao fora de CODE_EXTENSIONS (inclui .md, .css, .scss): libera.
  3. Projeto sem nenhuma tarefa em .spec/features/*/tasks.md: comportamento
     original. Libera com ROADMAP.md + CHECKLIST.md (abertura do projeto) ou
     com qualquer .spec/features/<feature>/spec.md; senao pergunta.
  4. Projeto com tarefas: a mesma checagem de "codigo orfao" que o audit faz
     no portao, no momento da escrita. Arquivo que casa srcGlobs e nao casa
     testGlobs nem ignoreGlobs so e liberado se estiver no campo Arquivos de
     alguma tarefa. fuzkrigo.config.json invalido, ou tarefas ilegiveis,
     tambem viram pergunta.
  5. Demais arquivos (teste, script, configuracao, fora da raiz): como em 3.

Decision order: (1) Task Mode marker, created by arm_modo_tarefa.py: allow;
(2) extension outside CODE_EXTENSIONS: allow; (3) no task in the project:
original behavior; (4) with tasks: the audit's orphan-code check at write
time; (5) anything else: as in 3.

Raiz do projeto: CLAUDE_PROJECT_DIR, ou o diretorio atual sem ela. A pasta
das especificacoes e o specDir do fuzkrigo.config.json (padrao .spec), como no
motor; com o arquivo invalido, vale .spec. Os documentos de planejamento ficam
em docs/ (SKILL.md secao 5); a raiz e aceita como fallback para projetos
anteriores a essa convencao.
Project root: CLAUDE_PROJECT_DIR, else the current directory. The spec folder
is specDir from fuzkrigo.config.json (default .spec), as in the engine.

Paridade com o motor da skill fuzkrigo-spec-driven (scripts/lib/src): os
padroes padrao saem de DEFAULT_CONFIG (config.js), glob_to_regex porta
globToRegExp (util/text.js) e as linhas de tarefa seguem parsers/tasks.js.
Mudou la, mude aqui: hooks/tests confere a paridade contra o proprio motor
quando ha node no PATH.
Parity with the engine is the goal; hooks/tests checks it against the engine.
"""
import json
import os
import re
import sys
import tempfile
import unicodedata

# Arquivos que IMPLEMENTAM comportamento. Componente de framework entra
# (vue/svelte/astro carregam a logica junto do template); folha de estilo
# fica de fora de proposito: ajustar uma cor nao e implementar feature, e um
# hook que pergunta a cada retoque visual e um hook que se aprende a ignorar.
CODE_EXTENSIONS = {
    "py", "js", "mjs", "cjs", "jsx", "ts", "tsx", "vue", "svelte", "astro",
    "vba", "bas", "java", "go", "rs", "cs", "cpp", "cc", "c", "h", "hpp",
    "rb", "php", "sh", "ps1", "sql",
}

CONFIG_FILE = "fuzkrigo.config.json"
# Padrao de specDir em DEFAULT_CONFIG (config.js do motor). / Engine default.
DEFAULT_SPEC_DIR = ".spec"

# Copia dos padroes de DEFAULT_CONFIG (config.js do motor), usados quando o
# projeto nao tem fuzkrigo.config.json ou nao define a chave.
# Copy of the engine's DEFAULT_CONFIG glob patterns.
DEFAULT_GLOBS = {
    "srcGlobs": ["src/**"],
    "testGlobs": ["test/**", "tests/**", "src/**/*.test.*", "src/**/*.spec.*", "__tests__/**"],
    "ignoreGlobs": [
        "node_modules/**", ".git/**", "dist/**", "build/**", "coverage/**",
        ".spec/**", "**/__pycache__/**", "**/*.pyc", ".venv/**", "venv/**",
        ".pytest_cache/**", ".mypy_cache/**", ".ruff_cache/**", "htmlcov/**",
        "**/*.egg-info/**",
    ],
}

# Mesmos padroes de parsers/tasks.js: cabecalho "## T-xxx" com traco
# (U+2014, U+2013 ou -) e a linha "Arquivos:". / Same patterns as tasks.js.
TASK_HEADER_RE = re.compile(r"^##\s+T-[0-9]{3,}\s*[—–-]\s*(.+?)\s*$")
FILES_LINE_RE = re.compile(r"^\s*[-*]\s*Arquivos\s*:\s*(.+?)\s*$", re.IGNORECASE)

# Os caracteres que globToRegExp escapa. / Characters globToRegExp escapes.
REGEX_SPECIALS = set(".+^${}()|[]\\")

PLANNING_REASON = (
    "Antes de prosseguir com a escrita de codigo de producao, ainda "
    "preciso de uma das duas evidencias de planejamento: a abertura do "
    "projeto (A1-A2: ROADMAP.md e CHECKLIST.md em docs/) ou uma "
    "especificacao de feature em .spec/features/. Quer fazer isso "
    "agora, ou tem uma razao especifica para pular esta etapa (#tarefa, "
    "correcao pequena, ajuste estetico)?"
)
ORPHAN_REASON = (
    "O arquivo `{path}` não está no campo Arquivos de nenhuma tarefa em "
    "`{spec_dir}/features/*/tasks.md`, e o audit vai acusá-lo como código órfão. "
    "Quer adicioná-lo a uma tarefa antes, ou é um ajuste fora do fluxo?"
)
INVALID_CONFIG_REASON = (
    "O `fuzkrigo.config.json` da raiz do projeto está inválido ({error}): "
    "sem ele não dá para saber quais arquivos são código de produção, e o "
    "motor vai recusar o audit até ele ser corrigido. Quer corrigi-lo antes, "
    "ou é um ajuste fora do fluxo?"
)
UNREADABLE_TASKS_REASON = (
    "Não consegui ler as tarefas em `{spec_dir}/features/*/tasks.md` ({error}), "
    "então não dá para saber se este arquivo está mapeado em alguma tarefa. "
    "Quer seguir mesmo assim?"
)


def respond(payload):
    print(json.dumps(payload))
    sys.exit(0)


def allow():
    respond({"continue": True})


def ask(reason):
    respond({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": reason,
        }
    })


def modo_tarefa_ativo(session_id):
    if not session_id:
        return False
    marker = os.path.join(tempfile.gettempdir(), "claude-modo-tarefa", f"{session_id}.flag")
    return os.path.isfile(marker)


def is_code_file(file_path):
    """A extensao indica codigo que implementa comportamento?
    Does the extension indicate code that implements behavior?"""
    basename = os.path.basename(file_path)
    ext = basename.rsplit(".", 1)[-1].lower() if "." in basename else ""
    return ext in CODE_EXTENSIONS


def project_root():
    return os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()


def doc_exists(root, name):
    """Procura o documento em docs/ (canonico) e na raiz (legado).
    Looks for the document in docs/ (canonical) and at the root (legacy)."""
    return os.path.isfile(os.path.join(root, "docs", name)) or os.path.isfile(os.path.join(root, name))


def feature_dirs(root, spec_dir):
    """Pastas de <specDir>/features/, como o loadProject do motor.
    Folders under <specDir>/features/, like the engine's loadProject."""
    features = os.path.join(root, spec_dir, "features")
    if not os.path.isdir(features):
        return []
    paths = [os.path.join(features, name) for name in sorted(os.listdir(features))]
    return [path for path in paths if os.path.isdir(path)]


def planning_rule(root, spec_dir):
    """Comportamento original: None libera, ou o motivo da pergunta.
    Original behavior: None allows, else the reason to ask."""
    has_docs = doc_exists(root, "ROADMAP.md") and doc_exists(root, "CHECKLIST.md")
    specs = (os.path.join(path, "spec.md") for path in feature_dirs(root, spec_dir))
    has_spec = any(os.path.isfile(path) for path in specs)
    return None if has_docs or has_spec else PLANNING_REASON


def glob_to_regex(pattern):
    """Porta literal de globToRegExp (util/text.js): `**/` casa zero ou mais
    pastas, `**` casa qualquer coisa, `*` e `?` nao atravessam `/`, sensivel
    a maiusculas. O \\Z final equivale ao `$` do JavaScript sem flags.
    Literal port of the engine's globToRegExp, with the same semantics."""
    out = []
    i = 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out.append("(?:[^/]+/)*")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif pattern[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pattern[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append("\\" + pattern[i] if pattern[i] in REGEX_SPECIALS else pattern[i])
            i += 1
    return re.compile("^" + "".join(out) + r"\Z")


def matches_any(rel_path, patterns):
    """Como anyGlobMatch do motor: \\ vira / antes de casar.
    Like the engine's anyGlobMatch: backslashes become slashes first."""
    posix = rel_path.replace("\\", "/")
    return any(glob_to_regex(pattern).match(posix) for pattern in patterns)


def is_source_file(rel_path, globs):
    """Casa srcGlobs e nao casa testGlobs nem ignoreGlobs (loadProject).
    Matches srcGlobs and neither testGlobs nor ignoreGlobs."""
    excluded = globs["testGlobs"] + globs["ignoreGlobs"]
    return matches_any(rel_path, globs["srcGlobs"]) and not matches_any(rel_path, excluded)


def read_config(root):
    """O fuzkrigo.config.json como dict, None se nao existe, ValueError se
    invalido. / The config as a dict, None if missing, ValueError if invalid."""
    path = os.path.join(root, CONFIG_FILE)
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as handle:
        raw = json.load(handle)
    if not isinstance(raw, dict):
        raise ValueError("o conteudo nao e um objeto JSON")
    return raw


def spec_dir_of(root):
    """specDir da configuracao, tolerante: sem arquivo ou com arquivo invalido,
    vale o padrao (quem acusa a configuracao invalida e o load_globs).
    Lenient specDir: missing or invalid config falls back to the default."""
    try:
        raw = read_config(root)
    except (OSError, ValueError):
        return DEFAULT_SPEC_DIR
    value = raw.get("specDir") if raw else None
    return value if isinstance(value, str) and value.strip() else DEFAULT_SPEC_DIR


def load_globs(root):
    """Padroes do projeto como o loadConfig do motor: chave presente no
    fuzkrigo.config.json substitui o padrao. ValueError se invalido.
    Project patterns like the engine's loadConfig. ValueError if invalid."""
    globs = {key: list(value) for key, value in DEFAULT_GLOBS.items()}
    raw = read_config(root)
    if raw is None:
        return globs
    for key in globs:
        if key not in raw:
            continue
        value = raw[key]
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise ValueError(f"{key} precisa ser uma lista de textos")
        globs[key] = value
    return globs


def clean_file_entry(raw):
    """Como tasks.js + audit.js: trim, uma crase em cada ponta, \\ vira /.
    As tasks.js + audit.js: trim, one backtick per end, \\ becomes /."""
    entry = raw.strip()
    if entry.startswith("`"):
        entry = entry[1:]
    if entry.endswith("`"):
        entry = entry[:-1]
    return entry.replace("\\", "/")


def parse_task_files(content):
    """Linhas Arquivos: abaixo de um cabecalho de tarefa, separadas so por
    virgula. Devolve (ha tarefa?, arquivos).
    Arquivos: lines below a task header, comma-separated only."""
    has_tasks = False
    files = set()
    for line in re.split(r"\r?\n", unicodedata.normalize("NFC", content)):
        if TASK_HEADER_RE.match(line):
            has_tasks = True
            continue
        match = FILES_LINE_RE.match(line) if has_tasks else None
        if match:
            files.update(clean_file_entry(item) for item in match.group(1).split(","))
    files.discard("")
    return has_tasks, files


def read_tasks(root, spec_dir):
    """(alguma tarefa no projeto?, arquivos mapeados em todas as tarefas).
    (any task in the project?, files mapped by all tasks)."""
    has_tasks = False
    claimed = set()
    for folder in feature_dirs(root, spec_dir):
        path = os.path.join(folder, "tasks.md")
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8", errors="replace", newline="") as handle:
            found, files = parse_task_files(handle.read())
        has_tasks = has_tasks or found
        claimed.update(files)
    return has_tasks, claimed


def relative_to_root(file_path, root):
    """Caminho posix relativo a raiz, ou None quando fica fora dela.
    Root-relative posix path, or None when outside the root."""
    try:
        rel_path = os.path.relpath(os.path.abspath(file_path), os.path.abspath(root))
    except ValueError:  # outro drive no Windows / another drive on Windows
        return None
    rel_path = rel_path.replace(os.sep, "/")
    if rel_path == ".." or rel_path.startswith("../"):
        return None
    return rel_path


def decide(data):
    """None libera; um texto e o motivo da pergunta. Nunca bloqueia.
    None allows; a string is the reason to ask. Never denies."""
    if not isinstance(data, dict) or modo_tarefa_ativo(data.get("session_id")):
        return None
    tool_input = data.get("tool_input")
    file_path = tool_input.get("file_path") if isinstance(tool_input, dict) else None
    if not isinstance(file_path, str) or not file_path or not is_code_file(file_path):
        return None
    root = project_root()
    spec_dir = spec_dir_of(root)
    try:
        has_tasks, claimed = read_tasks(root, spec_dir)
    except OSError as exc:
        return UNREADABLE_TASKS_REASON.format(error=exc, spec_dir=spec_dir)
    if not has_tasks:
        return planning_rule(root, spec_dir)
    try:
        globs = load_globs(root)
    except (OSError, ValueError) as exc:
        return INVALID_CONFIG_REASON.format(error=exc)
    rel_path = relative_to_root(file_path, root)
    if rel_path is None or not is_source_file(rel_path, globs):
        return planning_rule(root, spec_dir)
    if rel_path in claimed:
        return None
    return ORPHAN_REASON.format(path=rel_path, spec_dir=spec_dir)


def main():
    # Bytes, nao texto: o json decodifica sozinho o UTF-8 que o harness manda,
    # em qualquer versao do Python. Ler sys.stdin como texto usaria cp1252 no
    # Windows ate o Python 3.14 (sem UTF-8 mode) e corromperia os caminhos.
    # Bytes, not text: json decodes the harness UTF-8 itself on any Python;
    # text stdin would be cp1252 on Windows up to Python 3.14.
    try:
        data = json.load(sys.stdin.buffer)
    except (json.JSONDecodeError, ValueError):
        allow()
        return
    reason = decide(data)
    if reason is None:
        allow()
        return
    ask(reason)


if __name__ == "__main__":
    main()
