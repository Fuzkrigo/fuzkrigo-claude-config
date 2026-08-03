# Security Development Lifecycle (SDL)

Segurança não é uma fase no fim; é uma atividade em **cada** etapa do desenvolvimento. O SDL (originado na Microsoft, hoje base do DevSecOps) integra controles de segurança ao longo do ciclo. O ganho: bugs de segurança aparecem cedo, quando são baratos de corrigir. Carregar ao planejar um projeto ou ao querer entender onde cada controle de segurança entra no fluxo.

## Princípio

Segurança é responsabilidade de todos e está presente do primeiro requisito à aposentadoria do código, não um portão final de qualidade. É checklist **mais** mentalidade: o checklist dá as ações; a mentalidade sustenta que segurança é hábito diário, não evento.

## Mapeamento SDL → Blocos A / B / C

O SDL não é um processo paralelo — ele se encaixa nos blocos da metodologia (skill `iniciar-projeto`, com o ciclo de feature conduzido pela `fuzkrigo-spec-driven`). Onde cada prática entra:

| Etapa do fluxo | Prática de segurança do SDL |
| -------------- | --------------------------- |
| A1 — Briefing | Definir requisitos de segurança: que dados o sistema trata? Sensíveis? Regulados (LGPD)? Definir o nível de rigor. |
| A2 — Documentos-base | Classificar dados; estabelecer padrões de segurança do projeto; decidir stack por primitivas de segurança maduras. |
| A3 — Constituição | Traduzir cada restrição de segurança em princípio `[DEVE]` com verificação executável (`teste`, `proibido` ou `obrigatório`). É aqui que a política deixa de ser texto e passa a ser gate. |
| B — Especificar e Projetar | **Threat modeling (STRIDE)** — ver `references/threat-modeling.md`. Cada ameaça relevante vira critério de aceite observável ou princípio da constituição, nunca um lembrete solto. |
| B — Executar | Escrever os testes de segurança primeiro (autorização/BOLA, input malicioso, falha fechada); depois validação de input, criptografia e menor privilégio no código. SAST no CI (ver `references/ia-seguranca.md`). |
| B — Portão 1 (audit) | Os princípios `[DEVE]` são verificados mecanicamente a cada auditoria: violação quebra o gate, com arquivo e linha. Nunca "consertar" o princípio para passar. |
| B — Portão 2 | Revisão por quem não escreveu o código (este agente) quando a feature toca autenticação, autorização, permissões, dinheiro ou dados pessoais. Achado aceito volta como princípio novo. |
| C1 — Revisão da milestone | Auditoria completa: OWASP Top 10, checklist LGPD, revisão manual e reavaliação da superfície de ataque acumulada. Código morto e dependências desatualizadas entram aqui. |

## As práticas centrais do SDL

Independente da fase, o SDL prescreve:

- **Requisitos de segurança explícitos** — documentados e rastreados, revisitados quando a funcionalidade muda.
- **Padrões e governança** — regras claras (classificação de dados, limites de vulnerabilidade aceitáveis) que não podem ser burladas sem aprovação.
- **Escolher ferramentas seguras** — linguagens/frameworks com primitivas de segurança testadas; preferir memory-safe onde couber.
- **Threat modeling no design** — identificar, categorizar e pontuar ameaças antes da implementação.
- **Análise estática (SAST) automatizada** — no pipeline, a cada commit; scanner de segredos embarcados.
- **Revisão de código por terceiro** — quem revisa não é quem escreveu (separação de funções). Vale também para código gerado por IA.
- **Gestão de dependências e supply chain** — inventário (SBOM), scan de vulnerabilidades, cadência de atualização. Ver `references/supply-chain.md`.
- **Hardening do pipeline** — o CI/CD é produção: MFA, acesso mínimo, auditoria, builds isolados, artefatos assinados.
- **Patch management** — processo para monitorar, priorizar e aplicar correções. Vulnerabilidade de segurança tem prioridade alta.
- **Resposta a incidentes** — plano para localizar o afetado (via SBOM), reverter versão comprometida, comunicar.

## Melhoria contínua

O SDL é jornada, não destino: começar de algum ponto e evoluir. Políticas são documentos vivos, ajustados por incidentes reais e novas ameaças — não regras estáticas conferidas mecanicamente.
