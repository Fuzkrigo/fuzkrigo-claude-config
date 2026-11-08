// Testes do patch local: nomes proprios do fuzkrigo no lugar dos herdados do
// projeto de origem. Rodar da pasta scripts/:
//   node --test test/nomes-fuzkrigo.test.mjs
//
// Local patch tests: fuzkrigo's own names replace the ones inherited from the
// upstream project. Run from scripts/.
//
// A troca foi feita de uma vez, sem compatibilidade com o nome antigo, porque
// nenhum projeto usa o arquivo antigo. Os dois casos fixam as duas pontas que
// o usuario enxerga: o motor LE fuzkrigo.config.json e o `init` GRAVA esse
// nome, nunca o antigo.
// The rename has no backward compatibility on purpose. Both cases pin the two
// ends the user sees: the engine READS fuzkrigo.config.json and `init` WRITES
// that name, never the legacy one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from '../lib/src/config.js';

const ENGINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fuzkrigo-spec.mjs');

// O nome antigo e montado por concatenacao: assim o grep de aceite da troca
// (nenhuma ocorrencia do nome herdado no repositorio) continua significativo.
// The legacy name is built by concatenation, so the rename acceptance grep
// (no occurrence of the inherited name in the repository) stays meaningful.
const LEGACY_CONFIG_NAME = ['onp', 'spec.config.json'].join('');

function makeTempDir() {
  return mkdtempSync(path.join(tmpdir(), 'fspec-nomes-'));
}

test('loadConfig le fuzkrigo.config.json', () => {
  const root = makeTempDir();
  try {
    writeFileSync(path.join(root, 'fuzkrigo.config.json'), JSON.stringify({ testCommand: 'echo ok' }));
    assert.equal(loadConfig(root).testCommand, 'echo ok');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('init grava fuzkrigo.config.json e nunca o nome antigo', () => {
  const root = makeTempDir();
  try {
    // process.execPath: o mesmo node que roda a suite, sem depender do PATH.
    // process.execPath: the same node running the suite, no PATH dependency.
    const proc = spawnSync(process.execPath, [ENGINE, 'init'], { cwd: root, encoding: 'utf-8' });
    assert.equal(proc.status, 0, `init saiu com ${proc.status}: ${proc.stderr}`);
    assert.ok(existsSync(path.join(root, 'fuzkrigo.config.json')), 'fuzkrigo.config.json nao foi criado');
    assert.ok(!existsSync(path.join(root, LEGACY_CONFIG_NAME)), `${LEGACY_CONFIG_NAME} nao deveria ser criado`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
