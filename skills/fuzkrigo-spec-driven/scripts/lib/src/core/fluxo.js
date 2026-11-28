// Fluxo legível: transforma o stream-json do `claude -p`, um evento JSON por
// linha, no texto que vai para o log da faixa. Formatos conforme a referência
// TypeScript do Agent SDK.
// Readable stream: turns the `claude -p` stream-json, one JSON event per line,
// into the text that goes to the lane log. Formats as in the Agent SDK
// TypeScript reference.

import { stripControl } from '../util/text.js';

const TEXT_LIMIT = 200;
const DETAIL_LIMIT = 160;
const FILE_TOOLS = ['Write', 'Edit', 'Read'];

// Corta por caractere, para não partir um par substituto ao meio.
// Cuts by character, so a surrogate pair is never split in half.
const clip = (text, limit) => Array.from(stripControl(text)).slice(0, limit).join('');
const splitText = (text) => String(text ?? '').split(/\r?\n/);
const firstLine = (text) => splitText(text)[0];
const blocksOf = (event) => (Array.isArray(event.message?.content) ? event.message.content : []);

function describeTool({ name, input = {} }) {
  if (name === 'Bash') return `→ Bash: ${clip(firstLine(input.command), DETAIL_LIMIT)}`;
  if (FILE_TOOLS.includes(name)) return `→ ${name} ${stripControl(input.file_path ?? '')}`;
  return `→ ${stripControl(name)}`;
}

function assistantLines(event) {
  return blocksOf(event).flatMap((block) => {
    if (block.type === 'tool_use') return [describeTool(block)];
    if (block.type !== 'text') return [];
    const text = clip(splitText(block.text).join(' ').trim(), TEXT_LIMIT);
    return text ? [text] : [];
  });
}

// O `content` do tool_result vem como texto ou como lista de blocos de texto.
// A tool_result `content` is either text or a list of text blocks.
function resultText({ content }) {
  if (!Array.isArray(content)) return content ?? '';
  return content.map((block) => block.text ?? '').join('\n');
}

function toolErrorLines(event) {
  return blocksOf(event)
    .filter((block) => block.type === 'tool_result' && block.is_error)
    .map((block) => `✘ ${clip(firstLine(resultText(block)), DETAIL_LIMIT)}`);
}

// A resposta final, ou os erros, saem inteiros e sem prefixo, como o log mostrava.
// The final answer, or the errors, come out whole and unprefixed, as before.
function closingLines(event, prefix) {
  const seconds = Math.round((event.duration_ms ?? 0) / 1000);
  const body = event.result === undefined ? [event.errors ?? []].flat() : [event.result];
  return [
    `${prefix}fim: ${stripControl(event.subtype)} (${seconds} s)`,
    ...body.flatMap(splitText).map(stripControl),
  ];
}

function eventLines(event, prefix) {
  const prefixed = (lines) => lines.map((line) => `${prefix}${line}`);
  if (event?.type === 'system' && event.subtype === 'init') {
    return prefixed([`início: modelo ${stripControl(event.model)}`]);
  }
  if (event?.type === 'assistant') return prefixed(assistantLines(event));
  if (event?.type === 'user') return prefixed(toolErrorLines(event));
  if (event?.type === 'result') return closingLines(event, prefix);
  return [];
}

// Linha que não é JSON, ou de formato inesperado, sai como veio (só limpa): o
// comando nunca derruba a faixa nem esconde o que recebeu.
// A line that is not JSON, or has an unexpected shape, comes out as received
// (only sanitized): the command never takes the lane down nor hides its input.
export function formatLine(line, label) {
  try {
    return eventLines(JSON.parse(line), `[${stripControl(label)}] `);
  } catch {
    return [stripControl(line)];
  }
}

// Só `\n` separa eventos: o readline também partiria no U+2028, que o JSON não
// escapa. / Only `\n` separates events: readline would also split on U+2028,
// which JSON does not escape.
async function* linesOf(input) {
  let rest = '';
  input.setEncoding('utf8');
  for await (const chunk of input) {
    const parts = (rest + chunk).split('\n');
    rest = parts.pop();
    yield* parts;
  }
  if (rest) yield rest;
}

// O comando da CLI: escreve conforme os eventos chegam e sai 0 no fim da entrada.
// The CLI command: writes as events arrive and exits 0 at the end of input.
export async function runFluxo(label, input = process.stdin, output = process.stdout) {
  for await (const line of linesOf(input)) {
    for (const text of formatLine(line, label)) output.write(`${text}\n`);
  }
  return 0;
}
