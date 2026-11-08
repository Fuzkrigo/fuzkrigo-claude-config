#!/usr/bin/env python3
"""Hook PreToolUse (Write|Edit) - iniciar-projeto SKILL.md secao 8, Proibicoes de Estilo.

Bloqueia (nao so avisa - isto e mecanico, nao precisa de julgamento) emoji
decorativo e frases que reivindicam coautoria ou autoria de maquina.

Escopo deliberadamente restrito a frases de reivindicacao de coautoria
("Co-authored-by: Claude", "Generated with Claude Code" etc), NAO a palavra
"Claude"/"Anthropic" isolada - um bloqueio amplo quebraria a edicao de
documentacao legitima sobre configuracao do proprio Claude Code (o
repositorio fuzkrigo-claude-config incluido).

Excecao por caminho: dentro de ~/.claude (DOC_EXCEPTION_PATHS) e de qualquer
pasta chamada exatamente fuzkrigo-claude-config (REPO_DIR_NAME, onde quer que
o repositorio esteja clonado), citar as frases proibidas e necessario para
documentar a regra. Sem essa excecao o hook impede editar o texto que o
define - foi exatamente o que aconteceu ao instalar esta versao: a anterior
barrou tanto o docstring quanto a propria lista de padroes. A excecao vale
SO para as frases; emoji continua bloqueado em todo lugar.

Path exception: inside ~/.claude and inside any folder named exactly
fuzkrigo-claude-config, quoting the forbidden phrases is allowed, so the rule
can be documented. Emoji stays blocked everywhere.
"""
import json
import os
import re
import sys

FORBIDDEN_PATTERNS = [
    r"co-authored-by:?\s*claude",
    r"generated with\s*\[?claude",
    r"\U0001F916\s*generated",
    r"gerado (?:por|com)\s*(?:claude|ia|intelig[êe]ncia artificial)",
    r"escrito (?:por|com)\s*(?:claude|ia|intelig[êe]ncia artificial)",
    r"assistente de ia",
    r"gera[cç][aã]o autom[aá]tica",
]
FORBIDDEN_RE = re.compile("|".join(FORBIDDEN_PATTERNS), re.IGNORECASE)

# Onde a documentacao da propria regra vive. Nestes caminhos, citar as
# frases da lista acima e legitimo - a secao 8 da SKILL.md e este proprio
# arquivo precisam cita-las para explicar o que e proibido. Sem esta
# excecao, o hook impede editar o documento que o define. A excecao NAO
# vale para emoji.
# Where the rule's own documentation lives: quoting the phrases above is
# legitimate there. The exception does NOT cover emoji.
DOC_EXCEPTION_PATHS = [
    os.path.join(os.path.expanduser("~"), ".claude"),
]
# O repositorio e reconhecido pelo nome de uma pasta-ancestral, em qualquer
# caminho, porque o clone pode morar em qualquer lugar da maquina. Nome
# exato: "fuzkrigo-claude-config-old" nao conta. A comparacao usa
# os.path.normcase (no Windows, sem distinguir maiusculas).
# The repository is recognized by the name of an ancestor folder, anywhere
# on the machine. Exact name, compared with os.path.normcase.
REPO_DIR_NAME = "fuzkrigo-claude-config"

EMOJI_RANGES = [
    (0x1F300, 0x1FAFF),
    (0x2600, 0x27BF),
    (0x1F1E6, 0x1F1FF),
]
# Excecao deliberada: estes sao marcadores de status funcionais usados pelo
# proprio agente security-reviewer e por convencoes do usuario, nao emoji
# decorativo. / Deliberate exception: functional status markers, not
# decorative emoji.
ALLOWED_EMOJI_CODEPOINTS = {0x2705, 0x26A0, 0x274C, 0xFE0F}


def allow():
    print(json.dumps({"continue": True}))
    sys.exit(0)


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def find_blocking_emoji(content):
    for ch in content:
        codepoint = ord(ch)
        if codepoint in ALLOWED_EMOJI_CODEPOINTS:
            continue
        for lo, hi in EMOJI_RANGES:
            if lo <= codepoint <= hi:
                return ch
    return None


def is_rule_documentation(file_path):
    """O arquivo faz parte da configuracao que documenta a propria regra?
    Is the file part of the configuration that documents the rule itself?"""
    if not file_path:
        return False
    try:
        target = os.path.normcase(os.path.abspath(file_path))
    except (TypeError, ValueError):
        return False
    for base in DOC_EXCEPTION_PATHS:
        base = os.path.normcase(os.path.abspath(base))
        if target == base or target.startswith(base + os.sep):
            return True
    # Pastas acima do arquivo, sem o proprio arquivo. / Folders above the file.
    ancestors = os.path.dirname(target).split(os.sep)
    return os.path.normcase(REPO_DIR_NAME) in ancestors


def main():
    # Bytes, nao texto: o json decodifica sozinho o UTF-8 que o harness manda,
    # em qualquer versao do Python. Ler sys.stdin como texto usaria cp1252 no
    # Windows ate o Python 3.14 (sem UTF-8 mode), e o emoji passaria.
    # Bytes, not text: json decodes the harness UTF-8 itself on any Python;
    # text stdin would be cp1252 on Windows up to Python 3.14.
    try:
        data = json.load(sys.stdin.buffer)
    except (json.JSONDecodeError, ValueError):
        allow()
        return

    tool_input = data.get("tool_input", {})
    content = tool_input.get("content")
    if content is None:
        content = tool_input.get("new_string", "")

    if not content:
        allow()
        return

    emoji = find_blocking_emoji(content)
    if emoji:
        deny(
            f"Bloqueado pela regra de zero emoji (iniciar-projeto secao 8): "
            f"encontrado '{emoji}' (U+{ord(emoji):04X}) no conteudo. Remova "
            f"antes de gravar."
        )
        return

    if is_rule_documentation(tool_input.get("file_path", "")):
        allow()
        return

    match = FORBIDDEN_RE.search(content)
    if match:
        deny(
            f"Bloqueado pela regra de nao reivindicar coautoria de maquina "
            f"(iniciar-projeto secao 8): encontrado '{match.group()}' no "
            f"conteudo. Reescreva sem essa mencao."
        )
        return

    allow()


if __name__ == "__main__":
    main()
