#!/usr/bin/env python3
"""Hook UserPromptSubmit - CLAUDE.md secao 7, Modo Tarefa.

Cria e remove o arquivo-marcador de Modo Tarefa de forma MECANICA, lendo o
prompt do usuario. Antes isso dependia de o proprio Claude lembrar de gravar
o marcador ao ler "#tarefa" - uma instrucao em CLAUDE.md, nao um mecanismo.
Na pratica quase nunca acontecia: sessoes abertas com "#Tarefa - ..."
seguiam sem marcador, e o hook check_planning_docs.py, que roda isolado e
nao ve a conversa, continuava perguntando a cada arquivo de codigo.

Ativa com um prompt iniciado por "#tarefa" (qualquer caixa, com ou sem
hifen/traco em seguida). Desativa com "sair do modo tarefa" ou "modo
normal" em qualquer ponto do prompt.

O marcador e o mesmo lido por check_planning_docs.modo_tarefa_ativo():
<temp>/claude-modo-tarefa/<session_id>.flag

Creates and removes the Task Mode marker file mechanically, from the user
prompt, instead of relying on the model to remember to write it.
"""
import json
import os
import re
import sys
import tempfile

ATIVA_RE = re.compile(r"^\s*#\s*tarefa\b", re.IGNORECASE)
DESATIVA_RE = re.compile(r"sair do modo tarefa|modo normal", re.IGNORECASE)


def marker_path(session_id):
    return os.path.join(
        tempfile.gettempdir(), "claude-modo-tarefa", f"{session_id}.flag"
    )


def main():
    # Falha aberta: qualquer problema aqui nao pode travar o prompt do
    # usuario. / Fail open: never block the prompt because of this hook.
    try:
        data = json.load(sys.stdin)
        session_id = data.get("session_id")
        prompt = data.get("prompt") or ""

        if session_id:
            path = marker_path(session_id)
            if DESATIVA_RE.search(prompt):
                if os.path.isfile(path):
                    os.remove(path)
            elif ATIVA_RE.search(prompt):
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "w", encoding="utf-8") as f:
                    f.write("")
    except Exception as exc:
        print(f"arm_modo_tarefa: {exc}", file=sys.stderr)

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
