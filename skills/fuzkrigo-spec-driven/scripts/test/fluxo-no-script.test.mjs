// Testes do fluxo legível dentro do executar-tarefas.sh: o `claude -p` sai em
// stream-json, o cru vai para o .jsonl e o texto legível para o .log. Rodar da
// pasta scripts/, no Git Bash:
//   node --test test/fluxo-no-script.test.mjs
//
// Tests of the readable stream inside executar-tarefas.sh: `claude -p` emits
// stream-json, the raw stream goes to the .jsonl and the readable text to the
// .log. Run from scripts/, in Git Bash.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';
import {
  eventsOf,
  fakeClaude,
  FEATURE,
  git,
  logsDirOf,
  plannedProject,
  projectWith,
  readFeature,
  run,
  runScript,
} from './fixture-faixas.mjs';

const EVENTS = [
  { type: 'system', subtype: 'init', model: 'modelo-falso' },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'trabalhando' }] } },
  { type: 'result', subtype: 'success', is_error: false, duration_ms: 1000, result: 'resposta final' },
].map((e) => JSON.stringify(e));

// Duas tarefas na mesma faixa e uma sequencial.
// Two tasks in the same lane and one sequential task.
const LANE_AND_SEQUENTIAL = [
  { id: 'T-001', model: 'sonnet', file: 'src/a.js' },
  { id: 'T-002', model: 'sonnet', file: 'src/a.js' },
  { id: 'T-003', model: 'sonnet' },
];

const logOf = (root, name) => readFileSync(path.join(logsDirOf(root), name), 'utf-8');
const rawLines = (root, name) => logOf(root, name).split(/\r?\n/).filter(Boolean);

// Restos de uma execução anterior, que a nova precisa zerar.
// Leftovers of a previous run, which the new one must truncate.
function seedStale(root, ...names) {
  mkdirSync(logsDirOf(root), { recursive: true });
  for (const name of names) writeFileSync(path.join(logsDirOf(root), name), 'STALE\n');
}

function runStreaming(root, tasks, exitCode = 0) {
  const repo = plannedProject(root, tasks);
  const claude = fakeClaude(root, exitCode, { events: EVENTS, stderr: 'AVISO-DO-CLAUDE' });
  seedStale(root, 'faixa-1.jsonl', 'T-003.jsonl');
  return { repo, claude, proc: runScript(repo, claude.env) };
}

test('cada chamada do claude usa stream-json com --verbose', () => {
  withTempDir('fspec-stream-', (root) => {
    const { claude, proc } = runStreaming(root, LANE_AND_SEQUENTIAL);
    const flags = claude.calls().match(/--output-format stream-json --verbose/g) || [];
    assert.equal(flags.length, 3, `${proc.out}\n${claude.calls()}`);
  });
});

test('o .jsonl guarda o fluxo cru desta execucao, acumulando as tarefas da faixa', () => {
  withTempDir('fspec-stream-', (root) => {
    runStreaming(root, LANE_AND_SEQUENTIAL);
    assert.deepEqual(rawLines(root, 'faixa-1.jsonl'), [...EVENTS, ...EVENTS]);
    assert.deepEqual(rawLines(root, 'T-003.jsonl'), EVENTS);
  });
});

test('o .log da faixa e o da sequencial trazem o texto legivel e o stderr do claude', () => {
  withTempDir('fspec-stream-', (root) => {
    const { proc } = runStreaming(root, LANE_AND_SEQUENTIAL);
    const lane = logOf(root, 'faixa-1.log');
    const sequential = logOf(root, 'T-003.log');
    for (const id of ['T-001', 'T-002']) {
      assert.ok(lane.includes(`[${id}] início: modelo modelo-falso`), lane);
      assert.ok(lane.includes(`[${id}] fim: success (1 s)`), lane);
    }
    assert.ok(sequential.includes('[T-003] trabalhando'), sequential);
    for (const log of [lane, sequential]) {
      assert.ok(log.includes('AVISO-DO-CLAUDE'), log);
      assert.doesNotMatch(log, /"type"/);
    }
    assert.doesNotMatch(proc.out, /AVISO-DO-CLAUDE/);
  });
});

test('claude que falha derruba a faixa e a sequencial, mesmo com o fluxo saindo 0', () => {
  const tasks = [LANE_AND_SEQUENTIAL[0], { id: 'T-003', model: 'sonnet' }];
  withTempDir('fspec-stream-', (root) => {
    const { repo, proc } = runStreaming(root, tasks, 1);
    assert.equal(proc.status, 1, proc.out);
    const events = eventsOf(root);
    assert.ok(events.includes('faixa|faixa-1|falhou'), events.join('\n'));
    assert.ok(events.includes('seq|T-003|falhou'), events.join('\n'));
    assert.ok(logOf(root, 'faixa-1.log').includes('[T-001] trabalhando'));
    assert.ok(logOf(root, 'T-003.log').includes('[T-003] trabalhando'));
    for (const id of ['T-001', 'T-003']) {
      assert.match(readFeature(repo, 'tasks.md'), new RegExp(`${id} .*\\[pendente\\]`));
    }
  });
});

// Instala a skill dentro do projeto, fora do git, e gera o plano com essa cópia.
// Installs the skill inside the project, untracked, and plans with that copy.
function projectWithLocalEngine(root, tasks) {
  const repo = projectWith(root, tasks);
  writeFileSync(path.join(repo, '.gitignore'), '.claude/\n');
  git(repo, 'add', '.gitignore');
  git(repo, 'commit', '-q', '-m', 'ignora a skill local');
  assert.equal(run(process.execPath, [ENGINE, 'init', '--agents', 'claude'], repo).status, 0);
  const local = path.join(repo, '.claude', 'skills', 'fuzkrigo-spec-driven', 'scripts', 'fuzkrigo-spec.mjs');
  const plan = run(process.execPath, [local, 'plano', FEATURE, '--agents', 'claude'], repo);
  assert.equal(plan.status, 0, plan.out);
  assert.equal(git(repo, 'ls-files', '.claude'), '', 'a cópia do motor não pode estar no git');
  return repo;
}

test('com o motor dentro do projeto e fora do git, a faixa usa a copia da arvore principal', () => {
  withTempDir('fspec-stream-', (root) => {
    const repo = projectWithLocalEngine(root, [LANE_AND_SEQUENTIAL[0]]);
    const proc = runScript(repo, fakeClaude(root, 0, { events: EVENTS }).env);
    const events = eventsOf(root);
    assert.ok(events.includes('faixa|faixa-1|mesclada'), `${proc.out}\n${events.join('\n')}`);
    assert.ok(logOf(root, 'faixa-1.log').includes('[T-001] trabalhando'), proc.out);
    assert.ok(proc.out.includes('faixa-1: 1 arquivo(s) tocado(s), todos permitidos'), proc.out);
  });
});
