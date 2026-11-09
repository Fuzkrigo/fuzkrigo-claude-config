"""Testes do lancador do Python dos hooks (run-python.sh).
Tests for the hooks' Python launcher (run-python.sh).

O lancador e chamado como o settings.json chama: carregado com "." por um
bash -c, com o PATH do subprocesso controlado pelo teste. Os interpretadores
sao falsos: scripts chamados py e python3 que imprimem o proprio nome e os
argumentos, um por linha, e saem com 3. O PATH tem so a pasta deles, para o
py real da maquina (ou do runner do Windows) nao interferir.
The launcher is called the way settings.json calls it: sourced with "." by a
bash -c, with the subprocess PATH controlled by the test. The interpreters
are fakes: scripts named py and python3 that print their own name and their
arguments, one per line, and exit with 3. PATH holds only their folder, so
the machine's real py (or the Windows runner's) cannot interfere.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s hooks/tests -v      (Windows)
    python3 -m unittest discover -s hooks/tests -v    (Linux/WSL)
"""
import os
import shutil
import subprocess
import tempfile
import unittest

from hook_runner import HOOKS_DIR

# Barras normais: o bash do Git for Windows aceita C:/..., e o Linux nao muda.
# Forward slashes: Git for Windows' bash takes C:/..., and Linux is unchanged.
LAUNCHER = os.path.join(HOOKS_DIR, "run-python.sh").replace("\\", "/")
BASH = shutil.which("bash")
HOOK_SCRIPT = "/hooks/arm_modo_tarefa.py"
FAKE_EXIT_CODE = 3

# So builtins do sh: o PATH do teste nao tem printf nem nada externo.
# Only sh builtins: the test PATH has no external printf or anything else.
FAKE_INTERPRETER = (
    "#!/bin/sh\n"
    "echo {name}\n"
    'for arg in "$@"; do echo "$arg"; done\n'
    "exit {code}\n"
)


@unittest.skipUnless(BASH, "bash nao esta no PATH / bash is not on PATH")
class RunPythonTest(unittest.TestCase):
    def run_launcher(self, interpreters, args=""):
        """Roda o lancador com so os interpretadores falsos pedidos no PATH.
        Runs the launcher with only the requested fake interpreters on PATH."""
        with tempfile.TemporaryDirectory() as folder:
            for name in interpreters:
                path = os.path.join(folder, name)
                with open(path, "w", encoding="utf-8", newline="\n") as handle:
                    handle.write(FAKE_INTERPRETER.format(name=name, code=FAKE_EXIT_CODE))
                os.chmod(path, 0o755)
            env = dict(os.environ, PATH=folder)
            command = f'. "{LAUNCHER}" "{HOOK_SCRIPT}" {args}'.rstrip()
            proc = subprocess.run(
                [BASH, "-c", command], capture_output=True,
                env=env, timeout=60, check=False,
            )
        lines = proc.stdout.decode("utf-8", "replace").splitlines()
        return proc.returncode, lines, proc.stderr.decode("utf-8", "replace")

    def test_prefers_py_with_dash_3_when_both_exist(self):
        _, lines, stderr = self.run_launcher(["py", "python3"], "--flag")
        self.assertEqual(lines, ["py", "-3", HOOK_SCRIPT, "--flag"], stderr)

    def test_falls_back_to_python3_without_py(self):
        _, lines, stderr = self.run_launcher(["python3"], "--flag")
        self.assertEqual(lines, ["python3", HOOK_SCRIPT, "--flag"], stderr)

    def test_argument_with_space_stays_one_argument(self):
        _, lines, stderr = self.run_launcher(["python3"], '"a b"')
        self.assertEqual(lines, ["python3", HOOK_SCRIPT, "a b"], stderr)

    def test_without_interpreter_exits_1_and_names_both(self):
        code, lines, stderr = self.run_launcher([])
        # 2 bloquearia a acao no Claude Code; 1 e erro que nao bloqueia.
        # 2 would block the action in Claude Code; 1 is a non-blocking error.
        self.assertEqual(code, 1, stderr)
        self.assertEqual(lines, [])
        self.assertRegex(stderr, r"\bpy\b")
        self.assertIn("python3", stderr)
        self.assertIn(" / ", stderr, "mensagem bilingue: PT / EN")

    def test_returns_the_interpreter_exit_code(self):
        code, _, stderr = self.run_launcher(["python3"])
        self.assertEqual(code, FAKE_EXIT_CODE, stderr)


if __name__ == "__main__":
    unittest.main()
