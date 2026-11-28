# Orquestração dos agentes

Protocolo que o Arquiteto de Software lê ao distribuir trabalho entre os agentes e ao integrar o que eles entregam.

## 1. Papéis

| Agente | Atalho | Modelo e esforço do atalho | O que faz |
| --- | --- | --- | --- |
| Arquiteto de Software | `jarq` | Claude Opus, `xhigh` | especifica, projeta, distribui as tarefas, roda o script, integra e julga |
| Engenheiro | `jeng` | Claude Sonnet, `high` | implementa na sessão quando não há faixas; nas faixas, as tarefas `sonnet` rodam headless pelo script |
| Dev Principal | `jcodex` | Codex, `gpt-6.2-sol`, `medium` | executa as faixas `codex` |
| Dev Secundario | `jagy` | Antigravity, `gemini-3.8-flash-medium` | executa as faixas `agy` |

Tarefa `opus` também roda headless pelo script, em janela limpa, nunca na sessão do Arquiteto. Push e pull request são do usuário, fora da caixa.

## 2. Fluxo de uma feature em faixas

1. **Spec**: passo 1 da skill `fuzkrigo-spec-driven`, com o design resolvido antes das tarefas.
2. **Tarefas**: `Modelo:` e `Esforço:` pelo critério do passo "3. Tarefas" da [skill](../skills/fuzkrigo-spec-driven/SKILL.md).
3. **Plano**: `fuzkrigo-spec plano <feature>`.
4. **Validação**: apresente as faixas ao usuário, que valida o executor e o esforço de cada tarefa. Mudou algo: ajuste o `tasks.md` e regenere o plano.
5. **Execução**: o Arquiteto, na caixa (`jarq`), na branch da issue, roda `bash .spec/features/<feature>/executar-tarefas.sh`. O andamento das faixas do Claude aparece ao vivo em `../fuzkrigo-worktrees/<repo>-<feature>-logs/faixa-*.log` (por exemplo, `tail -F` num terminal comum).
6. **Faixas manuais**: o usuário abre cada uma no worktree dela (`cd ../fuzkrigo-worktrees/<repo>-<feature>-faixa-N && jcodex`, ou `jagy`, a partir da raiz do repositório), ajusta o esforço se preciso e cola o prompt do `plano-execucao.md`.
7. **Retorno**: o executor responde no formato da seção "Ao terminar" do `AGENTS.md` de executor (`~/.codex/AGENTS.md` e `~/.gemini/AGENTS.md`), e o usuário leva a resposta ao Arquiteto.
8. **Juiz mecânico** (seção 4), **integração** pelos comandos da seção "Faixas manuais" do `plano-execucao.md` e **gate**.

Saída do script:

| Código | Significado | Próximo passo |
| --- | --- | --- |
| 0 | gate verde (plano sem faixa manual) | Portão 2 do Bloco B |
| 1 | falha de ambiente, de faixa, de tarefa ou do gate | ler a saída e os logs antes de rodar de novo |
| 2 | há faixa manual; sequenciais e gate não rodaram | passos 6 a 8 |

Com tarefas sem `Arquivos:` e faixas manuais no mesmo plano, a integração termina regenerando o plano e rodando o script, que executa as sequenciais e fecha o gate.

Não regenere o plano com faixa manual por integrar: a numeração muda, e o script recusa recomeçar. Faixa que parou e vai trocar de executor: integre antes as manuais, aproveite ou descarte a branch da que parou e só então regenere.

## 3. Briefing por tarefa

O briefing é o prompt da faixa gerado pelo motor: tarefas, critérios de aceite, arquivos permitidos, mensagem de commit e regras. O Arquiteto não o reescreve à mão. Precisou mudar: ajuste a spec ou o `tasks.md` e regenere o plano antes de rodar o script.

## 4. Juiz mecânico antes do julgamento

Antes de mesclar qualquer faixa, na árvore principal:

1. `fuzkrigo-spec conferir <feature> faixa-N`: compara os arquivos que a faixa mudou (`git diff --no-renames --name-only HEAD...<branch>`) com o `Arquivos:` das tarefas dela, testes inclusos. Sai 1 com arquivo fora da lista, faixa sem commit ou sem arquivo alterado, tarefa sem um commit cuja mensagem comece pelo código dela (`T-xxx`), arquivo sem commit no worktree ou branch inexistente.
2. Rode os testes do projeto dentro do worktree da faixa.
3. Reprovou em um dos dois: não mescle; devolva ao executor com a saída.

O projeto ignora no `.gitignore` o que o runner gera (por exemplo `__pycache__/`, `.pytest_cache/` e o arquivo do `reporterOutputFile`): sem isso, a faixa reprova por arquivo sem commit no worktree.

O script faz o passo 1 sozinho antes de mesclar cada faixa do Claude: faixa reprovada não é mesclada, o worktree fica para inspeção e o script sai 1. No fim, quem decide se está pronto é o `verify` seguido do `audit --ci --feature <feature>` com saída 0. Opinião vem depois da máquina.

## 5. Caixa

- Os projetos ficam em `~/code`, e os worktrees das faixas em `~/code/fuzkrigo-worktrees/`, montada só no `jarq`.
- Na raiz de um worktree, os atalhos ligam o `--worktree` do ai-jail sozinhos.
- `project_strategy = "repo-root"` faz o worktree usar a política do repositório principal, sem tela de primeira execução por worktree.
- Painel (`fuzkrigo-spec painel`): só fora da caixa, só para acompanhar, e sem o botão Executar, que rodaria o script fora da caixa.
- Nenhum agente roda fora da caixa.

## 6. Git fora da caixa

Em repositório onde um agente trabalhou, o usuário passa pela `gitc` (detalhes em `maquina/LEIA-ME.md`, no repositório do ecossistema):

- `gitc --confere` no começo de toda sessão fora da caixa;
- `gitc push` no lugar de `git push`;
- `gitc --confere && gh pr create` para abrir o pull request.

Recusa da `gitc` é parada obrigatória: nada de trocar para o `git` direto antes de entender o achado.

## 7. Quando não usar faixas

Menos de duas tarefas, ou todas as tarefas sem `Arquivos:`: o Engenheiro implementa na sessão.
