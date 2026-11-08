# Fundamentos de Segurança

Os princípios que ancoram todo o resto. Se um controle técnico não serve a um destes fundamentos, provavelmente é cerimônia, não segurança. Carregar quando o projeto está sendo desenhado ou quando falta clareza sobre "por que" um controle existe.

## A Tríade CIA (+ Observabilidade)

Toda decisão de segurança protege um destes três (mais um quarto, moderno):

- **Confidencialidade** — só quem tem direito acessa o dado. Violada por: vazamento, acesso indevido, criptografia fraca. Protegida por: controle de acesso, criptografia, menor privilégio.
- **Integridade** — o dado não é alterado de forma não autorizada. Violada por: tampering, injeção, corrupção. Protegida por: validação, assinaturas, hashes, transações atômicas.
- **Disponibilidade** — o sistema está acessível quando necessário. Violada por: DoS, falha não tratada, exaustão de recursos. Protegida por: rate limiting, timeouts, redundância, tratamento de erro.
- **Observabilidade** (4º pilar) — é possível saber o que aconteceu e detectar o que está acontecendo. Sem ela, os outros três falham em silêncio. Provida por: logging estruturado, alertas, auditoria, telemetria.

Ao avaliar qualquer feature, perguntar: qual destes quatro ela pode quebrar? Essa é a pergunta que direciona quais controles aplicar.

## Defesa em Profundidade

Nunca depender de uma única camada. Se o firewall falha, ainda há autenticação; se a autenticação falha, ainda há autorização por objeto; se essa falha, ainda há criptografia e logs que detectam o abuso. Cada camada assume que a anterior pode ter sido furada.

Camadas típicas, de fora para dentro: rede (firewall, segmentação) → aplicação (autenticação, autorização, validação de input) → dados (criptografia, mascaramento) → observabilidade (logs, alertas) transversal a todas.

O oposto a evitar: "segurança de perímetro" — confiar que, por estar atrás do firewall, o tráfego interno é confiável. Não é (ver Zero Trust em `references/protecao.md`).

## Menor Privilégio (Least Privilege)

Cada componente, usuário, chave e conta de serviço recebe **apenas** as permissões mínimas necessárias para sua função, e nada além. Aparece em várias camadas: usuário no A01, chave de API no `secrets.md`, conta de serviço no hardening. É o mesmo princípio aplicado em contextos diferentes.

Corolário: **deny by default**. Começar negando tudo e liberar explicitamente o necessário, em vez de liberar tudo e tentar bloquear o perigoso.

## Fail Fast vs. Fail-Safe — reconciliação

Estes dois princípios parecem se contradizer, mas atuam em momentos diferentes e são complementares:

- **Fail Fast** (validação de entrada) — erre cedo e barulhento. Ao receber input inválido ou pré-condição não satisfeita, parar imediatamente com erro explícito, em vez de propagar estado inválido adiante. Definido em `~/.claude/CODIGO.md`.
- **Fail-Safe / Fail-Closed** (comportamento sob erro) — quando algo dá errado no meio da operação, o sistema deve cair para o estado **mais seguro**, não o mais permissivo. Em dúvida sobre autorização por causa de um erro, negar (nunca liberar por falha). É o A10 do OWASP.

Regra combinada: **validar rápido e barulhento na entrada; falhar fechado e silencioso para o atacante na saída.** Um não anula o outro — Fail Fast evita processar lixo; Fail-Safe garante que, se algo escapar, a falha não vira brecha.

## Princípio da Menor Surpresa aplicado à segurança

Comportamento previsível é comportamento auditável. Código que faz o que o leitor espera tem menos brechas ocultas: sem efeitos colaterais escondidos, sem "porta dos fundos" para debug esquecida, sem caminho de código que contorna a validação. Surpresa no código costuma ser onde o atacante mora.
