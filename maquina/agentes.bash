# Funcao e atalhos dos agentes no ai-jail. Lido pelo ~/.bashrc:
#   [ -f "$HOME/.config/fuzkrigo/agentes.bash" ] && . "$HOME/.config/fuzkrigo/agentes.bash"
# Fica fora de ~/.claude de proposito: a caixa monta ~/.claude com escrita.
# Agent function and shortcuts for ai-jail. Sourced by ~/.bashrc (line above).
# Kept outside ~/.claude on purpose: the jail mounts ~/.claude read-write.

# Pasta das faixas: um --rw-map de pasta inexistente quebra o ai-jail e fica
# gravado no perfil (incidente de 20/11).
# Lanes folder: an --rw-map to a missing folder breaks ai-jail and stays saved
# in the profile (Nov 20 incident).
mkdir -p "$HOME/code/fuzkrigo-worktrees"

# Verdadeiro so na raiz de um worktree ligado legitimo. O arquivo .git pode ter
# sido reescrito por um agente para o ai-jail montar outro repositorio, entao
# exige: .git comum (nao link), pasta git dentro de <comum>/worktrees e o
# gitdir dela apontando de volta para este .git.
# True only at the root of a genuine linked worktree. An agent may have rewritten
# the .git file to make ai-jail mount another repository, so it requires: a
# regular .git (not a link), a git dir inside <common>/worktrees, and that dir's
# gitdir pointing back to this .git.
_linked_worktree_root() {
  local top gitdir common backlink
  # Fora de repositorio o git falha, e isso so significa "sem a flag".
  # Outside a repository git fails, which only means "no flag".
  top="$(command git rev-parse --show-toplevel 2>/dev/null)" || return 1
  [ -n "$top" ] && [ "$top" -ef . ] && [ -f .git ] && [ ! -L .git ] || return 1
  gitdir="$(command git rev-parse --absolute-git-dir)" || return 1
  common="$(command git rev-parse --path-format=absolute --git-common-dir)" || return 1
  [ "$(dirname "$gitdir")" -ef "$common/worktrees" ] || return 1
  IFS= read -r backlink < "$gitdir/gitdir" || return 1
  # Caminho relativo vale a partir da pasta git. / A relative path starts at the git dir.
  case "$backlink" in
    /* | [A-Za-z]:*) ;;
    *) backlink="$gitdir/$backlink" ;;
  esac
  [ "$backlink" -ef .git ]
}

# Dentro de um terminal do Maestri, repassa as variaveis dele e monta a pasta do socket.
# Na raiz de um worktree ligado, liga o suporte a worktree do ai-jail.
# Inside a Maestri terminal, passes its variables through and mounts the socket folder.
# At the root of a linked worktree, turns on ai-jail's worktree support.
_jail() {
  if [ -n "${MAESTRI_SOCKET:-}" ]; then
    set -- --env MAESTRI_CLI --env MAESTRI_SOCKET --env MAESTRI_WORKSPACE_ID \
      --env MAESTRI_TERMINAL_ID --env TERM_PROGRAM \
      --rw-map "$(dirname "$MAESTRI_SOCKET")" "$@"
  fi
  if _linked_worktree_root; then
    set -- --worktree "$@"
  fi
  ai-jail "$@"
}

# Um atalho por papel; modelo e esforco na linha de comando, sem regravar o settings.json.
# One shortcut per role; model and effort on the command line, never rewriting settings.json.
alias jclaude='_jail claude'
# O jarq monta a pasta das faixas: o Arquiteto cria os worktrees e integra.
# jarq mounts the lanes folder: the Architect creates the worktrees and merges.
alias jarq='_jail --rw-map "$HOME/code/fuzkrigo-worktrees" -- claude --model opus --effort xhigh'
alias jeng='_jail -- claude --model sonnet --effort high'
alias jengout='_jail --rw-map "/mnt/c/code/Fuzkrigo/fuzkrigo-claude-config/Claude outputs" -- claude --model sonnet --effort high'
alias jcodex='_jail -- codex -s danger-full-access -m gpt-6.2-sol -c model_reasoning_effort=medium'
alias jagy='_jail -- agy --dangerously-skip-permissions --model gemini-3.8-flash-medium'

# gitc ("git conferido"): para todo git ou gh rodado fora da caixa num
# repositorio onde um agente trabalhou. Recusa o que o git executaria ou
# obedeceria a partir do que um agente pode ter escrito no .git.
# gitc ("checked git"): for every git or gh run outside the jail in a repository
# where an agent worked. Refuses whatever git would run or obey out of what an
# agent may have written into .git.

# Unicas chaves aceitas na configuracao de um repositorio. O git devolve secao e
# variavel em minusculas.
# The only keys accepted in a repository's config. git lowercases section and
# variable names.
_GITC_ALLOWED_KEYS='^(core\.(repositoryformatversion|filemode|bare|logallrefupdates|ignorecase|precomposeunicode|symlinks)|extensions\.worktreeconfig|user\.(name|email)|remote\..+\.(url|fetch|gh-resolved)|branch\..+\.(remote|merge|rebase|vscode-merge-base))$'

# Imprime um achado ou destino sem caracteres de controle, que poderiam
# esconder texto no terminal.
# Prints a finding or destination without control characters, which could hide
# text on the terminal.
_gitc_line() {
  printf '%s: %s\n' "$1" "${2//[[:cntrl:]]/?}"
}

# Arquivos de configuracao de uma pasta git, separados por NUL: o principal e o
# config.worktree de todos os worktrees.
# Config files of a git dir, NUL separated: the main one and every worktree's
# config.worktree.
_gitc_config_files() {
  local file
  for file in "$1/config" "$1/config.worktree" "$1"/worktrees/*/config.worktree; do
    [ -f "$file" ] && printf '%s\0' "$file"
  done
}

# Achados de uma pasta git comum: hooks, remotos no formato antigo (definem
# destino fora da configuracao) e chaves fora da lista.
# Findings of a common git dir: hooks, old-format remotes (they define a
# destination outside the config) and keys outside the list.
_gitc_scan() {
  local file keys key
  for file in "$1"/hooks/* "$1"/hooks/.[!.]* "$1"/remotes/* "$1"/branches/*; do
    { [ -e "$file" ] || [ -L "$file" ]; } && [ ! -d "$file" ] || continue
    case "$file" in
      "$1"/hooks/*.sample) ;;
      *) _gitc_line arquivo "$file" ;;
    esac
  done
  while IFS= read -r -d '' file; do
    if ! keys="$(command git --no-pager config --file "$file" --list --name-only)"; then
      _gitc_line "configuracao ilegivel" "$file"
      continue
    fi
    while IFS= read -r key; do
      [ -z "$key" ] || [[ $key =~ $_GITC_ALLOWED_KEYS ]] || _gitc_line chave "$key ($file)"
    done <<< "$keys"
  done < <(_gitc_config_files "$1")
}

# Confere um destino que seja pasta local, porque o push roda os hooks dele.
# $1: URL ou caminho; $2: base dos caminhos relativos.
# Checks a destination that is a local folder, since pushing runs its hooks.
# $1: URL or path; $2: base for relative paths.
_gitc_destination() {
  local path="$1" candidate common
  case "$path" in
    file://*%*)
      # O git decodifica %XX; recusar e mais seguro que repetir a decodificacao.
      # git decodes %XX; refusing is safer than reimplementing the decoding.
      _gitc_line "URL file:// com %" "$path"
      return ;;
    file://*)
      path="${path#file://}"
      case "$path" in
        /[A-Za-z]:*) path="${path#/}" ;;
        /* | [A-Za-z]:*) ;;
        *) path="/${path#*/}" ;;
      esac ;;
    '~/'*) path="$HOME/${path#??}" ;;
    '~'*)
      _gitc_line "destino com ~usuario" "$path"
      return ;;
  esac
  case "$path" in
    /* | [A-Za-z]:*) ;;
    *) path="$2/$path" ;;
  esac
  while [[ $path == ?*/ ]]; do path="${path%/}"; done
  # Os mesmos sufixos que o git tenta num caminho local.
  # The same suffixes git tries on a local path.
  for candidate in "$path/.git" "$path" "$path.git/.git" "$path.git"; do
    [ -e "$candidate" ] || continue
    # Se o git nao le como repositorio, tambem nao enviaria para la.
    # If git cannot read it as a repository, it would not push there either.
    common="$(command git --git-dir="$candidate" rev-parse --path-format=absolute \
      --git-common-dir 2>/dev/null)" || continue
    _gitc_scan "$common"
  done
}

# Confere todo URL de remoto e todo branch.<nome>.remote, que aceita caminho.
# Checks every remote URL and every branch.<name>.remote, which accepts a path.
_gitc_configured_destinations() {
  local file entry
  while IFS= read -r -d '' file; do
    while IFS= read -r -d '' entry; do
      _gitc_destination "${entry#*$'\n'}" "$2"
    done < <(command git config --file "$file" -z \
      --get-regexp '^(remote\..*\.url|branch\..*\.remote)$')
  done < <(_gitc_config_files "$1")
}

# Com achados, lista e encerra o subshell do gitc sem rodar o comando.
# With findings, lists them and ends the gitc subshell without running the command.
_gitc_refuse() {
  [ -n "$1" ] || return 0
  printf 'gitc: revise antes de usar git fora da caixa:\n%s\n' "$1" >&2
  printf 'gitc: comando nao executado\n' >&2
  exit 1
}

# Remoto (nome ou caminho) que o "git push" com estes argumentos usaria.
# Remote (name or path) that "git push" with these arguments would use.
_gitc_push_remote() {
  local arg skip="" repo="" branch remotes
  for arg in "$@"; do
    if [ -n "$skip" ]; then
      [ "$skip" = repo ] && repo="$arg"
      skip=""
      continue
    fi
    case "$arg" in
      --repo=*) repo="${arg#--repo=}" ;;
      --repo) skip=repo ;;
      --push-option | --receive-pack | --exec | --recurse-submodules | -o) skip=value ;;
      --* | -o?*) ;;
      -*o) skip=value ;;
      -*) ;;
      *)
        printf '%s\n' "$arg"
        return ;;
    esac
  done
  if [ -n "$repo" ]; then
    printf '%s\n' "$repo"
    return
  fi
  # Sem argumento, a mesma ordem do git. / With no argument, git's own order.
  branch="$(command git symbolic-ref -q --short HEAD)"
  command git config --get "branch.$branch.pushRemote" ||
    command git config --get remote.pushDefault ||
    command git config --get "branch.$branch.remote" && return
  remotes="$(command git remote)"
  case "$remotes" in
    "" | *$'\n'*) echo origin ;;
    *) printf '%s\n' "$remotes" ;;
  esac
}

# Confere e mostra o destino, e so deixa o push seguir com "s".
# $1: base dos caminhos relativos; o resto: argumentos do push.
# Checks and shows the destination, and only lets the push go on with "s".
# $1: base for relative paths; the rest: push arguments.
_gitc_confirm_push() {
  local base="$1" remote urls url findings answer
  shift
  remote="$(_gitc_push_remote "$@")"
  # Se nao for remoto configurado, e caminho ou URL; o ls-remote so o expande.
  # If it is not a configured remote, it is a path or URL; ls-remote only expands it.
  urls="$(command git remote get-url --push --all "$remote" 2>/dev/null ||
    command git ls-remote --get-url "$remote")" || return 1
  findings="$(while IFS= read -r url; do _gitc_destination "$url" "$base"; done <<< "$urls")"
  _gitc_refuse "$findings"
  while IFS= read -r url; do
    _gitc_line "gitc: destino do push" "$url" >&2
  done <<< "$urls"
  printf 'gitc: enviar? [s/N] ' >&2
  IFS= read -r answer || answer=""
  # Sem terminal a resposta nao ecoa; quebra a linha. / No echo without a terminal; end the line.
  [ -t 0 ] || echo >&2
  # Resposta vinda do Windows pode terminar em CR. / A Windows answer may end in CR.
  answer="${answer%$'\r'}"
  case "$answer" in
    s | S) return 0 ;;
  esac
  printf 'gitc: push cancelado, nada foi enviado\n' >&2
  return 1
}

# Corpo em subshell: as variaveis e o exit ficam contidos.
# Subshell body: variables and exit stay contained.
gitc() (
  shopt -u failglob nullglob
  case "${1:-}" in
    --confere) ;;
    -*)
      # Um -C ou --git-dir faria conferir um repositorio e rodar em outro.
      # A -C or --git-dir would check one repository and run in another.
      printf 'gitc: opcao antes do subcomando nao e aceita: %s\n' "$1" >&2
      exit 2 ;;
  esac
  if ! common="$(command git rev-parse --path-format=absolute --git-common-dir)"; then
    printf 'gitc: nao ha repositorio git utilizavel aqui\n' >&2
    exit 2
  fi
  # Fora de uma arvore de trabalho (bare, dentro do .git) vale a pasta atual.
  # Outside a work tree (bare, inside .git) the current folder is the base.
  base="$(command git rev-parse --show-toplevel 2>/dev/null)" || base="$PWD"
  findings="$(_gitc_scan "$common"; _gitc_configured_destinations "$common" "$base")"
  _gitc_refuse "$findings"
  case "${1:-}" in
    --confere)
      echo "gitc: repositorio conferido"
      exit 0 ;;
    push) _gitc_confirm_push "$base" "${@:2}" || exit 1 ;;
  esac
  command git -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"
)
