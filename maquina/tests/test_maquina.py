"""Testes da configuracao da maquina versionada (pasta maquina/).
Tests for the versioned machine configuration (maquina/ folder).

O agentes.bash e carregado como o ~/.bashrc o carrega, num bash que expande
aliases. O ai-jail e falso: um script que imprime os argumentos recebidos, um
por linha, e fica na frente do PATH. Os arquivos de configuracao sao lidos
como dados (tomllib e json), sem tocar em nada da maquina real.
agentes.bash is loaded the way ~/.bashrc loads it, in a bash that expands
aliases. ai-jail is a fake: a script that prints the arguments it received,
one per line, placed first on PATH. The config files are read as data
(tomllib and json); nothing on the real machine is touched.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s maquina/tests -v      (Windows)
    python3 -m unittest discover -s maquina/tests -v    (Linux/WSL)
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import tomllib
import unittest
from pathlib import Path

MAQUINA_DIR = Path(__file__).resolve().parent.parent
AGENTES = MAQUINA_DIR / "agentes.bash"
BASH = shutil.which("bash")

EXCHANGE_FOLDER = "/mnt/c/code/Fuzkrigo/fuzkrigo-claude-config/Claude outputs"
MAESTRI_FLAGS = [
    "--env", "MAESTRI_CLI",
    "--env", "MAESTRI_SOCKET",
    "--env", "MAESTRI_WORKSPACE_ID",
    "--env", "MAESTRI_TERMINAL_ID",
    "--env", "TERM_PROGRAM",
]
CLAUDE_SONNET = ["claude", "--model", "sonnet", "--effort", "high"]

# Atalho -> argumentos que o ai-jail deve receber, sem o Maestri.
# Shortcut -> arguments ai-jail must receive, outside Maestri.
SHORTCUTS = {
    "jclaude": ["claude"],
    "jarq": ["--", "claude", "--model", "opus", "--effort", "xhigh"],
    "jeng": ["--"] + CLAUDE_SONNET,
    "jengout": ["--rw-map", EXCHANGE_FOLDER, "--"] + CLAUDE_SONNET,
    "jcodex": ["--", "codex", "-s", "danger-full-access",
               "-m", "gpt-6.2-sol", "-c", "model_reasoning_effort=medium"],
    "jagy": ["--", "agy", "--dangerously-skip-permissions",
             "--model", "gemini-3.8-flash-medium"],
}

# Script do ai-jail falso; so builtins do sh.
# Fake ai-jail script; sh builtins only.
FAKE_AI_JAIL = '#!/bin/sh\nfor arg in "$@"; do echo "$arg"; done\n'

# Palavras que sugerem segredo; so valem fora de comentario.
# Words that hint at a secret; only count outside comments.
SECRET_WORDS = re.compile(r"token|secret|password", re.IGNORECASE)


def machine_files():
    """Arquivos de maquina/ fora de tests/ / Files of maquina/ outside tests/."""
    return sorted(
        path for path in MAQUINA_DIR.rglob("*")
        if path.is_file() and "tests" not in path.relative_to(MAQUINA_DIR).parts
        and "__pycache__" not in path.parts
    )


def without_comments(text):
    """Texto sem comentarios de linha (# no inicio ou depois de espaco).
    Text without line comments (# at line start or after whitespace)."""
    return "\n".join(re.sub(r"(^|\s)#.*$", "", line) for line in text.splitlines())


@unittest.skipUnless(BASH, "bash nao esta no PATH / bash is not on PATH")
class AgentesBashTest(unittest.TestCase):
    def run_shortcut(self, shortcut, extra_env=None):
        """Carrega o agentes.bash e chama o atalho; devolve os argumentos.
        Loads agentes.bash and calls the shortcut; returns the arguments."""
        with tempfile.TemporaryDirectory() as folder:
            fake = Path(folder) / "ai-jail"
            fake.write_text(FAKE_AI_JAIL, encoding="utf-8", newline="\n")
            fake.chmod(0o755)
            env = {k: v for k, v in os.environ.items() if not k.startswith("MAESTRI_")}
            env["PATH"] = folder.replace("\\", "/") + os.pathsep + env.get("PATH", "")
            env.update(extra_env or {})
            # Quebra de linha, nao ";": o alias so vale na linha seguinte ao source.
            # Newline, not ";": the alias only applies from the line after source.
            script = f'shopt -s expand_aliases\n. "{AGENTES.as_posix()}"\n{shortcut}\n'
            proc = subprocess.run(
                [BASH, "-c", script], env=env, capture_output=True, text=True, check=False,
            )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return proc.stdout.splitlines()

    def test_syntax_is_valid(self):
        """bash -n sai 0 / bash -n exits 0."""
        proc = subprocess.run([BASH, "-n", str(AGENTES)], capture_output=True, text=True, check=False)
        self.assertEqual(proc.returncode, 0, proc.stderr)

    def test_each_shortcut_builds_expected_arguments(self):
        """Cada atalho gera os argumentos da tabela / Each shortcut builds its table arguments."""
        for shortcut, expected in SHORTCUTS.items():
            with self.subTest(shortcut=shortcut):
                self.assertEqual(self.run_shortcut(shortcut), expected)

    def test_maestri_terminal_passes_variables_and_socket_folder(self):
        """Com MAESTRI_SOCKET, jeng traz as cinco --env e o --rw-map antes do --.
        With MAESTRI_SOCKET, jeng carries the five --env and the --rw-map before --."""
        args = self.run_shortcut("jeng", {"MAESTRI_SOCKET": "/tmp/maestri-x/sock"})
        self.assertEqual(args, MAESTRI_FLAGS + ["--rw-map", "/tmp/maestri-x", "--"] + CLAUDE_SONNET)

    def test_without_maestri_no_extra_flags(self):
        """Sem MAESTRI_SOCKET nao sobra --env nem --rw-map / Without MAESTRI_SOCKET no --env or --rw-map remains."""
        args = self.run_shortcut("jeng")
        self.assertNotIn("--env", args)
        self.assertNotIn("--rw-map", args)


class ConfigFilesTest(unittest.TestCase):
    def load_toml(self, name):
        """Le um TOML de maquina/ / Reads a TOML from maquina/."""
        with open(MAQUINA_DIR / name, "rb") as handle:
            return tomllib.load(handle)

    def test_ai_jail_config_values(self):
        """ro_maps e allow_hosts exatos / Exact ro_maps and allow_hosts."""
        config = self.load_toml("ai-jail-config.toml")
        self.assertEqual(config["ro_maps"], ["__HOME__/.maestri", "__HOME__/.config/git"])
        self.assertEqual(
            config["commands"]["claude"]["allow_hosts"],
            ["mcp-proxy.anthropic.com", "platform.claude.com"],
        )
        self.assertEqual(config["commands"]["codex"]["allow_hosts"], ["auth.openai.com"])

    def test_codex_config_is_valid_toml(self):
        """codex-config.toml e TOML valido / codex-config.toml is valid TOML."""
        self.assertIsInstance(self.load_toml("codex-config.toml"), dict)

    def test_antigravity_settings_is_valid_json(self):
        """agentMode igual a auto / agentMode equals auto."""
        text = (MAQUINA_DIR / "antigravity-settings.json").read_text(encoding="utf-8")
        self.assertEqual(json.loads(text)["agentMode"], "auto")


class RepositoryHygieneTest(unittest.TestCase):
    def test_there_are_files_to_check(self):
        """Falha se a pasta estiver vazia, senao os testes de varredura passariam sem varrer.
        Fails on an empty folder, else the scanning tests would pass scanning nothing."""
        self.assertGreater(len(machine_files()), 0)

    def test_no_home_path_and_no_secret_words(self):
        """Sem /home/ e sem token, secret ou password fora de comentario.
        No /home/ and no token, secret or password outside comments."""
        for path in machine_files():
            text = path.read_text(encoding="utf-8")
            with self.subTest(file=path.name):
                self.assertNotIn("/home/", text)
                self.assertIsNone(SECRET_WORDS.search(without_comments(text)))

    def test_every_file_is_listed_in_readme(self):
        """Todo arquivo aparece no LEIA-ME.md (ele mesmo fica de fora).
        Every file appears in LEIA-ME.md (it is itself left out)."""
        readme = (MAQUINA_DIR / "LEIA-ME.md").read_text(encoding="utf-8")
        for path in machine_files():
            if path.name == "LEIA-ME.md":
                continue
            with self.subTest(file=path.name):
                self.assertIn(path.relative_to(MAQUINA_DIR).as_posix(), readme)


if __name__ == "__main__":
    unittest.main()
