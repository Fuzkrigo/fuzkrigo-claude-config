// Auxiliares de shell dos artefatos do plano: aspas e preparo de worktree.
// Shell helpers for the plan artifacts: quoting and worktree preparation.

export const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// Aspas só quando o texto precisa: os comandos do .md ficam legíveis, e um
// caminho do Windows (barra invertida) ou com espaço continua colável no bash.
// Quotes only when needed: the .md commands stay readable, and a Windows path
// (backslash) or one with spaces can still be pasted into bash.
export const shqSePreciso = (s) => (/^[\w./-]+$/.test(s) ? String(s) : shq(s));

// "faixa-2" → "FAIXA_2", sufixo das variáveis do script.
// "faixa-2" → "FAIXA_2", suffix of the script variables.
export const sufixoVar = (fx) => fx.id.replace('-', '_').toUpperCase();

export function linhasWorktree(plan, fx) {
  const wt = `WT_${sufixoVar(fx)}`;
  return [
    `${wt}="$(dirname "$TOPLEVEL")/fuzkrigo-worktrees/${plan.repoName}-${plan.feature}-${fx.id}"`,
    `git worktree add "$${wt}" -b ${shq(fx.branch)} >/dev/null || falhar "worktree da ${fx.id} (sobrou de uma execução anterior? git worktree prune + apague ${fx.worktree})"`,
  ];
}
