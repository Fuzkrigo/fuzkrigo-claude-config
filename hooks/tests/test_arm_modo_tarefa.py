"""Testes do hook arm_modo_tarefa.py (CLAUDE.md secao 7, Modo Tarefa).
Tests for the arm_modo_tarefa.py hook (CLAUDE.md section 7, Task Mode).

O hook cria e apaga o marcador <temp>/claude-modo-tarefa/<session_id>.flag
lendo o prompt. TMP, TEMP e TMPDIR apontam para uma pasta temporaria por
caso, entao o marcador real da sessao nunca e tocado.
The hook creates and removes the Task Mode marker from the prompt. TMP, TEMP
and TMPDIR point to a per-case temporary folder.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s hooks/tests -v      (Windows)
    python3 -m unittest discover -s hooks/tests -v    (Linux/WSL)
"""
import os
import tempfile
import unittest

from hook_runner import run_hook

HOOK = "arm_modo_tarefa.py"
SESSION_ID = "sessao-de-teste"
# Padrao do Python 3.14 ou anterior: sem UTF-8 mode, stdin em cp1252 no
# Windows. / Pre-3.15 default: no UTF-8 mode, cp1252 stdin on Windows.
WITHOUT_UTF8_MODE = ("-X", "utf8=0")
CONTINUE = {"continue": True}


class TaskModeHookTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.env = {name: temp.name for name in ("TMP", "TEMP", "TMPDIR")}
        self.marker = os.path.join(temp.name, "claude-modo-tarefa", f"{SESSION_ID}.flag")

    def send(self, prompt, python_flags=()):
        payload = {"session_id": SESSION_ID, "prompt": prompt}
        return run_hook(HOOK, payload, env=self.env, python_flags=python_flags)

    def test_task_prefix_creates_marker(self):
        self.assertEqual(self.send("#tarefa corrigir o rodape"), CONTINUE)
        self.assertTrue(os.path.isfile(self.marker))

    def test_exit_phrases_remove_marker(self):
        for phrase in ("modo normal", "pode sair do modo tarefa"):
            with self.subTest(phrase=phrase):
                self.send("#tarefa ajuste")
                self.assertEqual(self.send(phrase), CONTINUE)
                self.assertFalse(os.path.isfile(self.marker))

    def test_prefix_glued_to_dash_works_without_utf8_mode(self):
        # "#tarefa" colado a um travessao (U+2014): em cp1252 o travessao vira
        # letras e o \b da regex nao casava. / Glued em dash under cp1252.
        self.send("#tarefa—ajuste", python_flags=WITHOUT_UTF8_MODE)
        self.assertTrue(os.path.isfile(self.marker))

    def test_malformed_json_fails_open(self):
        self.assertEqual(run_hook(HOOK, "{isto nao e json", env=self.env), CONTINUE)
        self.assertFalse(os.path.isfile(self.marker))


if __name__ == "__main__":
    unittest.main()
