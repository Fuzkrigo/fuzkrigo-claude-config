# Configuração da máquina

O que o Bloco 0 e o Bloco 1 configuraram à mão (função `_jail`, atalhos dos agentes, hosts liberados no ai-jail, modo automático do Codex e do Antigravity, `.ai-jail` no ignore global do git) fica versionado aqui. Os arquivos são a fonte; a máquina é uma cópia.

O script de instalação (Bloco 6) vai ler esta pasta. Até lá, a máquina é atualizada à mão, pelos passos abaixo.

## Arquivos

| Arquivo | Destino na máquina | Como aplicar |
| --- | --- | --- |
| `agentes.bash` | `~/.config/fuzkrigo/agentes.bash` | Copiar. O `~/.bashrc` ganha a linha `[ -f "$HOME/.config/fuzkrigo/agentes.bash" ] && . "$HOME/.config/fuzkrigo/agentes.bash"` |
| `ai-jail-config.toml` | `~/.config/ai-jail/config.toml` | Copiar, trocando `__HOME__` pela home: `sed "s#__HOME__#$HOME#g" maquina/ai-jail-config.toml` (o arquivo não expande `~`) |
| `codex-config.toml` | topo de `~/.codex/config.toml` | Mesclar: acrescentar as duas chaves, nunca sobrescrever o arquivo |
| `antigravity-settings.json` | `~/.gemini/antigravity-cli/settings.json` | Mesclar: a chave `agentMode` entra no JSON existente |
| `gitignore-global` | ignore global do git (`~/.config/git/ignore`) | Acrescentar a linha, se ainda não estiver lá |
| `agents-executor.md` | `~/.codex/AGENTS.md` e `~/.gemini/AGENTS.md` | Copiar; se já existir um arquivo seu, mesclar à mão |

O arquivo de shell vai para `~/.config/fuzkrigo/`, **nunca para dentro de `~/.claude/`**: o ai-jail monta `~/.claude` com escrita dentro da caixa, e um arquivo lido pelo `~/.bashrc` dentro dele deixaria um agente injetar comando no shell do usuário, fora da caixa.

## Git fora da caixa

Um agente na caixa escreve no `.git/` do projeto, e o git que você roda fora dela obedece ao que está lá: hooks, configuração e destinos de remoto. Em repositório onde um agente trabalhou, todo `git` e `gh` fora da caixa passa pela `gitc` ("git conferido"), definida no `agentes.bash`:

| Em vez de | Use |
| --- | --- |
| `git push` | `gitc push` |
| `git log` e os demais comandos | `gitc log` |
| `gh pr create` | `gitc --confere && gh pr create` |

Antes de rodar qualquer coisa, ela confere:

- arquivos em `.git/hooks/` (menos os `.sample`), em `.git/remotes/` e em `.git/branches/`;
- chaves fora da lista permitida no `config` e no `config.worktree` de todos os worktrees. A lista: `core.repositoryformatversion`, `core.filemode`, `core.bare`, `core.logallrefupdates`, `core.ignorecase`, `core.precomposeunicode`, `core.symlinks`, `extensions.worktreeconfig`, `user.name`, `user.email`, `remote.<nome>.url`, `remote.<nome>.fetch`, `remote.<nome>.gh-resolved`, `branch.<nome>.remote`, `branch.<nome>.merge`, `branch.<nome>.rebase` e `branch.<nome>.vscode-merge-base`;
- destino que seja pasta local (todo `remote.<nome>.url`, todo `branch.<nome>.remote` e o destino passado ao `push`), com a mesma conferência acima, porque o push executa os hooks do destino. URL `file://` com `%` e caminho `~usuario` são recusados.

Passando, o comando roda com `core.hooksPath=/dev/null` e `core.fsmonitor=false`; por isso os seus hooks globais também não rodam pela `gitc`. O `gitc push` mostra o destino e pergunta `[s/N]`: só `s` envia. Opção antes do subcomando (`-C`, `--git-dir` ou qualquer outra) é recusada.

Saídas próprias: 1 quando há achado ou o push é cancelado; 2 fora de um repositório ou com opção antes do subcomando. Nos demais casos, a saída é a do git.

### Quando ela recusa

Não troque para o `git` direto. Cada achado vem com o caminho do arquivo ou o nome da chave:

1. Veja o conteúdo (`cat <arquivo>`, ou o arquivo indicado entre parênteses depois da chave).
2. Se não foi você que criou, apague o arquivo ou remova a chave: `git config --local --unset <chave>`. Quando o arquivo indicado não for o `config` do repositório, use `git config --file <arquivo> --unset <chave>`.
3. Rode `gitc --confere` até sair limpo.

### O que ela não cobre

- Submódulos e repositórios aninhados.
- Alias global seu que faça push: a pergunta só aparece no `gitc push`.
- Destino local digitado à mão num `fetch` ou `pull`.
- Agente rodando ao mesmo tempo, que pode alterar o `.git/` entre a conferência e o comando.
- Opção longa abreviada com valor separado (`--push-opt x`): o destino anunciado sai errado.

## Passos manuais

O que não se automatiza:

- Login de cada agente (Claude, Codex, Antigravity), feito fora da caixa.
- Tela do ai-jail de cada projeto novo, com o GitHub desligado.
- `/plugin`, para desligar os plugins sincronizados da conta.
- `obs` e o Obsidian.

## Testes

```bash
python3 -m unittest discover -s maquina/tests -v    # Linux/WSL
py -3 -m unittest discover -s maquina/tests -v      # Windows
```
