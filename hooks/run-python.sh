# Lancador do Python dos hooks, o mesmo no Windows e no Linux/WSL.
# O settings.json o carrega com "." (comando do hook com "shell": "bash"):
#   . "$HOME/.claude/hooks/run-python.sh" "$HOME/.claude/hooks/<hook>.py"
# Carregado, e nao executado, ele nao depende da permissao de execucao, que se
# perde ao copiar entre Windows e WSL; o "." com argumentos e recurso do bash.
# Termina em exec: o Python substitui o shell, sem processo extra, e o codigo
# de saida do hook chega intacto ao Claude Code.
# Python launcher for the hooks, the same on Windows and on Linux/WSL.
# settings.json sources it with "." (hook command with "shell": "bash").
# Sourced, not executed, it does not depend on the execute permission, which
# is lost when copying between Windows and WSL; "." with arguments is a bash
# feature. It ends in exec: Python replaces the shell, with no extra process,
# and the hook's exit code reaches Claude Code untouched.

# Windows: o lancador py. No WSL ele so responde como py.exe, e nao e achado.
# Windows: the py launcher. In WSL it only answers as py.exe, so it is not found.
if command -v py >/dev/null 2>&1; then
  exec py -3 "$@"
fi

# Linux e WSL. / Linux and WSL.
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$@"
fi

# Saida 1, e nunca 2: no Claude Code, 2 bloquearia a acao do usuario.
# Exit 1, never 2: in Claude Code, 2 would block the user's action.
echo "run-python.sh: nem py nem python3 no PATH; hook nao executado / neither py nor python3 on PATH; hook not run" >&2
exit 1
