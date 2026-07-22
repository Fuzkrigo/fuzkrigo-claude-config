# Threat Modeling com STRIDE

Threat modeling responde "o que pode dar errado?" de forma sistemática, **antes** de codar (Insecure Design, A06). Sem método, a análise cobre só as ameaças óbvias que a pessoa já conhece. STRIDE dá um checklist mental que força cobertura completa. Carregar ao desenhar features sensíveis (autenticação, dados sensíveis, dinheiro, permissões).

## Como aplicar (processo)

1. **Desenhar o fluxo** — um diagrama simples da feature: quem são os atores externos, os processos, os armazenamentos de dados e os fluxos entre eles. O `ARCHITECTURE.md` (Mermaid) já serve de base.
2. **Marcar as fronteiras de confiança** — onde o dado cruza de "não confiável" para "confiável" (ex.: input do usuário entrando no backend). É nessas fronteiras que as ameaças se concentram.
3. **Aplicar STRIDE a cada elemento** — para cada processo, fluxo e armazenamento, perguntar quais das 6 categorias podem afetá-lo.
4. **Propor mitigação** — cada ameaça identificada recebe um controle concreto.
5. **Priorizar** — por probabilidade x impacto. Nem toda ameaça precisa de tratamento imediato.

## As 6 categorias (e o que cada uma viola)

Cada letra de STRIDE é a violação de uma propriedade de segurança — por isso mapeia direto para a tríade CIA (ver `references/fundamentos.md`):

- **S — Spoofing (falsificação de identidade)** — atacante se passa por outro usuário ou sistema. Viola **autenticação**. Mitigação: autenticação forte, MFA, verificação de origem.
- **T — Tampering (adulteração)** — modificação não autorizada de dados em trânsito ou repouso. Viola **integridade**. Mitigação: assinaturas, hashes, validação, transações.
- **R — Repudiation (repúdio)** — ator realiza uma ação e depois nega, e não há como provar. Viola **não-repúdio**. Mitigação: logs de auditoria imutáveis, trilha de quem-fez-o-quê-quando.
- **I — Information Disclosure (vazamento)** — exposição de dado a quem não deveria vê-lo. Viola **confidencialidade**. Mitigação: criptografia, controle de acesso, mascaramento.
- **D — Denial of Service (negação de serviço)** — tornar o recurso indisponível. Viola **disponibilidade**. Mitigação: rate limiting, timeouts, limites de payload e recursão.
- **E — Elevation of Privilege (elevação de privilégio)** — ganhar direitos que não deveria ter. Viola **autorização**. Mitigação: menor privilégio, deny by default, verificação de autorização por objeto.

## Mapeamento elemento → ameaças prováveis

Nem todo elemento sofre todas as 6. Guia para focar a análise:

- **Entidades externas** (usuários, sistemas terceiros): principalmente **S** e **R**.
- **Processos** (sua aplicação, serviços): as **6** categorias.
- **Armazenamentos de dados** (banco, arquivos, cache): **T, R, I, D**.
- **Fluxos de dados** (rede, IPC, chamadas): **T, I, D**.

## Nota de escopo

Para a maioria dos projetos, STRIDE aplicado nas fronteiras de confiança já cobre o essencial. Sistemas grandes podem usar STRIDE-per-interaction (foco nas interações entre elementos, não nos elementos isolados) para reduzir o volume de ameaças a revisar. Não transformar o modelo em burocracia: o objetivo é encontrar as brechas de design cedo, não produzir documento.
