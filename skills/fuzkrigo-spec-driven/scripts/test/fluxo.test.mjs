// Testes do comando `fluxo <rótulo>`: transforma o stream-json do `claude -p` em
// linhas legíveis para o log da faixa. Rodar da pasta scripts/:
//   node --test test/fluxo.test.mjs
//
// Tests of the `fluxo <label>` command: turns the `claude -p` stream-json into
// readable lines for the lane log. Run from scripts/.
//
// Formatos conforme a referência TypeScript do Agent SDK
// (code.claude.com/docs/en/agent-sdk/typescript).
// Formats as in the Agent SDK TypeScript reference.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';

// ── eventos de amostra / sample events ─────────────────────────────────────

const init = { type: 'system', subtype: 'init', model: 'claude-sonnet-x' };
const assistant = (...content) => ({ type: 'assistant', message: { role: 'assistant', content } });
const text = (value) => assistant({ type: 'text', text: value });
const toolUse = (name, input) => assistant({ type: 'tool_use', id: `id-${name}`, name, input });
const toolResult = (content, isError) => ({
  type: 'user',
  parent_tool_use_id: null,
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'id-1', content, is_error: isError }] },
});
const success = (result, durationMs = 12000) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  duration_ms: durationMs,
  result,
});

// Roda o comando com as linhas na entrada; objetos viram uma linha de JSON.
// Runs the command with the lines as input; objects become one JSON line.
function flow(root, entries) {
  const input = entries.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('\n');
  const proc = spawnSync(process.execPath, [ENGINE, 'fluxo', 'T-003'], { cwd: root, input, encoding: 'utf-8' });
  const lines = proc.stdout.split(/\r?\n/).filter((l) => l !== '');
  return { status: proc.status, stdout: proc.stdout, stderr: proc.stderr, lines };
}

function assertLines(entries, expected) {
  withTempDir('fspec-fluxo-', (root) => {
    const proc = flow(root, entries);
    assert.equal(proc.status, 0, proc.stdout + proc.stderr);
    assert.deepEqual(proc.lines, expected);
  });
}

// ── tabela de eventos / event table ────────────────────────────────────────

test('cada evento da tabela vira a sua linha, na ordem, com o prefixo', () => {
  const entries = [
    init,
    text('Vou ler a spec.'),
    toolUse('Bash', { command: 'node --test' }),
    toolUse('Write', { file_path: 'src/a.js', content: 'x' }),
    toolUse('Edit', { file_path: 'src/b.js' }),
    toolUse('Read', { file_path: 'src/c.js' }),
    toolUse('Glob', { pattern: '**/*.js' }),
    toolResult('Error: boom', true),
    toolResult([{ type: 'text', text: 'Error: em bloco' }], true),
    success('linha 1\nlinha 2'),
  ];
  assertLines(entries, [
    '[T-003] início: modelo claude-sonnet-x',
    '[T-003] Vou ler a spec.',
    '[T-003] → Bash: node --test',
    '[T-003] → Write src/a.js',
    '[T-003] → Edit src/b.js',
    '[T-003] → Read src/c.js',
    '[T-003] → Glob',
    '[T-003] ✘ Error: boom',
    '[T-003] ✘ Error: em bloco',
    '[T-003] fim: success (12 s)',
    'linha 1',
    'linha 2',
  ]);
});

test('mensagem com varios blocos vira uma linha por bloco, sem o raciocinio', () => {
  const message = assistant(
    { type: 'thinking', thinking: 'não aparece' },
    { type: 'text', text: 'Agora o teste.' },
    { type: 'tool_use', id: 'id-2', name: 'Bash', input: { command: 'ls' } }
  );
  assertLines([message], ['[T-003] Agora o teste.', '[T-003] → Bash: ls']);
});

test('resultado de erro mostra o subtipo e as linhas de errors', () => {
  const failure = {
    type: 'result',
    subtype: 'error_max_turns',
    is_error: true,
    duration_ms: 3000,
    errors: ['Reached maximum number of turns (1)', 'segundo erro'],
  };
  assertLines(
    [failure],
    ['[T-003] fim: error_max_turns (3 s)', 'Reached maximum number of turns (1)', 'segundo erro']
  );
});

// ── entrada estranha / odd input ───────────────────────────────────────────

test('linha que nao e JSON sai como veio, e evento sem linha na tabela e ignorado', () => {
  const entries = [
    'aviso solto do CLI: { incompleto',
    { type: 'rate_limit_event' },
    { type: 'stream_event', event: {} },
    { type: 'system', subtype: 'compact_boundary' },
    toolResult('saída normal', false),
    'null',
    '42',
    { type: 'assistant' },
    { type: 'user', message: { role: 'user', content: 'texto simples' } },
    'última linha sem quebra',
  ];
  withTempDir('fspec-fluxo-', (root) => {
    const proc = flow(root, entries);
    assert.equal(proc.status, 0, proc.stdout + proc.stderr);
    assert.ok(proc.lines.includes('aviso solto do CLI: { incompleto'), proc.stdout);
    assert.ok(proc.lines.includes('última linha sem quebra'), proc.stdout);
    // JSON sem linha na tabela não vira linha / unlisted JSON events print nothing
    assert.deepEqual(proc.lines.filter((l) => l.startsWith('[T-003]') || l.includes('"type"')), []);
  });
});

test('comando de varias linhas e textos longos sao cortados nos limites', () => {
  const long = (char, size) => char.repeat(size);
  assertLines(
    [
      toolUse('Bash', { command: `${long('x', 200)}\nsegunda linha do comando` }),
      toolUse('Bash', { command: 'echo um\necho dois' }),
      text('palavra\nsegunda'),
      text(long('y', 250)),
      toolResult(`${long('z', 200)}\nresto do erro`, true),
    ],
    [
      `[T-003] → Bash: ${long('x', 160)}`,
      '[T-003] → Bash: echo um',
      '[T-003] palavra segunda',
      `[T-003] ${long('y', 200)}`,
      `[T-003] ✘ ${long('z', 160)}`,
    ]
  );
});

// ── terminal seguro / terminal safety ──────────────────────────────────────

const ESC = '\u001b';
const BEL = '\u0007';
// Controles C0 e C1, menos tabulação e quebra de linha.
// C0 and C1 controls, except tab and line feed.
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/;

test('sequencias de escape e caracteres de controle nao chegam ao terminal', () => {
  const colored = (word) => `${ESC}[31m${word}${ESC}[0m`;
  const entries = [
    { ...init, model: colored('modelo') },
    text(colored('texto')),
    toolUse('Bash', { command: `echo comando\r${ESC}[2K` }),
    toolUse('Read', { file_path: colored('arquivo') }),
    toolResult(`${ESC}]0;titulo${BEL}falha\u009b31m`, true),
    success(`${colored('resposta')}\r\nfim`),
    `${colored('solta')}${BEL}`,
    { type: 'result', subtype: 'error_during_execution', duration_ms: 1000, errors: [colored('erro')] },
  ];
  withTempDir('fspec-fluxo-', (root) => {
    const proc = flow(root, entries);
    assert.equal(proc.status, 0, proc.stdout + proc.stderr);
    assert.doesNotMatch(proc.stdout.replace(/\r\n/g, '\n'), CONTROL);
    assert.doesNotMatch(proc.stdout, /\[31m|\[0m|\[2K|0;titulo/);
    for (const word of ['modelo', 'texto', 'comando', 'arquivo', 'falha', 'resposta', 'solta', 'erro']) {
      assert.ok(proc.stdout.includes(word), `sumiu "${word}":\n${proc.stdout}`);
    }
  });
});

// ── ajuda / help ───────────────────────────────────────────────────────────

test('a ajuda lista o conferir e o fluxo', () => {
  withTempDir('fspec-fluxo-', (root) => {
    const proc = spawnSync(process.execPath, [ENGINE, 'help'], { cwd: root, encoding: 'utf-8' });
    assert.equal(proc.status, 0, proc.stderr);
    assert.match(proc.stdout, /^ {2}conferir <feature> <faixa>/m);
    assert.match(proc.stdout, /^ {2}fluxo </m);
  });
});
