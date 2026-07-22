# Build e Deploy — PyInstaller + Rede

## Primeira Compilação
```bash
pyinstaller --onefile --name [projeto] src/main.py
```

## Recompilações
```bash
rm dist/[projeto].exe        # remover antes (Defender pode manter lock)
pyinstaller [projeto].spec
```

## Parâmetros do .spec
| Parâmetro | Valor         | Razão                               |
| --------- | ------------- | ----------------------------------- |
| `name`    | `'[projeto]'` | Nome do executável                  |
| `console` | `False`       | Oculta terminal (essencial via VBA) |
| `upx`     | `True`        | Compressão — reduz tamanho          |

## Windows Defender
Se o `.exe` "desapareceu" de `dist/`: Defender → Histórico de Proteção → Restaurar. Adicionar pasta às exclusões se recorrente.

## Deploy em Rede
1. Compilar e testar `.exe` localmente.
2. Copiar versão atual de `current/` para `historico/` com sufixo de versão.
3. Copiar novo `.exe` para `current/`.
4. Atualizar `CHANGELOG.txt`.
5. Avisar usuários (Teams/e-mail).

**Nunca pular o passo 2.** Rollback é sua rede de segurança.

## Primeiro Deploy — Criar Pastas
```bash
DESTINO="/s/CONTROL/FISCAL_REPORTS/10_INTELIGENCIA DE DADOS/1 - Desenvolvimento/0 - Claude/0 - Executáveis/[projeto]"
mkdir -p "$DESTINO/current" "$DESTINO/historico"
[ ! -f "$DESTINO/CHANGELOG.txt" ] && touch "$DESTINO/CHANGELOG.txt"
```

## Estrutura de Distribuição
```
S:\...\0 - Executáveis\[projeto]\
├── current\[projeto].exe        ← versão em produção
├── historico\                   ← versões anteriores (_vX.X)
└── CHANGELOG.txt                ← data, versão, resumo
```
