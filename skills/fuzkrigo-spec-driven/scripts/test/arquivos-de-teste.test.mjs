// Testes da regra dos testes em `Arquivos:`: o que o prompt diz ao executor e o
// que o `plano` avisa. Regra do prompt e avisos só no modo claude, o único com
// conferência. Rodar da pasta scripts/:
//   node --test test/arquivos-de-teste.test.mjs
//
// Tests of the tests-in-`Arquivos:` rule: what the prompt tells the executor and
// what `plano` warns about. Prompt rule and warnings in claude mode only, the
// one with a check. Run from scripts/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { loadConfig } from '../lib/src/config.js';
import { montarPlano, promptFaixa, promptTarefa } from '../lib/src/core/plano.js';
import { loadProject } from '../lib/src/core/project.js';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';
import { FEATURE, plannedProject, projectWith, readFeature, run } from './fixture-faixas.mjs';

const RULE =
  '- Toque SOMENTE nos arquivos permitidos, testes inclusos: a faixa é conferida contra a lista antes do merge e reprova com qualquer arquivo a mais.';

const missingTest = (id) =>
  `${id}: nenhum arquivo de teste em Arquivos: — liste o teste da tarefa, ou a conferência reprova o teste que o executor escrever`;

const scaffoldFile = (id, file) =>
  `${id} lista ${file}, o arquivo de testes do scaffold — em faixas, use um arquivo de teste por tarefa (todas as tarefas que o listam caem na mesma faixa)`;

// Só os avisos desta regra. / Only this rule's warnings.
const testWarnings = (warnings) => warnings.filter((w) => /arquivo de teste/.test(w)).sort();

const warningsOf = (repo) => testWarnings(JSON.parse(readFeature(repo, 'plano.json')).avisos);

const MIXED = [
  { id: 'T-001', model: 'sonnet', file: 'src/a.js, test/a.test.js' },
  { id: 'T-002', model: 'sonnet' },
  { id: 'T-003', model: 'codex', file: 'src/b.js, test/b.test.js' },
];

const planOf = (repo, agent) => montarPlano(loadProject(loadConfig(repo)), FEATURE, { agent });

// ── prompt ─────────────────────────────────────────────────────────────────

test('o prompt do modo claude fecha a lista, testes inclusos, so onde ha Arquivos:', () => {
  withTempDir('fspec-arquivos-', (root) => {
    const repo = plannedProject(root, MIXED);
    const plan = planOf(repo, 'claude');
    const single = promptTarefa(plan, plan.faixas[0].tasks[0]);
    const manual = promptFaixa(plan, plan.faixas[1], { manual: true });
    const sequential = promptTarefa(plan, plan.sequenciais[0]);

    assert.ok(single.includes('arquivos permitidos (testes inclusos): src/a.js, test/a.test.js'), single);
    for (const prompt of [single, manual]) assert.ok(prompt.split('\n').includes(RULE), prompt);
    assert.ok(sequential.includes('arquivos permitidos (testes inclusos): (a definir pela tarefa)'), sequential);
    assert.equal(sequential.includes(RULE), false, sequential);

    for (const name of ['executar-tarefas.sh', 'plano-execucao.md']) {
      const artifact = readFeature(repo, name);
      assert.ok(artifact.includes(RULE), name);
      assert.doesNotMatch(artifact, /e seus testes/);
    }
  });
});

test('no modo antigravity muda o texto da lista, sem a regra e sem os avisos', () => {
  withTempDir('fspec-arquivos-', (root) => {
    const repo = projectWith(root, [{ id: 'T-001', model: 'sonnet', file: 'src/a.js' }]);
    assert.equal(run(process.execPath, [ENGINE, 'plano', FEATURE, '--agents', 'antigravity'], repo).status, 0);
    const md = readFeature(repo, 'plano-execucao.md');
    assert.ok(md.includes('arquivos permitidos (testes inclusos): src/a.js'), md);
    assert.equal(md.includes(RULE), false, md);
    assert.deepEqual(warningsOf(repo), []);
  });
});

// ── avisos do plano / plan warnings ────────────────────────────────────────

const WARNING_TASKS = [
  { id: 'T-001', model: 'sonnet', file: 'src/a.js' },
  { id: 'T-002', model: 'sonnet', file: 'src/b.js, test/demo.spec.test.js' },
  { id: 'T-003', model: 'sonnet', file: 'src/c.js, test/c.test.js' },
  { id: 'T-004', model: 'sonnet', file: 'src/d.py, tests/test_d.py' },
  { id: 'T-005', model: 'sonnet', file: 'pkg/e.py, pkg/e_test.py' },
  { id: 'T-006', model: 'sonnet', file: 'src/f.tsx, src/f.spec.tsx' },
  { id: 'T-007', model: 'sonnet', file: 'src/g.mjs, src/g.test.cjs' },
  { id: 'T-008', model: 'sonnet' },
  { id: 'T-009', model: 'sonnet', file: 'src/test_h.js' },
];

test('o plano avisa tarefa sem arquivo de teste e tarefa com o arquivo do scaffold', () => {
  withTempDir('fspec-arquivos-', (root) => {
    const repo = plannedProject(root, WARNING_TASKS);
    const expected = [
      missingTest('T-001'),
      missingTest('T-009'),
      scaffoldFile('T-002', 'test/demo.spec.test.js'),
    ];
    assert.deepEqual(warningsOf(repo), expected.sort());
  });
});

// O nome segue o do scaffold: pytest em tests/, com o hífen virando sublinhado.
// The name follows scaffold's: pytest in tests/, hyphen turned into underscore.
test('com pytest o arquivo do scaffold e o de tests/, com sublinhado no nome', () => {
  withTempDir('fspec-arquivos-', (root) => {
    const repo = projectWith(root, [{ id: 'T-001', model: 'sonnet', file: 'src/a.py' }]);
    const config = path.join(repo, 'fuzkrigo.config.json');
    const raw = JSON.parse(readFileSync(config, 'utf-8'));
    writeFileSync(config, JSON.stringify({ ...raw, testCommand: 'python3 -m pytest' }));
    assert.equal(run(process.execPath, [ENGINE, 'new', 'duas-partes'], repo).status, 0);
    const dir = path.join(repo, '.spec', 'features', 'duas-partes');
    const file = 'tests/test_spec_duas_partes.py';
    writeFileSync(
      path.join(dir, 'tasks.md'),
      `# Tasks\n\n> feature: duas-partes\n\n## T-101 — Parte [pendente]\n\n- Refs: US-002\n- Arquivos: src/p.py, ${file}\n`
    );
    assert.equal(run(process.execPath, [ENGINE, 'plano', 'duas-partes', '--agents', 'claude'], repo).status, 0);
    const plan = JSON.parse(readFileSync(path.join(dir, 'plano.json'), 'utf-8'));
    assert.deepEqual(testWarnings(plan.avisos), [scaffoldFile('T-101', file)]);
  });
});
