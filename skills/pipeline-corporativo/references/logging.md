# Logging — Padrão Corporativo

## Path Condicional (Dev vs Prod)
```python
import os, logging
from pathlib import Path

PROJETO_NOME = "[projeto]"
DEV_USER = "bruno.krieger"
LOG_ROOT_REDE = r"S:\CONTROL\FISCAL_REPORTS\10_INTELIGENCIA DE DADOS\1 - Desenvolvimento\0 - Claude\2 - Logs"

usuario_atual = os.getenv("USERNAME", "desconhecido")

if usuario_atual == DEV_USER and os.path.exists(".venv"):
    LOG_PATH = f"{PROJETO_NOME}.log"  # dev: local
else:
    log_dir = Path(LOG_ROOT_REDE) / PROJETO_NOME / usuario_atual
    log_dir.mkdir(parents=True, exist_ok=True)
    LOG_PATH = str(log_dir / f"{PROJETO_NOME}.log")  # prod: rede (projeto/usuario/)
```

Estrutura em rede: `2 - Logs/[projeto]/[usuario]/[projeto].log`

## Configuração Padrão
```python
logging.basicConfig(
    filename=LOG_PATH, level=logging.ERROR,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S", encoding="utf-8"
)
```

## O Que Logar
Erros com stack trace completo, arquivo/aba processados, usuário (`USERNAME`).

## O Que NÃO Logar
Nomes de funcionários, CPF, dados bancários, salários, senhas, tokens — especialmente em logs de rede onde colegas têm leitura.
