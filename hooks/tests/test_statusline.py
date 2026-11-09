"""Testes da status line (statusline.sh), que o harness roda pelo Git Bash.
Tests for the status line script, which the harness runs through Git Bash.

O script roda de verdade, com o JSON de sessao na entrada padrao e a
localidade brasileira (pt_BR.UTF-8), a mesma do Git Bash desta instalacao:
nela o printf do bash espera virgula decimal e recusava "0.5".
The script really runs, with the session JSON on stdin and the Brazilian
locale, where bash printf expects a decimal comma.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s hooks/tests -v      (Windows)
    python3 -m unittest discover -s hooks/tests -v    (Linux/WSL)
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest

from hook_runner import REPO_ROOT

STATUSLINE = os.path.join(REPO_ROOT, "statusline.sh")
BASH = shutil.which("bash")
ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
SESSION = {
    "model": {"display_name": "Opus"},
    "context_window": {"used_percentage": 12, "total_input_tokens": 24000, "context_window_size": 200000},
    "cost": {"total_cost_usd": 0.5, "total_duration_ms": 65000, "total_lines_added": 3, "total_lines_removed": 1},
    "rate_limits": {"five_hour": {"used_percentage": 40}},
}


@unittest.skipUnless(BASH, "bash nao esta no PATH / bash is not on PATH")
class StatusLineTest(unittest.TestCase):
    def render(self, extra=None):
        """Roda o script e devolve (texto sem cores, stderr).
        Runs the script and returns (text without colors, stderr)."""
        with tempfile.TemporaryDirectory() as folder:
            payload = dict(SESSION, workspace={"current_dir": folder}, **(extra or {}))
            env = {k: v for k, v in os.environ.items() if k != "LC_ALL"}
            env.update({"LANG": "pt_BR.UTF-8", "LC_NUMERIC": "pt_BR.UTF-8"})
            proc = subprocess.run(
                [BASH, STATUSLINE], input=json.dumps(payload).encode("utf-8"),
                capture_output=True, env=env, cwd=folder, timeout=60, check=False,
            )
        self.assertEqual(proc.returncode, 0, proc.stderr.decode("utf-8", "replace"))
        text = ANSI_RE.sub("", proc.stdout.decode("utf-8", "replace"))
        return text, proc.stderr.decode("utf-8", "replace")

    def test_cost_uses_decimal_point_in_brazilian_locale(self):
        text, stderr = self.render()
        self.assertIn("$0.50", text)
        self.assertNotIn("invalid number", stderr)

    def test_no_empty_segment_when_thinking_is_off(self):
        text, _ = self.render()
        self.assertIn("- Opus | 5h:", text)

    def test_effort_segment_when_thinking_is_on(self):
        text, _ = self.render({"thinking": {"enabled": True}, "effort": {"level": "high"}})
        self.assertIn("- Opus | high | 5h:", text)


if __name__ == "__main__":
    unittest.main()
