#!/usr/bin/env python3
"""Hook PreToolUse (Write|Edit) - iniciar-projeto SKILL.md secao 8, Proibicoes de Estilo.

Bloqueia (nao so avisa - isto e mecanico, nao precisa de julgamento) emoji
decorativo e frases que reivindicam coautoria ou autoria de maquina.

Escopo deliberadamente restrito a frases de reivindicacao de coautoria
("Co-authored-by: Claude", "Generated with Claude Code" etc), NAO a palavra
"Claude"/"Anthropic" isolada - um bloqueio amplo quebraria a edicao de
documentacao legitima sobre configuracao do proprio Claude Code (este
repositorio de backup incluido).

Excecao por caminho (DOC_EXCEPTION_PATHS): dentro da propria configuracao,
citar as frases proibidas e necessario para documentar a regra. Sem essa
excecao o hook impede editar o texto que o define - foi exatamente o que
aconteceu ao instalar esta versao: a anterior barrou tanto o docstring
quanto a propria lista de padroes. A excecao vale SO para as frases; emoji
continua bloqueado em todo lugar.
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
# excecao, o hook impede editar o documento que o define. Mover qualquer
# uma das pastas exige atualizar a lista: o hook volta a bloquear, que e o
# comportamento seguro (falha fechada). A excecao NAO vale para emoji.
DOC_EXCEPTION_PATHS = [
    os.path.join(os.path.expanduser("~"), ".claude"),
    os.path.join(os.path.expanduser("~"), "Desktop", "PESSOAL", "Claude Config Backup"),
]

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


def e_documentacao_da_regra(file_path):
    """O arquivo faz parte da configuracao que documenta a propria regra?"""
    if not file_path:
        return False
    try:
        alvo = os.path.normcase(os.path.abspath(file_path))
    except (TypeError, ValueError):
        return False
    for base in DOC_EXCEPTION_PATHS:
        base = os.path.normcase(os.path.abspath(base))
        if alvo == base or alvo.startswith(base + os.sep):
            return True
    return False


def main():
    try:
        data = json.load(sys.stdin)
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

    if e_documentacao_da_regra(tool_input.get("file_path", "")):
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
