// Testes do patch local: modelo padrao por alias. Rodar da pasta scripts/:
//   node --test test/modelo-padrao.test.mjs
//
// Local patch tests: default model by alias. Run from scripts/.
//
// O executor paralelo roda cada tarefa num `claude -p --model <modelo>`. Sem
// `Modelo:` na tarefa, vale paralelo.model da configuracao. O padrao e o
// alias `opus`, que acompanha sempre o Opus mais recente; a configuracao do
// projeto continua vencendo o padrao.
// The parallel executor runs each task in `claude -p --model <model>`. The
// default is the `opus` alias, which always tracks the latest Opus; the
// project configuration still wins over the default.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { loadConfig } from '../lib/src/config.js';

function makeTempDir() {
  return mkdtempSync(path.join(tmpdir(), 'fspec-modelo-'));
}

test('sem fuzkrigo.config.json, o modelo padrao e o alias opus', () => {
  const root = makeTempDir();
  try {
    assert.equal(loadConfig(root).paralelo.model, 'opus');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('paralelo.model do projeto vence o padrao', () => {
  const root = makeTempDir();
  try {
    writeFileSync(path.join(root, 'fuzkrigo.config.json'), JSON.stringify({ paralelo: { model: 'sonnet' } }));
    const { paralelo } = loadConfig(root);
    assert.equal(paralelo.model, 'sonnet');
    // A mescla e rasa por chave: os outros padroes de paralelo continuam.
    // The merge is shallow per key: the other paralelo defaults remain.
    assert.equal(paralelo.maxParalelas, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
