# Design Patterns — Referência

---

## 1. Princípio

Design patterns não são decorativos. Só entram quando resolvem uma dor concreta do código. A IA deve **sugerir proativamente** quando um pattern resolveria um problema real que estou enfrentando, mas nunca impor, nunca aplicar antecipadamente, nunca usar porque "fica profissional".

A regra é: **dor primeiro, pattern depois.** Código simples que funciona é melhor que código "arquiteturalmente limpo" cheio de abstrações desnecessárias.

---

## 2. Quando Sugerir

A IA deve identificar e sugerir um pattern quando eu estiver:
- Escrevendo `if/elif/elif/elif` grande baseado em tipo → considerar **Strategy**
- Copiando e colando fluxos inteiros mudando só 1-2 passos → considerar **Template Method**
- Criando função com 10+ passos sequenciais que o chamador precisa orquestrar → considerar **Facade**
- Repetindo a mesma lógica transversal (log, retry, medir tempo) em várias funções → considerar **Decorator**
- Fazendo validações encadeadas com múltiplos `if` independentes → considerar **Chain of Responsibility**
- Construindo objetos com lógica condicional espalhada → considerar **Factory**

**Como sugerir:**
1. Apontar a dor concreta
2. Nomear o pattern
3. Mostrar o benefício em 1 frase
4. Perguntar se quer aplicar
5. **Nunca aplicar sem confirmação**

---

## 3. Catálogo Core — Sugestão Proativa

A IA deve sugerir proativamente quando detectar a dor correspondente.

### Strategy
- **Quando:** múltiplas formas de fazer a mesma coisa, selecionadas em runtime
- **Sinal:** `if/elif/elif` baseado em tipo com lógica complexa em cada branch
- **Exemplos:** cálculo de tributos (INSS, CSRF, IRRF), regimes fiscais, métodos de pagamento, validadores de formulário
- **Preferência:** dicionário de funções em vez de classes quando a linguagem permite, exceto no contexto fiscal quando houver necessidade de histórico e estado entre chamadas (ex: histórico, saldo, configurações)

### Template Method
- **Quando:** esqueleto de processo fixo com variações pontuais
- **Sinal:** cópia de fluxos quase idênticos mudando 1-2 passos
- **Exemplos:** pipeline de automação (ler → validar → processar → escrever), ciclo de vida de componentes, fluxos de build/deploy
- **Preferência:** função genérica que aceita callbacks, não herança

### Facade
- **Quando:** conjunto de passos complexos expostos como interface simples
- **Sinal:** chamador precisa conhecer ordem correta de 5+ funções para uma tarefa
- **Exemplos:** função pública que orquestra módulos internos, SDK sobre API complexa
- **Preferência:** função ou classe de alto nível que encapsula as chamadas internas

### Decorator
- **Quando:** funcionalidade transversal aplicada em várias funções sem poluir o código
- **Sinal:** mesmo `try/except`, mesmo log, mesma medição de tempo repetidos em N funções
- **Exemplos:** logging, retry, cache, medição de tempo, autenticação, validação de permissão
- **Preferência:** `@decorator` em Python, higher-order functions em JS. Não existe em VBA.

### Chain of Responsibility
- **Quando:** sequência de validações/processadores independentes que podem decidir parar ou passar adiante
- **Sinal:** lista de `if` de validação que rodam em ordem e param no primeiro erro
- **Exemplos:** validação de entrada, middleware HTTP, pipeline de filtros, parsers
- **Preferência:** lista de funções validadoras iterada em loop, retornando no primeiro erro

### Factory
- **Quando:** construção de objeto/função depende de condições e deve ser centralizada
- **Sinal:** criação de objetos complexos espalhada com lógica condicional repetida
- **Exemplos:** criar leitores para diferentes formatos, instanciar drivers de banco
- **Preferência:** função de criação única que retorna o objeto apropriado

---

## 4. Catálogo Completo Referência - 23 patterns do Gang of Four

Sugerir apenas quando o contexto do projeto claramente pedir.

**Criacionais:**
- **Builder** — objetos complexos em etapas. Útil para: queries SQL, documentos, planilhas
- **Abstract Factory** — famílias de objetos relacionados. Útil para: UIs cross-platform
- **Prototype** — clonar objetos em vez de construir do zero
- **Singleton** — instância única global. Controverso; preferir módulos Python ou injeção de dependência

**Estruturais:**
- **Adapter** — conectar interfaces incompatíveis. Útil para: integrar biblioteca antiga, wrapper de API legada
- **Bridge** — separar abstração de implementação
- **Composite** — tratar elementos individuais e grupos uniformemente. Útil para: UI trees, ASTs
- **Proxy** — controle de acesso ao objeto real. Útil para: lazy loading, cache, ORMs
- **Flyweight** — compartilhar estado comum entre muitos objetos

**Comportamentais:**
- **Observer** — assinatura de eventos. Fundamental em: frontend reativo, pub/sub, event-driven
- **Command** — encapsula ação como objeto. Fundamental em: undo/redo, fila de tarefas, CQRS
- **State** — comportamento varia por estado interno. Útil para: workflows com fases, UI states
- **Mediator** — coordenador central de comunicação
- **Memento** — snapshot e restauração de estado. Útil para: undo com histórico
- **Iterator** — acesso sequencial à coleção. Redundante em Python (tem `for`/generators nativos); relevante em C++, Java, Go quando precisa de iterador customizado
- **Visitor** — adiciona operações a estruturas sem modificar suas classes. Útil para: ASTs, compiladores

---

## 5. Regras Inegociáveis

1. Nunca aplicar pattern sem dor concreta identificada
2. Nunca aplicar na primeira versão — aguardar segunda ou terceira iteração
3. Sempre preferir solução mais simples (dicionário > classe abstrata, parâmetro > herança)
4. Documentar no PLANEJAMENTO.md quando um pattern foi aplicado e qual dor resolveu
5. Se aplicar o pattern aumentar linhas sem reduzir complexidade real → recuar

---

## 6. Anti-Padrões a Evitar

- **Pattern cosmético:** aplicar só para parecer profissional, sem dor real
- **Over-abstraction:** criar 5 interfaces para 1 implementação única
- **Pattern amontoado:** empilhar múltiplos patterns no mesmo código sem necessidade
- **Premature generalization:** preparar para "N tipos futuros" quando só existe 1 hoje
- **Classes desnecessárias:** usar OOP em problemas que função simples resolve

---

## 7. Regra de Sugestão Proativa vs. Contextual

**Sugestão proativa:** A IA sugere ativamente os **6 patterns da seção 3.** quando detectar a dor correspondente no código, em qualquer tipo de projeto.

**Sugestão contextual:** Para os patterns da seção 4., a IA só sugere quando o **contexto do projeto claramente pedir**:
- Codando React/Vue/Svelte → **Observer** pode ser natural
- Codando editor de texto, ferramenta com undo → **Command** e **Memento** fazem sentido
- Codando jogo, workflow com fases → **State** é candidato
- Integrando sistema legado → **Adapter** é o caminho
- Construindo AST ou compilador → **Visitor** e **Composite** entram
- Otimizando performance com milhares de objetos → **Flyweight** pode ser considerado
