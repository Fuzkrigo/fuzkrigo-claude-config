// Prompts do plano de execução: o texto que cada executor recebe.
// Execution plan prompts: the text each executor receives.

function linhasRegras(plan) {
  const teste = plan.testCommand
    ? `Rode os testes localmente com \`${plan.testCommand}\` até passarem.`
    : 'Rode os testes do projeto localmente até passarem.';
  return [
    'Regras inegociáveis:',
    '- Todo critério de aceite referenciado vira teste com @spec:AC-xxx no título.',
    '- NUNCA enfraqueça, pule (skip/todo) ou apague um teste para passar — teste pulado não é prova e o audit acusa.',
    `- ${teste}`,
    '- NÃO edite tasks.md, NÃO rode fuzkrigo-spec verify/audit e NÃO toque em outras tarefas — o orquestrador cuida disso.',
    '- Ao final de CADA tarefa: `git add` só no que você tocou e um commit próprio.',
  ];
}

function descreveTarefa(plan, t) {
  const acs = t.acs.map((id) => (plan.acTitulo[id] ? `${id} (${plan.acTitulo[id]})` : id));
  const refs = acs.length ? acs.join(', ') : t.refs.join(', ') || '—';
  const arquivos = t.files.length ? t.files.join(', ') : '(a definir pela tarefa)';
  return [
    `${t.id} — "${t.title}"`,
    `  critérios/refs: ${refs}`,
    `  arquivos permitidos (e seus testes): ${arquivos}`,
    `  mensagem de commit: "${t.id} ${plan.feature}: ${t.title}"`,
  ];
}

// prompt de UMA tarefa (script claude headless e tarefas sequenciais)
export function promptTarefa(plan, t) {
  return [
    `Você executa UMA tarefa da feature "${plan.feature}" (fluxo fuzkrigo-spec, spec-anchored).`,
    `Leia primeiro: ${plan.baseDir}/spec.md, ${plan.baseDir}/tasks.md e .spec/constituicao.md.`,
    '',
    'Sua tarefa (somente ela):',
    ...descreveTarefa(plan, t),
    '',
    ...linhasRegras(plan),
  ].join('\n');
}

// Onde o executor trabalha. Na faixa manual o agente é aberto já dentro do
// worktree, então o prompt não cita caminho relativo ao repositório principal.
// Where the executor works. In a manual lane the agent is opened inside the
// worktree, so the prompt cites no path relative to the main repository.
function ondeTrabalhar(fx, { worktree, manual }) {
  if (manual) {
    return `Você já está na raiz do worktree desta faixa (branch ${fx.branch}). Trabalhe somente dentro dele.`;
  }
  return worktree
    ? `Trabalhe SOMENTE dentro do worktree ${fx.worktree} (branch ${fx.branch}) — já preparado.`
    : 'Trabalhe na árvore principal do repositório.';
}

// prompt de uma FAIXA inteira (uma janela limpa executa as tarefas em ordem)
export function promptFaixa(plan, fx, { worktree = true, manual = false } = {}) {
  const fim = manual
    ? 'Quando a última tarefa estiver commitada, PARE e responda no formato da seção "Ao terminar" do AGENTS.md de executor — a mesclagem é do orquestrador.'
    : 'Quando a última tarefa estiver commitada, PARE e informe o resultado — a mesclagem é do orquestrador.';
  return [
    `Você executa as tarefas da ${fx.id} da feature "${plan.feature}" (fluxo fuzkrigo-spec, spec-anchored).`,
    ondeTrabalhar(fx, { worktree, manual }),
    `Leia primeiro: ${plan.baseDir}/spec.md, ${plan.baseDir}/tasks.md e .spec/constituicao.md.`,
    '',
    `Execute NESTA ORDEM (1 tarefa = 1 commit):`,
    ...fx.tasks.flatMap((t) => descreveTarefa(plan, t)),
    '',
    ...linhasRegras(plan),
    fim,
  ].join('\n');
}
