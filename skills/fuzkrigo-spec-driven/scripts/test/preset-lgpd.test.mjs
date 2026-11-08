// Testes do patch local: preset LGPD que enxerga print e logging, nao so o
// console do JavaScript. Rodar da pasta scripts/:
//   node --test test/preset-lgpd.test.mjs
//
// Local patch tests: the LGPD preset sees print and logging, not only the
// JavaScript console. Run from scripts/.
//
// O P-004 ("dados pessoais nunca aparecem em logs") olhava so `src/**/*.js`
// e so `console.*`: num projeto Python, a verificacao nao via nada. Os casos
// usam o template real e o audit real, sobre arquivos Python e JS.
// P-004 used to look only at JS files and console.*; in a Python project the
// check saw nothing. The cases run the real template through the real audit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from '../lib/src/config.js';
import { loadProject } from '../lib/src/core/project.js';
import { auditProject } from '../lib/src/core/audit.js';

const TEMPLATE = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'templates', 'constituicao-lgpd-educacao.md'
);

const SOURCES = {
  'src/registro.py': 'def registrar(cpf):\n    print(f"cpf do aluno: {cpf}")\n',
  'src/servico.py': 'import logging\nlogger = logging.getLogger(__name__)\nlogger.info("email enviado para %s", email)\n',
  'src/rotas.js': 'export function rota(aluno) {\n  console.log(aluno.telefone);\n}\n',
  'src/limpo.py': 'import logging\nlogger = logging.getLogger("app.notas")\nprint("processamento concluido")\n',
};

function auditP004Files() {
  const root = mkdtempSync(path.join(tmpdir(), 'fspec-lgpd-'));
  try {
    mkdirSync(path.join(root, '.spec', 'features'), { recursive: true });
    writeFileSync(path.join(root, '.spec', 'constituicao.md'), readFileSync(TEMPLATE, 'utf-8'));
    for (const [rel, content] of Object.entries(SOURCES)) {
      mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      writeFileSync(path.join(root, rel), content);
    }
    const audit = auditProject(loadProject(loadConfig(root)), { ci: true });
    const hits = audit.findings.filter((f) => f.code === 'PRINCIPIO_VIOLADO' && f.principle === 'P-004');
    return new Set(hits.map((f) => f.file));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('P-004 acusa print e logging em Python e console em JS', () => {
  const files = auditP004Files();
  for (const expected of ['src/registro.py', 'src/servico.py', 'src/rotas.js']) {
    assert.ok(files.has(expected), `esperava violacao do P-004 em ${expected}, veio: ${[...files].join(', ')}`);
  }
});

test('P-004 nao acusa logger criado nem print sem dado pessoal', () => {
  // getLogger("app.notas") contem "nota", mas nao e chamada de log.
  // getLogger("app.notas") contains "nota", but it is not a log call.
  assert.ok(!auditP004Files().has('src/limpo.py'));
});
