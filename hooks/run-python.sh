# Lancador do Python dos hooks, o mesmo no Windows e no Linux/WSL.
# O settings.json o executa como argumento do bash:
#   bash "$HOME/.claude/hooks/run-python.sh" "$HOME/.claude/hooks/<hook>.py"
# Nao use ". run-python.sh <hook>.py": o Claude Code roda o comando dos hooks
# num "sh -c" no Linux e no macOS, e ali o "." nao repassa os argumentos; o
# Python recebe "$@" vazio, le o JSON da entrada como codigo e sai 0 sem fazer
# nada. Como e argumento do bash, o arquivo nao depende da permissao de
# execucao, que se perde ao copiar entre Windows e WSL.
# Termina em exec: o Python substitui o shell, sem processo extra, e o codigo
# de saida do hook chega intacto ao Claude Code.
# Python launcher for the hooks, the same on Windows and on Linux/WSL.
# settings.json runs it as an argument of bash:
#   bash "$HOME/.claude/hooks/run-python.sh" "$HOME/.claude/hooks/<hook>.py"
# Do not use ". run-python.sh <hook>.py": Claude Code runs the hook command in
# an "sh -c" on Linux and macOS, where "." does not pass the arguments; Python
# gets an empty "$@", reads the JSON input as code and exits 0 doing nothing.
# Being an argument of bash, the file does not depend on the execute
# permission, which is lost when copying between Windows and WSL.
# It ends in exec: Python replaces the shell, with no extra process, and the
# hook's exit code reaches Claude Code untouched.

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
