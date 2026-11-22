"""Testes da linha de comando dos hooks no settings.json.
Tests for the hooks' command line in settings.json.

Roda a linha exatamente como esta no settings.json, no shell que o Claude Code
usa (sh -c fora do Windows; bash -c, o Git Bash, no Windows). O HOME do
subprocesso e uma pasta temporaria com a copia do lancador do repositorio e,
no lugar de cada hook, um script Python falso que imprime o proprio nome e o
que leu da entrada padrao. Assim o teste prova que o hook certo e chamado e
recebe o evento, sem depender da logica dos hooks reais.
Runs the line exactly as it is in settings.json, in the shell Claude Code
uses (sh -c outside Windows; bash -c, Git Bash, on Windows). The subprocess
HOME is a temporary folder with a copy of the repository's launcher and, in
place of each hook, a fake Python script that prints its own name and what it
read from stdin. So the test proves the right hook is called and receives the
event, without depending on the real hooks' logic.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s hooks/tests -v      (Windows)
    python3 -m unittest discover -s hooks/tests -v    (Linux/WSL)
"""
import glob
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest

from hook_runner import HOOKS_DIR, REPO_ROOT

LAUNCHER_NAME = "run-python.sh"
IS_WINDOWS = os.name == "nt"
# O Claude Code roda o comando num sh -c no Linux/macOS e no Git Bash no Windows.
# Claude Code runs the command in sh -c on Linux/macOS and in Git Bash on Windows.
SHELL_NAME = "bash" if IS_WINDOWS else "sh"
SHELL = shutil.which(SHELL_NAME)
EVENT = '{"hook_event_name": "Teste", "n": 1}'

# O script falso imprime um JSON com o nome do hook e a entrada que recebeu.
# The fake script prints a JSON with the hook's name and the input it received.
FAKE_HOOK = (
    "import json, sys\n"
    "print(json.dumps({{'hook': {name!r}, 'stdin': sys.stdin.read()}}))\n"
)

# A forma antiga, proibida: "." nao repassa os argumentos no sh (dash).
# The old, forbidden form: "." does not pass the arguments in sh (dash).
LEGACY_LINE = (
    '. "$HOME/.claude/hooks/run-python.sh" '
    '"$HOME/.claude/hooks/arm_modo_tarefa.py"'
)


def load_launcher_commands():
    """Comandos do settings.json que citam o lancador.
    settings.json commands that mention the launcher."""
    with open(os.path.join(REPO_ROOT, "settings.json"), encoding="utf-8") as handle:
        settings = json.load(handle)
    commands = []
    for groups in settings.get("hooks", {}).values():
        for group in groups:
            for hook in group.get("hooks", []):
                command = hook.get("command", "")
                if hook.get("type") == "command" and LAUNCHER_NAME in command:
                    commands.append(command)
    return commands


def script_of(command):
    """Nome do .py chamado pela linha / Name of the .py the line calls."""
    found = re.findall(r"([\w.-]+\.py)\"?\s*$", command)
    return found[0] if found else None


def real_hook_names():
    """Os .py de hooks/ (nao os dos testes) / The .py files in hooks/ (not tests)."""
    pattern = os.path.join(HOOKS_DIR, "*.py")
    return sorted(os.path.basename(path) for path in glob.glob(pattern))


def run_line(command, hook_name):
    """Roda a linha no shell real com o HOME falso; devolve o processo.
    Runs the line in the real shell with the fake HOME; returns the process."""
    with tempfile.TemporaryDirectory() as home:
        hooks_dir = os.path.join(home, ".claude", "hooks")
        os.makedirs(hooks_dir)
        shutil.copyfile(
            os.path.join(HOOKS_DIR, LAUNCHER_NAME),
            os.path.join(hooks_dir, LAUNCHER_NAME),
        )
        with open(os.path.join(hooks_dir, hook_name), "w", encoding="utf-8") as handle:
            handle.write(FAKE_HOOK.format(name=hook_name))
        # Barras normais: o Git Bash aceita C:/..., e o Linux nao muda.
        # Forward slashes: Git Bash takes C:/..., and Linux is unchanged.
        env = dict(os.environ, HOME=home.replace("\\", "/"))
        return subprocess.run(
            [SHELL, "-c", command], input=EVENT.encode("utf-8"),
            capture_output=True, env=env, timeout=60, check=False,
        )


def python_on_path():
    return bool(shutil.which("py") or shutil.which("python3"))


class SettingsHooksFormTest(unittest.TestCase):
    def test_every_launcher_line_starts_with_bash_not_dot(self):
        commands = load_launcher_commands()
        self.assertTrue(commands, "nenhum hook chama o lancador / no hook calls the launcher")
        for command in commands:
            with self.subTest(command=command):
                self.assertTrue(
                    command.startswith("bash "),
                    "a linha deve comecar com 'bash ' (o '.' nao repassa argumentos no sh) "
                    "/ the line must start with 'bash ' ('.' drops arguments in sh)",
                )

    def test_scripts_called_are_exactly_the_hooks_folder_scripts(self):
        called = sorted(script_of(command) for command in load_launcher_commands())
        self.assertEqual(called, real_hook_names())


@unittest.skipUnless(SHELL, f"{SHELL_NAME} nao esta no PATH / {SHELL_NAME} is not on PATH")
@unittest.skipUnless(python_on_path(), "nem py nem python3 no PATH / neither py nor python3 on PATH")
class SettingsHooksRealShellTest(unittest.TestCase):
    def test_real_line_runs_the_right_hook_with_stdin_intact(self):
        for command in load_launcher_commands():
            name = script_of(command)
            with self.subTest(hook=name):
                proc = run_line(command, name)
                stdout = proc.stdout.decode("utf-8", "replace")
                stderr = proc.stderr.decode("utf-8", "replace")
                self.assertEqual(proc.returncode, 0, stderr)
                # Saida vazia: o hook nao rodou (saida 0 sem fazer nada).
                # Empty output: the hook did not run (exit 0 doing nothing).
                self.assertTrue(stdout.strip(), "o hook nao imprimiu nada / the hook printed nothing")
                result = json.loads(stdout)
                self.assertEqual(result["hook"], name)
                self.assertEqual(result["stdin"], EVENT)

    @unittest.skipIf(IS_WINDOWS, "no Windows o sh e o Git Bash, que aceita '.' com argumentos "
                                 "/ on Windows the shell is Git Bash, which takes '.' with arguments")
    def test_old_dot_form_does_not_run_the_hook_in_sh(self):
        # Controle do defeito: documenta por que a forma com "." e proibida.
        # Defect control: documents why the "." form is forbidden.
        probe = subprocess.run(
            [SHELL, "-c", "echo $BASH_VERSION"], capture_output=True, check=False,
        )
        if probe.stdout.strip():
            self.skipTest("o sh deste sistema e bash e repassa os argumentos "
                          "/ this system's sh is bash and passes the arguments")
        proc = run_line(LEGACY_LINE, "arm_modo_tarefa.py")
        self.assertNotIn(b"arm_modo_tarefa.py", proc.stdout)


if __name__ == "__main__":
    unittest.main()
