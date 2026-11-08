// Testes do patch local: mensagens e saida do motor. Rodar da pasta scripts/:
//   node --test test/saida-do-motor.test.mjs
//
// Local patch tests: engine messages and output. Run from scripts/.
//
// Tres pontas que o usuario enxerga: o `init --agents` orienta a instalacao
// conforme o agente (antes mandava o Antigravity copiar a skill do Claude), a
// instalacao da skill do Claude continua funcionando, e o plano gerado nao
// carrega emoji decorativo (a regra de estilo vale tambem para o que o motor
// escreve).
// Three visible ends: `init --agents` guidance per agent, the Claude skill
// install still works, and the generated plan has no decorative emoji.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ENGINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fuzkrigo-spec.mjs');

// Mesmas faixas do hook de estilo, menos os marcadores funcionais liberados.
// Same ranges as the style hook, minus the allowed functional markers.
const EMOJI_RANGES = [[0x1f300, 0x1faff], [0x2600, 0x27bf], [0x1f1e6, 0x1f1ff]];
const ALLOWED = new Set([0x2705, 0x26a0, 0x274c, 0xfe0f, 0x2713, 0x2714, 0x2717, 0x2718]);

const TASKS_MD = `# Tasks: Demo

> feature: demo

## T-001 — Primeira tarefa [pendente]

- Refs: US-001, AC-001
- Arquivos: src/a.js

## T-002 — Segunda tarefa [pendente]

- Refs: US-001, AC-001
- Arquivos: src/b.js
`;

function engine(root, args) {
  return spawnSync(process.execPath, [ENGINE, ...args], { cwd: root, encoding: 'utf-8' });
}

function withTempDir(fn) {
  const root = mkdtempSync(path.join(tmpdir(), 'fspec-saida-'));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('init --agents antigravity nao manda copiar a skill do Claude', () => {
  withTempDir((root) => {
    const proc = engine(root, ['init', '--agents', 'antigravity']);
    assert.equal(proc.status, 0, proc.stderr);
    assert.match(proc.stdout, /Antigravity/);
    assert.doesNotMatch(proc.stdout, /~\/\.claude\/skills\//);
  });
});

test('init --agents claude instala a skill dentro do projeto', () => {
  withTempDir((root) => {
    const proc = engine(root, ['init', '--agents', 'claude']);
    assert.equal(proc.status, 0, proc.stderr);
    assert.ok(existsSync(path.join(root, '.claude', 'skills', 'fuzkrigo-spec-driven', 'SKILL.md')));
  });
});

test('o plano gerado nao tem emoji decorativo', () => {
  withTempDir((root) => {
    assert.equal(engine(root, ['init']).status, 0);
    assert.equal(engine(root, ['new', 'demo']).status, 0);
    writeFileSync(path.join(root, '.spec', 'features', 'demo', 'tasks.md'), TASKS_MD);
    const proc = engine(root, ['plano', 'demo', '--agents', 'claude']);
    assert.equal(proc.status, 0, proc.stderr);
    const md = readFileSync(path.join(root, '.spec', 'features', 'demo', 'plano-execucao.md'), 'utf-8');
    const found = [...md].filter((ch) => {
      const cp = ch.codePointAt(0);
      return !ALLOWED.has(cp) && EMOJI_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
    });
    assert.deepEqual(found.map((ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase()}`), []);
  });
});
