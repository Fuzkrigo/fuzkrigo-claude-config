// Testes do patch local: tarefas entram na checagem de unicidade. Rodar da
// pasta scripts/:
//   node --test test/unicidade-tarefas.test.mjs
//
// Local patch tests: tasks join the uniqueness check. Run from scripts/.
//
// O audit conferia US, AC, ASM e Q duplicados entre features, mas nao T-xxx.
// The audit checked duplicated US, AC, ASM and Q across features, but not
// T-xxx.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProject, findingsOf, runAudit, withTempDir } from './fixture-projeto.mjs';

const PROOF = { timestamp: '2099-01-01T00:00:00.000Z', principle: 'pass' };

test('T-001 em duas features e ID_DUPLICADO citando os dois tasks.md', () => {
  withTempDir('fspec-tarefas-', (root) => {
    buildProject(root, [
      { name: 'a', tasks: ['T-001'], proof: PROOF },
      { name: 'b', tasks: ['T-001'], proof: PROOF },
    ]);
    const found = findingsOf(runAudit(root).report, 'ID_DUPLICADO');
    assert.equal(found.length, 1);
    assert.equal(found[0].severity, 'erro');
    assert.match(found[0].message, /T-001/);
    assert.match(found[0].message, /a[\\/]tasks\.md/);
    assert.match(found[0].message, /b[\\/]tasks\.md/);
  });
});

test('T-001 e T-002 em features diferentes nao geram ID_DUPLICADO', () => {
  withTempDir('fspec-tarefas-', (root) => {
    buildProject(root, [
      { name: 'a', tasks: ['T-001'], proof: PROOF },
      { name: 'b', tasks: ['T-002'], proof: PROOF },
    ]);
    assert.deepEqual(findingsOf(runAudit(root).report, 'ID_DUPLICADO'), []);
  });
});
