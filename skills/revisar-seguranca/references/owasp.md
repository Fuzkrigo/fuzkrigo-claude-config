# OWASP Top 10 2025

Os dez riscos mais críticos de aplicações web, edição final confirmada em janeiro de 2026. Toda aplicação deve ser avaliada contra eles. Em projetos novos, revisar antes de produção; em manutenção, revisar ao tocar em áreas sensíveis.

Mudanças-chave em relação a 2021: **SSRF foi absorvido no A01** (é um problema de controle de acesso, não de input isolado); **Security Misconfiguration subiu para #2**; **Software Supply Chain Failures virou categoria própria (A03)**; **Mishandling of Exceptional Conditions é nova (A10)**.

## A01 — Broken Access Control
- Risco #1 há anos. Todo endpoint/função sensível verifica **autorização**, não só autenticação.
- **Menor privilégio**: usuário só acessa o que precisa. **Deny by default**: negar por padrão, permitir explicitamente.
- **IDOR / BOLA**: nunca confiar em IDs vindos do cliente sem validar que o usuário logado é dono do objeto. Se a aplicação expõe APIs, ver `references/api-seguranca.md`.
- **SSRF** (agora aqui): se a aplicação faz requisições HTTP a partir de input do usuário, validar destinos contra allowlist e bloquear IPs internos (127.x, 10.x, 192.168.x, 169.254.x).

## A02 — Security Misconfiguration
- Subiu para #2: configuração incorreta é onipresente (deploy, cloud, containers, IaC, feature flags).
- Desabilitar features não usadas; nunca usar credenciais default de frameworks/bancos.
- Headers de segurança: `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`.
- Mensagens de erro genéricas para o usuário; detalhes só em logs internos.
- Endpoints de debug desativados em produção.

## A03 — Software Supply Chain Failures
- **Categoria nova** (era "Vulnerable and Outdated Components", agora expandida). Comprometer a cadeia costuma ser mais fácil que atacar a aplicação direto (SolarWinds, Log4Shell, dependency confusion).
- Manter **SBOM** (Software Bill of Materials) do projeto.
- Auditar dependências: `pip-audit` (Python), `npm audit`, `cargo audit`. Pin de versões via lockfile commitado.
- Detalhes de typosquatting, dependency confusion e proteção da cadeia: `references/supply-chain.md`.
- Integridade de artefatos: verificar checksums/assinaturas; para binários distribuídos (PyInstaller), considerar code signing.

## A04 — Cryptographic Failures
- Dados sensíveis **em trânsito**: TLS 1.2+ obrigatório, preferir 1.3.
- Dados sensíveis **em repouso**: AES-256 ou equivalente.
- Nunca usar algoritmos obsoletos (MD5, SHA-1 para senhas, DES).
- Senhas: hash com **bcrypt, Argon2 ou scrypt** (nunca SHA-256 puro).
- Chaves: geradas com RNG seguro, rotacionadas a cada 90 dias no mínimo. Gestão de segredos em `references/secrets.md`.

## A05 — Injection
- **Nunca** concatenar input do usuário em queries SQL, comandos de shell, caminhos de arquivo.
- SQL: **prepared statements / parameterized queries** sempre.
- Validar e sanitizar **todo input** no backend (nunca confiar só no frontend).
- XSS é injeção em contexto de browser: escapar output conforme o contexto (HTML, JS, URL).
- Cuidado: código gerado por IA tende a reintroduzir concatenação insegura.

## A06 — Insecure Design
- **Threat modeling antes de codar** features sensíveis: método STRIDE em `references/threat-modeling.md`.
- Definir controles de segurança **antes** da implementação, não depois.
- Security by Design, Security by Default: privacidade e segurança na concepção.
- Rate limiting em endpoints públicos (autenticação, APIs).

## A07 — Authentication Failures
- **MFA** sempre que possível para dados sensíveis.
- Sessões: timeout razoável, invalidação no logout, regeneração de ID após login.
- Rate limiting em endpoints de login (proteção contra brute force e credential stuffing).
- Nunca armazenar senhas em texto puro. Nunca.
- Não revelar se o erro foi no usuário ou na senha (evita enumeração de contas).

## A08 — Software and Data Integrity Failures
- Verificar integridade de pacotes baixados (checksums, assinaturas).
- **Pipeline CI/CD é ambiente de produção**: hardening, acesso restrito, auditoria, MFA nos runners.
- Cuidado com `deserialize` de dados não confiáveis (pickle em Python, ObjectInputStream em Java).
- Commits/tags assinados em branches de release; só o CI produz artefatos assinados.

## A09 — Security Logging and Alerting Failures
- Logar tentativas de autenticação (sucesso e falha), acessos negados, erros 500, mudanças em dados críticos.
- **Nunca logar dados sensíveis em claro** (senhas, tokens, CPF, cartões).
- Logs estruturados (JSON) com níveis adequados. Retenção definida e proteção contra adulteração.
- Alertas para padrões anômalos (picos de erro, logins falhos em massa, exfiltração em volume).
- Observabilidade como pilar: ver `references/fundamentos.md`.

## A10 — Mishandling of Exceptional Conditions
- **Categoria nova.** Cobre erros que surgem quando o sistema entra em estado que não foi projetado para tratar.
- Três falhas: não prevenir a situação anormal, não detectá-la enquanto acontece, responder mal ou não responder.
- **Falhar de forma segura** (fail-safe / fail-closed, nunca fail-open): negar acesso em caso de erro.
- Não vazar informação em erro (stack traces, chaves): mensagem genérica fora, detalhe no log interno.
- Limites para loops, recursão, memória e tamanho de input (evitar DoS por exaustão).
- Relação com Fail Fast (validação de entrada) vs. fail-safe (comportamento sob erro): ver `references/fundamentos.md`.
