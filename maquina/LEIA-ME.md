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

## Passos manuais

O que não se automatiza:

- Login de cada agente (Claude, Codex, Antigravity), feito fora da caixa.
- Tela do ai-jail de cada projeto novo, com o GitHub desligado.
- `/plugin`, para desligar os plugins sincronizados da conta.
- Site do Jules.
- `obs` e o Obsidian.

## Testes

```bash
python3 -m unittest discover -s maquina/tests -v    # Linux/WSL
py -3 -m unittest discover -s maquina/tests -v      # Windows
```
