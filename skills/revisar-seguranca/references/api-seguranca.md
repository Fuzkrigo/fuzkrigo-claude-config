# Segurança de APIs (OWASP API Top 10)

APIs têm uma classe de riscos própria, distinta do OWASP Top 10 web. O padrão web foca em XSS, injeção; o de API foca em **falhas de autorização** e abuso de lógica de negócio. Carregar quando o projeto expõe endpoints REST ou GraphQL.

Diferença central: muitos ataques a API são requisições **válidas** que retornam HTTP 200. O scanner web não detecta, porque não há payload malicioso — só um ID trocado. A autorização é o campo de batalha.

## As falhas de autorização (o núcleo do problema)

Três categorias dominam e são o que mais vaza dados em APIs modernas:

- **BOLA — Broken Object Level Authorization** (o risco #1, ~40% dos ataques a API). O endpoint recebe um ID de objeto e age sobre ele **sem verificar se o usuário logado é dono daquele objeto**. Ex.: `GET /faturas/12345` — trocar para `12346` e ver a fatura de outro. Autenticar não basta: por design o usuário tem acesso ao endpoint; a falha é no nível do objeto.
  - **Correção**: em **todo** endpoint que recebe ID, validar no servidor que o objeto pertence ao usuário da sessão. Centralizar essa lógica, não repetir ad hoc.
  - **Teste**: criar duas contas. Com a conta A, criar um recurso e anotar o ID. Com a conta B, tentar acessar esse ID. Se retornar o dado de A, é vulnerável. Repetir para cada endpoint que aceita ID.

- **BFLA — Broken Function Level Authorization**. Usuário comum acessa função administrativa (ex.: `DELETE /usuarios/99` ou `/admin/...`) porque a checagem de papel não existe no endpoint. Correção: controle de acesso por papel/função em cada rota sensível, deny by default.

- **BOPLA — Broken Object Property Level Authorization**. O usuário acessa o objeto legitimamente, mas consegue ler ou escrever **campos** que não deveria (ex.: enviar `{"is_admin": true}` num update de perfil — o velho "mass assignment"). Correção: allowlist de campos que o cliente pode ler e escrever; nunca fazer bind cego do payload no modelo.

## Demais riscos relevantes

- **Broken Authentication** — JWT mal validado (aceitar `alg:none`, ignorar assinatura, não checar expiração/issuer/audience). Usar tokens curtos com rotação, validar todas as claims, preferir assinatura assimétrica (RS256/ES256).
- **Unrestricted Resource Consumption** — sem rate limiting nem paginação, a API vira vetor de DoS e de extração em massa. Limitar taxa, tamanho de payload e volume por página.
- **Unrestricted Access to Sensitive Business Flows** — a API funciona como projetada, mas o atacante abusa em escala (bots em compra, cadastro, reset de senha). Exige proteção anti-automação nos fluxos críticos.
- **SSRF** — endpoint que faz requisição a URL vinda do cliente. Validar contra allowlist, bloquear IPs internos. (No web Top 10 2025, virou parte do A01.)
- **Improper Inventory Management** — APIs "zumbis" (versões antigas, ambientes de teste expostos) que ninguém monitora. Manter inventário de endpoints e versões.
- **Unsafe Consumption of APIs** — confiar cegamente na resposta de API de terceiro. Validar o que vem de fora tanto quanto o que vem do usuário.

## Regra de ouro

Autorização é verificada **no servidor, em toda requisição, no nível do objeto e da propriedade** — nunca no cliente, nunca só uma vez no login, nunca confiando em ID que o cliente enviou. WAF e API gateway não pegam BOLA: para eles, a requisição parece legítima.
