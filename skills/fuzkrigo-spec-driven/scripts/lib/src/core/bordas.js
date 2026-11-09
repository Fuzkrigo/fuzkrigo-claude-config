// Achados da secao "## Casos de borda e regras de fechamento" da spec.
// Findings for the spec's "## Casos de borda e regras de fechamento" section.
//
// Severidade: SECAO_AUSENTE, BORDA_INCOMPLETA e FECHAMENTO_INCOMPLETO seguem a
// regra do SECAO_AUSENTE de hoje (aviso em rascunho, erro de `pronta` em
// diante). REF_SPEC_INEXISTENTE e erro sempre: citar um criterio ou uma
// suposicao que nao existe nesta spec, ou um principio que nao existe na
// constituicao, e uma referencia quebrada, como o REF_QUEBRADA.
// Severity: the first three follow today's SECAO_AUSENTE rule (warning in
// draft, error from `pronta` on). REF_SPEC_INEXISTENTE is always an error: it
// is a broken reference, like REF_QUEBRADA.

import { allAcs } from '../parsers/spec.js';
import { foldStatus } from '../util/text.js';

const SECTION_TITLE = 'Casos de borda e regras de fechamento';
const RE_AC = /^AC-\d{3,}$/;
const RE_ASM = /^ASM-\d{3,}$/;
const RE_PRINCIPLE = /^P-\d{3,}$/;
const NOT_APPLICABLE = 'nao se aplica:';

// "Não se aplica:" seguido de um motivo nao vazio, sem acento e sem caixa.
// "Não se aplica:" followed by a non-empty reason, folded.
function hasReason(decision) {
  const folded = foldStatus(decision);
  return folded.startsWith(NOT_APPLICABLE) && folded.slice(NOT_APPLICABLE.length).trim() !== '';
}

// Contexto de um julgamento: severidade, codigos desta spec, principios da
// constituicao e o montador. / Judgement context: severity, this spec's
// codes, the constitution's principles and the finding builder.
function contextFor(spec, { feature, matured, constitution }) {
  const known = new Set([...allAcs(spec).map((ac) => ac.id), ...spec.assumptions.map((a) => a.id)]);
  const principles = new Set((constitution?.principles || []).map((p) => p.id));
  const finding = (code, severity, message, line) => ({
    code, severity, message, feature, file: spec.file, ...(line ? { line } : {}),
  });
  return { severity: matured ? 'erro' : 'aviso', known, principles, finding };
}

// P-xxx mora na constituicao; AC e ASM, nesta spec.
// P-xxx lives in the constitution; AC and ASM, in this spec.
function refExists(id, ctx) {
  return RE_PRINCIPLE.test(id) ? ctx.principles.has(id) : ctx.known.has(id);
}

function missingRefMessage(id) {
  return RE_PRINCIPLE.test(id)
    ? `${id}, citado em "${SECTION_TITLE}", não existe na constituição do projeto`
    : `${id}, citado em "${SECTION_TITLE}", não existe nesta especificação (código de outra spec não vale aqui)`;
}

// Codigos citados que nao existem onde deveriam. / Cited codes missing where they belong.
function refFindings(ids, line, ctx) {
  return [...new Set(ids)].filter((id) => !refExists(id, ctx)).map((id) =>
    ctx.finding('REF_SPEC_INEXISTENTE', 'erro', missingRefMessage(id), line)
  );
}

function edgeRowFindings(row, ctx) {
  const isCode = [RE_AC, RE_ASM, RE_PRINCIPLE].some((re) => re.test(row.decision));
  const missing = [
    !row.category && 'categoria',
    !row.situation && 'situação',
    !isCode && !hasReason(row.decision) && 'decisão (AC-xxx, ASM-xxx, P-xxx ou "Não se aplica: motivo")',
  ].filter(Boolean);
  const out = missing.length
    ? [ctx.finding('BORDA_INCOMPLETA', ctx.severity,
      `caso de borda "${row.situation || row.category}" sem ${missing.join(', ')}`, row.line)]
    : [];
  return isCode ? [...out, ...refFindings([row.decision], row.line, ctx)] : out;
}

function closingRowFindings(row, ctx) {
  const missing = [
    !row.rule && 'regra',
    !row.tolerance && 'tolerância (escreva "exata" se não houver folga)',
    !RE_AC.test(row.closes) && 'critério que prova que fecha (AC-xxx)',
    !RE_AC.test(row.stops) && 'critério que prova que para (AC-xxx)',
  ].filter(Boolean);
  const label = `regra de fechamento "${row.rule || row.tolerance}"`;
  const out = [];
  if (missing.length) {
    out.push(ctx.finding('FECHAMENTO_INCOMPLETO', ctx.severity, `${label} sem ${missing.join(', ')}`, row.line));
  } else if (row.closes === row.stops) {
    out.push(ctx.finding('FECHAMENTO_INCOMPLETO', ctx.severity,
      `${label} usa ${row.closes} nas duas provas: a que fecha e a que para são critérios diferentes`, row.line));
  }
  return [...out, ...refFindings([row.closes, row.stops].filter((id) => RE_AC.test(id)), row.line, ctx)];
}

function edgeCaseFindings({ edgeCases }, ctx) {
  if (edgeCases.rows.length === 0) {
    return [ctx.finding('BORDA_INCOMPLETA', ctx.severity,
      'nenhum caso de borda registrado na subseção "### Casos de borda" — uma linha por borda relevante, com a decisão', edgeCases.line)];
  }
  return edgeCases.rows.flatMap((row) => edgeRowFindings(row, ctx));
}

function closingRuleFindings({ closingRules }, ctx) {
  if (closingRules.rows.length === 0) {
    return closingRules.none ? [] : [ctx.finding('FECHAMENTO_INCOMPLETO', ctx.severity,
      'subseção "### Regras de fechamento" sem regra — liste os totais que precisam fechar ou escreva "Nenhuma."', closingRules.line)];
  }
  return closingRules.rows.flatMap((row) => closingRowFindings(row, ctx));
}

// Achados da secao para uma spec. `matured`: status de `pronta` em diante;
// `constitution`: a do projeto, ou null. / Section findings for one spec.
// `matured`: status from `pronta` on; `constitution`: the project's, or null.
export function edgeSectionFindings(spec, { feature, matured, constitution = null }) {
  const ctx = contextFor(spec, { feature, matured, constitution });
  if (!spec.edgeSection) {
    return [ctx.finding('SECAO_AUSENTE', ctx.severity,
      `especificação sem seção "## ${SECTION_TITLE}" — registre a decisão de cada caso de borda e os totais que precisam fechar (catálogo: references/casos-de-borda.md)`)];
  }
  return [...edgeCaseFindings(spec.edgeSection, ctx), ...closingRuleFindings(spec.edgeSection, ctx)];
}
