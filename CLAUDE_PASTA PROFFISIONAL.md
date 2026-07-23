# Diretrizes de Projetos Profissionais

> Complementa o CLAUDE.md global. Em caso de conflito, este vence por ser mais específico.
> Para templates, comandos e boilerplate, carregar a skill `pipeline-corporativo`.

---

## 1. Ambiente e Restrições

- **SO:** Windows corporativo. Terminal: Git Bash (default no Antigravity).
- **Usuários finais:** sem Python, sem permissão administrativa.
- **Desenvolvedor:** Python 3.10+, Git Bash, Google Antigravity.
- **Sem nuvem externa** (sem OneDrive, sem Docker, sem containers).
- **Versionamento e organização:** Git + GitHub são o hub central do projeto (repositório, board, issues, releases, GitHub Actions para CI). Fluxo conduzido pela skill `iniciar-projeto`.
- **Distribuição de executáveis:** pasta de rede `S:\CONTROL\FISCAL_REPORTS\10_INTELIGENCIA DE DADOS\1 - Desenvolvimento\0 - Claude\0 - Executáveis\`.
- Não sugerir containers ou soluções em nuvem externa. Alternativas de execução/distribuição sempre locais ou em drive de rede.

---

## 2. Stack e Arquiteturas

**A stack abaixo é uma base inicial sugerida, não uma regra.** Depois do briefing e do levantamento de requisitos (Fases 1-2 da skill `iniciar-projeto`), avaliar se ela atende ou se há opção melhor e mais aprofundada para o sistema em questão — e me apresentar a recomendação (manter a base ou trocar, com justificativa), respeitando a restrição de binário standalone para os usuários finais.

**Stack base:** VBA (front-end Excel) + Python 3.10+ (back-end) + PyInstaller (executável standalone). Bibliotecas padrão: `pandas`, `openpyxl`. Avaliar impacto no tamanho do `.exe` ao adicionar outras.

**Arquitetura A — VBA Puro:** automações simples, <200 linhas, sem cruzamento complexo. Entrega: `.xlsm`.

**Arquitetura B — VBA + Python + PyInstaller:** processamento de dados, lógica complexa, múltiplas fontes, performance. Entrega: `.xlsm` + `.exe` em rede.

Se eu não especificar arquitetura, **apresente as duas com prós/contras antes de codar**.

---

## 3. Regras Inegociáveis

- **Separação .xlsx/.xlsm:** `.xlsx` = dados (Python lê/escreve). `.xlsm` = macros (Python NUNCA abre). `openpyxl` destrói macros ao salvar .xlsm.
- **IPC via CLI apenas:** comunicação Excel ↔ Python sempre por linha de comando (argparse). Nunca `xlwings`, COM ou `win32com`.
- **Fail Fast (especialização corporativa):** aplica o princípio geral do `@.claude/CODIGO.md` ao contexto VBA+Python. Validar entrada antes de processar; cada projeto declara `REQUIRED_COLUMNS` no `reader.py`; mensagens de erro acionáveis para o usuário final.
- **Nunca engolir erros:** proibido `except: pass`.
- **console=False** no PyInstaller em produção (janela preta = bug para o usuário).

---

## 4. Testes — Overrides do Global

- **Cobertura:** 80% geral e **95% em `processor.py`** (a lógica fiscal crítica concentra-se aqui).
- `reader.py`/`writer.py`: cobertura menor (I/O, testados com mocks leves ou manualmente). Estratégia de camadas e mocks: `@.claude/CODIGO.md` (seção 8).
- **VBA:** sem testes automatizados. Validação manual antes do deploy.
- **Fixtures:** `tests/fixtures/` com dados sintéticos. Nunca planilhas reais.

---

## 5. Versionamento e Backup

- **Git + GitHub é o versionamento oficial** de todo projeto. Histórico, branches, PRs, releases e board seguem a skill `iniciar-projeto` (`references/git-conventions.md` e `references/releases.md`).
- **Backup em rede é complemento, não versionamento.** O mirror/snapshots no drive `S:` cobrem o que não vai para o repositório: o `.exe` compilado, artefatos grandes e cópia de segurança do ambiente local. Procedimentos na skill `pipeline-corporativo`.
- **Nunca commitar:** `.env`, credenciais, planilhas reais, binários grandes. `.gitignore` configurado antes do primeiro commit.

---

## 6. Segurança — Dados Fiscais

> Revisão completa de segurança → agente `security-reviewer` (invocar via ferramenta Agent).

Projetos lidam com **dados fiscais/operacionais** (impostos, faturamento, cruzamentos financeiros). Tratar com rigor de dado sensível: não expor em logs de rede, não incluir em debug, não colar em prompts de IA.

**Em prompts:** estruturas e regras de negócio podem ir. **Valores reais** (faturamento, CNPJs, fornecedores) → substituir por fictícios.

---

## 7. Erros Comuns

| Erro                              | Causa                | Solução                           |
| --------------------------------- | -------------------- | --------------------------------- |
| `ModuleNotFoundError: 'src'`      | Fora da pasta raiz   | `cd` até o projeto                |
| `ModuleNotFoundError: 'openpyxl'` | `.venv` inativo      | `source .venv/Scripts/activate`   |
| `KeyError: 'Coluna'`              | Case-sensitive       | Validar com `REQUIRED_COLUMNS`    |
| `PermissionError` escrita         | Planilha aberta      | Fechar Excel                      |
| `PermissionError` compilação      | Defender lock        | `rm dist/[projeto].exe`           |
| `.exe` sumiu                      | Defender quarentenou | Histórico de Proteção → Restaurar |
| Célula vazia sem erro             | `console=False`      | Checar `[projeto].log`            |
| `.xlsm` corrompido                | Python tocou macros  | Separar `.xlsx`/`.xlsm`           |
| Datas viram números               | Locale BR            | `DateSerial` / parsing PT-BR      |
| PDF vazio                         | ActivePrinter errado | `"Microsoft Print to PDF"`        |

---

## 8. CLAUDE.md do Projeto

Cada projeto tem **seu próprio CLAUDE.md** na raiz com: descrição do problema, `REQUIRED_COLUMNS`, regras de negócio, histórico de decisões, exceções a este arquivo. Este arquivo define o "como". O do projeto define o "o quê".
