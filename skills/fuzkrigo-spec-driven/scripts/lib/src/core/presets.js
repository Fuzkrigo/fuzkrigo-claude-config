// Presets de constituicao do `init --preset a,b`: le a lista, valida e monta
// o arquivo. Com um preset so, devolve o arquivo dele sem mudanca nenhuma.
// Com mais de um: cabecalho unico com os presets e as versoes, o corpo do
// primeiro (com o comentario explicativo), cada preset seguinte precedido de
// <!-- preset: <nome> -->, e os P-xxx renumerados em sequencia, inclusive nas
// etiquetas @principle — sem isso, dois P-001 dariam ID_DUPLICADO.
// Constitution presets for `init --preset a,b`: reads the list, validates it
// and builds the file. A single preset comes back untouched. Several get one
// header with presets and versions, the first body (explanatory comment
// included), a <!-- preset: <name> --> marker before each following preset,
// and every P-xxx renumbered in sequence, @principle tags included.

import { readdirSync, readFileSync } from 'fs';
import path from 'path';

const PREFIX = 'constituicao-';
const RE_VERSION = /v(\d+\.\d+\.\d+)/;
const RE_TITLE = /^#\s/;
const RE_PRINCIPLE_HEADING = /^##\s+(P-\d{3,})\b/;
const RE_CODE = /\bP-\d{3,}\b/g;

// Nomes dos presets que existem na pasta de modelos, em ordem alfabetica.
// Preset names found in the templates folder, alphabetically.
export function availablePresets(templatesDir) {
  return readdirSync(templatesDir)
    .filter((file) => file.startsWith(PREFIX) && file.endsWith('.md'))
    .map((file) => file.slice(PREFIX.length, -'.md'.length))
    .sort();
}

// "base,dados-tabulares" -> { names } ou { error }. Desconhecido ou repetido
// e erro: o init sai 2 antes de criar qualquer coisa.
// Unknown or repeated is an error: init exits 2 before creating anything.
export function parsePresetList(raw, available) {
  const names = String(raw).split(',').map((name) => name.trim());
  const unknown = names.filter((name) => !available.includes(name));
  if (unknown.length) {
    return { error: `preset desconhecido: ${unknown.map((n) => n || '(vazio)').join(', ')} (use: ${available.join(', ')}; combine com vírgula, ex.: base,dados-tabulares)` };
  }
  const repeated = [...new Set(names.filter((name, i) => names.indexOf(name) !== i))];
  if (repeated.length) {
    return { error: `preset repetido: ${repeated.join(', ')} — cada preset entra uma vez só (use: ${available.join(', ')})` };
  }
  return { names };
}

function trimBlankLines(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start++;
  while (end > start && !lines[end - 1].trim()) end--;
  return lines.slice(start, end);
}

// Separa o titulo "# ..." (de onde sai a versao) do corpo do preset.
// Splits the "# ..." title (source of the version) from the preset body.
function splitPreset(text) {
  const lines = text.split(/\r?\n/);
  const title = lines.findIndex((line) => RE_TITLE.test(line));
  const version = title >= 0 ? lines[title].match(RE_VERSION)?.[1] : undefined;
  return { version, body: trimBlankLines(lines.slice(title + 1)) };
}

// Renumera os P-xxx definidos no bloco a partir de `first`; codigo citado mas
// nao definido no bloco fica como esta.
// Renumbers the block's defined P-xxx from `first`; a code cited but not
// defined in the block stays as is.
function renumber(lines, first) {
  const map = new Map();
  for (const line of lines) {
    const heading = line.match(RE_PRINCIPLE_HEADING);
    if (heading && !map.has(heading[1])) map.set(heading[1], `P-${String(first + map.size).padStart(3, '0')}`);
  }
  return { lines: lines.map((line) => line.replace(RE_CODE, (code) => map.get(code) ?? code)), count: map.size };
}

function combine(names, texts) {
  const eol = texts[0].includes('\r\n') ? '\r\n' : '\n';
  const blocks = texts.map(splitPreset);
  const labels = names.map((name, i) => (blocks[i].version ? `${name} v${blocks[i].version}` : name));
  const parts = [`# Constituição (presets: ${labels.join(', ')})`];
  let next = 1;
  blocks.forEach((block, i) => {
    const { lines, count } = renumber(block.body, next);
    next += count;
    if (i > 0) parts.push(`<!-- preset: ${names[i]} -->`);
    parts.push(lines.join(eol));
  });
  return `${parts.join(eol + eol)}${eol}`;
}

// Monta a constituicao a partir do valor de --preset.
// -> { content, label } ou { error }
// Builds the constitution from the --preset value.
export function composeConstitution(raw, templatesDir) {
  const parsed = parsePresetList(raw, availablePresets(templatesDir));
  if (parsed.error) return parsed;
  const texts = parsed.names.map((name) => readFileSync(path.join(templatesDir, `${PREFIX}${name}.md`), 'utf-8'));
  if (texts.length === 1) return { content: texts[0], label: `preset: ${parsed.names[0]}` };
  return { content: combine(parsed.names, texts), label: `presets: ${parsed.names.join(', ')}` };
}
