// Testes do patch local: principios entram na checagem de unicidade. Rodar da
// pasta scripts/:
//   node --test test/unicidade-principios.test.mjs
//
// Local patch tests: principles join the uniqueness check. Run from scripts/.
//
// Dois `## P-001` na constituicao passavam sem achado: o segundo principio
// era auditado como se fosse outro. Agora e ID_DUPLICADO, achado do projeto,
// que sobrevive ao filtro --feature.
// Two `## P-001` in the constitution passed silently: the second principle
// was audited as if it were another one. Now it is ID_DUPLICADO, a project
// finding that survives the --feature filter.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'fs';
import path from 'path';
import { buildProject, findingsOf, runAudit, withTempDir } from './fixture-projeto.mjs';

const PROOF = { timestamp: '2099-01-01T00:00:00.000Z', principle: 'pass' };

function constitution(secondId) {
  return `# Constituição

## P-001 [DEVE] Nota nunca fica negativa

- verificação(teste): @principle:P-001

## ${secondId} [DEVE] Todo requisito tem prova executável

- verificação(gate): intrínseca ao audit
`;
}

function projectWith(root, secondId) {
  buildProject(root, [{ name: 'a', tasks: ['T-001'], proof: PROOF }]);
  writeFileSync(path.join(root, '.spec', 'constituicao.md'), constitution(secondId));
}

test('P-001 duas vezes na constituicao e ID_DUPLICADO citando as duas linhas', () => {
  withTempDir('fspec-principios-', (root) => {
    projectWith(root, 'P-001');
    const found = findingsOf(runAudit(root).report, 'ID_DUPLICADO');
    assert.equal(found.length, 1);
    assert.equal(found[0].severity, 'erro');
    assert.match(found[0].message, /P-001/);
    assert.match(found[0].message, /3.*7/);
    assert.match(found[0].file, /constituicao\.md$/);
  });
});

test('P-001 e P-002 nao geram ID_DUPLICADO', () => {
  withTempDir('fspec-principios-', (root) => {
    projectWith(root, 'P-002');
    assert.deepEqual(findingsOf(runAudit(root).report, 'ID_DUPLICADO'), []);
  });
});

test('principio duplicado sobrevive ao filtro --feature', () => {
  withTempDir('fspec-principios-', (root) => {
    projectWith(root, 'P-001');
    const found = findingsOf(runAudit(root, '--feature', 'a').report, 'ID_DUPLICADO');
    assert.equal(found.length, 1);
  });
});
