"""Testes da funcao gitc ("git conferido") do agentes.bash.
Tests for the gitc ("checked git") function of agentes.bash.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s maquina/tests -v      (Windows)
    python3 -m unittest discover -s maquina/tests -v    (Linux/WSL)
"""
import os
import unittest

from shell_sandbox import ShellSandbox

# Chave achada -> chamadas de "git config" que a criam; valores inofensivos.
# Finding -> "git config" calls that create it; harmless values.
CONFIG_FINDINGS = {
    "core.fsmonitor": [("core.fsmonitor", "false")],
    "core.hooksPath": [("core.hooksPath", "other-hooks")],
    "core.pager": [("core.pager", "cat")],
    "include.path": [("include.path", "extra.inc")],
    "core.sshCommand": [
        ("extensions.worktreeConfig", "true"),
        ("--worktree", "core.sshCommand", "ssh"),
    ],
}


class GitcSandbox(ShellSandbox):
    """Preparacao comum, sem casos / Shared setup, no cases."""

    def clean_repo(self, name="repo"):
        """Repositorio so com chaves permitidas / Repository with allowed keys only."""
        repo = self.make_repo(name)
        for key, value in (
            ("remote.origin.url", "https://example.invalid/repo.git"),
            ("remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"),
            ("branch.main.remote", "origin"),
            ("branch.main.merge", "refs/heads/main"),
        ):
            self.git(repo, "config", key, value)
        return repo

    def make_bare(self, name="remote.git"):
        """Repositorio bare que serve de remoto local / Bare repository used as local remote."""
        bare = self.root / name
        bare.mkdir()
        self.git(bare, "init", "-q", "--bare", "-b", "main")
        return bare

    def add_hook(self, git_dir, name):
        """Grava um hook inofensivo / Writes a harmless hook."""
        hook = git_dir / "hooks" / name
        hook.parent.mkdir(exist_ok=True)
        hook.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8", newline="\n")
        hook.chmod(0o755)

    def assert_refused(self, repo, finding):
        """Saida 1, achado citado e comando nao executado.
        Exit 1, finding named and command not run."""
        proc = self.run_bash("gitc branch marker", cwd=repo, merge_stderr=True)
        self.assertEqual(proc.returncode, 1, proc.stdout)
        # O git devolve o nome da variavel em minusculas. / git lowercases variable names.
        self.assertIn(finding.lower(), proc.stdout.lower())
        self.assertEqual(self.git(repo, "branch", "--list", "marker"), "")


class GitcCheckTest(GitcSandbox):
    def test_clean_repository_passes_check(self):
        """--confere em repositorio limpo sai 0 / --confere on a clean repository exits 0."""
        proc = self.run_bash("gitc --confere", cwd=self.clean_repo())
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.strip(), "gitc: repositorio conferido")

    def test_outside_repository_exits_2(self):
        """Fora de repositorio: mensagem e saida 2 / Outside a repository: message and exit 2."""
        proc = self.run_bash("gitc status", merge_stderr=True)
        self.assertEqual(proc.returncode, 2, proc.stdout)
        self.assertIn("gitc:", proc.stdout)

    def test_refuses_hook(self):
        """Um hook pre-push barra o comando / A pre-push hook blocks the command."""
        repo = self.clean_repo()
        self.add_hook(repo / ".git", "pre-push")
        self.assert_refused(repo, "pre-push")

    def test_refuses_config_key_outside_list(self):
        """Chave local ou de worktree fora da lista barra o comando.
        A local or worktree key outside the list blocks the command."""
        for number, (finding, calls) in enumerate(CONFIG_FINDINGS.items()):
            with self.subTest(finding=finding):
                repo = self.clean_repo(f"repo-{number}")
                for call in calls:
                    self.git(repo, "config", *call)
                self.assert_refused(repo, finding)

    def test_refuses_key_in_any_worktree_config(self):
        """O config.worktree de qualquer worktree conta, nao so o do atual.
        Any worktree's config.worktree counts, not only the current one."""
        for number, (written_in, run_from) in enumerate((("lane", "main"), ("main", "lane"))):
            with self.subTest(written_in=written_in, run_from=run_from):
                repo = self.clean_repo(f"repo-{number}")
                folders = {"main": repo, "lane": self.add_worktree(repo, f"lane-{number}")}
                self.git(repo, "config", "extensions.worktreeConfig", "true")
                self.git(folders[written_in], "config", "--worktree", "core.pager", "cat")
                self.assert_refused(folders[run_from], "core.pager")

    def test_command_runs_with_hooks_disabled(self):
        """O -c core.hooksPath chega ao git / The -c core.hooksPath reaches git."""
        proc = self.run_bash("gitc config --get core.hooksPath", cwd=self.clean_repo())
        self.assertEqual(proc.returncode, 0, proc.stderr)
        # No Git for Windows o MSYS reescreve /dev/null como nul.
        # On Git for Windows, MSYS rewrites /dev/null as nul.
        expected = ["/dev/null", "nul"] if os.name == "nt" else ["/dev/null"]
        self.assertIn(proc.stdout.strip(), expected)

    def test_refuses_options_before_subcommand(self):
        """Opcao antes do subcomando (-C, --git-dir, --work-tree) sai 2 sem rodar.
        An option before the subcommand (-C, --git-dir, --work-tree) exits 2 unrun."""
        repo, other = self.clean_repo(), self.clean_repo("other")
        self.add_hook(other / ".git", "pre-push")
        target = other.as_posix()
        forms = (
            f'-C "{target}"', f'--git-dir="{target}/.git"', f'--git-dir "{target}/.git"',
            f'--work-tree="{target}"', f'--work-tree "{target}"', f'--no-pager -C "{target}"',
        )
        for form in forms:
            with self.subTest(form=form):
                proc = self.run_bash(f"gitc {form} branch marker", cwd=repo, merge_stderr=True)
                self.assertEqual(proc.returncode, 2, proc.stdout)
                self.assertIn("gitc:", proc.stdout)
                for folder in (repo, other):
                    self.assertEqual(self.git(folder, "branch", "--list", "marker"), "")

    def test_options_after_subcommand_pass(self):
        """-C depois do subcomando e do proprio git / -C after the subcommand is git's own."""
        repo = self.clean_repo()
        proc = self.run_bash("gitc commit -q --allow-empty -C HEAD", cwd=repo, merge_stderr=True)
        self.assertEqual(proc.returncode, 0, proc.stdout)
        self.assertEqual(self.git(repo, "rev-list", "--count", "HEAD").strip(), "2")


class GitcLocalRemoteTest(GitcSandbox):
    def assert_destination_refused(self, repo, bare, finding):
        """--confere e push recusam, e nada chega ao destino.
        --confere and push refuse, and nothing reaches the destination."""
        for command in ("gitc --confere", "gitc push origin main"):
            proc = self.run_bash(command, cwd=repo / "sub", stdin=b"s\n", merge_stderr=True)
            self.assertEqual(proc.returncode, 1, f"{command}: {proc.stdout}")
            self.assertIn(finding.lower(), proc.stdout.lower())
        if bare is not None:
            self.assertEqual(self.git(bare, "for-each-ref"), "")

    def repo_pushing_to(self, number, url):
        repo = self.make_repo(f"repo-{number}")
        (repo / "sub").mkdir()
        self.git(repo, "config", "remote.origin.url", url)
        return repo

    def test_refuses_hook_in_local_destination(self):
        """Hook no remoto local barra, em qualquer forma de URL que o git aceita.
        A hook in a local remote blocks, in any URL form git accepts."""
        forms = {
            "absolute": lambda bare: bare.as_posix(),
            "relative": lambda bare: f"../{bare.name}",
            "file url": lambda bare: bare.as_uri(),
            # O git completa o sufixo .git sozinho. / git adds the .git suffix itself.
            "without suffix": lambda bare: bare.as_posix().removesuffix(".git"),
        }
        for number, (form, url_of) in enumerate(forms.items()):
            with self.subTest(form=form):
                bare = self.make_bare(f"evil-{number}.git")
                self.add_hook(bare, "post-receive")
                repo = self.repo_pushing_to(number, url_of(bare))
                self.assert_destination_refused(repo, bare, "post-receive")

    def test_refuses_hook_in_destination_with_work_tree(self):
        """Destino com arvore de trabalho: vale o .git/hooks dele.
        Destination with a work tree: its .git/hooks counts."""
        target = self.make_repo("target")
        self.add_hook(target / ".git", "pre-receive")
        repo = self.repo_pushing_to(0, target.as_posix())
        self.assert_destination_refused(repo, None, "pre-receive")

    def test_refuses_config_key_in_local_destination(self):
        """Chave fora da lista na configuracao do destino tambem barra.
        A key outside the list in the destination's config also blocks."""
        bare = self.make_bare()
        self.git(bare, "config", "core.fsmonitor", "false")
        repo = self.repo_pushing_to(0, bare.as_posix())
        self.assert_destination_refused(repo, bare, "core.fsmonitor")

    def test_checks_every_url_of_a_remote(self):
        """Um segundo URL no mesmo remoto tambem e conferido.
        A second URL on the same remote is checked too."""
        clean, evil = self.make_bare("clean.git"), self.make_bare("evil.git")
        self.add_hook(evil, "post-receive")
        repo = self.repo_pushing_to(0, clean.as_posix())
        self.git(repo, "config", "--add", "remote.origin.url", evil.as_posix())
        self.assert_destination_refused(repo, evil, "post-receive")


    def evil_remote(self, parent=None):
        """Bare com hook de recebimento, na raiz ou em outra pasta.
        Bare repository with a receive hook, in the root or another folder."""
        bare = self.make_bare("evil.git") if parent is None else parent / "evil.git"
        if parent is not None:
            self.git(parent, "init", "-q", "--bare", "-b", "main", "evil.git")
        self.add_hook(bare, "post-receive")
        return bare

    def test_refuses_path_in_branch_remote(self):
        """branch.<nome>.remote aceita um caminho no lugar do nome do remoto.
        branch.<name>.remote takes a path in place of the remote name."""
        bare = self.evil_remote()
        repo = self.make_repo("repo-0")
        (repo / "sub").mkdir()
        self.git(repo, "config", "branch.main.remote", "../evil.git")
        self.assert_destination_refused(repo, bare, "post-receive")

    def test_refuses_legacy_remote_files(self):
        """.git/remotes e .git/branches definem destino fora da configuracao.
        .git/remotes and .git/branches define a destination outside the config."""
        files = {"remotes": "URL: ../evil.git\n", "branches": "../evil.git\n"}
        bare = self.evil_remote()
        for number, (folder, content) in enumerate(files.items()):
            with self.subTest(folder=folder):
                repo = self.make_repo(f"repo-{number}")
                (repo / "sub").mkdir()
                legacy = repo / ".git" / folder / "origin"
                legacy.parent.mkdir(exist_ok=True)
                legacy.write_text(content, encoding="utf-8", newline="\n")
                self.assert_destination_refused(repo, bare, f"{folder}/origin")

    def test_refuses_hook_in_home_relative_destination(self):
        """O git expande ~/ no caminho do remoto / git expands ~/ in the remote path."""
        bare = self.evil_remote(parent=self.home)
        repo = self.repo_pushing_to(0, "~/evil.git")
        self.assert_destination_refused(repo, bare, "post-receive")

    def test_refuses_percent_encoded_file_url(self):
        """O git decodifica %XX em file://; a gitc recusa o URL.
        git decodes %XX in file://; gitc refuses the URL."""
        bare = self.evil_remote()
        url = bare.as_uri().replace("evil.git", "%65vil.git")
        repo = self.repo_pushing_to(0, url)
        self.assert_destination_refused(repo, bare, "%65vil.git")

    def test_refuses_destination_given_on_command_line(self):
        """Destino passado no push, fora da configuracao, tambem e conferido.
        A destination given to push, outside the config, is checked too."""
        bare = self.evil_remote()
        repo = self.make_repo("repo-0")
        proc = self.run_bash(
            "gitc push ../evil.git main", cwd=repo, stdin=b"s\n", merge_stderr=True,
        )
        self.assertEqual(proc.returncode, 1, proc.stdout)
        self.assertIn("post-receive", proc.stdout)
        self.assertEqual(self.git(bare, "for-each-ref"), "")


class GitcPushTest(GitcSandbox):
    def push_setup(self):
        """Repositorio com dois remotos locais limpos / Repository with two clean local remotes."""
        repo = self.make_repo()
        remotes = {name: self.make_bare(f"{name}.git") for name in ("origin", "backup")}
        for name, bare in remotes.items():
            self.git(repo, "remote", "add", name, bare.as_posix())
        self.git(repo, "config", "branch.main.remote", "origin")
        self.git(repo, "config", "branch.main.merge", "refs/heads/main")
        return repo, remotes

    def test_push_prints_destination_and_asks_before_sending(self):
        """URL, pergunta e so depois o envio, para o remoto certo.
        URL, question and only then the upload, to the right remote."""
        cases = {
            "gitc push -u origin main": ("origin", "backup"),
            "gitc push": ("origin", "backup"),
            "gitc push backup main": ("backup", "origin"),
        }
        for command, (target, untouched) in cases.items():
            with self.subTest(command=command):
                self.setUp()
                repo, remotes = self.push_setup()
                url = remotes[target].as_posix()
                proc = self.run_bash(command, cwd=repo, stdin=b"s\n", merge_stderr=True)
                self.assertEqual(proc.returncode, 0, proc.stdout)
                # "To <url>" abre o relatorio do push. / "To <url>" opens the push report.
                shown, asked, sent = (
                    proc.stdout.find(text) for text in (url, "[s/N]", f"To {url}")
                )
                self.assertTrue(0 <= shown < asked < sent, proc.stdout)
                self.assertNotIn(remotes[untouched].as_posix(), proc.stdout)
                self.assertEqual(
                    self.git(remotes[target], "rev-parse", "main"),
                    self.git(repo, "rev-parse", "main"),
                )

    def test_push_accepts_answer_with_carriage_return(self):
        """Resposta terminada em CR LF, como no Windows, tambem envia.
        An answer ending in CR LF, as on Windows, sends too."""
        repo, remotes = self.push_setup()
        proc = self.run_bash(
            "gitc push origin main", cwd=repo, stdin=b"s\r\n", merge_stderr=True,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout)
        self.assertEqual(
            self.git(remotes["origin"], "rev-parse", "main"),
            self.git(repo, "rev-parse", "main"),
        )

    def test_push_without_yes_sends_nothing(self):
        """Resposta diferente de s, vazia ou sem entrada: nada e enviado.
        Any answer but s, empty or no input: nothing is sent."""
        repo, remotes = self.push_setup()
        for label, answer in {"no": b"n\n", "enter": b"\n", "no input": b""}.items():
            with self.subTest(answer=label):
                proc = self.run_bash(
                    "gitc push origin main", cwd=repo, stdin=answer, merge_stderr=True,
                )
                self.assertEqual(proc.returncode, 1, proc.stdout)
                self.assertIn("[s/N]", proc.stdout)
                self.assertEqual(self.git(remotes["origin"], "for-each-ref"), "")


if __name__ == "__main__":
    unittest.main()
