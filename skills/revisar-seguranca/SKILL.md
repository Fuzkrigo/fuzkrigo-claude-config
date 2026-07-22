---
name: revisar-seguranca
description: Revisão de segurança completa para projetos de software. Use esta skill SEMPRE que o contexto envolver segurança de aplicação, OWASP, LGPD, proteção de dados, secrets management, hardening, validação de input, criptografia, threat modeling, STRIDE, segurança de API, cadeia de suprimentos de software, SDL, ou quando a skill `iniciar-projeto` atingir a Fase 9. Também ativar quando o usuário mencionar vulnerabilidades, vazamento de dados, auditoria de segurança, pentest, compliance, BOLA, defesa em profundidade, tríade CIA, ou pedir revisão de código com foco em segurança. Mesmo em tarefas pontuais que toquem em autenticação, autorização, tratamento de senhas ou dados pessoais, carregue esta skill.
---

# Revisão de Segurança

## Modo de Operação

Esta skill funciona de forma proativa. Ao ser ativada, analise o projeto e carregue **apenas** os módulos de referência necessários.

## Passo 1 — Triagem do Projeto

Antes de iniciar a revisão, avalie o projeto respondendo mentalmente estas perguntas:

| Pergunta | Se SIM → carregar |
|----------|-------------------|
| A aplicação tem endpoints, APIs, UI ou qualquer superfície de ataque? | `references/owasp.md` |
| A aplicação expõe APIs REST ou GraphQL (endpoints que recebem IDs, servem dados a clientes)? | `references/api-seguranca.md` |
| O código usa senhas, API keys, tokens, connection strings ou qualquer credencial? | `references/secrets.md` |
| O projeto instala dependências (pip, npm) ou distribui executáveis? | `references/supply-chain.md` |
| O projeto lida com dados pessoais (CPF, nome, e-mail, telefone, IP, cookies, dados fiscais de pessoas físicas)? | `references/lgpd.md` |
| A aplicação é exposta à internet ou processa input externo (usuários, APIs, arquivos)? | `references/protecao.md` |
| O código foi gerado ou assistido por IA? (dica: se estamos aqui, provavelmente sim) | `references/ia-seguranca.md` |
| Estamos desenhando uma feature sensível (auth, dinheiro, dados sensíveis, permissões)? | `references/threat-modeling.md` |
| Falta clareza sobre o "porquê" de um controle, ou o projeto está sendo concebido? | `references/fundamentos.md` |
| Estamos planejando o projeto e queremos integrar segurança ao fluxo de fases? | `references/sdl.md` |

**Na grande maioria dos projetos, `owasp.md` e `ia-seguranca.md` serão sempre necessários.** Os demais dependem do contexto. Em projetos novos, `fundamentos.md`, `threat-modeling.md` e `sdl.md` orientam o design seguro desde o início; nas revisões de código, o foco recai sobre `owasp.md`, `api-seguranca.md`, `secrets.md` e `supply-chain.md`.

## Passo 2 — Carregar os Módulos Relevantes

Leia os arquivos de referência identificados na triagem usando a ferramenta `view`. Cada arquivo contém um checklist autocontido com as verificações daquele domínio.

Localização dos arquivos: na pasta `references/` ao lado deste SKILL.md.

## Passo 3 — Executar a Revisão

Para cada módulo carregado:
1. Verificar cada item do checklist contra o código/arquitetura do projeto
2. Marcar como ✅ (OK), ⚠️ (atenção necessária) ou ❌ (falha de segurança)
3. Para cada ⚠️ ou ❌, descrever o problema concreto e a correção recomendada

## Passo 4 — Relatório

Ao final, produzir um relatório consolidado com:
- **Resumo**: quais módulos foram avaliados e por quê
- **Itens críticos (❌)**: listar primeiro, com correção imediata
- **Itens de atenção (⚠️)**: listar em seguida, com recomendação
- **Itens aprovados (✅)**: listar por último, brevemente
- **Próximos passos**: ações concretas priorizadas por risco

## Referências Disponíveis

| Arquivo | Conteúdo |
|---------|----------|
| `references/fundamentos.md` | Fundamentos — tríade CIA + observabilidade, defesa em profundidade, menor privilégio, fail-safe vs fail-fast |
| `references/owasp.md` | OWASP Top 10 2025 — os 10 riscos críticos de segurança web |
| `references/api-seguranca.md` | OWASP API Top 10 — BOLA/BFLA/BOPLA e riscos específicos de APIs |
| `references/threat-modeling.md` | Threat modeling com STRIDE — método para "o que pode dar errado?" |
| `references/sdl.md` | Security Development Lifecycle — segurança mapeada às 9 Fases |
| `references/secrets.md` | Gestão de segredos — credenciais, chaves, tokens |
| `references/supply-chain.md` | Cadeia de suprimentos — typosquatting, dependency confusion, pip-audit, SBOM |
| `references/lgpd.md` | LGPD compliance — classificação de dados, transparência ao titular, checklist |
| `references/protecao.md` | Proteção contra ataques — XSS, CSRF, DoS, input validation, Zero Trust, hardening |
| `references/ia-seguranca.md` | Segurança em código gerado por IA — padrões suspeitos, regras, SAST no CI |
