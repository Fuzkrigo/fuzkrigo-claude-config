// Testes do patch local: o scaffold sempre acrescenta, nunca reescreve.
// Rodar da pasta scripts/:
//   node --test test/scaffold-acrescenta.test.mjs
//
// Local patch tests: scaffold always appends, never rewrites. Run from
// scripts/.
//
// Antes, com o arquivo de testes existente, o scaffold recusava, e o
// `--force` reescrevia o arquivo inteiro, apagando os testes escritos a mao.
// Agora ele acrescenta ao fim so os esqueletos dos criterios sem teste.
// Before, with the test file in place, scaffold refused, and `--force`
// rewrote the whole file, wiping hand-written tests. Now it appends only the
// skeletons of the criteria without a test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';

// Constituicao sem verificacao(teste): o scaffold so cuida dos criterios.
// Constitution without verificacao(teste): scaffold only handles the criteria.
const CONSTITUTION = `# Constituição

## P-001 [DEVE] Todo requisito tem prova executável

- verificação(gate): intrínseca ao audit
`;

const SPEC = `# Spec: demo

> feature: demo
> status: em-implementacao

## Histórias

### US-001 — Login por e-mail

Como usuário, quero entrar com e-mail, para acessar minha conta.

#### AC-001 — E-mail válido entra

- **Dado** um usuário cadastrado
- **Quando** ele entra com e-mail e senha corretos
- **Então** vê o painel

#### AC-002 — Senha errada é recusada

- **Dado** um usuário cadastrado
- **Quando** ele erra a senha
- **Então** vê a mensagem de erro

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
`;

const HAND_WRITTEN_JS = `// Testes da feature demo, escritos a mao
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('e-mail valido entra @spec:AC-001', () => {
  assert.equal(1 + 1, 2);
});
`;

// Sem quebra de linha no fim, de proposito: cobre o outro separador.
// No trailing newline, on purpose: covers the other separator.
const HAND_WRITTEN_PY = `# Testes da feature demo, escritos a mao
import pytest


def test_email_valido_entra():
    """E-mail valido entra @spec:AC-001"""
    assert 1 + 1 == 2`;

// O que o scaffold gera hoje num arquivo novo, byte a byte.
// What scaffold generates today in a new file, byte for byte.
const NEW_FILE_JS = `// Testes de spec da feature demo — gerados por fuzkrigo-spec scaffold
import { test } from 'node:test';
import assert from 'node:assert/strict';

// US-001 — Login por e-mail
test('AC-001: E-mail válido entra @spec:AC-001', () => {
  // Dado: um usuário cadastrado
  // Quando: ele entra com e-mail e senha corretos
  // Então: vê o painel
  assert.fail('critério de aceite AC-001 ainda não provado — implemente este teste');
});

// US-001 — Login por e-mail
test('AC-002: Senha errada é recusada @spec:AC-002', () => {
  // Dado: um usuário cadastrado
  // Quando: ele erra a senha
  // Então: vê a mensagem de erro
  assert.fail('critério de aceite AC-002 ainda não provado — implemente este teste');
});
`;

function write(root, rel, content) {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), content);
}

// Projeto com a feature demo (AC-001 e AC-002) e, se dado, o arquivo de
// testes ja existente.
// Project with the demo feature (AC-001 and AC-002) and, if given, the test
// file already in place.
function buildProject(root, testCommand, existing = null) {
  write(root, 'fuzkrigo.config.json', JSON.stringify({ testCommand }));
  write(root, '.spec/constituicao.md', CONSTITUTION);
  write(root, '.spec/features/demo/spec.md', SPEC);
  if (existing) write(root, existing.file, existing.content);
}

function scaffold(root, ...extra) {
  const proc = spawnSync(process.execPath, [ENGINE, 'scaffold', 'demo', ...extra], { cwd: root, encoding: 'utf-8' });
  return { status: proc.status, out: `${proc.stdout}${proc.stderr}` };
}

// O arquivo antigo fica intacto no inicio e o fim recebe so o esqueleto que
// faltava, depois de uma linha em branco.
// The old file stays intact at the start and the end gets only the missing
// skeleton, after a blank line.
function assertAppended(before, after, { newTag, oldTag }) {
  assert.ok(after.startsWith(before), 'o conteudo antigo mudou');
  const tail = after.slice(before.length);
  // Exatamente uma linha em branco entre o antigo e o novo, com ou sem quebra
  // de linha no fim do antigo. / Exactly one blank line between old and new.
  assert.match(after.slice(before.trimEnd().length), /^\n\n(?!\n)/);
  assert.match(tail, newTag);
  assert.doesNotMatch(tail, oldTag);
  assert.doesNotMatch(tail, /^import /m);
  assert.doesNotMatch(tail, /gerados por fuzkrigo-spec scaffold/);
}

const JS_FILE = 'test/demo.spec.test.js';
const PY_FILE = 'tests/test_spec_demo.py';

test('JS: arquivo existente recebe so o esqueleto do AC-002, sem tocar no que havia', () => {
  withTempDir('fspec-scaffold-', (root) => {
    buildProject(root, 'node --test', { file: JS_FILE, content: HAND_WRITTEN_JS });
    const proc = scaffold(root);
    assert.equal(proc.status, 0, proc.out);
    assertAppended(HAND_WRITTEN_JS, readFileSync(path.join(root, JS_FILE), 'utf-8'), {
      newTag: /@spec:AC-002/,
      oldTag: /@spec:AC-001/,
    });
    assert.match(proc.out, /recebeu 1 esqueleto/);
  });
});

test('Python: arquivo existente recebe so o esqueleto do AC-002, sem tocar no que havia', () => {
  withTempDir('fspec-scaffold-', (root) => {
    buildProject(root, 'python -m pytest', { file: PY_FILE, content: HAND_WRITTEN_PY });
    const proc = scaffold(root);
    assert.equal(proc.status, 0, proc.out);
    assertAppended(HAND_WRITTEN_PY, readFileSync(path.join(root, PY_FILE), 'utf-8'), {
      newTag: /def test_ac_002\(\):[\s\S]*@spec:AC-002/,
      oldTag: /@spec:AC-001|test_ac_001/,
    });
  });
});

test('JS com --force: acrescenta do mesmo jeito e avisa que o --force nao e mais necessario', () => {
  withTempDir('fspec-scaffold-', (root) => {
    buildProject(root, 'node --test', { file: JS_FILE, content: HAND_WRITTEN_JS });
    const proc = scaffold(root, '--force');
    assert.equal(proc.status, 0, proc.out);
    assertAppended(HAND_WRITTEN_JS, readFileSync(path.join(root, JS_FILE), 'utf-8'), {
      newTag: /@spec:AC-002/,
      oldTag: /@spec:AC-001/,
    });
    assert.match(proc.out, /--force não é mais necessário/);
  });
});

test('arquivo inexistente e criado como hoje: cabecalho, imports e esqueletos', () => {
  withTempDir('fspec-scaffold-', (root) => {
    buildProject(root, 'node --test');
    const proc = scaffold(root);
    assert.equal(proc.status, 0, proc.out);
    assert.equal(readFileSync(path.join(root, JS_FILE), 'utf-8'), NEW_FILE_JS);
    assert.match(proc.out, /criado/);
  });
});
