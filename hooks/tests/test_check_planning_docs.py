"""Testes do hook check_planning_docs.py (iniciar-projeto secao 4).
Tests for the check_planning_docs.py hook (iniciar-projeto section 4).

Cada caso monta um projeto numa pasta temporaria e roda o hook como o
harness roda. Por caso, sao controlados o CLAUDE_PROJECT_DIR, o diretorio
atual e a pasta temporaria do sistema (TMP, TEMP e TMPDIR), onde mora o
marcador do Modo Tarefa. Toda fixture com tarefa tem spec.md ao lado do
tasks.md, como o `fspec new` cria: assim o comportamento antigo, que libera
quando existe spec, nao mascara a checagem de mapeamento.
Each case builds a project in a temporary folder and runs the hook the way
the harness does, controlling CLAUDE_PROJECT_DIR, the working directory and
the system temp folder (where the Task Mode marker lives).

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s hooks/tests -v
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

from hook_runner import REPO_ROOT, decision, load_hook_module, reason, run_hook, write_file

HOOK = "check_planning_docs.py"
SESSION_ID = "sessao-de-teste"
# Padrao do Python 3.14 ou anterior: sem UTF-8 mode, stdin em cp1252 no
# Windows. / Pre-3.15 default: no UTF-8 mode, cp1252 stdin on Windows.
WITHOUT_UTF8_MODE = ("-X", "utf8=0")
SPEC_MD = "# Spec: alfa\n\n> feature: alfa\n"
TASKS_MD = (
    "# Tasks: Alfa\n\n> feature: alfa\n\n"
    "## T-001 — Implementar o modulo [pendente]\n\n"
    "- Refs: US-001, AC-001\n"
    "- Arquivos: {files}\n"
)


class PlanningHookTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.project = os.path.join(temp.name, "projeto")
        self.system_temp = os.path.join(temp.name, "tmp")
        self.elsewhere = os.path.join(temp.name, "outro-lugar")
        for folder in (self.project, self.system_temp, self.elsewhere):
            os.makedirs(folder)

    def add_task(self, files):
        write_file(self.project, ".spec/features/alfa/spec.md", SPEC_MD)
        write_file(self.project, ".spec/features/alfa/tasks.md", TASKS_MD.format(files=files))

    def add_roadmap_and_checklist(self):
        write_file(self.project, "docs/ROADMAP.md", "# Roadmap\n")
        write_file(self.project, "docs/CHECKLIST.md", "# Checklist\n")

    def env(self, with_project_dir=True):
        env = {name: self.system_temp for name in ("TMP", "TEMP", "TMPDIR")}
        if with_project_dir:
            env["CLAUDE_PROJECT_DIR"] = self.project
        return env

    def run_write(self, rel_path, cwd=None, with_project_dir=True, python_flags=()):
        payload = {
            "session_id": SESSION_ID,
            "tool_name": "Write",
            "tool_input": {
                "file_path": os.path.join(self.project, *rel_path.split("/")),
                "content": "x = 1\n",
            },
        }
        return run_hook(HOOK, payload, env=self.env(with_project_dir),
                        cwd=cwd or self.project, python_flags=python_flags)

    def test_empty_project_asks_with_planning_message(self):
        output = self.run_write("src/a.py")
        self.assertEqual(decision(output), "ask")
        self.assertIn("evidencias de planejamento", reason(output))

    def test_task_mode_marker_allows_in_empty_project(self):
        write_file(self.system_temp, f"claude-modo-tarefa/{SESSION_ID}.flag")
        self.assertEqual(decision(self.run_write("src/a.py")), "allow")

    def test_stylesheets_are_allowed_in_empty_project(self):
        for rel_path in ("src/estilo.css", "src/estilo.scss"):
            with self.subTest(rel_path=rel_path):
                self.assertEqual(decision(self.run_write(rel_path)), "allow")

    def test_mapped_source_file_is_allowed(self):
        self.add_task("src/a.py")
        self.assertEqual(decision(self.run_write("src/a.py")), "allow")

    def test_unmapped_source_file_asks_citing_the_file(self):
        self.add_task("src/a.py")
        output = self.run_write("src/b.py")
        self.assertEqual(decision(output), "ask")
        self.assertIn("`src/b.py`", reason(output))
        self.assertIn("campo Arquivos", reason(output))

    def test_test_file_is_allowed(self):
        self.add_task("src/a.py")
        self.assertEqual(decision(self.run_write("tests/test_a.py")), "allow")

    def test_file_outside_src_globs_is_allowed_with_roadmap(self):
        self.add_task("src/a.py")
        self.add_roadmap_and_checklist()
        self.assertEqual(decision(self.run_write("scripts/x.py")), "allow")

    def test_src_globs_from_config_replace_the_defaults(self):
        self.add_task("src/a.py")
        write_file(self.project, "fuzkrigo.config.json", json.dumps({"srcGlobs": ["app/**"]}))
        self.assertEqual(decision(self.run_write("app/m.py")), "ask")

    def test_backslash_in_files_field_is_normalized(self):
        self.add_task("src\\sub\\c.py")
        self.assertEqual(decision(self.run_write("src/sub/c.py")), "allow")

    def test_invalid_config_asks_citing_the_config(self):
        self.add_task("src/a.py")
        write_file(self.project, "fuzkrigo.config.json", "{ isto nao e json")
        output = self.run_write("src/a.py")
        self.assertEqual(decision(output), "ask")
        self.assertIn("fuzkrigo.config.json", reason(output))

    def test_malformed_input_fails_open(self):
        for stdin_text in ("{isto nao e json", "[]"):
            with self.subTest(stdin_text=stdin_text):
                output = run_hook(HOOK, stdin_text, env=self.env(), cwd=self.project)
                self.assertEqual(decision(output), "allow")

    def test_project_dir_variable_wins_over_cwd(self):
        self.add_roadmap_and_checklist()
        output = self.run_write("src/a.py", cwd=self.elsewhere)
        self.assertEqual(decision(output), "allow")

    def test_cwd_is_the_root_without_project_dir_variable(self):
        self.add_task("src/a.py")
        output = self.run_write("src/b.py", with_project_dir=False)
        self.assertEqual(decision(output), "ask")
        self.assertIn("`src/b.py`", reason(output))

    def test_non_ascii_project_path_without_utf8_mode(self):
        # O caminho do arquivo chega pelo stdin em UTF-8 cru, e a raiz chega
        # pelo ambiente: o hook nao pode depender do UTF-8 mode do Python.
        # The file path arrives as raw UTF-8 on stdin, the root through the
        # environment: the hook must not rely on the interpreter's UTF-8 mode.
        self.project = os.path.join(os.path.dirname(self.project), "projeção")
        os.makedirs(self.project)
        self.add_task("src/a.py")
        output = self.run_write("src/b.py", python_flags=WITHOUT_UTF8_MODE)
        self.assertEqual(decision(output), "ask")
        self.assertIn("`src/b.py`", reason(output))


class GlobPortTest(unittest.TestCase):
    """Casos obrigatorios de paridade do glob / Required glob parity cases."""

    CASES = [
        ("src/**", "src/a/b.py", True),
        ("src/**/*.test.*", "src/a.test.js", True),
        ("src/**/*.test.*", "src/x/a.test.js", True),
        ("**/*.pyc", "a/b/c.pyc", True),
        ("src/*", "src/a/b.py", False),
    ]

    def test_required_cases(self):
        hook = load_hook_module(HOOK)
        for pattern, path, expected in self.CASES:
            with self.subTest(pattern=pattern, path=path):
                self.assertEqual(hook.glob_to_regex(pattern).match(path) is not None, expected)


class UnreadableTasksTest(unittest.TestCase):
    """Erro ao ler as tarefas vira pergunta, nunca silencio nem bloqueio.
    A read error on the tasks becomes a question, never silence or a block."""

    def test_read_error_asks_with_the_error(self):
        hook = load_hook_module(HOOK)
        payload = {
            "session_id": SESSION_ID,
            "tool_input": {"file_path": os.path.join(REPO_ROOT, "src", "a.py")},
        }
        with mock.patch.object(hook, "modo_tarefa_ativo", return_value=False), \
                mock.patch.object(hook, "read_tasks", side_effect=PermissionError("acesso negado")):
            result = hook.decide(payload)
        self.assertIn("acesso negado", result)


# Sonda que roda no proprio motor: devolve os padroes de DEFAULT_CONFIG e o
# resultado de globToRegExp para cada caso recebido na entrada padrao.
# Probe that runs on the engine itself.
ENGINE_PROBE = """\
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [configJs, textJs] = process.argv.slice(2);
const { DEFAULT_CONFIG } = await import(pathToFileURL(configJs).href);
const { globToRegExp } = await import(pathToFileURL(textJs).href);
const cases = JSON.parse(readFileSync(0, 'utf-8'));
const { srcGlobs, testGlobs, ignoreGlobs } = DEFAULT_CONFIG;
console.log(JSON.stringify({
  defaults: { srcGlobs, testGlobs, ignoreGlobs },
  matches: cases.map(([glob, file]) => globToRegExp(glob).test(file)),
}));
"""
ENGINE_SRC = os.path.join(REPO_ROOT, "skills", "fuzkrigo-spec-driven", "scripts", "lib", "src")
NODE = shutil.which("node")
GLOB_MATRIX = [
    ("src/**", "src/a/b.py"), ("src/**", "src"), ("src/**", "srcx/a.py"),
    ("src/**/*.test.*", "src/a.test.js"), ("src/**/*.test.*", "src/x/a.test.js"),
    ("src/**/*.test.*", "src/x/y/a.test.ts"), ("src/**/*.test.*", "src/a.js"),
    ("**/*.pyc", "a/b/c.pyc"), ("**/*.pyc", "c.pyc"),
    ("**/__pycache__/**", "src/__pycache__/m.pyc"),
    ("**/*.egg-info/**", "pkg/x.egg-info/PKG-INFO"), (".venv/**", ".venv/lib/x.py"),
    ("src/*", "src/a/b.py"), ("src/*", "src/a.py"),
    ("src/?.py", "src/a.py"), ("src/?.py", "src/ab.py"),
    ("SRC/**", "src/a.py"), ("src/a.py", "src/aXpy"),
    ("src/a+b(1)$.py", "src/a+b(1)$.py"), ("src/[x]{y}|z^.py", "src/[x]{y}|z^.py"),
    ("**", "a/b/c"),
]


@unittest.skipUnless(NODE, "node nao esta no PATH / node is not on PATH")
class EngineParityTest(unittest.TestCase):
    """Confere o hook contra o proprio motor da fuzkrigo-spec-driven.
    Checks the hook against the fuzkrigo-spec-driven engine itself."""

    @classmethod
    def setUpClass(cls):
        cls.hook = load_hook_module(HOOK)
        with tempfile.TemporaryDirectory() as folder:
            probe = os.path.join(folder, "probe.mjs")
            with open(probe, "w", encoding="utf-8") as handle:
                handle.write(ENGINE_PROBE)
            args = [NODE, probe, os.path.join(ENGINE_SRC, "config.js"),
                    os.path.join(ENGINE_SRC, "util", "text.js")]
            proc = subprocess.run(args, input=json.dumps(GLOB_MATRIX), capture_output=True,
                                  text=True, encoding="utf-8", timeout=60, check=False)
        if proc.returncode != 0:
            raise AssertionError(f"a sonda do motor falhou: {proc.stderr}")
        cls.engine = json.loads(proc.stdout)

    def test_default_globs_match_engine_defaults(self):
        self.assertEqual(self.hook.DEFAULT_GLOBS, self.engine["defaults"])

    def test_glob_semantics_match_engine(self):
        self.assertEqual(len(self.engine["matches"]), len(GLOB_MATRIX))
        for (pattern, path), expected in zip(GLOB_MATRIX, self.engine["matches"]):
            with self.subTest(pattern=pattern, path=path):
                self.assertEqual(self.hook.matches_any(path, [pattern]), expected)


if __name__ == "__main__":
    unittest.main()
