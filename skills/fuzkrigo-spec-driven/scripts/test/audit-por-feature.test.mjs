// Testes do patch local: audit com escopo de feature.
// Rodar da pasta scripts/: node --test test/audit-por-feature.test.mjs
//
// O audit avalia o projeto inteiro. Isso quebra o Portao 1 do fluxo: criar a
// spec da proxima feature reprova o gate da anterior. O filtro --feature
// resolve, com duas regras que estes testes fixam:
//
//   1. achados de OUTRAS features somem;
//   2. achados que nao pertencem a feature nenhuma (constituicao, projeto
//      invalido) PERMANECEM — sao problemas do projeto, e esconde-los
//      transformaria o filtro num bypass.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { loadConfig } from '../lib/src/config.js';
import { loadProject } from '../lib/src/core/project.js';
import { auditProject } from '../lib/src/core/audit.js';

const SPEC = (feature, us, ac) => `# Spec: ${feature}

> feature: ${feature}
> status: em-implementacao

## Histórias

### US-${us} — História de ${feature}

Como usuário, quero algo, para ter um benefício.

#### AC-${ac} — Critério de ${feature}

- **Dado** um contexto
- **Quando** eu ajo
- **Então** vejo o resultado

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
`;

// Constituicao com glob que nao casa arquivo nenhum: gera um achado GLOBAL
// (GLOB_SEM_ARQUIVOS), que nao pertence a nenhuma feature.
const CONSTITUICAO = `# Constituição

## P-001 [RECOMENDADO] Segredo nunca em código

- verificação(proibido): \`senha\\s*=\` em \`inexistente/**\`
`;

function montarProjeto() {
  const raiz = mkdtempSync(path.join(tmpdir(), 'fspec-audit-'));
  mkdirSync(path.join(raiz, '.spec', 'features', 'alfa'), { recursive: true });
  mkdirSync(path.join(raiz, '.spec', 'features', 'beta'), { recursive: true });
  writeFileSync(path.join(raiz, '.spec', 'constituicao.md'), CONSTITUICAO);
  writeFileSync(path.join(raiz, '.spec', 'features', 'alfa', 'spec.md'), SPEC('alfa', '001', '001'));
  writeFileSync(path.join(raiz, '.spec', 'features', 'beta', 'spec.md'), SPEC('beta', '002', '002'));
  writeFileSync(
    path.join(raiz, 'onpspec.config.json'),
    JSON.stringify({ testCommand: 'echo', reporter: 'tap' }, null, 2)
  );
  return raiz;
}

function auditar(raiz, opcoes) {
  return auditProject(loadProject(loadConfig(raiz)), opcoes);
}

const codigosDaFeature = (audit, nome) =>
  audit.findings.filter((f) => f.feature === nome).map((f) => f.code);

test('sem filtro, os achados das duas features aparecem', () => {
  const raiz = montarProjeto();
  try {
    const audit = auditar(raiz, { ci: true });
    assert.ok(codigosDaFeature(audit, 'alfa').includes('AC_SEM_TESTE'));
    assert.ok(codigosDaFeature(audit, 'beta').includes('AC_SEM_TESTE'));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('com filtro, os achados da outra feature somem', () => {
  const raiz = montarProjeto();
  try {
    const audit = auditar(raiz, { ci: true, feature: 'alfa' });
    assert.ok(codigosDaFeature(audit, 'alfa').includes('AC_SEM_TESTE'));
    assert.deepEqual(codigosDaFeature(audit, 'beta'), []);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('com filtro, achado que nao e de feature nenhuma permanece', () => {
  const raiz = montarProjeto();
  try {
    const audit = auditar(raiz, { ci: true, feature: 'alfa' });
    const globais = audit.findings.filter((f) => !f.feature).map((f) => f.code);
    assert.ok(
      globais.includes('GLOB_SEM_ARQUIVOS'),
      `esperava o achado global da constituicao, veio: ${globais.join(', ')}`
    );
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('com filtro, as estatisticas passam a ser da feature', () => {
  const raiz = montarProjeto();
  try {
    const global = auditar(raiz, { ci: true });
    const filtrado = auditar(raiz, { ci: true, feature: 'alfa' });
    assert.equal(global.stats.features, 2);
    assert.equal(global.stats.acs, 2);
    assert.equal(filtrado.stats.features, 1);
    assert.equal(filtrado.stats.acs, 1);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('feature inexistente e recusada, nunca tratada como auditoria limpa', () => {
  const raiz = montarProjeto();
  try {
    assert.throws(
      () => auditar(raiz, { ci: true, feature: 'nao-existe' }),
      /nao-existe/,
      'um nome errado precisa falhar alto: filtrar tudo e sair 0 seria um gate falso'
    );
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('o filtro nao muda o veredito quando a feature alvo esta suja', () => {
  const raiz = montarProjeto();
  try {
    const filtrado = auditar(raiz, { ci: true, feature: 'alfa' });
    assert.equal(filtrado.ok, false);
    assert.equal(filtrado.exitCode, 1);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
