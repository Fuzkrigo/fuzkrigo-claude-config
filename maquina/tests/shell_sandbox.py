"""Base dos testes de shell da maquina, sem casos proprios.
Base for the machine shell tests, with no cases of its own.

O agentes.bash e carregado como o ~/.bashrc o carrega, num bash que expande
aliases. O ai-jail e falso: um script que imprime os argumentos recebidos, um
por linha, e fica na frente do PATH. Cada caso roda com HOME temporario e git
isolado da configuracao do usuario.
agentes.bash is loaded the way ~/.bashrc loads it, in a bash that expands
aliases. ai-jail is a fake: a script that prints the arguments it received, one
per line, placed first on PATH. Every case runs with a temporary HOME and git
isolated from the user's configuration.
"""
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

MAQUINA_DIR = Path(__file__).resolve().parent.parent
AGENTES = MAQUINA_DIR / "agentes.bash"
BASH = shutil.which("bash")

# Script do ai-jail falso; so builtins do sh.
# Fake ai-jail script; sh builtins only.
FAKE_AI_JAIL = '#!/bin/sh\nfor arg in "$@"; do echo "$arg"; done\n'


@unittest.skipUnless(BASH, "bash nao esta no PATH / bash is not on PATH")
class ShellSandbox(unittest.TestCase):
    """HOME temporario, ai-jail falso e git isolado.
    Temporary HOME, fake ai-jail and isolated git."""

    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.root = Path(folder.name).resolve()
        self.home, self.work, self.bin = (self.root / name for name in ("home", "work", "bin"))
        for path in (self.home, self.work, self.bin):
            path.mkdir()
        fake = self.bin / "ai-jail"
        fake.write_text(FAKE_AI_JAIL, encoding="utf-8", newline="\n")
        fake.chmod(0o755)

    def env(self, extra=None):
        """Ambiente sem MAESTRI_*, GIT_* nem BASH_ENV do usuario.
        Environment without the user's MAESTRI_*, GIT_* or BASH_ENV."""
        env = {
            key: value for key, value in os.environ.items()
            if not key.startswith(("MAESTRI_", "GIT_")) and key != "BASH_ENV"
        }
        env.update({
            "HOME": self.home.as_posix(),
            "XDG_CONFIG_HOME": (self.home / ".config").as_posix(),
            "PATH": self.bin.as_posix() + os.pathsep + env.get("PATH", ""),
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CEILING_DIRECTORIES": str(self.root),
            "GIT_AUTHOR_NAME": "Test", "GIT_AUTHOR_EMAIL": "test@example.invalid",
            "GIT_COMMITTER_NAME": "Test", "GIT_COMMITTER_EMAIL": "test@example.invalid",
        })
        env.update(extra or {})
        return env

    def run_bash(self, command, cwd=None, extra_env=None, merge_stderr=False, stdin=""):
        """Carrega o agentes.bash e roda o comando / Loads agentes.bash and runs the command."""
        # Quebra de linha, nao ";": o alias so vale na linha seguinte ao source.
        # Newline, not ";": the alias only applies from the line after source.
        script = f'shopt -s expand_aliases\n. "{AGENTES.as_posix()}"\n{command}\n'
        return subprocess.run(
            [BASH, "-c", script], cwd=cwd or self.work, env=self.env(extra_env),
            input=stdin, stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT if merge_stderr else subprocess.PIPE,
            text=True, check=False,
        )

    def git(self, repo, *args):
        """git de preparacao, que tem de dar certo / Setup git, which must succeed."""
        proc = subprocess.run(
            ["git", "-C", str(repo), *args], env=self.env(),
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return proc.stdout

    def make_repo(self, name="repo"):
        """Repositorio com um commit / Repository with one commit."""
        repo = self.root / name
        repo.mkdir()
        self.git(repo, "init", "-q", "-b", "main")
        self.git(repo, "commit", "-q", "--allow-empty", "-m", "init")
        return repo

    def add_worktree(self, repo, name="lane"):
        """Worktree ligado numa pasta irma / Linked worktree in a sibling folder."""
        worktree = self.root / name
        self.git(repo, "worktree", "add", "-q", str(worktree), "-b", name)
        return worktree
