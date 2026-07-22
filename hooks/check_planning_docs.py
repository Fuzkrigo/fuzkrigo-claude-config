#!/usr/bin/env python3
"""Hook PreToolUse (Write|Edit) - iniciar-projeto SKILL.md secao 3, Regra de Bloqueio.

Pergunta (nao bloqueia direto - hooks nao veem a conversa, entao nao sabem
se estamos em #tarefa ou correcao pequena; quem decide e o usuario) quando
codigo de producao esta sendo escrito sem PLANEJAMENTO.md/CHECKLIST.md na
raiz do projeto.
"""
import json
import os
import sys

DOC_EXEMPT = {"PLANEJAMENTO.md", "CHECKLIST.md", "ARCHITECTURE.md"}

CODE_EXTENSIONS = {
    "py", "js", "jsx", "ts", "tsx", "vba", "bas", "java", "go", "rs",
    "cs", "cpp", "cc", "c", "h", "hpp", "rb", "php", "sh", "ps1", "sql",
}


def allow():
    print(json.dumps({"continue": True}))
    sys.exit(0)


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        allow()
        return

    file_path = data.get("tool_input", {}).get("file_path", "")
    if not file_path:
        allow()
        return

    basename = os.path.basename(file_path)
    if basename in DOC_EXEMPT:
        allow()
        return

    ext = basename.rsplit(".", 1)[-1].lower() if "." in basename else ""
    if ext not in CODE_EXTENSIONS:
        allow()
        return

    if os.path.isfile("PLANEJAMENTO.md") and os.path.isfile("CHECKLIST.md"):
        allow()
        return

    reason = (
        "Antes de prosseguir com a escrita de codigo de producao, ainda "
        "preciso da Fase 1-2 (PLANEJAMENTO.md e CHECKLIST.md na raiz do "
        "projeto). Quer fazer isso agora, ou tem uma razao especifica para "
        "pular esta etapa (#tarefa, correcao pequena, ajuste estetico)?"
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": reason,
        }
    }))


if __name__ == "__main__":
    main()
