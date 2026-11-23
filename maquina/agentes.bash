# Funcao e atalhos dos agentes no ai-jail. Lido pelo ~/.bashrc:
#   [ -f "$HOME/.config/fuzkrigo/agentes.bash" ] && . "$HOME/.config/fuzkrigo/agentes.bash"
# Fica fora de ~/.claude de proposito: a caixa monta ~/.claude com escrita.
# Agent function and shortcuts for ai-jail. Sourced by ~/.bashrc (line above).
# Kept outside ~/.claude on purpose: the jail mounts ~/.claude read-write.

# Dentro de um terminal do Maestri, repassa as variaveis dele e monta a pasta do socket.
# Inside a Maestri terminal, passes its variables through and mounts the socket folder.
_jail() {
  if [ -n "${MAESTRI_SOCKET:-}" ]; then
    ai-jail --env MAESTRI_CLI --env MAESTRI_SOCKET --env MAESTRI_WORKSPACE_ID \
      --env MAESTRI_TERMINAL_ID --env TERM_PROGRAM \
      --rw-map "$(dirname "$MAESTRI_SOCKET")" "$@"
  else
    ai-jail "$@"
  fi
}

# Um atalho por papel; modelo e esforco na linha de comando, sem regravar o settings.json.
# One shortcut per role; model and effort on the command line, never rewriting settings.json.
alias jclaude='_jail claude'
alias jarq='_jail -- claude --model opus --effort xhigh'
alias jeng='_jail -- claude --model sonnet --effort high'
alias jengout='_jail --rw-map "/mnt/c/code/Fuzkrigo/fuzkrigo-claude-config/Claude outputs" -- claude --model sonnet --effort high'
alias jcodex='_jail -- codex -s danger-full-access -m gpt-6.2-sol -c model_reasoning_effort=medium'
alias jagy='_jail -- agy --dangerously-skip-permissions --model gemini-3.8-flash-medium'
