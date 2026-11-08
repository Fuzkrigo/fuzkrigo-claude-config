"""Utilitarios dos testes dos hooks / Hook test utilities.

Roda cada hook como o harness do Claude Code roda: um subprocesso com o JSON
do evento na entrada padrao, lendo a decisao no JSON da saida. Usa
sys.executable, o mesmo Python que roda os testes.
Runs each hook the way the Claude Code harness does: a subprocess fed with
the event JSON on stdin, reading the decision from the JSON on stdout.
"""
import importlib.util
import json
import os
import subprocess
import sys

HOOKS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(HOOKS_DIR)


def run_hook(hook_file, payload, env=None, cwd=None, python_flags=()):
    """Roda o hook e devolve o JSON de saida / Runs the hook, returns its JSON.

    payload dict e serializado como o harness faz (UTF-8 cru); payload str
    vai como esta, para simular entrada malformada. python_flags vai para o
    interpretador: ("-X", "utf8=0") reproduz o padrao do Python 3.14 ou
    anterior, sem UTF-8 mode.
    A dict payload is serialized like the harness does (raw UTF-8); a str
    payload is sent as is. python_flags go to the interpreter, e.g.
    ("-X", "utf8=0") reproduces the pre-3.15 default (no UTF-8 mode).
    """
    if isinstance(payload, str):
        stdin_text = payload
    else:
        stdin_text = json.dumps(payload, ensure_ascii=False)
    # O CLAUDE_PROJECT_DIR de quem roda os testes nao pode vazar para o caso.
    # The caller's CLAUDE_PROJECT_DIR must not leak into the test case.
    child_env = {k: v for k, v in os.environ.items() if k != "CLAUDE_PROJECT_DIR"}
    child_env.update(env or {})
    proc = subprocess.run(
        [sys.executable, *python_flags, os.path.join(HOOKS_DIR, hook_file)],
        input=stdin_text.encode("utf-8"),
        capture_output=True,
        cwd=cwd,
        env=child_env,
        timeout=60,
        check=False,
    )
    if proc.returncode != 0:
        raise AssertionError(
            f"{hook_file} saiu com codigo {proc.returncode}: "
            f"{proc.stderr.decode('utf-8', 'replace')}"
        )
    return json.loads(proc.stdout.decode("utf-8"))


def decision(output):
    """'allow' quando o hook libera; senao a permissionDecision ('ask'/'deny').
    'allow' when the hook lets the call through; else its permissionDecision."""
    specific = output.get("hookSpecificOutput")
    if specific is None:
        return "allow" if output.get("continue") is True else "unknown"
    return specific.get("permissionDecision", "unknown")


def reason(output):
    """Motivo da pergunta ou do bloqueio / Reason for asking or denying."""
    return output.get("hookSpecificOutput", {}).get("permissionDecisionReason", "")


def load_hook_module(hook_file):
    """Importa o hook como modulo, sem rodar main().
    Imports the hook as a module, without running main()."""
    name = os.path.splitext(hook_file)[0]
    spec = importlib.util.spec_from_file_location(name, os.path.join(HOOKS_DIR, hook_file))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_file(root, rel_path, content=""):
    """Grava root/rel_path (separador /), criando as pastas.
    Writes root/rel_path (/-separated), creating the folders."""
    path = os.path.join(root, *rel_path.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as handle:
        handle.write(content)
    return path
