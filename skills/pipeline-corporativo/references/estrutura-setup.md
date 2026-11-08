# Estrutura e Setup de Projetos

## Estrutura Canônica — Arquitetura B (VBA + Python)
```
nome_do_projeto/
├── .venv/                      ← NUNCA versionar (no .gitignore)
├── .git/
├── .gitignore                  ← .venv, dist, __pycache__, .env, *.xlsm, *.log
├── src/
│   ├── __init__.py
│   ├── main.py                 ← entry point + CLI (argparse) + logging
│   ├── vba/                    ← módulos VBA exportados (.bas), versionados no Git
│   ├── processors/
│   │   ├── __init__.py
│   │   ├── reader.py           ← leitura com pandas
│   │   ├── processor.py        ← lógica de negócio pura
│   │   └── writer.py           ← escrita com openpyxl
│   └── utils/
│       └── __init__.py
├── tests/
│   └── fixtures/               ← planilhas de teste (dados sintéticos, nunca reais)
├── dist/                       ← .exe (no .gitignore; backup em rede)
├── dados.xlsx                  ← Python lê/escreve (dados apenas)
├── automacao.xlsm              ← VBA mora aqui (Python NUNCA toca; binário, fora do Git)
├── [projeto].log
├── [projeto].spec
└── requirements.txt
```

**Regra crítica:** `.xlsx` = dados (Python lê/escreve). `.xlsm` = macros (Python NUNCA abre). `openpyxl` não preserva macros — regra inegociável.

## Estrutura — Arquitetura A (VBA Puro)
```
nome_do_projeto/
├── .git/
├── .gitignore                  ← *.xlsm, *.log
├── automacao.xlsm              ← binário, fora do Git
├── src/vba/                    ← módulos .bas versionados no Git
└── DOCUMENTACAO.md
```

## Setup do Zero (Arquitetura B — Git Bash)
```bash
mkdir -p "$HOME/Desktop/FERTIPAR/0 - Claude/0 - Apps"
cd "$HOME/Desktop/FERTIPAR/0 - Claude/0 - Apps"
mkdir nome_do_projeto && cd nome_do_projeto
python -m venv .venv
source .venv/Scripts/activate
mkdir -p src/processors src/utils src/vba tests/fixtures dist
touch src/__init__.py src/processors/__init__.py src/utils/__init__.py src/main.py
pip install pandas openpyxl pyinstaller
pip freeze > requirements.txt
```

O repositório no GitHub e o board do Linear são provisionados em A3 do fluxo da skill `iniciar-projeto`, pelo agente `project-manager`. Garantir que `.gitignore` cubra `.venv/`, `dist/`, `__pycache__/`, `.env`, `*.xlsm` e `*.log` antes do primeiro commit.

## Retomada de Sessão
```bash
source .venv/Scripts/activate
```
Sem isso: `ModuleNotFoundError` na primeira execução.
