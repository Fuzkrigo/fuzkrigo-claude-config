// Testes da conferência dentro do executar-tarefas.sh: nenhuma faixa do Claude é
// mesclada sem passar pelo `conferir`. Rodar da pasta scripts/, no Git Bash:
//   node --test test/conferir-no-script.test.mjs
//
// Tests of the check inside executar-tarefas.sh: no Claude lane is merged
// without passing `conferir`. Run from scripts/, in Git Bash.
//
// Antes, o script mesclava o que viesse: arquivo a mais entrava, faixa sem
// commit marcava a tarefa como concluída e o `worktree remove --force` apagava
// o trabalho sem commit.
// Before, the script merged whatever came: extra files got in, a lane without
// commits marked its task done and `worktree remove --force` deleted the
// uncommitted work.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'fs';
import path from 'path';
import { withTempDir } from './fixture-projeto.mjs';
import {
  eventsOf,
  fakeClaude,
  git,
  plannedProject,
  readFeature,
  runScript,
  worktreeOf,
} from './fixture-faixas.mjs';

const ONE_LANE = [{ id: 'T-001', model: 'sonnet', file: 'src/a.js' }];
const TWO_LANES = [...ONE_LANE, { id: 'T-002', model: 'sonnet', file: 'src/b.js' }];
const SHARED_FILE = [...ONE_LANE, { id: 'T-002', model: 'sonnet', file: 'src/a.js' }];

function runLanes(root, tasks, options) {
  const repo = plannedProject(root, tasks);
  const proc = runScript(repo, fakeClaude(root, 0, options).env);
  return { repo, proc, events: eventsOf(root) };
}

// A lista de falhas do fim do script: o gate da fixture já sai 1 sozinho, então
// o código de saída não prova que a faixa entrou nela.
// The script's final failure list: the fixture gate exits 1 on its own, so the
// exit code does not prove the lane got into it.
const FAILURE_LIST = 'faixas/tarefas com falha:';

// Faixa reprovada: não mesclada, worktree mantido, tarefas pendentes, saída 1.
// Rejected lane: not merged, worktree kept, tasks pending, exit 1.
function assertRejected(root, { repo, proc, events }, lane, taskIds) {
  assert.equal(proc.status, 1, proc.out);
  assert.match(proc.out, new RegExp(`${lane} reprovada na conferência`));
  assert.match(proc.out, new RegExp(`${FAILURE_LIST}[^\\n]*${lane}`));
  assert.ok(events.includes(`faixa|${lane}|reprovada`), events.join('\n'));
  assert.equal(events.includes(`faixa|${lane}|mesclada`), false, events.join('\n'));
  assert.doesNotMatch(git(repo, 'log', '--format=%s'), new RegExp(`merge ${lane}`));
  assert.ok(existsSync(worktreeOf(root, lane)), proc.out);
  for (const id of taskIds) {
    assert.equal(events.includes(`tarefa|${id}|concluida`), false, events.join('\n'));
    assert.match(readFeature(repo, 'tasks.md'), new RegExp(`${id} .*\\[pendente\\]`));
  }
}

test('faixa que toca arquivo fora da lista nao e mesclada; a outra da onda segue', () => {
  withTempDir('fspec-script-', (root) => {
    const result = runLanes(root, TWO_LANES, { extraFiles: { 'T-002': 'src/outside.js' } });
    assertRejected(root, result, 'faixa-2', ['T-002']);
    assert.ok(result.proc.out.includes('fora da lista: src/outside.js'), result.proc.out);
    assert.ok(result.events.includes('faixa|faixa-1|mesclada'), result.events.join('\n'));
    assert.match(readFeature(result.repo, 'tasks.md'), /T-001 .*\[concluida\]/);
    assert.equal(existsSync(path.join(result.repo, 'src', 'outside.js')), false);
  });
});

test('faixa limpa passa pela conferencia e e mesclada', () => {
  withTempDir('fspec-script-', (root) => {
    const { repo, proc, events } = runLanes(root, ONE_LANE);
    assert.ok(proc.out.includes('faixa-1: 1 arquivo(s) tocado(s), todos permitidos'), proc.out);
    assert.ok(events.includes('faixa|faixa-1|mesclada'), events.join('\n'));
    assert.equal(proc.out.includes(FAILURE_LIST), false, proc.out);
    assert.match(git(repo, 'log', '--format=%s'), /merge faixa-1/);
    assert.match(readFeature(repo, 'tasks.md'), /T-001 .*\[concluida\]/);
  });
});

test('claude que sai 0 sem commitar tem a faixa reprovada', () => {
  withTempDir('fspec-script-', (root) => {
    const result = runLanes(root, ONE_LANE, { commit: false });
    assertRejected(root, result, 'faixa-1', ['T-001']);
    assert.ok(result.proc.out.includes('faixa-1 sem commits — nada a mesclar'), result.proc.out);
  });
});

test('arquivo sem commit no worktree reprova a faixa e o trabalho fica la', () => {
  withTempDir('fspec-script-', (root) => {
    const result = runLanes(root, ONE_LANE, { leftovers: { 'T-001': 'tmp/sobra.txt' } });
    assertRejected(root, result, 'faixa-1', ['T-001']);
    assert.ok(result.proc.out.includes('tmp/sobra.txt'), result.proc.out);
    assert.ok(existsSync(path.join(worktreeOf(root, 'faixa-1'), 'tmp', 'sobra.txt')), result.proc.out);
  });
});

test('tarefa sem commit proprio reprova a faixa inteira', () => {
  withTempDir('fspec-script-', (root) => {
    const result = runLanes(root, SHARED_FILE, { skipCommit: ['T-002'] });
    assertRejected(root, result, 'faixa-1', ['T-001', 'T-002']);
    assert.match(result.proc.out, /T-002[^\n]*sem commit|sem commit[^\n]*T-002/);
  });
});
