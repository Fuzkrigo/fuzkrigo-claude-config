// Testes do patch local: numeracao continua no `new`. Rodar da pasta scripts/:
//   node --test test/numeracao-continua.test.mjs
//
// Local patch tests: continuous numbering in `new`. Run from scripts/.
//
// Os codigos de rastreio sao unicos no projeto inteiro. O `new` ja continuava
// US e AC a partir do maior codigo existente, mas toda feature nova nascia com
// ASM-001, Q-001 e T-001: a partir da segunda, o audit acusava ID_DUPLICADO.
// Trace codes are unique project-wide. `new` already continued US and AC from
// the highest existing code, but every new feature started at ASM-001, Q-001
// and T-001: from the second one on, audit reported ID_DUPLICADO.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ENGINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fuzkrigo-spec.mjs');

// Roda o teste numa pasta temporaria vazia e a apaga no fim.
// Runs the test in an empty temporary folder and removes it afterwards.
function withTempDir(fn) {
  const root = mkdtempSync(path.join(tmpdir(), 'fspec-numeracao-'));
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

function featureFile(root, feature, file) {
  return path.join(root, '.spec', 'features', feature, file);
}

function createFeature(root, name) {
  const proc = engine(root, 'new', name);
  assert.equal(proc.status, 0, `new saiu com ${proc.status}: ${proc.stderr}`);
}

// Troca codigos num arquivo da feature, simulando uma spec ja trabalhada.
// Replaces codes in a feature file, simulating a spec already worked on.
function renumber(root, feature, file, pairs) {
  const target = featureFile(root, feature, file);
  let text = readFileSync(target, 'utf-8');
  for (const [from, to] of pairs) text = text.replace(from, to);
  writeFileSync(target, text);
}

test('new continua ASM e Q a partir do maior codigo do projeto', () => {
  withTempDir((root) => {
    createFeature(root, 'alfa');
    renumber(root, 'alfa', 'spec.md', [['ASM-001', 'ASM-007'], ['Q-001', 'Q-004']]);
    createFeature(root, 'beta');
    const spec = readFileSync(featureFile(root, 'beta', 'spec.md'), 'utf-8');
    assert.match(spec, /^\| ASM-008 \|/m);
    assert.match(spec, /^\| Q-005 \|/m);
  });
});

test('new continua T a partir da maior tarefa do projeto', () => {
  withTempDir((root) => {
    createFeature(root, 'alfa');
    renumber(root, 'alfa', 'tasks.md', [['T-001', 'T-010']]);
    createFeature(root, 'beta');
    const tasks = readFileSync(featureFile(root, 'beta', 'tasks.md'), 'utf-8');
    assert.match(tasks, /^## T-011 /m);
  });
});

test('duas features criadas pelo new nao geram ID_DUPLICADO no audit', () => {
  withTempDir((root) => {
    createFeature(root, 'alfa');
    createFeature(root, 'beta');
    const proc = engine(root, 'audit', '--json');
    const report = JSON.parse(proc.stdout.slice(0, proc.stdout.lastIndexOf('}') + 1));
    const duplicated = report.findings.filter((f) => f.code === 'ID_DUPLICADO');
    assert.deepEqual(duplicated, []);
  });
});
