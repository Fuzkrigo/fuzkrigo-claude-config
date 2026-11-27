// Faixas externas — tarefas de Codex e Antigravity viram faixas MANUAIS: o
// executar-tarefas.sh cria o worktree e a branch, e quem executa é o agente que
// o usuário abre ali. Enquanto houver faixa manual, as tarefas sequenciais e o
// gate esperam a integração.
// External lanes — Codex and Antigravity tasks become MANUAL lanes:
// executar-tarefas.sh creates the worktree and the branch, and the agent the
// user opens there does the work. While a manual lane is pending, sequential
// tasks and the gate wait for the integration.

import { foldStatus } from '../util/text.js';
import { promptFaixa } from './plano-prompts.js';
import { linhasWorktree, shq, shqSePreciso, sufixoVar } from './plano-shell.js';

const EXTERNOS = {
  codex: { papel: 'Dev Principal', atalho: 'jcodex' },
  agy: { papel: 'Dev Secundario', atalho: 'jagy' },
};

// Valores de `Modelo:` que escolhem um executor externo; o resto é do Claude.
// `Modelo:` values that pick an external executor; anything else is Claude's.
const APELIDOS = new Map([
  ['codex', 'codex'],
  ['agy', 'agy'],
  ['antigravity', 'agy'],
]);

export const executorDoModelo = (model) => APELIDOS.get(foldStatus(String(model).trim())) || 'claude';

const ehManual = (fx) => fx.executor !== 'claude';
export const faixasManuais = (plan) => plan.faixas.filter(ehManual);
export const faixasClaude = (faixas) => faixas.filter((fx) => !ehManual(fx));
export const temTarefaClaude = (plan) => plan.sequenciais.length > 0 || faixasClaude(plan.faixas).length > 0;

// Mensagem de erro do plano, ou null. / Plan error message, or null.
export function validarExecutores(faixas, sequenciais) {
  const solta = sequenciais.find((t) => t.executor !== 'claude');
  if (solta) {
    return `${solta.id} (${solta.executor}) não lista Arquivos: — executor externo só trabalha em faixa`;
  }
  const mista = faixas.find((fx) => new Set(fx.tasks.map((t) => t.executor)).size > 1);
  if (!mista) return null;
  const tarefas = mista.tasks.map((t) => `${t.id} (${t.executor})`).join(', ');
  return `${mista.id} mistura executores: ${tarefas} — tarefas que dividem arquivo vão para o mesmo executor`;
}

// ── executar-tarefas.sh ────────────────────────────────────────────────────

// Regenerar o plano renumera as faixas: sem esta recusa, o script abriria um
// worktree novo e deixaria o trabalho já feito no antigo.
// Regenerating the plan renumbers the lanes: without this refusal the script
// would open a new worktree and leave the finished work in the old one.
export function linhasRecusaSobras() {
  return [
    '# faixa de uma execução anterior ainda por integrar: nada é criado',
    `SOBRAS=$(git for-each-ref --format='%(refname:short)' "refs/heads/spec/$FEATURE-faixa-[0-9]*" | tr '\\n' ' ')`,
    '[ -z "$SOBRAS" ] || falhar "faixa de uma execução anterior: ${SOBRAS% } — integre ou remova antes de rodar de novo (seção Faixas manuais do plano-execucao.md)"',
  ];
}

export function linhasPreparoManual(plan) {
  const L = ['', '# ── faixas manuais: só o preparo; quem executa é o agente externo ──'];
  for (const fx of faixasManuais(plan)) {
    const wt = `WT_${sufixoVar(fx)}`;
    L.push(...linhasWorktree(plan, fx));
    L.push(`evento "faixa|${fx.id}|manual"`);
    L.push(`info "${fx.id} (manual): ${fx.executor} — abra com ${EXTERNOS[fx.executor].atalho} em $${wt}"`);
  }
  return L;
}

// Fecho do script quando há faixa manual: commita o status, lista o que ficou
// pendente e sai sem o gate. Falha tem precedência (1) sobre a pendência (2).
// Script ending with a manual lane: commits the status, lists what is pending
// and exits without the gate. Failure (1) takes precedence over pending (2).
export function linhasFimManual(plan) {
  const pendentes = faixasManuais(plan).map((fx) => `${fx.id} (${fx.executor})`).join(', ');
  const sequenciais = plan.sequenciais.map((t) => t.id).join(', ');
  const specDir = shq(plan.specDir);
  return [
    '',
    '# ── fim: há faixa manual, o gate fica para depois da integração ──',
    `if [ -n "$(git status --porcelain -- ${specDir})" ]; then`,
    `  git add -A -- ${specDir} && git commit -q -m "$FEATURE: status das tarefas (plano)" || falhar "não consegui commitar o status das tarefas"`,
    '  info "status das tarefas commitado"',
    'fi',
    'echo',
    `info "faixas manuais pendentes: ${pendentes}"`,
    ...(sequenciais ? [`info "tarefas sequenciais pendentes: ${sequenciais} — rodam depois da integração"`] : []),
    `info ${shq(`gate não rodou: siga a seção "Faixas manuais" de ${plan.baseDir}/plano-execucao.md`)}`,
    'if [ -n "$FALHAS" ]; then',
    '  evento "fim|1"',
    '  vermelho "faixas/tarefas com falha:$FALHAS — logs em $LOG_DIR"',
    '  exit 1',
    'fi',
    'evento "fim|2"',
    'exit 2',
  ];
}

// ── plano-execucao.md ──────────────────────────────────────────────────────

function blocoAbertura(plan, fx) {
  const { papel, atalho } = EXTERNOS[fx.executor];
  const esforcos = fx.tasks.map((t) => `${t.id} ${t.esforcoCli}`).join(', ');
  return [
    `### ${fx.id} — ${papel} (${fx.executor})`,
    '',
    'Abra a partir da raiz do repositório:',
    '',
    '```bash',
    `cd ${shqSePreciso(fx.worktree)} && ${atalho}`,
    '```',
    '',
    `Esforço: ${esforcos}. Se o atalho abrir em outro esforço, ajuste com \`/model\` (Codex) ou \`/effort\` (Antigravity) antes de colar.`,
    '',
    '```',
    promptFaixa(plan, fx, { manual: true }),
    '```',
    '',
  ];
}

// O diff fica num bloco só dele: colar a integração não pode mesclar antes da
// conferência. --no-renames mostra a origem de um arquivo renomeado.
// The diff has its own block: pasting the integration must not merge before the
// check. --no-renames shows the source of a renamed file.
function blocoConferencia(manuais) {
  return [
    '**1. Confira os arquivos tocados** contra os permitidos (e seus testes). Arquivo fora da lista: não mescle.',
    '',
    ...manuais.map((fx) => {
      const permitidos = [...new Set(fx.tasks.flatMap((t) => t.files))];
      return `- ${fx.id}: ${permitidos.map((f) => `\`${f}\``).join(', ')}`;
    }),
    '',
    '```bash',
    ...manuais.map((fx) => `git diff --no-renames --name-only HEAD...${fx.branch}`),
    '```',
    '',
  ];
}

function blocoMesclagem(plan, fx) {
  const motor = shqSePreciso(plan.engine);
  const passos = [
    `git merge --no-ff ${fx.branch} -m "merge ${fx.id} (${plan.feature})"`,
    `git worktree remove ${shqSePreciso(fx.worktree)}`,
    `git branch -d ${fx.branch}`,
    ...fx.tasks.map((t) => `node ${motor} tarefa ${plan.feature} ${t.id} concluida`),
  ];
  return ['```bash', passos.join(' &&\n  '), '```', ''];
}

function blocoFechamento(plan) {
  const motor = shqSePreciso(plan.engine);
  const adicionar = `git add -A -- ${shqSePreciso(plan.specDir)}`;
  if (plan.sequenciais.length) {
    const ids = plan.sequenciais.map((t) => t.id).join(', ');
    return [
      `**3. Rode as sequenciais (${ids}) e o gate:** commite o status, regenere o plano e rode o script.`,
      '',
      '```bash',
      `${adicionar} && git commit -m "${plan.feature}: status das tarefas (plano)" &&`,
      `  node ${motor} plano ${plan.feature} --agents claude &&`,
      `  bash ${shqSePreciso(`${plan.baseDir}/executar-tarefas.sh`)}`,
      '```',
    ];
  }
  return [
    '**3. Gate** (o audit precisa sair 0, ou não está pronto):',
    '',
    '```bash',
    `node ${motor} verify ${plan.feature}`,
    `node ${motor} audit --ci --feature ${plan.feature}`,
    '```',
    '',
    '**4. Commite o status e a prova:**',
    '',
    '```bash',
    `${adicionar} && git commit -m "${plan.feature}: status das tarefas + prova do verify (plano)"`,
    '```',
  ];
}

export function secaoFaixasManuais(plan) {
  const manuais = faixasManuais(plan);
  return [
    '',
    '## Faixas manuais (Dev Principal e Dev Secundario)',
    '',
    'O `executar-tarefas.sh` cria os worktrees e as branches destas faixas, mas não as executa: abra um agente por faixa.',
    '',
    '**Não regenere o plano enquanto houver faixa manual por integrar:** a numeração das faixas muda, e o script recusa recomeçar.',
    '',
    ...manuais.flatMap((fx) => blocoAbertura(plan, fx)),
    '### Integração (na árvore principal, depois que os executores responderem)',
    '',
    ...blocoConferencia(manuais),
    '**2. Mescle faixa por faixa.** Se o `git worktree remove` recusar, sobrou arquivo sem commit no worktree: olhe antes de apagar.',
    '',
    ...manuais.flatMap((fx) => blocoMesclagem(plan, fx)),
    ...blocoFechamento(plan),
  ];
}

// ── plano-execucao.html ────────────────────────────────────────────────────

export function notaExecucaoHtml(plan) {
  if (!faixasManuais(plan).length) {
    return `Cada faixa roda <code>claude -p</code> num worktree próprio, com contexto limpo,
    modelo e esforço já definidos. O gate final (verify + audit) roda sozinho.`;
  }
  return `Cada faixa do Claude roda <code>claude -p</code> num worktree próprio, com contexto limpo.
    As faixas de Codex e Antigravity só ganham o worktree: siga a seção "Faixas manuais" do
    <code>plano-execucao.md</code>. O gate final fica para depois da integração.`;
}
