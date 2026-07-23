# Proteção Contra Vazamento e Ataques

## Proteção de Dados
- **Dados em repouso**: criptografia AES-256. Inclui banco, arquivos, backups, caches persistentes.
- **Dados em trânsito**: TLS 1.2+ (preferir 1.3). HSTS habilitado.
- **Dados em uso (memória)**: em linguagens gerenciadas, limpar referências após uso. Em C/Rust, zerar memória.
- **Backups**: criptografados, testados regularmente (backup não testado = backup inexistente), armazenados separadamente.

## Proteção Contra Ataques Comuns
- **XSS (Cross-Site Scripting)**: escapar output HTML sempre. CSP restritivo.
- **CSRF**: tokens anti-CSRF em formulários que mudam estado. SameSite cookies.
- **Clickjacking**: `X-Frame-Options: DENY` ou `frame-ancestors 'none'` no CSP.
- **Path Traversal**: validar e normalizar caminhos de arquivo. Nunca concatenar input em paths.
- **Open Redirect**: validar URLs de redirecionamento contra allowlist.
- **Race Conditions / TOCTOU**: usar operações atômicas, locks adequados, transações no banco.
- **DoS (Denial of Service)**: rate limiting, timeouts, limites de payload, limites de recursão.
- **DDoS**: WAF (Web Application Firewall) e CDN em aplicações expostas publicamente.

## Validação de Input
- **Toda entrada externa é suspeita**: user input, APIs externas, arquivos lidos, variáveis de ambiente, queries parameters, headers HTTP.
- Validação no backend **sempre** (frontend é conveniência, não segurança).
- Tipo, tamanho, formato, range, charset, encoding.
- **Allowlist** (o que é permitido) é mais seguro que **blocklist** (o que é proibido).

## Zero Trust
- Assumir que todo usuário pode ser malicioso.
- Assumir que todo componente interno pode estar comprometido.
- Não confiar só no perímetro (firewall): defesa em profundidade.

## Observabilidade de Segurança
- Logs de segurança centralizados.
- Alertas para: tentativas de login falhas em massa, acessos fora de horário, exfiltração de dados em volume anormal, erros 500 em picos.
- Plano de resposta a incidentes documentado antes de precisar dele.

## Hardening de Ambiente
- Sistemas operacionais atualizados (patches de segurança).
- Serviços desnecessários desabilitados.
- Portas abertas minimizadas.
- Princípio do menor privilégio em contas de serviço.
- Separação de redes (produção ≠ desenvolvimento).
