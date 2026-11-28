// Plano de execução — transforma as tarefas pendentes de tasks.md em FAIXAS:
// tarefas com `Arquivos:` disjuntos podem rodar em PARALELO (1 faixa = 1
// git worktree + 1 branch + 1 janela de contexto limpa); tarefas que
// compartilham arquivo caem na MESMA faixa (sequência dentro dela); tarefa
// sem `Arquivos:` tem pegada desconhecida → roda ao final, uma a uma, na
// árvore principal.
//
// O CÁLCULO do plano é agnóstico de agente. Os ARTEFATOS variam:
//   claude      → plano-execucao.md + executar-tarefas.sh (claude -p headless,
//                 com --model e --effort por tarefa) + plano-execucao.html
//                 (visual, com o botão que copia o comando do script)
//   antigravity → plano-execucao.md com comandos de worktree e um PROMPT
//                 pronto por faixa, para os agentes paralelos nativos do
//                 Antigravity (nunca depende do CLI do Claude)
//
// No modo claude, a tarefa de `Modelo: codex` ou `agy` vira faixa manual (ver
// faixas-externas.js): o script prepara o worktree e não a executa.
// In claude mode, a `Modelo: codex` or `agy` task becomes a manual lane (see
// faixas-externas.js): the script prepares the worktree and does not run it.

import path from 'path';
import { foldStatus } from '../util/text.js';
import { avisosDeTeste } from './avisos-de-teste.js';
import {
  executorDoModelo,
  faixasClaude,
  faixasManuais,
  linhasFimManual,
  linhasPreparoManual,
  linhasRecusaSobras,
  notaExecucaoHtml,
  secaoFaixasManuais,
  temTarefaClaude,
  validarExecutores,
} from './faixas-externas.js';
import { promptFaixa, promptTarefa } from './plano-prompts.js';
import { linhasWorktree, shq, sufixoVar } from './plano-shell.js';

export { promptFaixa, promptTarefa };

// esforço aceito em PT ou EN → nível do CLI (`claude --effort <nível>`)
export const ESFORCO_CLI = {
  baixo: 'low',
  low: 'low',
  medio: 'medium',
  medium: 'medium',
  alto: 'high',
  high: 'high',
  xalto: 'xhigh',
  xhigh: 'xhigh',
  max: 'max',
  maximo: 'max',
};

export function normalizarEsforco(raw) {
  if (!raw) return null;
  return ESFORCO_CLI[foldStatus(String(raw)).replace(/[\s_-]/g, '')] || null;
}

function intersecta(setA, arrB) {
  return arrB.some((f) => setA.has(f));
}

// Também usada pelo `conferir`, para comparar com o que o git informa.
// Also used by `conferir`, to compare against what git reports.
export function normFile(f) {
  return f.split('\\').join('/').replace(/^\.\//, '');
}

// O executor trabalha na branch em que for chamado (a da issue) e recusa a
// main; o plano não fixa nome de branch de trabalho.
// The executor works on the branch it is called from (the issue's) and refuses
// main; the plan does not fix a working branch name.
const BRANCH_ATUAL = 'a branch atual (a da issue)';

// ── cálculo ────────────────────────────────────────────────────────────────

export function montarPlano(project, featureName, opts = {}) {
  const agent = opts.agent === 'antigravity' ? 'antigravity' : 'claude';
  const feature = project.features.find((f) => f.name === featureName);
  if (!feature) return { erro: `feature "${featureName}" não encontrada em ${project.config.specDir}/features/` };
  if (!feature.tasks || !feature.tasks.tasks.length) {
    return { erro: `feature "${featureName}" não tem tarefas em tasks.md — escreva as tarefas (T-xxx) primeiro` };
  }

  const cfg = project.config.paralelo;
  const avisos = [];

  // título dos critérios de aceite, para dar contexto humano nos prompts
  const acTitulo = {};
  for (const f of project.features) {
    if (!f.spec) continue;
    for (const s of f.spec.stories) for (const ac of s.acs) acTitulo[ac.id] = ac.title || '';
  }

  const concluidas = [];
  const pendentes = [];
  for (const t of feature.tasks.tasks) {
    if (t.status === 'concluida') {
      concluidas.push(t);
      continue;
    }
    if (t.status === 'em-andamento') {
      avisos.push(`${t.id} está [em-andamento] — entrou no plano; se já houver trabalho local, commite antes de executar`);
    }
    const esforcoRaw = t.esforco || cfg.esforco;
    const esforcoCli = normalizarEsforco(esforcoRaw);
    if (!esforcoCli) {
      avisos.push(`${t.id}: esforço "${esforcoRaw}" desconhecido — usando "medium" (aceitos: baixo|medio|alto|xalto|max)`);
    }
    const model = t.model || cfg.model;
    pendentes.push({
      ...t,
      files: t.files.map(normFile),
      model,
      executor: executorDoModelo(model),
      esforcoCli: esforcoCli || 'medium',
      acs: t.refs.filter((r) => r.startsWith('AC-')),
    });
  }

  if (!pendentes.length) {
    return { erro: `todas as tarefas de "${featureName}" já estão [concluida] — nada a planejar` };
  }

  // só o modo claude confere as faixas / only claude mode checks the lanes
  if (agent === 'claude') avisos.push(...avisosDeTeste(pendentes, project.config, featureName));

  // agrupa por conflito de arquivos: componentes conexos viram faixas
  const comArquivos = pendentes.filter((t) => t.files.length);
  const sequenciais = pendentes.filter((t) => !t.files.length);
  for (const t of sequenciais) {
    avisos.push(`${t.id} não lista Arquivos: — pegada desconhecida, vai rodar sozinha ao final (sem paralelismo)`);
  }

  const faixas = [];
  for (const t of comArquivos) {
    const donos = faixas.filter((fx) => intersecta(fx.fileSet, t.files));
    if (!donos.length) {
      faixas.push({ tasks: [t], fileSet: new Set(t.files) });
    } else {
      // conflita com 1+ faixas: funde todas na primeira e acrescenta a tarefa
      const alvo = donos[0];
      for (const outra of donos.slice(1)) {
        alvo.tasks.push(...outra.tasks);
        for (const f of outra.fileSet) alvo.fileSet.add(f);
        faixas.splice(faixas.indexOf(outra), 1);
      }
      alvo.tasks.push(t);
      for (const f of t.files) alvo.fileSet.add(f);
    }
  }
  // ordem estável: pela primeira tarefa (ordem do tasks.md)
  faixas.sort((a, b) => a.tasks[0].line - b.tasks[0].line);
  for (const fx of faixas) fx.tasks.sort((a, b) => a.line - b.line);

  const repoName = path.basename(project.config.rootDir);
  faixas.forEach((fx, i) => {
    fx.id = `faixa-${i + 1}`;
    fx.branch = `spec/${featureName}-faixa-${i + 1}`;
    fx.worktree = `../fuzkrigo-worktrees/${repoName}-${featureName}-faixa-${i + 1}`;
  });
  const erroExecutor = validarExecutores(faixas, sequenciais);
  if (erroExecutor) return { erro: erroExecutor };
  for (const fx of faixas) fx.executor = fx.tasks[0].executor;

  // ondas: no máximo maxParalelas faixas simultâneas
  const max = Math.max(1, cfg.maxParalelas | 0 || 3);
  const ondas = [];
  for (let i = 0; i < faixas.length; i += max) ondas.push(faixas.slice(i, i + max));

  // como invocar o motor a partir da raiz do projeto
  let engine = opts.enginePath || 'fuzkrigo-spec';
  if (path.isAbsolute(engine)) {
    const rel = path.relative(project.config.rootDir, engine);
    if (!rel.startsWith('..')) engine = rel.split(path.sep).join('/');
  }

  return {
    agent,
    feature: featureName,
    specDir: project.config.specDir,
    baseDir: `${project.config.specDir}/features/${featureName}`,
    branchTrabalho: BRANCH_ATUAL,
    repoName,
    testCommand: project.config.testCommand || null,
    cfg,
    engine,
    acTitulo,
    faixas,
    ondas,
    sequenciais,
    concluidas,
    avisos,
    geradoEm: (opts.now || new Date()).toISOString().slice(0, 16).replace('T', ' '),
  };
}

// ── artefato: plano.json (leitura de máquina — alimenta o painel ao vivo) ──

export function renderPlanoJson(plan) {
  const tarefa = (t) => ({
    id: t.id,
    titulo: t.title,
    modelo: t.model,
    executor: t.executor,
    esforco: t.esforcoCli,
    arquivos: t.files,
    refs: t.refs,
  });
  return `${JSON.stringify(
    {
      feature: plan.feature,
      agent: plan.agent,
      geradoEm: plan.geradoEm,
      branchTrabalho: plan.branchTrabalho,
      baseDir: plan.baseDir,
      specDir: plan.specDir,
      repoName: plan.repoName,
      logsDir: `../fuzkrigo-worktrees/${plan.repoName}-${plan.feature}-logs`,
      ondas: plan.ondas.map((onda) => onda.map((fx) => fx.id)),
      faixas: plan.faixas.map((fx) => ({
        id: fx.id,
        executor: fx.executor,
        branch: fx.branch,
        worktree: fx.worktree,
        tarefas: fx.tasks.map(tarefa),
      })),
      sequenciais: plan.sequenciais.map(tarefa),
      concluidas: plan.concluidas.map((t) => t.id),
      avisos: plan.avisos,
    },
    null,
    2
  )}\n`;
}

// ── artefato: plano-execucao.md ────────────────────────────────────────────

function tabelaFaixa(plan, fx) {
  const linhas = [
    '| tarefa | título | modelo | esforço | arquivos |',
    '|---|---|---|---|---|',
  ];
  for (const t of fx.tasks) {
    linhas.push(`| ${t.id} | ${t.title} | \`${t.model}\` | ${t.esforcoCli} | ${t.files.map((f) => `\`${f}\``).join(', ') || '—'} |`);
  }
  return linhas;
}

export function renderPlanoMd(plan) {
  const L = [];
  const paralelas = plan.faixas.reduce((n, fx) => n + fx.tasks.length, 0);
  L.push(`# Plano de execução — ${plan.feature}`);
  L.push('');
  L.push(`> gerado por \`fuzkrigo-spec plano\` em ${plan.geradoEm} — NÃO edite à mão;`);
  L.push(`> mudou tasks.md ou a config? Regenere: \`fuzkrigo-spec plano ${plan.feature}\``);
  L.push('');
  L.push('## Resumo — o que vai acontecer');
  L.push('');
  L.push(`- **${paralelas + plan.sequenciais.length} tarefa(s) pendente(s)**: ${paralelas} em ${plan.faixas.length} faixa(s) paralela(s) + ${plan.sequenciais.length} sequencial(is)${plan.concluidas.length ? ` (${plan.concluidas.length} já concluída(s): ${plan.concluidas.map((t) => t.id).join(', ')})` : ''}`);
  L.push(`- **1 faixa = 1 worktree + 1 branch + 1 janela de contexto limpa** — faixas não compartilham nenhum arquivo entre si`);
  L.push(`- tudo acontece na ${plan.branchTrabalho}, nunca na \`main\`; mesclagens voltam para ela; levar para a main é por pull request, decisão sua`);
  if (plan.avisos.length) {
    L.push('');
    L.push('### Avisos');
    L.push('');
    for (const a of plan.avisos) L.push(`- ⚠ ${a}`);
  }
  L.push('');
  L.push('## Faixas e ondas');
  L.push('');
  plan.ondas.forEach((onda, i) => {
    L.push(`### Onda ${i + 1} — ${onda.map((fx) => fx.id).join(' ∥ ')}`);
    L.push('');
    for (const fx of onda) {
      L.push(`#### ${fx.id} — branch \`${fx.branch}\` — worktree \`${fx.worktree}\``);
      L.push('');
      L.push(...tabelaFaixa(plan, fx));
      L.push('');
    }
  });
  if (plan.sequenciais.length) {
    L.push('## Tarefas sequenciais (após as ondas, na árvore principal)');
    L.push('');
    L.push('| tarefa | título | modelo | esforço | por que sequencial |');
    L.push('|---|---|---|---|---|');
    for (const t of plan.sequenciais) {
      L.push(`| ${t.id} | ${t.title} | \`${t.model}\` | ${t.esforcoCli} | sem \`Arquivos:\` — pegada desconhecida |`);
    }
    L.push('');
  }
  L.push('## Gestão de branches e commits');
  L.push('');
  L.push(`1. a branch de trabalho é ${plan.branchTrabalho}; o executor recusa \`main\`, \`master\` e a branch padrão do remoto`);
  L.push('2. cada faixa nasce dela como branch própria e roda no seu worktree — **1 tarefa = 1 commit** (`T-xxx feature: título`)');
  L.push('3. terminou a onda → merge `--no-ff` de cada faixa de volta, na ordem; conflito interrompe a faixa e pede resolução humana');
  L.push('4. faixa mesclada → worktree removido, branch apagada, tarefa marcada `[concluida]` no tasks.md');
  L.push(`5. gate final na branch de trabalho: \`fuzkrigo-spec verify ${plan.feature}\` + \`fuzkrigo-spec audit --ci --feature ${plan.feature}\` — **exit 0 ou não está pronto**`);
  L.push('');
  L.push('## Como executar');
  L.push('');
  if (plan.agent === 'claude') {
    L.push('### ▶ Automático — Claude Code headless (recomendado)');
    L.push('');
    L.push('Quem roda é o Arquiteto, no `jarq`, dentro da caixa, a partir da raiz do repositório:');
    L.push('');
    L.push('```bash');
    L.push(`bash ${plan.baseDir}/executar-tarefas.sh`);
    L.push('```');
    L.push('');
    L.push('Não rode o script fora da caixa: o `claude -p` ficaria sem a barreira.');
    L.push('');
    const sujeito = faixasManuais(plan).length ? 'Cada faixa do Claude' : 'Cada faixa';
    L.push(`${sujeito} roda \`claude -p\` com **janela de contexto limpa**, \`--model\` e \`--effort\` já`);
    L.push(`definidos por tarefa, permissões \`${plan.cfg.permissionMode}\`. Os prompts exatos estão`);
    L.push('embutidos no script — quer rodar uma faixa na mão, é só copiá-los de lá.');
    L.push(`Logs: \`../fuzkrigo-worktrees/${plan.repoName}-${plan.feature}-logs/\`.`);
    L.push('');
    L.push('### Acompanhe ao vivo (fora da caixa, só para olhar)');
    L.push('');
    L.push('```bash');
    L.push(`fuzkrigo-spec painel ${plan.feature}`);
    L.push('```');
    L.push('');
    L.push('Só fora da caixa (dentro dela o endereço não chega ao navegador) e só para');
    L.push('acompanhar: faixas, logs e o veredito do gate em tempo real. Não use o botão');
    L.push('Executar do painel: ele roda o script fora da caixa.');
    if (faixasManuais(plan).length) L.push(...secaoFaixasManuais(plan));
  } else {
    L.push('### ▶ Paralelo nativo no Antigravity (janelas limpas, sem Claude CLI)');
    L.push('');
    L.push('1. **Esteja na branch da issue e prepare os worktrees** (terminal, na raiz do repositório):');
    L.push('');
    L.push('```bash');
    L.push('git branch --show-current   # a branch da issue (<tipo>/<numero>-<descricao>), nunca a main');
    for (const fx of plan.faixas) {
      L.push(`git worktree add ${fx.worktree} -b ${fx.branch}`);
    }
    L.push('```');
    L.push('');
    L.push('2. **Abra um agente NOVO por faixa** (janela limpa) e cole o prompt da faixa:');
    L.push('');
    for (const fx of plan.faixas) {
      L.push(`#### Prompt — ${fx.id}`);
      L.push('');
      L.push('```');
      L.push(promptFaixa(plan, fx));
      L.push('```');
      L.push('');
    }
    L.push('3. **Todas terminaram? Mescle na ordem e marque as tarefas** (na árvore principal):');
    L.push('');
    L.push('```bash');
    for (const fx of plan.faixas) {
      L.push(`git merge --no-ff ${fx.branch} -m "merge ${fx.id} (${plan.feature})"`);
      L.push(`git worktree remove ${fx.worktree} && git branch -d ${fx.branch}`);
      for (const t of fx.tasks) L.push(`node ${plan.engine} tarefa ${plan.feature} ${t.id} concluida`);
    }
    L.push('```');
    if (plan.sequenciais.length) {
      L.push('');
      L.push('4. **Tarefas sequenciais** — execute você mesmo (mesma janela ou nova), uma a uma:');
      L.push('');
      for (const t of plan.sequenciais) {
        L.push('```');
        L.push(promptTarefa(plan, t));
        L.push('```');
        L.push('');
        L.push(`\`node ${plan.engine} tarefa ${plan.feature} ${t.id} concluida\` após o commit.`);
        L.push('');
      }
    }
    L.push('');
    L.push('5. **Gate final** (exit 0 ou não está pronto):');
    L.push('');
    L.push('```bash');
    L.push(`node ${plan.engine} verify ${plan.feature}`);
    L.push(`node ${plan.engine} audit --ci --feature ${plan.feature}`);
    L.push('```');
    L.push('');
    L.push('6. **Acompanhe ao vivo** (opcional, fora da caixa, só para olhar):');
    L.push(`   \`fuzkrigo-spec painel ${plan.feature}\` abre um painel no navegador refletindo`);
    L.push('   tasks.md, as provas do verify e o gate em tempo real enquanto os agentes trabalham.');
  }
  L.push('');
  return `${L.join('\n')}\n`;
}

// ── artefato: executar-tarefas.sh (só claude) ──────────────────────────────

function allowedTools(plan) {
  if (plan.cfg.allowedTools) return plan.cfg.allowedTools;
  const base = ['Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)'];
  if (plan.testCommand) base.push(`Bash(${plan.testCommand.split(/\s+/)[0]}:*)`);
  return base.join(',');
}

// `registro` é a faixa ou a tarefa sequencial: o .jsonl dela guarda o fluxo cru,
// e o `fluxo` escreve o texto legível, que cai no .log. Com pipefail, a falha do
// claude continua valendo.
// `registro` is the lane or the sequential task: its .jsonl keeps the raw stream
// and `fluxo` writes the readable text, which lands in the .log. With pipefail, a
// claude failure still counts.
function chamadaClaude(plan, t, registro) {
  const claude = `claude -p ${shq(promptTarefa(plan, t))} --model ${shq(t.model)} --effort ${t.esforcoCli} --output-format stream-json --verbose "\${CLAUDE_FLAGS[@]}"`;
  return `${claude} | tee -a "$LOG_DIR/${registro}.jsonl" | node "$ENGINE" fluxo ${t.id}`;
}

// O .jsonl recomeça a cada execução; as tarefas de uma faixa acrescentam nele.
// The .jsonl restarts on every run; the tasks of a lane append to it.
const zerarFluxo = (registro) => `: > "$LOG_DIR/${registro}.jsonl"`;

// Dentro de um worktree, o caminho relativo do motor apontaria para a cópia dele,
// que pode nem existir e que o executor pode alterar.
// Inside a worktree the relative engine path would point at its copy, which may
// not exist and which the executor can change.
function linhasMotorAbsoluto() {
  return [
    '# motor sempre o da árvore principal, nunca a cópia de um worktree',
    'case "$ENGINE" in',
    '  /*|\\\\*|[A-Za-z]:*) ;;',
    '  *) ENGINE="$TOPLEVEL/$ENGINE" ;;',
    'esac',
  ];
}

// Seção 2 do script: a branch de trabalho é a atual (a da issue); recusa a
// main, a master e a branch padrão do remoto. Roda antes de qualquer commit
// do script, para nada ser gravado na main.
// Script section 2: the working branch is the current one (the issue's); it
// refuses main, master and the remote default branch. It runs before any
// commit the script makes, so nothing is written to main.
function linhasBranchAtual() {
  return [
    '',
    '# ── 2. branch de trabalho: a atual (a da issue) ──────────────────',
    'BASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)',
    '[ "$BASE_BRANCH" != "HEAD" ] || falhar "HEAD destacado — troque para a branch da issue (<tipo>/<numero>-<descricao>)"',
    'PADRAO=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || true)',
    'case "$BASE_BRANCH" in',
    '  main|master|"${PADRAO#origin/}")',
    '    falhar "o executor não roda na $BASE_BRANCH — troque para a branch da issue (<tipo>/<numero>-<descricao>, ex.: feat/12-login-email) e rode de novo" ;;',
    'esac',
  ];
}

export function renderPlanoSh(plan) {
  const L = [];
  const manual = faixasManuais(plan).length > 0;
  L.push('#!/usr/bin/env bash');
  L.push(`# executar-tarefas.sh — gerado por \`fuzkrigo-spec plano ${plan.feature}\` em ${plan.geradoEm}`);
  L.push('# NÃO edite à mão: mudou tasks.md ou a config, regenere o plano.');
  L.push('#');
  L.push('# O que este script faz, na ordem:');
  L.push('#   1. valida o ambiente (git, node, claude CLI)');
  L.push('#   2. trabalha na branch atual (a da issue) e recusa a main; depois exige');
  L.push('#      git limpo e a spec commitada');
  L.push('#   3. por onda: 1 worktree + 1 branch por faixa, e `claude -p` em');
  L.push('#      paralelo — cada faixa numa janela de contexto LIMPA');
  L.push('#   4. mescla cada faixa de volta (--no-ff) e marca as tarefas [concluida]');
  L.push('#   5. tarefas sem Arquivos: rodam uma a uma na árvore principal');
  L.push(`#   6. gate final: fuzkrigo-spec verify ${plan.feature} + fuzkrigo-spec audit --ci --feature ${plan.feature}`);
  if (manual) {
    L.push('# Faixas de codex e agy só ganham worktree e branch. Com elas, os passos 5 e 6');
    L.push('# ficam para depois da integração, e o script sai 2 (1 se algo falhar).');
  }
  L.push('set -u');
  L.push('set -o pipefail');
  L.push('');
  L.push(`FEATURE=${shq(plan.feature)}`);
  L.push(`ENGINE=${shq(plan.engine)}`);
  L.push(`CLAUDE_FLAGS=(--permission-mode ${plan.cfg.permissionMode} --allowedTools ${shq(allowedTools(plan))})`);
  L.push('FALHAS=""');
  L.push('');
  L.push(`verde()    { printf '\\033[32m%s\\033[0m\\n' "$*"; }`);
  L.push(`vermelho() { printf '\\033[31m%s\\033[0m\\n' "$*"; }`);
  L.push(`info()     { printf '· %s\\n' "$*"; }`);
  L.push('falhar()   { vermelho "✘ $*"; exit 1; }');
  L.push('# trilha de eventos para o painel ao vivo (`fuzkrigo-spec painel <feature>`)');
  L.push(`evento()   { [ -n "\${EVENTOS:-}" ] && printf '%s|%s\\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$EVENTOS"; }`);
  L.push('');
  L.push('# ── 1. ambiente ──────────────────────────────────────────────────');
  L.push('command -v git >/dev/null 2>&1 || falhar "git não encontrado"');
  L.push('command -v node >/dev/null 2>&1 || falhar "node não encontrado"');
  if (temTarefaClaude(plan)) {
    L.push('command -v claude >/dev/null 2>&1 || falhar "Claude Code CLI (claude) não encontrado — instale-o ou siga o modo manual em plano-execucao.md"');
  }
  L.push('TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null) || falhar "fora de um repositório git"');
  L.push('cd "$TOPLEVEL" || exit 1');
  L.push(...linhasMotorAbsoluto());
  L.push(...linhasBranchAtual());
  if (manual) L.push(...linhasRecusaSobras());
  L.push('# artefatos recém-gerados pelo `fuzkrigo-spec plano` são sujeira esperada:');
  L.push('# se forem a ÚNICA sujeira, o script mesmo commita; qualquer outra, aborta');
  L.push('if [ -n "$(git status --porcelain)" ]; then');
  L.push(`  if [ -z "$(git status --porcelain | grep -v -e 'plano-execucao\\.' -e 'plano\\.json' -e 'executar-tarefas\\.sh')" ]; then`);
  L.push('    git add -A');
  L.push('    git commit -q -m "plano de execução: $FEATURE (artefatos gerados)"');
  L.push('    info "artefatos do plano commitados"');
  L.push('  else');
  L.push('    falhar "árvore suja além dos artefatos do plano — commite ou faça git stash antes (os worktrees partem do último commit)"');
  L.push('  fi');
  L.push('fi');
  L.push(`git ls-files --error-unmatch -- ${shq(`${plan.baseDir}/spec.md`)} >/dev/null 2>&1 || falhar "spec.md não está commitada — os worktrees das faixas precisam dela no git"`);
  L.push('git worktree prune');
  L.push(`LOG_DIR="$(dirname "$TOPLEVEL")/fuzkrigo-worktrees/${plan.repoName}-${plan.feature}-logs"`);
  L.push('mkdir -p "$LOG_DIR"');
  L.push('EVENTOS="$LOG_DIR/plano-eventos.log"');
  L.push(': > "$EVENTOS"');
  L.push('evento "inicio|$FEATURE"');
  L.push('evento "branch|$BASE_BRANCH"');
  L.push('info "branch de trabalho: $BASE_BRANCH"');
  L.push('info "logs por faixa em: $LOG_DIR"');
  L.push(`info "acompanhe ao vivo: fuzkrigo-spec painel ${plan.feature} (fora da caixa, só para olhar)"`);
  L.push('');
  L.push('mesclar_faixa() { # $1=faixa $2=branch $3=worktree $4=exit-da-faixa');
  L.push('  if [ "$4" -ne 0 ]; then');
  L.push('    evento "faixa|$1|falhou"');
  L.push('    vermelho "✘ $1 falhou (log: $LOG_DIR/$1.log) — worktree mantido para inspeção: $3"');
  L.push('    FALHAS="$FALHAS $1"; return 1');
  L.push('  fi');
  L.push('  if ! node "$ENGINE" conferir "$FEATURE" "$1"; then');
  L.push('    evento "faixa|$1|reprovada"');
  L.push('    vermelho "✘ $1 reprovada na conferência (motivo acima) — não mesclada; worktree mantido para inspeção: $3"');
  L.push('    FALHAS="$FALHAS $1"; return 1');
  L.push('  fi');
  L.push('  if git merge --no-ff "$2" -m "merge $1 ($FEATURE)"; then');
  L.push('    git worktree remove --force "$3" >/dev/null 2>&1');
  L.push('    git branch -d "$2" >/dev/null 2>&1');
  L.push('    evento "faixa|$1|mesclada"');
  L.push('    verde "✔ $1 mesclada em $BASE_BRANCH"');
  L.push('  else');
  L.push('    git merge --abort >/dev/null 2>&1');
  L.push('    evento "faixa|$1|conflito"');
  L.push('    vermelho "✘ conflito ao mesclar $1 — resolva na mão: git merge $2 (worktree mantido: $3)"');
  L.push('    FALHAS="$FALHAS $1"; return 1');
  L.push('  fi');
  L.push('}');
  if (manual) L.push(...linhasPreparoManual(plan));

  plan.ondas.forEach((todas, oi) => {
    const onda = faixasClaude(todas);
    if (!onda.length) return;
    L.push('');
    L.push(`# ── onda ${oi + 1}: ${onda.map((fx) => `${fx.id} (${fx.tasks.map((t) => t.id).join(', ')})`).join(' ∥ ')} ──`);
    L.push(`evento "onda|${oi + 1}|inicio"`);
    L.push(`info "onda ${oi + 1}: ${onda.map((fx) => fx.id).join(' ∥ ')} — janelas limpas em paralelo"`);
    for (const fx of onda) {
      L.push(...linhasWorktree(plan, fx));
      L.push(`evento "faixa|${fx.id}|executando"`);
      L.push(zerarFluxo(fx.id));
      L.push('(');
      L.push(`  cd "$WT_${sufixoVar(fx)}" || exit 9`);
      fx.tasks.forEach((t, ti) => {
        L.push(`  ${ti > 0 ? '&& ' : ''}${chamadaClaude(plan, t, fx.id)} \\`);
      });
      // fecha o encadeamento (a última linha termina sem \)
      L[L.length - 1] = L[L.length - 1].replace(/ \\$/, '');
      L.push(`) > "$LOG_DIR/${fx.id}.log" 2>&1 &`);
      L.push(`PID_${sufixoVar(fx)}=$!`);
    }
    for (const fx of onda) {
      const up = sufixoVar(fx);
      L.push(`wait "$PID_${up}"; ST_${up}=$?`);
      L.push(`evento "faixa|${fx.id}|exit|$ST_${up}"`);
    }
    for (const fx of onda) {
      const up = sufixoVar(fx);
      L.push(`if mesclar_faixa ${shq(fx.id)} ${shq(fx.branch)} "$WT_${up}" "$ST_${up}"; then`);
      for (const t of fx.tasks) {
        L.push(`  node "$ENGINE" tarefa "$FEATURE" ${t.id} concluida || true`);
        L.push(`  evento "tarefa|${t.id}|concluida"`);
      }
      L.push('fi');
    }
  });

  if (plan.sequenciais.length && !manual) {
    L.push('');
    L.push('# ── tarefas sequenciais (árvore principal) ───────────────────────');
    for (const t of plan.sequenciais) {
      L.push(`info ${shq(`sequencial ${t.id} — ${t.title}`)} "(log: $LOG_DIR/${t.id}.log)"`);
      L.push(`evento "seq|${t.id}|executando"`);
      L.push(zerarFluxo(t.id));
      // as chaves levam o stderr do claude para o log, e não só o do último comando
      // the braces send claude's stderr to the log, not only the last command's
      L.push(`if { ${chamadaClaude(plan, t, t.id)}; } > "$LOG_DIR/${t.id}.log" 2>&1; then`);
      L.push('  # commit de segurança se o agente esqueceu (rastreabilidade > perfeição)');
      L.push('  if [ -n "$(git status --porcelain)" ]; then');
      L.push(`    git add -A && git commit -q -m ${shq(`${t.id} ${plan.feature}: ${t.title} (auto-commit do plano)`)}`);
      L.push('  fi');
      L.push(`  node "$ENGINE" tarefa "$FEATURE" ${t.id} concluida || true`);
      L.push(`  evento "seq|${t.id}|concluida"`);
      L.push(`  verde "✔ ${t.id} concluída"`);
      L.push('else');
      L.push(`  evento "seq|${t.id}|falhou"`);
      L.push(`  vermelho "✘ ${t.id} falhou (log: $LOG_DIR/${t.id}.log)"; FALHAS="$FALHAS ${t.id}"`);
      L.push('fi');
    }
  }

  L.push(...(manual ? linhasFimManual(plan) : linhasGate(plan)));
  return `${L.join('\n')}\n`;
}

function linhasGate(plan) {
  const L = [];
  L.push('');
  L.push('# ── gate final: quem decide é a máquina ──────────────────────────');
  L.push('echo');
  L.push('info "gate final: verify + audit --ci --feature"');
  L.push('evento "gate|inicio"');
  L.push('node "$ENGINE" verify "$FEATURE"');
  L.push('evento "gate|verify|$?"');
  L.push('node "$ENGINE" audit --ci --feature "$FEATURE"');
  L.push('AUDIT=$?');
  L.push('evento "gate|audit|$AUDIT"');
  L.push('# fecha a contabilidade: status das tarefas + prova do verify no git');
  L.push(`if [ -n "$(git status --porcelain -- ${shq(plan.specDir)})" ]; then`);
  L.push(`  git add -A -- ${shq(plan.specDir)}`);
  L.push('  git commit -q -m "$FEATURE: status das tarefas + prova do verify (plano)"');
  L.push('  info "status das tarefas e prova do verify commitados"');
  L.push('fi');
  L.push('echo');
  L.push('if [ -n "$FALHAS" ]; then vermelho "faixas/tarefas com falha:$FALHAS"; fi');
  L.push('if [ "$AUDIT" -eq 0 ] && [ -z "$FALHAS" ]; then');
  L.push('  evento "fim|0"');
  L.push('  verde "✔ plano concluído — especificação e código alinhados (audit exit 0) na branch $BASE_BRANCH"');
  L.push('  info "próximo passo: revise e abra o pull request da $BASE_BRANCH para a main"');
  L.push('  exit 0');
  L.push('fi');
  L.push('evento "fim|1"');
  L.push('vermelho "plano terminou com pendências — leia a saída do audit acima e os logs em $LOG_DIR"');
  L.push('exit 1');
  return L;
}

// ── artefato: plano-execucao.html (só claude) ──────────────────────────────

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderPlanoHtml(plan) {
  const cmd = `bash ${plan.baseDir}/executar-tarefas.sh`;
  const paralelas = plan.faixas.reduce((n, fx) => n + fx.tasks.length, 0);
  const card = (t) => `
        <div class="tarefa">
          <span class="tid">${esc(t.id)}</span>
          <span class="ttitulo">${esc(t.title)}</span>
          <span class="meta"><code>${esc(t.model)}</code> · esforço <b>${esc(t.esforcoCli)}</b></span>
          <span class="arquivos">${t.files.map((f) => `<code>${esc(f)}</code>`).join(' ') || '<em>sem arquivos — sequencial</em>'}</span>
        </div>`;
  const faixaHtml = (fx) => `
      <div class="faixa">
        <h4>${esc(fx.id)} <small>branch <code>${esc(fx.branch)}</code> · worktree <code>${esc(fx.worktree)}</code></small></h4>
        ${fx.tasks.map(card).join('')}
      </div>`;
  const ondasHtml = plan.ondas
    .map(
      (onda, i) => `
    <section class="onda">
      <h3>Onda ${i + 1} <small>${onda.map((fx) => esc(fx.id)).join(' ∥ ')} — em paralelo, janelas limpas</small></h3>
      <div class="grade">${onda.map(faixaHtml).join('')}</div>
    </section>`
    )
    .join('');
  const seqHtml = plan.sequenciais.length
    ? `
    <section class="onda">
      <h3>Sequenciais <small>após as ondas, na árvore principal</small></h3>
      <div class="grade"><div class="faixa">${plan.sequenciais.map(card).join('')}</div></div>
    </section>`
    : '';
  const avisosHtml = plan.avisos.length
    ? `<div class="avisos">${plan.avisos.map((a) => `<div>⚠ ${esc(a)}</div>`).join('')}</div>`
    : '';

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plano de execução — ${esc(plan.feature)}</title>
<style>
  :root { --bg:#fafafa; --fg:#1a1a1a; --card:#fff; --borda:#e2e2e2; --sub:#666;
          --acc:#0a7c42; --acc-fg:#fff; --aviso:#8a6d00; --aviso-bg:#fff8e1; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#141414; --fg:#eaeaea; --card:#1e1e1e; --borda:#333; --sub:#9a9a9a;
            --acc:#17a35c; --aviso:#e0c36a; --aviso-bg:#2a2410; }
  }
  * { box-sizing:border-box }
  body { margin:0; padding:2rem 1rem; background:var(--bg); color:var(--fg);
         font:15px/1.55 system-ui,-apple-system,sans-serif }
  main { max-width:64rem; margin:0 auto }
  h1 { font-size:1.5rem; margin:0 0 .25rem } h3 { margin:1.5rem 0 .5rem }
  h4 { margin:0 0 .5rem } small { color:var(--sub); font-weight:400 }
  .sub { color:var(--sub); margin:0 0 1.25rem }
  code { font:.85em ui-monospace,monospace; background:var(--card);
         border:1px solid var(--borda); border-radius:4px; padding:.05em .35em; overflow-wrap:anywhere }
  .resumo { display:flex; gap:.75rem; flex-wrap:wrap; margin:0 0 1rem }
  .resumo div { background:var(--card); border:1px solid var(--borda); border-radius:8px;
                padding:.5rem .9rem } .resumo b { font-size:1.2rem }
  .executor { background:var(--card); border:1px solid var(--borda); border-radius:10px;
              padding:1rem; margin:0 0 .5rem }
  button { background:var(--acc); color:var(--acc-fg); border:0; border-radius:8px;
           padding:.8rem 1.2rem; font:600 1rem system-ui; cursor:pointer; max-width:100% }
  button:hover { filter:brightness(1.1) }
  .nota { color:var(--sub); font-size:.85rem; margin:.5rem 0 0 }
  #cmd { display:inline-block; margin-top:.6rem }
  #toast { visibility:hidden; margin-left:.75rem; color:var(--acc); font-weight:600 }
  #toast.on { visibility:visible }
  .grade { display:grid; grid-template-columns:repeat(auto-fit,minmax(17rem,1fr)); gap:.75rem }
  .faixa { background:var(--card); border:1px solid var(--borda); border-radius:10px; padding: .9rem }
  .tarefa { display:flex; flex-direction:column; gap:.15rem; padding:.6rem 0;
            border-top:1px dashed var(--borda) }
  .tarefa:first-of-type { border-top:0 }
  .tid { font:700 .85rem ui-monospace,monospace; color:var(--acc) }
  .meta,.arquivos { font-size:.85rem; color:var(--sub) }
  .avisos { background:var(--aviso-bg); color:var(--aviso); border-radius:8px;
            padding:.6rem .9rem; margin:0 0 1rem; font-size:.9rem }
  ol li { margin:.25rem 0 }
</style>
<main>
  <h1>Plano de execução — ${esc(plan.feature)}</h1>
  <p class="sub">gerado por <code>fuzkrigo-spec plano</code> em ${esc(plan.geradoEm)} · regenere após mudar tasks.md</p>
  <div class="resumo">
    <div><b>${paralelas}</b> tarefa(s) em paralelo</div>
    <div><b>${plan.faixas.length}</b> faixa(s) · <b>${plan.ondas.length}</b> onda(s)</div>
    <div><b>${plan.sequenciais.length}</b> sequencial(is)</div>
    <div>branch: ${esc(plan.branchTrabalho)}</div>
  </div>
  ${avisosHtml}
  <div class="executor">
    <button onclick="copiar()">Copiar o comando do script</button>
    <span id="toast">comando copiado ✔ — para o Arquiteto rodar na caixa</span>
    <div><code id="cmd">${esc(cmd)}</code></div>
    <p class="nota">Este arquivo é estático: o botão só copia o comando, que é para o Arquiteto rodar na caixa
    (<code>jarq</code>), na raiz do projeto. Não rode o script fora da caixa. ${notaExecucaoHtml(plan)}
    <b>Painel ao vivo:</b> <code>fuzkrigo-spec painel ${esc(plan.feature)}</code>, fora da caixa e só para
    acompanhar; o botão Executar dele roda o script fora da caixa e não se usa.</p>
  </div>
  ${ondasHtml}
  ${seqHtml}
  <section class="onda">
    <h3>Branches e commits</h3>
    <ol>
      <li>tudo parte da ${esc(plan.branchTrabalho)}; o executor recusa a <code>main</code></li>
      <li>1 faixa = 1 branch + 1 worktree; 1 tarefa = 1 commit <code>T-xxx ${esc(plan.feature)}: título</code></li>
      <li>merge <code>--no-ff</code> por faixa, na ordem; conflito interrompe e pede você</li>
      <li>gate final: <code>fuzkrigo-spec verify ${esc(plan.feature)}</code> + <code>fuzkrigo-spec audit --ci --feature ${esc(plan.feature)}</code> — exit 0 ou não está pronto</li>
    </ol>
  </section>
</main>
<script>
  async function copiar() {
    var cmd = document.getElementById('cmd').textContent;
    try { await navigator.clipboard.writeText(cmd); }
    catch (e) {
      var ta = document.createElement('textarea');
      ta.value = cmd; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    var t = document.getElementById('toast');
    t.classList.add('on'); setTimeout(function(){ t.classList.remove('on'); }, 2500);
  }
</script>
`;
}
