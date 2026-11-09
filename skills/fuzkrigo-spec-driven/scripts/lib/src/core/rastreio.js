// Rastreio da feature pelo nome da pasta: e<n>- para etapa do CHECKLIST,
// i<n>- para issue avulsa e nenhum prefixo para projeto descartavel. O
// prefixo e reconhecido, nunca exigido.
// Feature traceability from the folder name: e<n>- for a CHECKLIST stage,
// i<n>- for a standalone issue and no prefix for a throwaway project. The
// prefix is recognized, never required.

const RE_PREFIX = /^(e\d+[a-z]?|i\d+)-(.+)$/;
const RE_ISSUE = /^\d+$/;
const NONE = '—';

// Marcador visivel de pendencia: etapa sem o numero da issue ainda.
// Visible pending marker: a stage whose issue number is still unknown.
export const PENDING_ISSUE = '[#<n> da issue]';

// Le o nome e a flag --issue. Devolve { error } ou os campos do cabecalho:
// description (nome sem prefixo), etapa, issue e origin (linha do Historico).
// Reads the name and the --issue flag. Returns { error } or the header fields:
// description (name without prefix), etapa, issue and origin (History row).
export function featureOrigin(name, issueFlag) {
  if (issueFlag !== undefined && (typeof issueFlag !== 'string' || !RE_ISSUE.test(issueFlag))) {
    const shown = typeof issueFlag === 'string' ? issueFlag : '';
    return { error: `--issue inválido: "${shown}" — use só o número da issue (ex.: --issue 12)` };
  }
  const match = name.match(RE_PREFIX);
  const prefix = match ? match[1] : '';
  const flagIssue = issueFlag === undefined ? null : Number(issueFlag);
  const prefixIssue = prefix.startsWith('i') ? Number(prefix.slice(1)) : null;
  if (prefixIssue !== null && flagIssue !== null && prefixIssue !== flagIssue) {
    return {
      error: `issue divergente: o nome "${name}" aponta a issue #${prefixIssue}, mas --issue diz #${flagIssue} — use um só`,
    };
  }
  const issueNumber = prefixIssue ?? flagIssue;
  const etapa = prefix.startsWith('e') ? `E${prefix.slice(1)}` : null;
  return {
    description: match ? match[2] : name,
    etapa: etapa ?? NONE,
    issue: issueNumber !== null ? `#${issueNumber}` : etapa ? PENDING_ISSUE : NONE,
    origin: etapa ? `Etapa ${etapa}` : issueNumber !== null ? `Issue #${issueNumber}` : NONE,
  };
}

// O que o `new` reconheceu no nome e no --issue, para o usuario conferir a
// leitura (ex.: `e2e-testes` vira a etapa E2e).
// What `new` recognized in the name and --issue, so the user can check the
// reading (e.g. `e2e-testes` becomes stage E2e).
export function traceSummary(origin) {
  return `etapa: ${origin.etapa} · issue: ${origin.issue}`;
}

// Data local no formato AAAA-MM-DD (a do usuario, nao a UTC).
// Local date as YYYY-MM-DD (the user's date, not UTC).
export function localIsoDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
