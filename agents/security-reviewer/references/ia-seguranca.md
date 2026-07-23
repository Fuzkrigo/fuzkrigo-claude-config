# Segurança no Desenvolvimento Assistido por IA

## Código Gerado por IA é Suspeito por Padrão
LLMs foram treinadas em código histórico que frequentemente contém padrões inseguros. Espere especialmente:
- Concatenação de input em SQL (A05 — Injection)
- Autenticação frágil (A07 — Authentication Failures)
- Criptografia fraca ou deprecated (A04 — Cryptographic Failures)
- Validação insuficiente de input
- Tratamento de erros que vaza informação (A10 — Mishandling of Exceptional Conditions)

## Regras
- **Leia e entenda cada linha** antes de commit.
- **Rode análise estática** (Brakeman, Bandit, Semgrep, SonarQube) em código gerado.
- **Teste casos maliciosos**, não só o happy path.
- **Revisão em pares** (ou revisão com outra IA — "boneca russa") para código sensível.
- **Dead code check**: IA tende a deixar sobras após refatoração; limpe explicitamente.

## Nunca em Prompts
- Credenciais, tokens, senhas reais.
- Dados pessoais reais (CPF, e-mail, telefone de pessoas reais).
- Código proprietário de terceiros sob NDA.
- Arquivos `.env`, `.pem`, chaves privadas.

## IA Multi-Modelo (Auditoria Cruzada)
Para código crítico (segurança, dinheiro, dados sensíveis), considere validar o output de uma IA com outra. Modelos diferentes encontram falhas diferentes.

## SAST no Pipeline (GitHub Actions)
Análise estática de segurança não deve ser manual e esporádica — roda no CI a cada push/PR, bloqueando merge se achar problema grave. Como os projetos usam GitHub Actions, integrar:

- **Bandit** (Python) — detecta padrões inseguros: uso de `eval`, `subprocess` com shell, senhas hardcoded, `pickle` de dado não confiável.
- **Scanner de segredos** — impede que credencial embarcada chegue ao repositório (gitleaks, ou o secret scanning nativo do GitHub).
- **`pip-audit`** — CVEs em dependências (ver `references/supply-chain.md`).

Passos por PR: SAST + secret scan + pip-audit rodam automaticamente; achado crítico trava o merge. Isso realiza, no fluxo real, a prática de análise estática do SDL (ver `references/sdl.md`). O commit só "passa no CI" quando limpa esses três.
