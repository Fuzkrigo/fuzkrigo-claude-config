// Testes do patch local que liga o motor ao pytest.
// Rodar da pasta scripts/: node --test test/
//
// Duas metades do problema:
//   1. o motor nao entendia a saida do pytest  -> reporter junit-xml
//   2. a etiqueta @spec: nao sobrevive a um nome de funcao Python
//      (@ e : sao invalidos em identificador) -> reconhecimento por nome
//
// O scaffold ja gera `def test_ac_001():` e `def test_p_001():`, entao as
// duas pontas se encontram sem mudar a convencao de escrita da spec.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseJUnitXml, extractTags } from '../lib/src/core/verify.js';

const xml = (corpo) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<testsuites><testsuite name="pytest" tests="1">${corpo}</testsuite></testsuites>`;

test('junit: testcase auto-fechado conta como PASS', () => {
  const tests = parseJUnitXml(xml('<testcase classname="tests.test_spec_login" name="test_ac_001" time="0.01"/>'));
  assert.equal(tests.length, 1);
  assert.equal(tests[0].pass, true);
  assert.equal(tests[0].skip, false);
});

test('junit: <failure> conta como FAIL', () => {
  const tests = parseJUnitXml(
    xml('<testcase classname="t" name="test_ac_002"><failure message="assert 1 == 2">detalhe</failure></testcase>')
  );
  assert.equal(tests[0].pass, false);
  assert.equal(tests[0].skip, false);
});

test('junit: <error> conta como FAIL, nao como skip', () => {
  const tests = parseJUnitXml(
    xml('<testcase classname="t" name="test_ac_003"><error message="fixture faltando">trace</error></testcase>')
  );
  assert.equal(tests[0].pass, false);
  assert.equal(tests[0].skip, false);
});

test('junit: <skipped> nunca e prova', () => {
  const tests = parseJUnitXml(
    xml('<testcase classname="t" name="test_ac_004"><skipped type="pytest.skip" message="depois"/></testcase>')
  );
  assert.equal(tests[0].skip, true);
  assert.equal(tests[0].pass, false);
});

test('junit: titulo junta classname e name', () => {
  const tests = parseJUnitXml(xml('<testcase classname="tests.test_spec_login" name="test_ac_005"/>'));
  assert.match(tests[0].title, /tests\.test_spec_login/);
  assert.match(tests[0].title, /test_ac_005/);
});

test('junit: varios testcases no mesmo arquivo', () => {
  const tests = parseJUnitXml(
    xml(
      '<testcase classname="t" name="test_ac_006"/>' +
        '<testcase classname="t" name="test_ac_007"><failure message="x"/></testcase>' +
        '<testcase classname="t" name="test_p_001"/>'
    )
  );
  assert.equal(tests.length, 3);
  assert.deepEqual(tests.map((t) => t.pass), [true, false, true]);
});

test('junit: xml sem testcase devolve lista vazia', () => {
  assert.deepEqual(parseJUnitXml(xml('')), []);
});

test('etiqueta explicita continua valendo (JS/TAP nao regride)', () => {
  const { acs, principles } = extractTags('AC-001: entrega no prazo @spec:AC-001 @principle:P-002');
  assert.deepEqual(acs, ['AC-001']);
  assert.deepEqual(principles, ['P-002']);
});

test('nome de funcao pytest vira criterio de aceite', () => {
  const { acs } = extractTags('tests.test_spec_login test_ac_042');
  assert.deepEqual(acs, ['AC-042']);
});

test('nome de funcao pytest vira principio', () => {
  const { principles } = extractTags('tests.test_spec_login test_p_007');
  assert.deepEqual(principles, ['P-007']);
});

test('nome comum nao vira etiqueta por acidente', () => {
  const { acs, principles } = extractTags('tests.test_processamento test_process_001 test_acesso');
  assert.deepEqual(acs, []);
  assert.deepEqual(principles, []);
});

test('etiqueta e nome apontando para o mesmo criterio nao duplicam', () => {
  const { acs } = extractTags('test_ac_009 @spec:AC-009');
  assert.deepEqual(acs, ['AC-009']);
});
