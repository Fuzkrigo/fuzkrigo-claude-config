# Design System — Referência

> Versão inicial. Derivado do sistema "Blacksmith Group" gerado no Claude Design.
> Documento em construção — ver seção 10 (Pendências) antes de tratar qualquer parte como fechada.

---

## 1. Princípio

Design system não é sobre estética. É sobre **eliminar decisão arbitrária repetida**. Mesma lógica do `git-conventions.md`: você não decide o formato do commit toda vez, você segue o padrão. Sem sistema, cada tela reabre a pergunta "que tom de cinza? quanto de espaço aqui?" — e a resposta muda a cada vez, porque foi escolhida no olho.

**O que é universal e o que é da marca:**

| Camada | Conteúdo | Reutilizável em outro projeto? |
| ------ | -------- | ------------------------------ |
| Estrutura | Nomes de token, escalas, papéis semânticos, estados obrigatórios, regras de acessibilidade, materialização por stack | **Sim** — seções 2, 4, 5, 6, 7, 8, 9 valem para qualquer projeto |
| Valores | Hex, famílias tipográficas, conceito visual | **Não** — seção 3 é a identidade Blacksmith Group |

Projeto novo com marca própria: copiar o documento inteiro e trocar **apenas a seção 3**. Nada mais precisa mudar.

**Quando a IA deve consultar este arquivo:** qualquer trabalho que produza interface — web, desktop, formulário Excel, slide, documento. Antes de escolher uma cor, um espaçamento ou um tamanho de fonte, consultar aqui. Se o valor necessário não existir no sistema, **perguntar** em vez de inventar.

---

## 2. Arquitetura de tokens — duas camadas

```
CAMADA A — PRIMITIVOS              CAMADA B — SEMÂNTICOS
(o valor cru, sem intenção)        (o papel, apontando pro primitivo)

--iron-950   = #0F0F10      ←───   --bg
--iron-800   = #232324      ←───   --surface
--pergaminho = #E8D5B7      ←───   --fg-1
--forja-500  = #FF6B35      ←───   --accent
```

**Regra inegociável: código de aplicação usa exclusivamente a camada semântica.** Um `#FF6B35` ou um `var(--forja-500)` dentro de um componente é violação.

Motivo: trocar a identidade visual passa a custar uma linha (`--accent: var(--outra-cor)`) em vez de uma caçada por 200 usos espalhados. É a mesma razão que faz o tema claro (seção 10) ser barato de adicionar depois — os primitivos não mudam, só o mapeamento semântico.

---

## 3. Primitivos — Blacksmith Group

> **Esta é a única seção específica de marca.** Trocar por completo em projetos de outra identidade.

**Conceito:** a forja digital. Herança da metalurgia + precisão da tecnologia. Deve soar robusto, sóbrio, premium, discretamente futurista. Nunca "techy agressivo", nunca SaaS com emoji, nunca gradiente neon.

### 3.1 Cor — núcleo

| Token | Hex | Papel |
| ----- | --- | ----- |
| `--laranja-forja` | `#FF6B35` | Acento primário. Fogo. |
| `--ambar-quente` | `#F7931E` | Secundário quente. Brasa. |
| `--pergaminho` | `#E8D5B7` | Creme quente. Texto sobre ferro. A cor "humana". |
| `--ferro-fundido` | `#2D2D2D` | Superfície primária. Ferro de bigorna. |

### 3.2 Cor — escalas

```
Iron (neutros metálicos, 10 passos)
--iron-950 #0F0F10   --iron-900 #1A1A1B   --iron-800 #232324
--iron-700 #2D2D2D   --iron-600 #3A3A3C   --iron-500 #525255
--iron-400 #6E6E72   --iron-300 #8E8E94   --iron-200 #B0B0B6
--iron-100 #D4D4D8

Pergaminho (creme quente, 5 passos)
--pergaminho-100 #FAF4E8   --pergaminho-200 #F2E6CE
--pergaminho-300 #E8D5B7   --pergaminho-400 #D4BC95
--pergaminho-500 #B89B6E

Forja (fogo, 5 passos)
--forja-100 #FFE0D1   --forja-300 #FF9866   --forja-500 #FF6B35
--forja-700 #E04E1A   --forja-900 #A8350D

Âmbar (brasa, 3 passos)
--ambar-300 #FBC074   --ambar-500 #F7931E   --ambar-700 #C76F08

Absolutos
--preto #000000   --branco #FFFFFF
```

### 3.3 Tipografia

| Token | Valor |
| ----- | ----- |
| `--font-sans` | `Montserrat` → `ui-sans-serif, system-ui, Segoe UI, sans-serif` |
| `--font-display` | `Oswald` → `Montserrat, ui-sans-serif, sans-serif` |
| `--font-mono` | `ui-monospace, JetBrains Mono, SF Mono, Menlo, Consolas, monospace` |

**Pesos:** 400 regular · 500 medium · 600 semibold · 700 bold · 800 extrabold · 900 black

**Escala:**

| Token | rem | px | Uso |
| ----- | --- | -- | --- |
| `--fs-display` | 4.5 | 72 | Hero. Caixa alta. |
| `--fs-h1` | 3 | 48 | Caixa alta. |
| `--fs-h2` | 2.25 | 36 | |
| `--fs-h3` | 1.625 | 26 | |
| `--fs-h4` | 1.25 | 20 | |
| `--fs-body` | 1 | 16 | Base. |
| `--fs-small` | 0.875 | 14 | |
| `--fs-xs` | 0.75 | 12 | Eyebrow, label. |

**Altura de linha:** `--lh-tight` 1.05 (display) · `--lh-snug` 1.2 (título) · `--lh-normal` 1.5 (corpo) · `--lh-loose` 1.7

**Tracking:** `--tracking-tight` -0.01em · `--tracking-normal` 0 · `--tracking-wide` 0.08em (display caps) · `--tracking-wider` 0.16em (botão, nav) · `--tracking-widest` 0.28em (eyebrow)

Tracking generoso em caixa alta é a assinatura da marca. Não reduzir por conta própria.

### 3.4 Espaçamento, raio, elevação, motion

```
Espaço (base 4px)
--space-1 4   --space-2 8    --space-3 12   --space-4 16   --space-5 24
--space-6 32  --space-7 48   --space-8 64   --space-9 96

Raio
--radius-xs 2   --radius-sm 4   --radius-md 8 (padrão)
--radius-lg 14  --radius-xl 20  --radius-pill 999

Elevação
--shadow-sm    0 1px 2px rgba(0,0,0,.4)
--shadow-md    0 4px 14px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.04) inset
--shadow-lg    0 18px 40px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.05) inset
--shadow-glow  0 0 0 1px rgba(255,107,53,.4), 0 8px 28px rgba(255,107,53,.35)

Motion
--ease-forge   cubic-bezier(.2,.8,.2,1)   entradas
--ease-strike  cubic-bezier(.7,0,.2,1)    saídas e cliques
--dur-fast 140ms   --dur-base 220ms   --dur-slow 420ms
```

O highlight interno de 1px nas sombras `md` e `lg` é o brilho do metal polido. Faz parte da identidade — não remover ao simplificar.

Movimento é decisivo e pesado: as coisas **pousam**. Sem mola, sem overshoot. Nunca acima de 420ms.

---

## 4. Semânticos

Camada canônica: **escuro**. O tema claro está pendente (seção 10).

| Papel | Token | Aponta para |
| ----- | ----- | ----------- |
| **Superfícies** | `--bg` | `--iron-950` — fundo de página |
| | `--surface` | `--iron-800` — card, painel |
| | `--surface-raised` | `--iron-700` — modal, popover |
| | `--surface-sunken` | `--iron-900` — poço, input |
| **Texto** | `--fg-1` | `--pergaminho` — primário |
| | `--fg-2` | `--iron-200` — secundário |
| | `--fg-3` | `--iron-400` — terciário / muted **(ver 7.1)** |
| | `--fg-on-fire` | `--iron-950` — texto sobre laranja |
| **Bordas** | `--border` | `--iron-600` |
| | `--border-subtle` | `--iron-700` |
| | `--border-strong` | `--iron-500` |
| **Acento** | `--accent` | `--laranja-forja` |
| | `--accent-hover` | `--forja-700` |
| | `--accent-soft` | laranja a 16% de opacidade |
| | `--accent-2` | `--ambar-quente` |
| **Status** | `--success` | `#4ADE80` |
| | `--warning` | `--ambar-quente` |
| | `--danger` | `#EF4444` |
| | `--info` | `#60A5FA` |

---

## 5. Componentes

### 5.1 Estados obrigatórios

O erro clássico é desenhar só o estado feliz. Todo componente interativo declara:

| Estado | Obrigatório em | Regra |
| ------ | -------------- | ----- |
| `default` | todos | |
| `hover` | clicáveis | 140ms, `--ease-forge` |
| `focus` | focáveis | **Anel de 2px sólido `--accent`, deslocado 2px. Nunca remover.** |
| `active` | clicáveis | `scale(0.97)`, 100ms, `--ease-strike` |
| `disabled` | formulário e botão | opacidade reduzida, cursor não permitido |
| `loading` | ações assíncronas | **pendente de definição** |
| `error` | campos de entrada | **pendente de definição** |
| `empty` | listas e tabelas | **pendente de definição** |

### 5.2 Especificado hoje

**Botão** — caixa alta, `--fw-bold`, tracking 0.16–0.18em.

| Variante | Fundo | Borda | Texto |
| -------- | ----- | ----- | ----- |
| Primário | `--accent` | nenhuma | `--fg-on-fire` + `--shadow-glow` |
| Secundário | `--surface` | 1px `--border-strong` | `--fg-1` |
| Ghost | transparente | 1px transparente | `--fg-1` |

Tamanhos: grande `14px 22px` / fonte 12px / raio `--radius-md`. Pequeno `9px 14px` / fonte 11px / raio 6px. **Ver 7.2 sobre altura de alvo.**

**Input** — fundo `--surface-sunken`, borda 1px `--border`, raio 6px, padding `12px 14px`, fonte 14px. Label em caixa alta 10px, tracking 0.18em, cor `--fg-2`. Foco: borda `--accent` + halo `rgba(255,107,53,.2)` de 2px. **Ver 7.1 — a borda padrão reprova em contraste.**

**Card** — fundo `--surface`, borda 1px `--border-subtle`, raio `--radius-md`, sombra `--shadow-md`, padding interno 24–32px. Variante *featured*: barra esquerda de 2–3px em `--accent`. É um destaque, não o padrão.

**Badge** — pílula (`--radius-pill`), caixa alta 10px, tracking 0.18em, padding `6px 12px`. Status usa a cor a ~14% de opacidade no fundo, ~30% na borda, cor cheia no texto.

**Nav superior** — fixa, fundo `--bg` a 80% com `backdrop-filter: blur(16px)`, borda inferior 1px `--surface`. Item ativo em `--fg-1`, inativo em `--iron-300`.

### 5.3 Não especificado

Todo o vocabulário de **produto** está ausente: tabela de dados, formulário longo, estado vazio, erro inline, paginação, tabs, tooltip, modal, toast, breadcrumb, densidade compacta. O sistema atual cobre marca e marketing. Ver seção 10.

---

## 6. Composição

**Proporção de cor — regra dura:** ferro/preto ≥ 75% · pergaminho 15–20% · forja + âmbar ≤ 5–8% somados. *Laranja é carimbo, não banho.* Nunca preencher superfície grande com o acento.

**Um botão primário por tela.** Se há dois, um deles não é primário.

**Layout:** largura máxima 1200px (aplicação) / 1440px (hero de marketing). Grid de 12 colunas, gutter 24px, margem externa 64px. Entre seções principais no desktop: 64–96px.

**Ritmo de seção:** alternar `--iron-950` e `--iron-900` para listrar páginas longas.

**Fundo:** ferro chapado, sem gradiente em hero. Permitido: grão de filme 4–8% de opacidade, ou gradiente de 1° entre `--iron-950` e `--iron-900`. O brilho de brasa (radial de `--accent` a ~12%) é permitido **uma vez por página, no máximo**.

**Transparência e blur:** raros. A marca é sólida, não vaporosa. Permitido em nav fixa e em scrim de modal (`rgba(0,0,0,.6)` chapado, sem blur).

**Imagem:** duotone `--ferro-fundido` → `--laranja-forja`, ou preto e branco de alto contraste. Grão é bem-vindo. Proibido: foto de escritório genérica, tom azulado, mascote ilustrado.

**Ícones:** Lucide, traço de 2px em 24px. Tamanhos 16/20/24/32. Cor `--fg-1`, `--accent` quando ativo. Gap de 8px ao pareá-los com texto. É um substituto, não um conjunto proprietário.

**Caixa:** título e momento de marca em CAIXA ALTA com tracking. Subtítulo em Title Case. Corpo em sentence case. Botão e nav em caixa alta.

**Emoji: nunca em conteúdo externo.** Glifos unicode utilitários (`→ ← ↑ ↓ · — §`) são permitidos; decorativos (`✨ ★`) não.

---

## 7. Acessibilidade

Alvo: **WCAG 2.2 nível AA**. Critérios verificáveis, não opinião.

### 7.1 Contraste — medições reais

Mínimos: texto normal **4.5:1** · texto grande (≥24px, ou ≥18.66px em bold) **3:1** · componente de UI e indicador funcional **3:1**.

Aprovados com folga: `--fg-1` sobre `--bg` (13.35:1) e sobre `--surface` (10.94:1) · `--fg-2` sobre `--bg` (8.88:1) · `--accent` sobre `--bg` (6.76:1) · botão primário (6.76:1) e seu hover (4.81:1) · os quatro status sobre `--bg` (5.09:1 a 10.99:1).

**Reprovados — corrigir antes de usar em produção:**

| Uso | Medido | Exigido | Correção |
| --- | ------ | ------- | -------- |
| `--fg-3` como texto sobre `--bg` | 3.77:1 | 4.5:1 | Restringir a texto ≥24px, ou repontar para `--iron-300` (#8E8E94) |
| `--fg-3` como texto sobre `--surface` | 3.09:1 | 4.5:1 | Idem |
| Borda de input `--border` sobre `--surface-sunken` | **1.53:1** | 3:1 | **Mais grave.** O campo não se distingue do fundo, e `--surface-sunken` também não se distingue de `--bg`. Subir a borda para `--iron-400` (#6E6E72) ou mais claro |
| `--border-strong` sobre `--bg` | 2.46:1 | 3:1 | Só corrigir se usada em elemento funcional |

Isento por norma, mas ruim na prática: botão `disabled` (2.23:1) — o critério 1.4.3 dispensa componente inativo. Bordas puramente decorativas (costura entre painéis) também são isentas do 1.4.11; a exigência de 3:1 vale para bordas que *identificam* um componente.

### 7.2 Alvo de toque

Critério 2.5.8 (AA) exige 24×24px. Botão grande resulta em ~42px e botão pequeno em ~31px — ambos passam em AA. O nível AAA (2.5.5) pede 44×44px; **nenhum dos dois alcança**. Em interface tocável, aumentar o padding vertical.

### 7.3 Demais critérios

- **Foco sempre visível.** Remover o `outline` por achar feio é a violação nº 1 da web. O anel de `--accent` a 2px já resolve — usar.
- **Ordem de tabulação** segue a ordem visual.
- **Nunca comunicar por cor apenas.** Campo com erro precisa de ícone ou texto, não só borda vermelha. Daltônico não vê a diferença.
- **Texto alternativo** em toda imagem que carrega informação.
- **Respeitar `prefers-reduced-motion`**: desligar translação e escala, manter apenas crossfade.

---

## 8. Materialização por stack

Os tokens são declarados uma vez em formato neutro. Cada destino consome do jeito dele.

| Destino | Como |
| ------- | ---- |
| **CSS puro** | `colors_and_type.css` como está — `:root { --token: valor }`. É a fonte canônica. |
| **Tailwind** | Mapear os semânticos no `theme.extend` apontando para `var(--token)`. Nunca duplicar os hex no config. |
| **React / Vue** | Consumir só a camada semântica via classe ou `var()`. Proibido hex literal em componente. |
| **VBA / UserForm Excel** | CSS var não existe. Converter hex para `RGB(r,g,b)` em constantes de um módulo único, com o mesmo nome semântico. Tipografia limitada às fontes instaladas — usar o fallback `Segoe UI`. |
| **Documento / slide** | Usar o tema claro quando existir (seção 10). Enquanto não existir, `--pergaminho-100` como fundo e `--iron-900` como texto é o par mais próximo da identidade. |

**Fonte offline:** a declaração atual importa Montserrat e Oswald do Google Fonts via CDN. Em máquina corporativa com saída bloqueada, a tipografia inteira cai para o fallback. Em projeto que rode nesse ambiente, baixar os arquivos e servir via `@font-face` local.

**Compatibilidade:** `--accent-soft` usa `color-mix(in oklab, ...)`, que exige navegador moderno (Chrome 111+, Safari 16.2+). Em alvo legado, substituir por um `rgba()` fixo.

---

## 9. Anti-padrões

1. **Hex literal em componente.** Se aparece `#FF6B35` fora da seção 3, o sistema já foi quebrado.
2. **Primitivo direto no código.** `var(--forja-500)` num botão é tão errado quanto o hex — usar `var(--accent)`.
3. **Valor fora da escala.** `margin: 18px` não existe. É 16 ou 24.
4. **Laranja como preenchimento de área grande.** Viola a proporção da seção 6 e destrói a sobriedade da marca.
5. **Remover o anel de foco.**
6. **Novo tamanho de fonte inventado.** Se a escala não tem, ou usa o mais próximo ou a escala muda — e mudar a escala é decisão, não improviso.
7. **Copiar HTML dos cards de preview para produção.** Eles têm valor hard-coded por serem especímenes de exibição.
8. **Animação acima de 420ms**, mola ou overshoot.
9. **Emoji em conteúdo externo.**
10. **Adicionar variante "porque pode".** Mesma regra do `PATTERNS.md`: dor primeiro, variante depois.

---

## 10. Pendências

Aberto e não resolvido. Nada aqui deve ser inventado pela IA — são decisões pendentes.

| # | Pendência | Por que importa |
| - | --------- | --------------- |
| 1 | **Tema claro** | O README da fonte afirma que existe; o CSS não tem. Relatório, documento impresso e planilha são claros por natureza — metade dos projetos precisa. A estrutura de duas camadas torna barato: remapear os semânticos, manter os primitivos. |
| 2 | **Componentes de produto** | Tabela, formulário longo, estado vazio, erro inline, modal, toast, tabs, paginação, densidade compacta. O sistema atual é de marca; falta o de aplicação. |
| 3 | **Correções de contraste** | Os quatro itens reprovados em 7.1 precisam de novo valor definido e verificado. |
| 4 | **Estados `loading` / `error` / `empty`** | Declarados obrigatórios em 5.1, sem especificação visual. |
| 5 | **Breakpoints e z-index como token** | Hoje existem só em prosa (1200/1440px, grid 12col). Sem variável, cada projeto reinventa. |
| 6 | **Escopo por projeto** | Definir a regra: qual projeto herda a identidade Blacksmith e qual só herda a estrutura (seção 1). |
| 7 | **Fontes locais** | Decidir se vale baixar Montserrat/Oswald para o repositório, dado o contexto corporativo com CDN bloqueado. |
| 8 | **Distribuição** | O archive traz um `SKILL.md` — avaliar se o sistema vira skill invocável, referência em `CLAUDE.md`, ou os dois. |
