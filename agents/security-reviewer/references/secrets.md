# Secrets Management (Hardcoded Credentials)

**Regra absoluta: segredos NUNCA no código, NUNCA no Git.**

## O que é segredo
Senhas, API keys, tokens de acesso, connection strings de banco, chaves de criptografia, certificados privados, credenciais de SSO/OAuth.

## Onde armazenar
Em ordem de preferência:
1. **Secrets manager dedicado** (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) — ideal para produção.
2. **Variáveis de ambiente** carregadas em runtime — bom para dev/staging.
3. **Arquivo `.env`** local, **nunca commitado** (adicionar ao `.gitignore`).

## Regras
- `.env.example` commitado com chaves vazias ou placeholders para documentar variáveis necessárias.
- Rotacionar segredos a cada **90 dias** ou imediatamente após suspeita de vazamento.
- Princípio do menor privilégio: cada chave tem escopo mínimo necessário.
- Chaves diferentes para ambientes diferentes (dev ≠ staging ≠ prod).
- **Secret scanning** no pipeline CI (gitleaks, trufflehog, detect-secrets).
- Se um segredo vazou no Git (mesmo em commit antigo), **rotacioná-lo imediatamente** — reescrever histórico não é suficiente.

## Alerta para IA
Antes de sugerir qualquer código que use segredo, **verifique** se há plano de injeção seguro. Nunca escreva `API_KEY = "sk-..."` em exemplo, mesmo fictício.
