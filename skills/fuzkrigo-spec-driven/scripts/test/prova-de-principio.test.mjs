// Testes do patch local: o audit cobra a prova do teste de principio. Rodar
// da pasta scripts/:
//   node --test test/prova-de-principio.test.mjs
//
// Local patch tests: audit requires the principle test's proof. Run from
// scripts/.
//
// A verificacao(teste) de um principio so conferia se existia um teste com a
// etiqueta @principle; nunca se ele tinha passado. Agora o audit le o
// resultado na prova: com --feature, a prova dessa feature; sem filtro, a mais
// recente do projeto. Falha ou pulo e erro para [DEVE]; sem resultado e aviso,
// que vira erro no --ci.
// A principle's verificacao(teste) only checked that a test carried the
// @principle tag, never that it passed. Now audit reads the result from the
// proof: with --feature, that feature's proof; without a filter, the project's
// most recent one. Fail or skip is an error for [DEVE]; no result is a
// warning, raised to error under --ci.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProject, findingsOf, runAudit, withTempDir } from './fixture-projeto.mjs';

const OLDER = '2099-01-01T00:00:00.000Z';
const NEWER = '2099-01-02T00:00:00.000Z';

function onlyFeature(principle) {
  return [{ name: 'a', tasks: ['T-001'], proof: principle === undefined ? null : { timestamp: OLDER, principle } }];
}

test('prova com o principio aprovado nao gera PRINCIPIO_SEM_PROVA', () => {
  withTempDir('fspec-principio-', (root) => {
    buildProject(root, onlyFeature('pass'));
    const { status, report } = runAudit(root, '--ci');
    assert.deepEqual(findingsOf(report, 'PRINCIPIO_SEM_PROVA'), []);
    assert.equal(status, 0, JSON.stringify(report.findings));
  });
});

test('prova com o principio falhando e erro e o audit sai 1', () => {
  withTempDir('fspec-principio-', (root) => {
    buildProject(root, onlyFeature('fail'));
    const { status, report } = runAudit(root);
    const found = findingsOf(report, 'PRINCIPIO_SEM_PROVA');
    assert.equal(found.length, 1);
    assert.equal(found[0].severity, 'erro');
    assert.equal(status, 1);
  });
});

test('prova com o principio pulado e erro e diz que pular nao e prova', () => {
  withTempDir('fspec-principio-', (root) => {
    buildProject(root, onlyFeature('skip'));
    const found = findingsOf(runAudit(root).report, 'PRINCIPIO_SEM_PROVA');
    assert.equal(found.length, 1);
    assert.equal(found[0].severity, 'erro');
    assert.match(found[0].message, /pular não é prova/);
  });
});

test('sem prova gravada e aviso no audit e erro no audit --ci', () => {
  withTempDir('fspec-principio-', (root) => {
    buildProject(root, onlyFeature(undefined));
    const plain = findingsOf(runAudit(root).report, 'PRINCIPIO_SEM_PROVA');
    const ci = findingsOf(runAudit(root, '--ci').report, 'PRINCIPIO_SEM_PROVA');
    assert.deepEqual(plain.map((f) => f.severity), ['aviso']);
    assert.deepEqual(ci.map((f) => f.severity), ['erro']);
  });
});

function twoFeatures() {
  return [
    { name: 'a', tasks: ['T-001'], proof: { timestamp: NEWER, principle: 'fail' } },
    { name: 'b', tasks: ['T-002'], proof: { timestamp: OLDER, principle: 'pass' } },
  ];
}

test('com --feature vale a prova da feature filtrada', () => {
  withTempDir('fspec-principio-', (root) => {
    buildProject(root, twoFeatures());
    const { report } = runAudit(root, '--ci', '--feature', 'b');
    assert.deepEqual(findingsOf(report, 'PRINCIPIO_SEM_PROVA'), []);
  });
});

test('sem filtro vale a prova mais recente do projeto', () => {
  withTempDir('fspec-principio-', (root) => {
    buildProject(root, twoFeatures());
    const found = findingsOf(runAudit(root).report, 'PRINCIPIO_SEM_PROVA');
    assert.deepEqual(found.map((f) => f.severity), ['erro']);
  });
});
