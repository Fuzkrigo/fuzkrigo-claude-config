// Testes do patch local: o executor paralelo roda na branch atual (a da
// issue), recusa a main e fecha com o gate da feature. Rodar da pasta
// scripts/, no Git Bash:
//   node --test test/executor-plano.test.mjs
//
// Local patch tests: the parallel executor runs on the current branch (the
// issue's), refuses main and ends with the feature gate. Run from scripts/,
// in Git Bash.
//
// Antes, o executar-tarefas.sh criava a branch spec/<feature> e fechava com
// `audit --ci` sem --feature: o gate de uma feature reprovava por causa de
// outra, e o trabalho saia da branch da issue.
// Before, executar-tarefas.sh created spec/<feature> and ended with
// `audit --ci` without --feature: one feature's gate failed because of
// another, and the work left the issue branch.
//
// O caso que roda o script precisa de `bash` no PATH (Git Bash no Windows).
// The case that runs the script needs `bash` on PATH (Git Bash on Windows).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parseEventos } from '../lib/src/core/painel.js';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';

const FEATURE = 'demo';

const TASKS_MD = `# Tasks: Demo

> feature: demo

## T-001 — Primeira tarefa [pendente]

- Refs: US-001, AC-001
- Arquivos: src/a.js

## T-002 — Segunda tarefa [pendente]

- Refs: US-001, AC-001
- Arquivos: src/b.js
`;

// Roda um comando e junta stdout e stderr, para as mensagens do script.
// Runs a command and joins stdout and stderr, for the script messages.
function run(cmd, args, cwd, env = process.env) {
  const proc = spawnSync(cmd, args, { cwd, env, encoding: 'utf-8' });
  return { status: proc.status, out: `${proc.stdout ?? ''}${proc.stderr ?? ''}` };
}

function git(cwd, ...args) {
  const proc = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  assert.equal(proc.status, 0, proc.stderr);
  return proc.stdout.trim();
}

// Repositorio git com uma feature de duas tarefas disjuntas e um commit
// inicial na main; o plano e gerado depois, e seus artefatos ficam fora do
// git, como no uso real. O repositorio fica numa subpasta, para o PATH falso
// nao sujar a arvore.
// Git repository with one feature of two disjoint tasks and an initial commit
// on main; the plan is generated afterwards, its artifacts left out of git,
// as in real use. The repository sits in a subfolder, so the fake PATH does
// not dirty the tree.
function projectWithPlan(root) {
  const repo = path.join(root, 'repo');
  mkdirSync(repo);
  assert.equal(run(process.execPath, [ENGINE, 'init'], repo).status, 0);
  assert.equal(run(process.execPath, [ENGINE, 'new', FEATURE], repo).status, 0);
  writeFileSync(featureFile(repo, 'tasks.md'), TASKS_MD);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', 'Teste');
  git(repo, 'config', 'user.email', 'teste@example.com');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'inicial');
  const plano = run(process.execPath, [ENGINE, 'plano', FEATURE, '--agents', 'claude'], repo);
  assert.equal(plano.status, 0, plano.out);
  return repo;
}

function featureFile(repo, name) {
  return path.join(repo, '.spec', 'features', FEATURE, name);
}

// PATH com um `claude` falso na frente, que sai 0 sem fazer nada.
// PATH with a fake `claude` in front, which exits 0 doing nothing.
function envWithFakeClaude(root) {
  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'claude'), '#!/bin/sh\nexit 0\n');
  chmodSync(path.join(bin, 'claude'), 0o755);
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  return { ...process.env, [key]: `${bin}${path.delimiter}${process.env[key]}` };
}

test('o gate final do executor e o da feature: audit --ci --feature', () => {
  withTempDir('fspec-executor-', (root) => {
    const sh = readFileSync(featureFile(projectWithPlan(root), 'executar-tarefas.sh'), 'utf-8');
    assert.match(sh, /audit --ci --feature "\$FEATURE"/);
    const withoutFeature = sh.split('\n').filter((l) => /audit --ci/.test(l) && !/audit --ci --feature/.test(l));
    assert.deepEqual(withoutFeature, []);
  });
});

test('o executor nao cria spec/<feature>; as faixas continuam spec/<feature>-faixa-N', () => {
  withTempDir('fspec-executor-', (root) => {
    const sh = readFileSync(featureFile(projectWithPlan(root), 'executar-tarefas.sh'), 'utf-8');
    assert.doesNotMatch(sh, /checkout[^\n]*-b/);
    assert.doesNotMatch(sh, /spec\/demo(?!-faixa-)/);
    assert.match(sh, /spec\/demo-faixa-1/);
    assert.match(sh, /spec\/demo-faixa-2/);
  });
});

test('na main o executor recusa, pede a branch da issue e nao cria branch nem commit', () => {
  withTempDir('fspec-executor-', (root) => {
    const repo = projectWithPlan(root);
    const env = envWithFakeClaude(root);
    const branchesBefore = git(repo, 'branch', '--list');
    const mainBefore = git(repo, 'rev-parse', 'main');
    const proc = run('bash', [`.spec/features/${FEATURE}/executar-tarefas.sh`], repo, env);
    assert.notEqual(proc.status, 0, proc.out);
    assert.match(proc.out, /<tipo>\/<numero>-<descricao>/);
    assert.equal(git(repo, 'branch', '--list'), branchesBefore);
    assert.equal(git(repo, 'rev-parse', 'main'), mainBefore);
  });
});

test('plano.json nao fixa mais spec/<feature> como branch de trabalho', () => {
  withTempDir('fspec-executor-', (root) => {
    const plano = JSON.parse(readFileSync(featureFile(projectWithPlan(root), 'plano.json'), 'utf-8'));
    assert.notEqual(plano.branchTrabalho, 'spec/demo');
    assert.match(plano.branchTrabalho, /branch atual/);
  });
});

test('o painel le a branch de trabalho do evento branch|<nome>', () => {
  const comBranch = parseEventos('2026-11-08T10:00:00Z|inicio|demo\n2026-11-08T10:00:01Z|branch|feat/12-login-email\n');
  assert.equal(comBranch.branch, 'feat/12-login-email');
  assert.equal(parseEventos('2026-11-08T10:00:00Z|inicio|demo\n').branch, null);
});
