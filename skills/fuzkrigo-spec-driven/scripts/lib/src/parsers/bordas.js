// Leitura da secao "## Casos de borda e regras de fechamento" da spec. O
// parsers/spec.js reconhece a secao e entrega as linhas dela; aqui as duas
// subsecoes viram linhas de tabela, cada uma com o numero da linha no arquivo.
// Quem julga as linhas e o core/bordas.js.
// Reads the spec's "## Casos de borda e regras de fechamento" section.
// parsers/spec.js recognizes the section and hands over its lines; here the
// two subsections become table rows, each with its line number in the file.
// core/bordas.js judges the rows.
//
//   ### Casos de borda
//   | Categoria | Situação | Decisão |
//   ### Regras de fechamento
//   | Regra | Tolerância | Prova de que fecha | Prova de que para |
//   (ou "Nenhuma." no lugar da tabela de fechamento / or "Nenhuma." instead)

import { foldStatus, isTableSeparator, tableCells } from '../util/text.js';

const RE_SUBSECTION = /^###\s+(.+?)\s*$/;

// Cada subsecao: o prefixo do titulo (sem acento, sem caixa) e como uma linha
// de tabela vira registro. / Each subsection: title prefix (folded) and how a
// table row becomes a record.
const SUBSECTIONS = {
  edgeCases: {
    prefix: 'casos de borda',
    toRow: (c) => ({ category: c[0] || '', situation: c[1] || '', decision: c[2] || '' }),
  },
  closingRules: {
    prefix: 'regras de fechamento',
    toRow: (c) => ({ rule: c[0] || '', tolerance: c[1] || '', closes: c[2] || '', stops: c[3] || '' }),
  },
};

// "Nenhuma." sozinho na linha, com ou sem ponto. / "Nenhuma." alone, dot optional.
function isNone(text) {
  return /^nenhuma\.?$/.test(foldStatus(text.trim()));
}

// Linha de cabecalho: a seguinte e o separador da tabela.
// Header row: the next line is the table separator.
function isHeader(next) {
  return next !== undefined && isTableSeparator(tableCells(next.text));
}

function subsectionKey(title) {
  const folded = foldStatus(title);
  return Object.keys(SUBSECTIONS).find((key) => folded.startsWith(SUBSECTIONS[key].prefix)) || null;
}

// entries: [{ line, text }] — as linhas da secao, sem o titulo "##".
// entries: [{ line, text }] — the section lines, without the "##" title.
export function parseEdgeSection(entries) {
  const result = {
    edgeCases: { present: false, line: null, rows: [], none: false },
    closingRules: { present: false, line: null, rows: [], none: false },
  };
  let key = null;
  entries.forEach((entry, i) => {
    const sub = entry.text.match(RE_SUBSECTION);
    if (sub) {
      key = subsectionKey(sub[1]);
      if (key) Object.assign(result[key], { present: true, line: result[key].line ?? entry.line });
      return;
    }
    if (!key) return;
    const cells = tableCells(entry.text);
    if (cells === null) {
      if (isNone(entry.text)) result[key].none = true;
      return;
    }
    if (isTableSeparator(cells) || isHeader(entries[i + 1])) return;
    result[key].rows.push({ ...SUBSECTIONS[key].toRow(cells), line: entry.line });
  });
  return result;
}
