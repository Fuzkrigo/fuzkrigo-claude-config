# Código — Referência de Padrões e Stack

---

## 1. Padrões de Código

**Princípios:**

- **SOLID** sempre avaliado. Apontar proativamente violações.
- **Clean Code:** nomes significativos, funções pequenas, uma responsabilidade por unidade
- **DRY:** se houver código duplicado, sinalizar e extrair
- **SOC:** cada módulo cuida de uma única responsabilidade/dimensão do problema. Base conceitual do próprio SOLID.
- **LOD:** um objeto só interage com vizinhos diretos, evitando encadeamentos.
- **Navalha de Hickey:** a solução está entrelaçando responsabilidades? Separe.
- **Fail Fast:** validar pré-condições no início; erro explícito e imediato em vez de propagar estado inválido.
- **POLA:** código previsível: nomes que dizem o que fazem, funções sem efeitos colaterais ocultos, comportamento que o leitor consegue antecipar.

**Limites de tamanho (forçam refatoração):**

- Função: máximo **50 linhas**. Se ultrapassar, sugerir ativamente extração.
- Arquivo: máximo **500 linhas**. Se ultrapassar, sugerir divisão em módulos.
- Exceções devem ser justificadas explicitamente.
- **A contagem considera só código executável.** Linhas de docstring e de comentário — inline ou de documentação — não entram nesse limite. Documentar uma função, ou explicar um trecho não óbvio, não deve empurrá-la para refatoração por tamanho.

**Tratamento de erros:**

- Nunca engolir erros silenciosamente
- Erros tratados explicitamente: rethrow, log, fallback ou propagação
- Não expor stack traces em mensagens voltadas ao usuário final

---

## 2. Protocolo de Debugging

Ao receber erro ou comportamento inesperado, seguir estritamente:

1. Identificar a causa raiz diretamente (sem chutes)
2. Explicar o erro na lógica (por que aconteceu)
3. Fornecer o código corrigido com a alteração destacada

**Preferência por diagnóstico:** se o problema for ambíguo, adicionar debug output (logs, prints, breakpoints) ao invés de chutar soluções. Melhor uma sessão extra coletando evidências do que três tentativas no escuro.

---

## 3. Stack Tecnológica

**Não há stack dogmática.** A escolha é orientada pelo problema, pelo contexto e pelas restrições do ambiente.

**Contexto corporativo (empresa atual):**

- Sem Python instalado na maioria das máquinas
- Excel/VBA como interface nativa dos usuários
- PyInstaller para distribuir executáveis Python standalone
- VBA + Python é a base atual

**Contexto pessoal/portfólio:**

- Stack aberta, escolhida pelo mérito técnico
- Pode ser base para propor modernização do ambiente corporativo

**Liberdade de sugestão:** sugerir stacks fora do radar atual quando fizerem sentido técnico. Avalie:

- Adequação ao problema (performance, concorrência, UI, ML, etc.)
- Maturidade da comunidade (popularidade = mais dados de treino = melhor suporte da IA)
- Restrições do ambiente de execução alvo
- Minha curva de aprendizado vs. benefício

Ao sugerir stack diferente da habitual, justificar: por que esta é melhor que VBA/Python para este caso?

**Popularidade importa:** preferir ferramentas maduras e populares — mais dados de treino, menos alucinações, mais proteções de segurança embutidas.

---

## 4. Observabilidade, Logs e Monitoramento

**Logs estruturados:**

- Formato JSON preferido em aplicações não triviais
- Níveis: DEBUG (dev), INFO (eventos normais), WARN (anomalias recuperáveis), ERROR (falhas)
- Correlation ID para rastrear requisições entre componentes

**O que NÃO logar:** senhas, tokens, API keys, CPF, dados bancários, cartões, payloads completos de dados pessoais.

**O que logar:** eventos de autenticação, acessos a recursos sensíveis, operações de escrita em dados críticos, erros com contexto suficiente para diagnóstico.

---

## 5. Versionamento e Commits

O padrão completo de commits, branches, PRs e releases (Conventional Commits, fluxo de comandos, keywords de fechamento) vive em `~/.claude/references/git-conventions.md`; o ritual de release é conduzido pelo agente `project-manager`. Aqui ficam apenas as regras transversais que valem em qualquer contexto, mesmo fora do fluxo de projeto:

- Commits pequenos, atômicos, focados; cada um passa em testes, lint e análise de segurança estática.
- **Nunca commitar:** `.env`, segredos, binários grandes, arquivos temporários.
- `.gitignore` configurado antes do primeiro commit (incluir `.env` e credenciais).

---

## 6. Dependências

- Preferir bibliotecas maduras e populares
- Auditar novas dependências antes de adicionar: último update, mantenedores, vulnerabilidades, licença
- Pin de versões (lockfiles) em produção
- Atualizações de segurança têm prioridade alta
- Supply chain attack é risco real: cuidado com pacotes recém-adicionados

---

## 7. Resiliência de Caminhos

**Toda operação que envolva caminho de pasta/arquivo deve ser resiliente à ausência da estrutura.** Se o código precisa escrever em `X/Y/Z/arquivo.txt`, o código deve criar `X/Y/Z` caso não exista, não falhar.

**Python:**

```python
from pathlib import Path

caminho_destino = Path("/caminho/qualquer/que/preciso")
caminho_destino.mkdir(parents=True, exist_ok=True)
# parents=True  → cria toda a hierarquia
# exist_ok=True → não falha se já existir
```

**Bash:**

```bash
mkdir -p "caminho/qualquer/que/preciso"
```

**JavaScript/Node.js:**

```javascript
import { mkdir } from "node:fs/promises";
await mkdir("caminho/qualquer/que/preciso", { recursive: true });
```

**VBA:**

```vba
Sub CriarPastaSeNaoExistir(ByVal caminho As String)
    Dim partes() As String
    Dim caminhoAtual As String
    Dim i As Integer

    partes = Split(caminho, "\")
    caminhoAtual = partes(0)

    For i = 1 To UBound(partes)
        caminhoAtual = caminhoAtual & "\" & partes(i)
        If Dir(caminhoAtual, vbDirectory) = "" Then
            MkDir caminhoAtual
        End If
    Next i
End Sub
```

**Aplicar automaticamente sempre que:**

- Criar arquivos de log
- Copiar ou mover arquivos para pasta destino
- Salvar resultados de processamento
- Fazer backup
- Gerar relatórios em subpastas datadas
- Exportar arquivos em pasta que pode não existir ainda

**Exceção:** se a ausência da pasta pode indicar erro de configuração legítimo (caminho inválido, drive desconectado), alertar antes de criar.

**Regra:** criar destinos silenciosamente, validar origens explicitamente.

---

## 8. Camadas de Teste e Mocks

Detalhamento operacional do TDD. O piso (testes antes, cobertura 95%/98% com ramos) está no CLAUDE.md global; o ciclo por feature é conduzido pela skill `fuzkrigo-spec-driven` (`scaffold` cria o teste que falha, `verify` grava a prova, `audit` julga). Aqui ficam as camadas e a estratégia de mock.

O teste que prova um critério de aceite carrega a etiqueta `@spec:AC-xxx` no título; o que prova um princípio da constituição carrega `@principle:P-xxx`. É por essa etiqueta que a prova é casada — nunca alterá-la ao refatorar ou renomear testes.

**Camadas obrigatórias:**

- **Unitários:** toda função/método com lógica significativa.
- **Integração:** comunicação entre módulos, banco de dados, APIs externas.
- **Ponta a ponta (E2E):** fluxos críticos do usuário, quando aplicável.

**Mocks:**

- Chamadas externas (APIs, banco, filesystem) sempre mockadas em unitários.
- Testes de integração usam fakes/stubs controlados, nunca produção.

**Exclusões de cobertura:**

Toda exclusão de cobertura precisa de justificativa: um comentário na linha imediatamente acima da exclusão, começando com `coverage-justification:`, com o motivo em PT-BR e EN.

- **Python:** a exclusão é `# pragma: no cover`. Na linha que abre uma cláusula (`if`, `else`, `def`), a cláusula inteira sai da medição.
- **JavaScript (vitest, provider v8):** `/* v8 ignore next -- @preserve */`, `/* v8 ignore if -- @preserve */`, `/* v8 ignore else -- @preserve */` ou o par `/* v8 ignore start -- @preserve */` e `/* v8 ignore stop -- @preserve */`. O `-- @preserve` impede que a transpilação do TypeScript apague o comentário.

```python
# coverage-justification: só roda no Windows, e o CI é Linux. / Windows only; CI runs on Linux.
if sys.platform == "win32":  # pragma: no cover
    configure_console_encoding()
```

Critério de coerência, aplicado pelo agente `code-reviewer`:

- **Aceitos:** código específico de plataforma que o CI não executa; ramo defensivo inalcançável por construção, com o porquê explicado; ponto de entrada (`if __name__ == "__main__":`).
- **Não aceitos:** "difícil de testar"; "sem tempo"; qualquer trecho com regra de negócio real; justificativa genérica que serviria para qualquer linha.

Exclusão sem justificativa, ou com justificativa incoerente, é achado crítico do `code-reviewer`.
