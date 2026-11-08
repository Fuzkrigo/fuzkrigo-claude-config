// Testes do patch local: spec rastreavel. Rodar da pasta scripts/:
//   node --test test/spec-rastreavel.test.mjs
//
// Local patch tests: traceable spec. Run from scripts/.
//
// O nome da pasta da feature diz de onde ela veio: e<n>- para etapa do
// CHECKLIST, i<n>- para issue avulsa e nenhum prefixo para projeto
// descartavel. O `new` reconhece o prefixo, sem exigi-lo, e grava no spec.md
// a etapa, a issue e as secoes Historico e Resolucao. O `init` grava o bloco
// coverage com a lista de pastas vazia, de proposito: o CI reprova ate a A3
// declara-las.
// The feature folder name tells where it came from: e<n>- for a CHECKLIST
// stage, i<n>- for a standalone issue, no prefix for a throwaway project.
// `new` recognizes the prefix without requiring it and writes stage, issue,
// History and Resolution into spec.md. `init` writes the coverage block with
// an empty folder list on purpose: CI fails until A3 declares the folders.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSpec } from '../lib/src/parsers/spec.js';

const ENGINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fuzkrigo-spec.mjs');

// Roda o teste numa pasta temporaria vazia e a apaga no fim.
// Runs the test in an empty temporary folder and removes it afterwards.
function withTempDir(fn) {
  const root = mkdtempSync(path.join(tmpdir(), 'fspec-rastreio-'));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// process.execPath: o mesmo node que roda a suite, sem depender do PATH.
// process.execPath: the same node running the suite, no PATH dependency.
function engine(root, ...args) {
  return spawnSync(process.execPath, [ENGINE, ...args], { cwd: root, encoding: 'utf-8' });
}

function createSpec(root, name, ...extra) {
  const proc = engine(root, 'new', name, ...extra);
  assert.equal(proc.status, 0, `new saiu com ${proc.status}: ${proc.stderr}`);
  return readFileSync(path.join(root, '.spec', 'features', name, 'spec.md'), 'utf-8');
}

function lines(spec) {
  return spec.split(/\r?\n/);
}

// Valor de uma linha de cabecalho "> chave: valor", ou null.
// Value of a "> key: value" header line, or null.
function header(spec, key) {
  const line = lines(spec).find((l) => l.startsWith(`> ${key}:`));
  return line === undefined ? null : line.slice(`> ${key}:`.length).trim();
}

// Primeira linha de dados da tabela da secao "## Historico", em celulas.
// First data row of the "## Historico" table, as cells.
function firstHistoryRow(spec) {
  const all = lines(spec);
  const start = all.indexOf('## Histórico');
  assert.notEqual(start, -1, 'secao ## Histórico ausente');
  const rows = all.slice(start + 1).filter((l) => l.startsWith('|'));
  return rows[2].split('|').slice(1, -1).map((cell) => cell.trim());
}

function assertNothingCreated(root, proc) {
  assert.equal(proc.status, 2, `deveria sair 2, saiu ${proc.status}: ${proc.stdout}`);
  assert.deepEqual(readdirSync(root), [], 'nada deveria ter sido criado');
}

test('new e1-login-email --issue 12 grava etapa, issue e titulo sem o prefixo', () => {
  withTempDir((root) => {
    const spec = createSpec(root, 'e1-login-email', '--issue', '12');
    assert.equal(header(spec, 'etapa'), 'E1');
    assert.equal(header(spec, 'issue'), '#12');
    assert.equal(lines(spec)[0], '# Spec: Login email');
  });
});

test('new e11a-migracao-legado sem --issue deixa a issue como pendencia visivel', () => {
  withTempDir((root) => {
    const spec = createSpec(root, 'e11a-migracao-legado');
    assert.equal(header(spec, 'etapa'), 'E11a');
    assert.equal(header(spec, 'issue'), '[#<n> da issue]');
  });
});

test('new i42-corrige-encoding tira a issue do prefixo e nao tem etapa', () => {
  withTempDir((root) => {
    const spec = createSpec(root, 'i42-corrige-encoding');
    assert.equal(header(spec, 'etapa'), '—');
    assert.equal(header(spec, 'issue'), '#42');
    assert.equal(firstHistoryRow(spec)[2], 'Issue #42');
  });
});

test('new i42 com --issue diferente sai 2, explica a divergencia e nao cria nada', () => {
  withTempDir((root) => {
    const proc = engine(root, 'new', 'i42-corrige-encoding', '--issue', '43');
    assertNothingCreated(root, proc);
    assert.match(proc.stderr, /#42/);
    assert.match(proc.stderr, /#43/);
  });
});

test('new com --issue que nao e numero sai 2 e nao cria nada', () => {
  withTempDir((root) => {
    assertNothingCreated(root, engine(root, 'new', 'e1-x', '--issue', 'abc'));
  });
});

test('new sem prefixo continua como hoje, com etapa e issue vazias', () => {
  withTempDir((root) => {
    const spec = createSpec(root, 'entrega-dever-casa');
    assert.equal(header(spec, 'etapa'), '—');
    assert.equal(header(spec, 'issue'), '—');
    assert.equal(lines(spec)[0], '# Spec: Entrega dever casa');
    assert.equal(firstHistoryRow(spec)[2], '—');
  });
});

test('spec gerada tem Historico e Resolucao e o parser a le sem problema', () => {
  withTempDir((root) => {
    const spec = createSpec(root, 'e1-login-email', '--issue', '12');
    const [date, change, origin] = firstHistoryRow(spec);
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(change, 'Spec criada');
    assert.equal(origin, 'Etapa E1');
    assert.ok(lines(spec).includes('## Resolução'), 'secao ## Resolução ausente');
    const parsed = parseSpec(spec);
    assert.deepEqual(parsed.parseIssues, []);
    assert.equal(parsed.stories.length, 1);
    assert.equal(parsed.assumptions.length, 1);
    assert.equal(parsed.questions.length, 1);
  });
});

test('init numa pasta vazia grava o bloco coverage com a lista de pastas vazia', () => {
  withTempDir((root) => {
    const proc = engine(root, 'init');
    assert.equal(proc.status, 0, `init saiu com ${proc.status}: ${proc.stderr}`);
    const config = JSON.parse(readFileSync(path.join(root, 'fuzkrigo.config.json'), 'utf-8'));
    assert.deepEqual(config.coverage, { global: 95, businessLogic: 98, businessLogicPaths: [] });
  });
});

test('init com fuzkrigo.config.json existente deixa o arquivo byte a byte igual', () => {
  withTempDir((root) => {
    const configPath = path.join(root, 'fuzkrigo.config.json');
    const original = Buffer.from('{"testCommand":"pytest",  "reporter": "junit-xml"}\r\n', 'utf-8');
    writeFileSync(configPath, original);
    const proc = engine(root, 'init');
    assert.equal(proc.status, 0, `init saiu com ${proc.status}: ${proc.stderr}`);
    assert.ok(readFileSync(configPath).equals(original), 'fuzkrigo.config.json foi alterado');
  });
});
