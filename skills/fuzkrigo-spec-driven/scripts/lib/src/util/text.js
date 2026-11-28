// Utilitários de texto compartilhados pelos parsers.

// Normaliza traço: aceita —, – ou - como separador de título.
export const DASH = '[—–-]';

// IDs canônicos da gramática fuzkrigo-spec-driven.
export const ID_PATTERNS = {
  story: /US-\d{3,}/,
  ac: /AC-\d{3,}/,
  assumption: /ASM-\d{3,}/,
  question: /Q-\d{3,}/,
  task: /T-\d{3,}/,
  principle: /P-\d{3,}/,
};

export function splitLines(content) {
  // NFC primeiro: arquivos criados no macOS podem vir em NFD ("Então" decomposto),
  // o que quebraria o casamento das cláusulas Dado/Quando/Então.
  return content.normalize('NFC').split(/\r?\n/);
}

// minúsculas + sem acentos — para casar status escritos por humanos
// ("Concluída" ⇒ "concluida") sem furar o gate em silêncio.
export function foldStatus(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Sequências de escape do terminal, nas formas de 7 e de 8 bits: OSC, CSI e as
// curtas. / Terminal escape sequences, 7-bit and 8-bit forms: OSC, CSI and the
// short ones.
const ESCAPE_SEQUENCES =
  /(?:\u001b\]|\u009d)[^\u0007\u001b\u009c]*(?:\u0007|\u001b\\|\u009c)?|(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]?|\u001b[ -/]*[0-~]/g;
// Controles C0 e C1 e o DEL, menos a tabulação.
// C0 and C1 controls and DEL, except tab.
const CONTROL_CHARS = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/g;

// Texto vindo de fora (modelo, nome de arquivo) antes de ir para um terminal:
// uma única linha, sem nada que o terminal interprete.
// Outside text (model, file name) before it reaches a terminal: a single line,
// with nothing the terminal would interpret.
export function stripControl(text) {
  return String(text).replace(ESCAPE_SEQUENCES, '').replace(CONTROL_CHARS, '');
}

// Linha de tabela markdown → células (sem as bordas vazias).
export function tableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const cells = trimmed.split('|').map((c) => c.trim());
  // remove primeira/última célula vazias criadas pelas bordas
  if (cells.length && cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

export function isTableSeparator(cells) {
  return cells !== null && cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

// Converte glob simples (`**`, `*`, `?`) em RegExp de caminho posix.
export function globToRegExp(glob) {
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        // `**/` casa zero ou mais diretórios; `**` casa qualquer coisa
        if (glob[i + 2] === '/') {
          re += '(?:[^/]+/)*';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (ch === '?') {
      re += '[^/]';
      i += 1;
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}

export function anyGlobMatch(relPath, regexps) {
  const posix = relPath.split('\\').join('/');
  return regexps.some((re) => re.test(posix));
}
