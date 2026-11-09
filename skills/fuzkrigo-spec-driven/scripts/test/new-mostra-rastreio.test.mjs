// Testes do patch local: o `new` mostra a etapa e a issue que reconheceu no
// nome. Rodar da pasta scripts/:
//   node --test test/new-mostra-rastreio.test.mjs
//
// Local patch tests: `new` shows the stage and issue it recognized in the
// name. Run from scripts/.
//
// O prefixo e<n><letra>- e lido como etapa: `e2e-testes` vira a etapa "E2e".
// A leitura nao muda; o `new` passa a mostra-la, para o usuario perceber.
// The e<n><letter>- prefix is read as a stage: `e2e-testes` becomes stage
// "E2e". The reading does not change; `new` now shows it, so the user notices.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';

function createFeature(root, ...args) {
  const proc = spawnSync(process.execPath, [ENGINE, 'new', ...args], { cwd: root, encoding: 'utf-8' });
  assert.equal(proc.status, 0, proc.stderr);
  return proc.stdout;
}

test('new e1-login-email --issue 12 mostra etapa E1 e issue #12', () => {
  withTempDir('fspec-rastreio-', (root) => {
    assert.match(createFeature(root, 'e1-login-email', '--issue', '12'), /etapa: E1 · issue: #12/);
  });
});

test('new e2e-testes mostra a leitura etapa E2e, para o usuario perceber', () => {
  withTempDir('fspec-rastreio-', (root) => {
    assert.match(createFeature(root, 'e2e-testes'), /etapa: E2e/);
  });
});
