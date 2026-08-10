#!/usr/bin/env python3
"""Hook PreToolUse (Write|Edit) - iniciar-projeto SKILL.md secao 4, Regra de Bloqueio.

Pergunta (nao bloqueia direto - hooks nao veem a conversa, entao nao sabem
se estamos em #tarefa ou correcao pequena; quem decide e o usuario) quando
codigo de producao esta sendo escrito sem evidencia de planejamento.

Duas evidencias sao aceitas, porque o fluxo tem duas camadas (SKILL.md
secao 1):

  - Abertura do projeto (A1-A2), skill iniciar-projeto: ROADMAP.md e
    CHECKLIST.md.
  - Especificacao de feature (Bloco B), skill fuzkrigo-spec-driven:
    qualquer .spec/features/<feature>/spec.md.

Basta uma das duas. Projeto pequeno que roda so com spec (script pessoal,
sem board nem roadmap) e um caso legitimo e nao deve ser interrogado a cada
arquivo; projeto com roadmap mas ainda sem a primeira spec tambem nao.

Local canonico dos documentos e docs/ (SKILL.md secao 5). A raiz continua
sendo aceita como fallback: projetos anteriores a essa mudanca tem os
documentos la, e a migracao para docs/ e proposta pelo agente ao rodar, nao
forcada. Sem esse fallback o hook perguntaria em toda escrita de codigo
desses projetos.

Excecao: se existir o arquivo-marcador de Modo Tarefa desta sessao (criado
pelo Claude ao ativar #tarefa - CLAUDE.md secao 7), libera direto sem
perguntar. O hook nao ve a conversa, entao esse marcador e o unico jeito
dele saber que a Regra de Bloqueio foi desativada nesta sessao.
"""
import glob
import json
import os
import sys
import tempfile

# Arquivos que IMPLEMENTAM comportamento. Componente de framework entra
# (vue/svelte/astro carregam a logica junto do template); folha de estilo
# fica de fora de proposito: ajustar uma cor nao e implementar feature, e um
# hook que pergunta a cada retoque visual e um hook que se aprende a ignorar.
CODE_EXTENSIONS = {
    "py", "js", "mjs", "cjs", "jsx", "ts", "tsx", "vue", "svelte", "astro",
    "vba", "bas", "java", "go", "rs", "cs", "cpp", "cc", "c", "h", "hpp",
    "rb", "php", "sh", "ps1", "sql",
}


def allow():
    print(json.dumps({"continue": True}))
    sys.exit(0)


def doc_existe(nome):
    """Procura o documento em docs/ (canonico) e na raiz (legado)."""
    return os.path.isfile(os.path.join("docs", nome)) or os.path.isfile(nome)


def spec_de_feature_existe():
    """Alguma feature ja especificada em .spec/features/<feature>/spec.md?"""
    return bool(glob.glob(os.path.join(".spec", "features", "*", "spec.md")))


def modo_tarefa_ativo(session_id):
    if not session_id:
        return False
    marker = os.path.join(tempfile.gettempdir(), "claude-modo-tarefa", f"{session_id}.flag")
    return os.path.isfile(marker)


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        allow()
        return

    if modo_tarefa_ativo(data.get("session_id")):
        allow()
        return

    file_path = data.get("tool_input", {}).get("file_path", "")
    if not file_path:
        allow()
        return

    basename = os.path.basename(file_path)
    ext = basename.rsplit(".", 1)[-1].lower() if "." in basename else ""
    if ext not in CODE_EXTENSIONS:
        allow()
        return

    if doc_existe("ROADMAP.md") and doc_existe("CHECKLIST.md"):
        allow()
        return

    if spec_de_feature_existe():
        allow()
        return

    reason = (
        "Antes de prosseguir com a escrita de codigo de producao, ainda "
        "preciso de uma das duas evidencias de planejamento: a abertura do "
        "projeto (A1-A2: ROADMAP.md e CHECKLIST.md em docs/) ou uma "
        "especificacao de feature em .spec/features/. Quer fazer isso "
        "agora, ou tem uma razao especifica para pular esta etapa (#tarefa, "
        "correcao pequena, ajuste estetico)?"
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
