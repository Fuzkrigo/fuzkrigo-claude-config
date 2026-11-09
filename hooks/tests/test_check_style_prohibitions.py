"""Testes do hook check_style_prohibitions.py (iniciar-projeto secao 8).
Tests for the check_style_prohibitions.py hook (iniciar-projeto section 8).

Emoji e frases proibidas sao montados por construcao (chr, concatenacao),
nunca escritos literalmente: o proprio hook barraria a gravacao deste
arquivo, porque emoji e bloqueado em qualquer pasta.
Emoji and forbidden phrases are built by construction, never written
literally: the hook itself would block writing this file.

Rodar da raiz / Run from the repository root:
    py -3 -m unittest discover -s hooks/tests -v      (Windows)
    python3 -m unittest discover -s hooks/tests -v    (Linux/WSL)
"""
import os
import tempfile
import unittest

from hook_runner import decision, run_hook

HOOK = "check_style_prohibitions.py"
# Padrao do Python 3.14 ou anterior: sem UTF-8 mode, stdin em cp1252 no
# Windows. / Pre-3.15 default: no UTF-8 mode, cp1252 stdin on Windows.
WITHOUT_UTF8_MODE = ("-X", "utf8=0")
EMOJI = chr(0x1F600)
FUNCTIONAL_MARKERS = (
    chr(0x2705) + " ok, " + chr(0x26A0) + chr(0xFE0F) + " atencao, "
    + chr(0x274C) + " falha"
)
FORBIDDEN_PHRASE = "Co-" + "Authored-By: " + "Claude"
# Marcas tipograficas de status (U+2714, U+2718, U+2713, U+2717): o motor e a
# status line as usam como ok/falha. / Typographic status marks.
TYPOGRAPHIC_MARKERS = (
    chr(0x2714) + " passou, " + chr(0x2718) + " falhou, "
    + chr(0x2713) + " limpo, " + chr(0x2717) + " sujo"
)
DECORATIVE_DINGBAT = chr(0x2605)


class StyleHookTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.base = temp.name
        home = os.path.join(self.base, "home")
        # ~ aponta para uma pasta temporaria: o ~/.claude real nunca entra.
        # ~ points to a temporary folder: the real ~/.claude never takes part.
        self.env = {"HOME": home, "USERPROFILE": home}

    def check(self, *parts, content, python_flags=()):
        payload = {
            "tool_name": "Write",
            "tool_input": {"file_path": os.path.join(self.base, *parts), "content": content},
        }
        return decision(run_hook(HOOK, payload, env=self.env, python_flags=python_flags))

    def test_emoji_in_repository_folder_is_denied(self):
        result = self.check("fuzkrigo-claude-config", "docs", "nota.md", content="ola " + EMOJI)
        self.assertEqual(result, "deny")

    def test_emoji_in_user_claude_folder_is_denied(self):
        result = self.check("home", ".claude", "nota.md", content="ola " + EMOJI)
        self.assertEqual(result, "deny")

    def test_functional_markers_are_allowed_outside_exceptions(self):
        result = self.check("outro-projeto", "status.md", content=FUNCTIONAL_MARKERS)
        self.assertEqual(result, "allow")

    def test_phrase_in_repository_folder_is_allowed(self):
        result = self.check("fuzkrigo-claude-config", "README.md", content=FORBIDDEN_PHRASE)
        self.assertEqual(result, "allow")

    def test_phrase_in_other_project_is_denied(self):
        result = self.check("outro-projeto", "README.md", content=FORBIDDEN_PHRASE)
        self.assertEqual(result, "deny")

    def test_phrase_in_similarly_named_folder_is_denied(self):
        # O nome da pasta tem de ser exato. / The folder name must be exact.
        result = self.check("fuzkrigo-claude-config-old", "README.md", content=FORBIDDEN_PHRASE)
        self.assertEqual(result, "deny")

    def test_phrase_in_user_claude_md_is_allowed(self):
        result = self.check("home", ".claude", "CLAUDE.md", content=FORBIDDEN_PHRASE)
        self.assertEqual(result, "allow")

    def test_malformed_json_fails_open(self):
        self.assertEqual(decision(run_hook(HOOK, "{isto nao e json", env=self.env)), "allow")

    def test_typographic_status_markers_are_allowed(self):
        result = self.check("outro-projeto", "saida.md", content=TYPOGRAPHIC_MARKERS)
        self.assertEqual(result, "allow")

    def test_decorative_dingbat_is_still_denied(self):
        # A faixa U+2600-U+27BF continua bloqueada fora dos marcadores.
        # The U+2600-U+27BF range stays blocked outside the markers.
        result = self.check("outro-projeto", "nota.md", content="destaque " + DECORATIVE_DINGBAT)
        self.assertEqual(result, "deny")

    def test_valid_json_that_is_not_an_event_object_fails_open(self):
        for stdin_text in ("[]", '"texto"', "42", '{"tool_input": []}'):
            with self.subTest(stdin_text=stdin_text):
                self.assertEqual(decision(run_hook(HOOK, stdin_text, env=self.env)), "allow")

    def test_emoji_is_denied_without_utf8_mode(self):
        # O harness manda UTF-8 cru; o hook nao pode depender do UTF-8 mode.
        # The harness sends raw UTF-8; the hook must not rely on UTF-8 mode.
        result = self.check("outro-projeto", "nota.md", content="ola " + EMOJI,
                            python_flags=WITHOUT_UTF8_MODE)
        self.assertEqual(result, "deny")


if __name__ == "__main__":
    unittest.main()
