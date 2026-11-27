"""Testes da configuracao da maquina versionada (pasta maquina/).
Tests for the versioned machine configuration (maquina/ folder).

Os casos de shell usam o shell_sandbox.py; os da gitc ficam no test_gitc.py.
Os arquivos de configuracao sao lidos como dados (tomllib e json), sem tocar
em nada da maquina real.
Shell cases use shell_sandbox.py; the gitc ones live in test_gitc.py. The
config files are read as data (tomllib and json); nothing on the real machine
is touched.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s maquina/tests -v      (Windows)
    python3 -m unittest discover -s maquina/tests -v    (Linux/WSL)
"""
import json
import re
import subprocess
import sys
import tomllib
import unittest

from shell_sandbox import AGENTES, BASH, MAQUINA_DIR, ShellSandbox

# A regra de emoji e a do hook de estilo; nao se repete aqui.
# The emoji rule is the style hook's; it is not repeated here.
sys.path.insert(0, str(MAQUINA_DIR.parent / "hooks"))
from check_style_prohibitions import find_blocking_emoji  # noqa: E402

EXCHANGE_FOLDER = "/mnt/c/code/Fuzkrigo/fuzkrigo-claude-config/Claude outputs"
MAESTRI_FLAGS = [
    "--env", "MAESTRI_CLI",
    "--env", "MAESTRI_SOCKET",
    "--env", "MAESTRI_WORKSPACE_ID",
    "--env", "MAESTRI_TERMINAL_ID",
    "--env", "TERM_PROGRAM",
]
CLAUDE_SONNET = ["claude", "--model", "sonnet", "--effort", "high"]

# Atalho -> argumentos que o ai-jail deve receber, sem o Maestri. O jarq
# fica no teste, porque depende do HOME temporario.
# Shortcut -> arguments ai-jail must receive, outside Maestri. jarq lives in
# the test because it depends on the temporary HOME.
SHORTCUTS = {
    "jclaude": ["claude"],
    "jeng": ["--"] + CLAUDE_SONNET,
    "jengout": ["--rw-map", EXCHANGE_FOLDER, "--"] + CLAUDE_SONNET,
    "jcodex": ["--", "codex", "-s", "danger-full-access",
               "-m", "gpt-6.2-sol", "-c", "model_reasoning_effort=medium"],
    "jagy": ["--", "agy", "--dangerously-skip-permissions",
             "--model", "gemini-3.8-flash-medium"],
}

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


class AgentesBashTest(ShellSandbox):
    def run_shortcut(self, shortcut, extra_env=None, cwd=None):
        """Chama o atalho; devolve os argumentos / Calls the shortcut; returns the arguments."""
        proc = self.run_bash(shortcut, cwd=cwd, extra_env=extra_env)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stderr, "")
        return proc.stdout.splitlines()

    def make_worktree(self):
        """Repositorio principal e worktree ligado com subpasta.
        Main repository and a linked worktree with a subfolder."""
        repo = self.make_repo()
        worktree = self.add_worktree(repo)
        (worktree / "sub").mkdir()
        return repo, worktree

    def test_syntax_is_valid(self):
        """bash -n sai 0 / bash -n exits 0."""
        proc = subprocess.run([BASH, "-n", str(AGENTES)], capture_output=True, text=True, check=False)
        self.assertEqual(proc.returncode, 0, proc.stderr)

    def test_each_shortcut_builds_expected_arguments(self):
        """Cada atalho gera os argumentos da tabela; o jarq monta a pasta das faixas.
        Each shortcut builds its table arguments; jarq mounts the lanes folder."""
        # O HOME como o bash o ve (no Windows, em formato MSYS).
        # HOME as bash sees it (MSYS form on Windows).
        home = self.run_bash('echo "$HOME"').stdout.strip()
        jarq = ["--rw-map", f"{home}/code/fuzkrigo-worktrees",
                "--", "claude", "--model", "opus", "--effort", "xhigh"]
        for shortcut, expected in {**SHORTCUTS, "jarq": jarq}.items():
            with self.subTest(shortcut=shortcut):
                self.assertEqual(self.run_shortcut(shortcut), expected)

    def test_sourcing_creates_lanes_folder_silently(self):
        """Ler o arquivo cria a pasta das faixas, sem saida, mesmo repetido.
        Sourcing the file creates the lanes folder, silently, even when repeated."""
        for attempt in ("first", "again"):
            with self.subTest(attempt=attempt):
                proc = self.run_bash(":")
                self.assertEqual((proc.returncode, proc.stdout, proc.stderr), (0, "", ""))
                self.assertTrue((self.home / "code" / "fuzkrigo-worktrees").is_dir())

    def test_worktree_flag_only_at_linked_worktree_root(self):
        """--worktree so na raiz de um worktree ligado.
        --worktree only at the root of a linked worktree."""
        repo, worktree = self.make_worktree()
        with self.subTest(place="worktree root"):
            self.assertEqual(
                self.run_shortcut("jeng", cwd=worktree), ["--worktree", "--"] + CLAUDE_SONNET,
            )
        places = {"main repo": repo, "worktree subfolder": worktree / "sub", "no repo": self.work}
        for place, cwd in places.items():
            with self.subTest(place=place):
                self.assertEqual(self.run_shortcut("jeng", cwd=cwd), ["--"] + CLAUDE_SONNET)

    def forge_git_dir(self, lane, target):
        """Pasta git falsa dentro da faixa, com commondir no repositorio alvo.
        Fake git dir inside the lane, with commondir in the target repository."""
        fake = lane / ".fake"
        fake.mkdir()
        for name, content in (
            ("commondir", (target / ".git").as_posix()),
            ("gitdir", (lane / ".git").as_posix()),
            ("HEAD", "ref: refs/heads/lane"),
        ):
            (fake / name).write_text(content + "\n", encoding="utf-8", newline="\n")
        (lane / ".git").write_text(f"gitdir: {fake.as_posix()}\n", encoding="utf-8", newline="\n")

    def borrow_git_file(self, lane, target):
        """.git da faixa copiado de um worktree de outro repositorio.
        Lane .git copied from another repository's worktree."""
        other = self.add_worktree(target, f"other-of-{lane.name}")
        (lane / ".git").write_bytes((other / ".git").read_bytes())

    def link_git_file(self, lane, target):
        """.git da faixa como link para o de um worktree de outro repositorio.
        Lane .git as a link to another repository's worktree one."""
        other = self.add_worktree(target, f"other-of-{lane.name}")
        (lane / ".git").unlink()
        try:
            (lane / ".git").symlink_to(other / ".git")
        except OSError as error:
            self.skipTest(f"sem permissao para link / cannot create symlink: {error}")

    def test_forged_worktree_gets_no_flag(self):
        """.git adulterado para outro repositorio nao ganha --worktree.
        A .git tampered to reach another repository gets no --worktree."""
        forgeries = (self.forge_git_dir, self.borrow_git_file, self.link_git_file)
        for number, forge in enumerate(forgeries):
            with self.subTest(forgery=forge.__name__):
                repo, target = self.make_repo(f"repo-{number}"), self.make_repo(f"target-{number}")
                lane = self.add_worktree(repo, f"lane-{number}")
                # Antes da adulteracao a faixa ganha a flag. / Before tampering it gets the flag.
                self.assertIn("--worktree", self.run_shortcut("jeng", cwd=lane))
                forge(lane, target)
                # O git aceita a faixa adulterada. / git accepts the tampered lane.
                common = self.git(lane, "rev-parse", "--path-format=absolute", "--git-common-dir")
                self.assertTrue((target / ".git").samefile(common.strip()), common)
                self.assertNotIn("--worktree", self.run_shortcut("jeng", cwd=lane))

    def test_relative_paths_worktree_gets_flag(self):
        """Worktree com caminhos relativos continua ganhando a flag.
        A worktree with relative paths still gets the flag."""
        repo, lane = self.make_repo(), self.root / "lane"
        proc = subprocess.run(
            ["git", "-C", str(repo), "worktree", "add", "-q", "--relative-paths",
             str(lane), "-b", "lane"],
            env=self.env(), capture_output=True, text=True, check=False,
        )
        if "unknown option" in proc.stderr:
            self.skipTest("git sem --relative-paths / git without --relative-paths")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("--worktree", self.run_shortcut("jeng", cwd=lane))

    def test_maestri_terminal_in_worktree_carries_both(self):
        """No Maestri e na raiz do worktree: --worktree, as --env e o --rw-map.
        Inside Maestri at the worktree root: --worktree, the --env and the --rw-map."""
        _, worktree = self.make_worktree()
        args = self.run_shortcut("jeng", {"MAESTRI_SOCKET": "/tmp/maestri-x/sock"}, cwd=worktree)
        self.assertEqual(
            args,
            ["--worktree"] + MAESTRI_FLAGS + ["--rw-map", "/tmp/maestri-x", "--"] + CLAUDE_SONNET,
        )

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

    def test_ai_jail_shares_policy_across_worktrees(self):
        """project_strategy no topo, fora das secoes / project_strategy at top level."""
        config = self.load_toml("ai-jail-config.toml")
        self.assertEqual(config.get("project_strategy"), "repo-root")
        for name, section in config["commands"].items():
            with self.subTest(command=name):
                self.assertNotIn("project_strategy", section)

    def test_executor_agents_file(self):
        """Existe, cabe com folga no limite do Codex e nao tem emoji nem /home/.
        Exists, fits well under the Codex limit, and has no emoji or /home/."""
        path = MAQUINA_DIR / "agents-executor.md"
        self.assertTrue(path.is_file(), "falta agents-executor.md / missing")
        self.assertLess(path.stat().st_size, 8 * 1024)
        text = path.read_text(encoding="utf-8")
        self.assertNotIn("/home/", text)
        self.assertIsNone(find_blocking_emoji(text))

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
