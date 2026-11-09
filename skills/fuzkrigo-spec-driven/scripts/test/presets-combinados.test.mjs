// Testes do patch local: presets de constituicao combinaveis no init. Rodar
// da pasta scripts/:
//   node --test test/presets-combinados.test.mjs
//
// Local patch tests: combinable constitution presets in init. Run from
// scripts/.
//
// O init aceitava um preset so. Um projeto de dados tabulares com o preset
// base precisava copiar principios a mao, e dois arquivos com P-001 gerariam
// ID_DUPLICADO. Agora `--preset a,b` monta uma constituicao unica: cabecalho
// com os presets e versoes, um marcador por preset seguinte, e os P-xxx
// renumerados em sequencia, inclusive nas etiquetas @principle. Com um preset
// so, o arquivo sai igual ao de hoje, byte a byte.
// init used to take a single preset. Now `--preset a,b` builds one
// constitution: a header naming presets and versions, a marker before each
// following preset, and P-xxx renumbered in sequence, @principle tags
// included. With a single preset, the file is today's, byte for byte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseConstitution } from '../lib/src/parsers/constitution.js';
import { ENGINE, findingsOf, runAudit, withTempDir } from './fixture-projeto.mjs';

const TEMPLATES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'templates');

function engine(root, ...args) {
  return spawnSync(process.execPath, [ENGINE, ...args], { cwd: root, encoding: 'utf-8' });
}

function template(name) {
  return readFileSync(path.join(TEMPLATES, `constituicao-${name}.md`));
}

function constitutionPath(root) {
  return path.join(root, '.spec', 'constituicao.md');
}

// Roda o init com os argumentos dados e devolve a constituicao gerada.
// Runs init with the given arguments and returns the generated constitution.
function initWith(root, ...args) {
  const proc = engine(root, 'init', ...args);
  assert.equal(proc.status, 0, `init saiu com ${proc.status}: ${proc.stderr}`);
  return { proc, content: readFileSync(constitutionPath(root)) };
}

const sequence = (n) => Array.from({ length: n }, (_, i) => `P-${String(i + 1).padStart(3, '0')}`);

// Cada principio com verificacao(teste) aponta para a propria etiqueta.
// Each principle with verificacao(teste) points to its own tag.
function assertTagsFollowIds(constitution) {
  for (const p of constitution.principles) {
    for (const check of p.checks.filter((c) => c.kind === 'teste')) {
      assert.equal(check.principleTag, p.id, `${p.id} "${p.title}" aponta para @principle:${check.principleTag}`);
    }
  }
}

test('init sem --preset gera a constituicao do preset base, byte a byte', () => {
  withTempDir('fspec-presets-', (root) => {
    assert.ok(initWith(root).content.equals(template('base')));
  });
});

test('init --preset lgpd-educacao gera o arquivo do preset, byte a byte', () => {
  withTempDir('fspec-presets-', (root) => {
    assert.ok(initWith(root, '--preset', 'lgpd-educacao').content.equals(template('lgpd-educacao')));
  });
});

test('init --preset dados-tabulares gera o preset novo sozinho, de P-001 em diante', () => {
  withTempDir('fspec-presets-', (root) => {
    const { content } = initWith(root, '--preset', 'dados-tabulares');
    assert.ok(content.equals(template('dados-tabulares')));
    const constitution = parseConstitution(content.toString('utf-8'));
    assert.deepEqual(constitution.principles.map((p) => p.id), sequence(6));
    assert.equal(constitution.principles[0].title, 'Identificador é texto, nunca número');
  });
});

test('init --preset base,dados-tabulares gera um arquivo so, renumerado e sem ID_DUPLICADO', () => {
  withTempDir('fspec-presets-', (root) => {
    const { proc, content } = initWith(root, '--preset', 'base,dados-tabulares');
    const text = content.toString('utf-8');
    assert.equal(text.split(/\r?\n/)[0], '# Constituição (presets: base v1.1.0, dados-tabulares v1.0.0)');
    assert.equal(text.match(/^# /gm).length, 1, 'um cabecalho so');
    assert.match(text, /<!-- preset: dados-tabulares -->/);
    assert.doesNotMatch(text, /<!-- preset: base -->/);
    const constitution = parseConstitution(text);
    assert.deepEqual(constitution.principles.map((p) => p.id), sequence(8));
    assert.equal(constitution.principles[2].title, 'Identificador é texto, nunca número');
    assertTagsFollowIds(constitution);
    assert.deepEqual([...text.matchAll(/@principle:(P-\d+)/g)].map((m) => m[1]), ['P-003', 'P-004', 'P-005', 'P-006']);
    assert.match(proc.stdout, /base, dados-tabulares/);
    assert.deepEqual(findingsOf(runAudit(root).report, 'ID_DUPLICADO'), []);
  });
});

test('init --preset base,lgpd-educacao continua a numeracao do base no lgpd-educacao', () => {
  withTempDir('fspec-presets-', (root) => {
    const text = initWith(root, '--preset', 'base,lgpd-educacao').content.toString('utf-8');
    const constitution = parseConstitution(text);
    assert.deepEqual(constitution.principles.map((p) => p.id), sequence(10));
    assert.equal(constitution.principles[2].title, 'Nota de um aluno nunca é exposta a outro aluno');
    assert.equal(constitution.principles[5].checks[0].kind, 'proibido');
    assertTagsFollowIds(constitution);
    assert.deepEqual(findingsOf(runAudit(root).report, 'ID_DUPLICADO'), []);
  });
});

test('preset desconhecido na lista sai 2, nao cria nada e lista os disponiveis', () => {
  withTempDir('fspec-presets-', (root) => {
    const proc = engine(root, 'init', '--preset', 'base,inexistente');
    assert.equal(proc.status, 2, proc.stdout);
    assert.deepEqual(readdirSync(root), []);
    assert.match(proc.stderr, /inexistente/);
    for (const name of ['base', 'dados-tabulares', 'lgpd-educacao']) assert.match(proc.stderr, new RegExp(name));
  });
});

test('preset repetido sai 2 e nao cria nada', () => {
  withTempDir('fspec-presets-', (root) => {
    const proc = engine(root, 'init', '--preset', 'base,base');
    assert.equal(proc.status, 2, proc.stdout);
    assert.deepEqual(readdirSync(root), []);
    assert.match(proc.stderr, /base/);
  });
});

test('constituicao existente e mantida mesmo com uma lista de presets', () => {
  withTempDir('fspec-presets-', (root) => {
    mkdirSync(path.join(root, '.spec'), { recursive: true });
    const original = Buffer.from('# Constituição — v9.9.9\n\n## P-001 [PODE] Do projeto\n', 'utf-8');
    writeFileSync(constitutionPath(root), original);
    assert.ok(initWith(root, '--preset', 'base,dados-tabulares').content.equals(original));
  });
});

test('scaffold depois de init --preset base,dados-tabulares usa as etiquetas renumeradas', () => {
  withTempDir('fspec-presets-', (root) => {
    initWith(root, '--preset', 'base,dados-tabulares');
    for (const args of [['new', 'demo'], ['scaffold', 'demo']]) {
      const proc = engine(root, ...args);
      assert.equal(proc.status, 0, proc.stderr);
    }
    const generated = readFileSync(path.join(root, 'test', 'demo.spec.test.js'), 'utf-8');
    const tags = [...generated.matchAll(/@principle:(P-\d+)/g)].map((m) => m[1]);
    assert.deepEqual(tags, ['P-003', 'P-004', 'P-005', 'P-006']);
  });
});
