# Security Development Lifecycle (SDL)

Segurança não é uma fase no fim; é uma atividade em **cada** etapa do desenvolvimento. O SDL (originado na Microsoft, hoje base do DevSecOps) integra controles de segurança ao longo do ciclo. O ganho: bugs de segurança aparecem cedo, quando são baratos de corrigir. Carregar ao planejar um projeto ou ao querer entender onde cada controle de segurança entra no fluxo.

## Princípio

Segurança é responsabilidade de todos e está presente do primeiro requisito à aposentadoria do código, não um portão final de qualidade. É checklist **mais** mentalidade: o checklist dá as ações; a mentalidade sustenta que segurança é hábito diário, não evento.

## Mapeamento SDL → Fluxo de 9 Fases

O SDL não é um processo paralelo — ele se encaixa nas 9 Fases da metodologia (skill `iniciar-projeto`). Onde cada prática entra:

| Fase da metodologia | Prática de segurança do SDL |
| ------------------- | --------------------------- |
| 1. Briefing | Definir requisitos de segurança: que dados o sistema trata? Sensíveis? Regulados (LGPD)? Definir o nível de rigor. |
| 2. Roadmap | Classificar dados; estabelecer padrões de segurança do projeto; decidir stack por primitivas de segurança maduras. |
| 3. Doc técnica | **Threat modeling (STRIDE)** — ver `references/threat-modeling.md`. Desenhar controles antes de codar. |
| 5. Plan Mode | Revisar o plano sob a ótica de ameaças; validar que os controles cobrem o modelo de ameaças. |
| 6. TDD | Escrever testes de segurança: casos de autorização (BOLA), input malicioso, falha fechada. |
| 7. Implementação | Validação de input, criptografia, menor privilégio no código. SAST no CI (ver `references/ia-seguranca.md`). |
| 8. Refatoração | Remover código morto, reduzir superfície de ataque, revisar dependências. |
| 9. Revisão de Segurança | Auditoria completa: OWASP Top 10, checklist LGPD, revisão manual por quem não escreveu o código. |

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
