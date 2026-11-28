// Testes do tamanho da SKILL.md: o corpo fica abaixo de 500 linhas, com o
// catálogo do audit e a prova em Python em references/. Rodar da pasta scripts/:
//   node --test test/skill-tamanho.test.mjs
//
// SKILL.md size tests: the body stays under 500 lines, with the audit catalog
// and the Python proof under references/. Run from scripts/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SKILL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts) => readFileSync(path.join(SKILL_DIR, ...parts), 'utf-8').replace(/\r\n/g, '\n');

// Arquivo novo, título e um trecho que prova que o conteúdo foi junto.
// New file, title and an excerpt proving the content moved along.
const MOVED = [
  { file: 'catalogo-audit.md', title: '# Catálogo de problemas que o audit aponta', excerpt: '(AC_SEM_TESTE)' },
  { file: 'prova-por-stack.md', title: '# Prova por stack — Python', excerpt: 'def test_ac_001():' },
];

test('a SKILL.md tem menos de 500 linhas', () => {
  const lines = read('SKILL.md').split('\n').length - 1;
  assert.ok(lines < 500, `SKILL.md com ${lines} linhas`);
});

test('o conteudo movido esta em references/, com o titulo, e a SKILL.md o cita', () => {
  const skill = read('SKILL.md');
  for (const { file, title, excerpt } of MOVED) {
    assert.ok(existsSync(path.join(SKILL_DIR, 'references', file)), `falta references/${file}`);
    const reference = read('references', file);
    assert.equal(reference.split('\n')[0], title);
    assert.ok(reference.includes(excerpt), `${file} sem "${excerpt}"`);
    assert.ok(skill.includes(`](references/${file})`), `SKILL.md não cita references/${file}`);
    assert.equal(skill.includes(excerpt), false, `"${excerpt}" ainda está na SKILL.md`);
  }
});
