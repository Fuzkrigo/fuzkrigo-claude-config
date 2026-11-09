// Testes do patch local: a spec registra casos de borda e regras de
// fechamento. Rodar da pasta scripts/:
//   node --test test/bordas-e-fechamento.test.mjs
//
// Local patch tests: the spec records edge cases and closing rules. Run from
// scripts/.
//
// A regra "caso de borda vira criterio de aceite" existia so como instrucao:
// o audit saia 0 com uma spec que so tinha o caminho feliz. A secao
// "## Casos de borda e regras de fechamento" registra a decisao de cada borda
// (AC, ASM ou "Nao se aplica: motivo") e cada total que precisa fechar, com
// tolerancia e dois criterios: um prova que fecha, outro prova que o programa
// para quando nao fecha. A falta da secao segue o SECAO_AUSENTE de hoje.
// The "edge case becomes an acceptance criterion" rule was only an
// instruction: audit exited 0 on a happy-path-only spec. The new section
// records the decision for each edge case and each total that must close,
// with a tolerance and two criteria (it closes; the program stops when it
// does not). A missing section follows today's SECAO_AUSENTE rule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { ENGINE, findingsOf, runAudit, withTempDir } from './fixture-projeto.mjs';

const NEW_CODES = ['BORDA_INCOMPLETA', 'FECHAMENTO_INCOMPLETO', 'REF_SPEC_INEXISTENTE'];

const VALID_SECTION = `## Casos de borda e regras de fechamento

### Casos de borda

| Categoria | Situação | Decisão |
|---|---|---|
| Identificador | Número da nota com e sem zeros à esquerda | AC-001 |
| Unidade | Alíquota gravada como 18 ou como 0,18 | AC-002 |
| Volume | Base com 200 mil linhas | Não se aplica: a base mensal tem até 5 mil linhas |
| Tempo | Nota de dezembro lançada em janeiro | ASM-001 |

### Regras de fechamento

| Regra | Tolerância | Prova de que fecha | Prova de que para |
|---|---|---|---|
| Percentual de saídas do ICMS efetivo soma 100% | ±0,01 p.p. | AC-003 | AC-004 |

`;

const ACS = [
  ['AC-001', 'Nota com zeros à esquerda é reconhecida'],
  ['AC-002', 'Alíquota em qualquer forma aceita chega igual ao cálculo'],
  ['AC-003', 'Percentuais de saída somam 100%'],
  ['AC-004', 'Soma fora da tolerância para o processamento'],
];

function acBlock([id, title]) {
  return `#### ${id} — ${title}\n\n- **Dado** uma base de notas\n- **Quando** eu processo\n- **Então** vejo o resultado\n\n`;
}

// Spec de uma feature com quatro criterios e uma suposicao; `section` entra
// entre "Fora de escopo" e "Suposicoes", como no modelo.
// One-feature spec with four criteria and one assumption; `section` goes
// between "Fora de escopo" and "Suposicoes", as in the template.
function specText({ status = 'rascunho', section = VALID_SECTION, feature = 'demo', acs = ACS, asm = 'ASM-001', us = 'US-001' } = {}) {
  return `# Spec: ${feature}\n\n> feature: ${feature}\n> status: ${status}\n\n## Histórias\n\n` +
    `### ${us} — Apurar ICMS efetivo\n\nComo analista, quero apurar o ICMS, para fechar o mês.\n\n` +
    acs.map(acBlock).join('') +
    `## Fora de escopo\n\n- Notas de entrada.\n\n${section}` +
    `## Suposições\n\n| ID | Suposição | Status | Resolução |\n|---|---|---|---|\n` +
    `| ${asm} | A base vem do ERP | aberta | — |\n\n## Perguntas em aberto\n\nNenhuma.\n`;
}

function write(root, rel, content) {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), content);
}

// Projeto com as specs dadas e um teste anotado para cada criterio: assim o
// unico erro possivel e o que o caso provoca.
// Project with the given specs and one tagged test per criterion, so the only
// possible error is the one the case provokes.
function buildSpecs(root, specs) {
  write(root, 'fuzkrigo.config.json', '{"testCommand":"node --test --test-reporter=tap","reporter":"tap"}\n');
  const tags = [];
  for (const [name, content] of Object.entries(specs)) {
    write(root, `.spec/features/${name}/spec.md`, content);
    tags.push(...[...content.matchAll(/^#### (AC-\d{3,})/gm)].map((m) => m[1]));
  }
  const tests = tags.map((id) => `test('@spec:${id} criterio', () => {});\n`).join('');
  write(root, 'test/demo.test.js', `import { test } from 'node:test';\n${tests}`);
}

function auditSpec(spec, ...args) {
  return withTempDir('fspec-bordas-', (root) => {
    buildSpecs(root, { demo: spec });
    return runAudit(root, ...args);
  });
}

function newFindings(report) {
  return report.findings.filter(
    (f) => NEW_CODES.includes(f.code) || (f.code === 'SECAO_AUSENTE' && /Casos de borda/.test(f.message))
  );
}

const errorsOf = (report) => report.findings.filter((f) => f.severity === 'erro');

test('spec rascunho sem a secao gera SECAO_AUSENTE de aviso citando a secao', () => {
  const { report } = auditSpec(specText({ section: '' }));
  const found = findingsOf(report, 'SECAO_AUSENTE');
  assert.equal(found.length, 1, JSON.stringify(report.findings));
  assert.equal(found[0].severity, 'aviso');
  assert.match(found[0].message, /Casos de borda e regras de fechamento/);
});

test('spec pronta sem a secao gera SECAO_AUSENTE de erro e o audit sai 1', () => {
  const { status, report } = auditSpec(specText({ status: 'pronta', section: '' }));
  assert.deepEqual(errorsOf(report).map((f) => f.code), ['SECAO_AUSENTE']);
  assert.match(errorsOf(report)[0].message, /Casos de borda e regras de fechamento/);
  assert.equal(status, 1);
});

test('secao completa e valida nao gera achado novo e a spec pronta audita limpa', () => {
  const { status, report } = auditSpec(specText({ status: 'pronta' }));
  assert.deepEqual(newFindings(report), []);
  assert.deepEqual(errorsOf(report), []);
  assert.equal(status, 0);
});

test('linha de borda com decisao vazia gera BORDA_INCOMPLETA de aviso no rascunho', () => {
  const { report } = auditSpec(specText({ section: VALID_SECTION.replace('| AC-002 |', '|  |') }));
  const found = findingsOf(report, 'BORDA_INCOMPLETA');
  assert.equal(found.length, 1, JSON.stringify(report.findings));
  assert.equal(found[0].severity, 'aviso');
  assert.equal(found[0].feature, 'demo');
  assert.ok(found[0].line > 0, 'o achado aponta a linha da borda');
});

test('linha de borda com decisao vazia gera BORDA_INCOMPLETA de erro na spec pronta', () => {
  const { status, report } = auditSpec(
    specText({ status: 'pronta', section: VALID_SECTION.replace('| AC-002 |', '|  |') })
  );
  assert.deepEqual(findingsOf(report, 'BORDA_INCOMPLETA').map((f) => f.severity), ['erro']);
  assert.equal(status, 1);
});

test('"Nao se aplica:" sem motivo gera BORDA_INCOMPLETA', () => {
  const section = VALID_SECTION.replace('Não se aplica: a base mensal tem até 5 mil linhas', 'Não se aplica:');
  const { report } = auditSpec(specText({ section }));
  assert.equal(findingsOf(report, 'BORDA_INCOMPLETA').length, 1, JSON.stringify(report.findings));
});

test('subsecao de casos de borda sem nenhuma linha gera BORDA_INCOMPLETA', () => {
  const section = VALID_SECTION.replace(/\| Identificador[^\n]*\n\| Unidade[^\n]*\n\| Volume[^\n]*\n\| Tempo[^\n]*\n/, '');
  assert.doesNotMatch(section, /Identificador/);
  const { report } = auditSpec(specText({ section }));
  assert.equal(findingsOf(report, 'BORDA_INCOMPLETA').length, 1, JSON.stringify(report.findings));
});

test('decisao que cita AC inexistente gera REF_SPEC_INEXISTENTE de erro mesmo no rascunho', () => {
  const { status, report } = auditSpec(specText({ section: VALID_SECTION.replace('| AC-002 |', '| AC-099 |') }));
  const found = findingsOf(report, 'REF_SPEC_INEXISTENTE');
  assert.equal(found.length, 1, JSON.stringify(report.findings));
  assert.equal(found[0].severity, 'erro');
  assert.match(found[0].message, /AC-099/);
  assert.equal(status, 1);
});

test('decisao que cita AC de outra spec gera REF_SPEC_INEXISTENTE de erro', () => {
  withTempDir('fspec-bordas-', (root) => {
    buildSpecs(root, {
      demo: specText({ section: VALID_SECTION.replace('| AC-002 |', '| AC-005 |') }),
      outra: specText({ feature: 'outra', us: 'US-002', asm: 'ASM-002', acs: [['AC-005', 'Critério de outra feature']], section: '' }),
    });
    const found = findingsOf(runAudit(root).report, 'REF_SPEC_INEXISTENTE');
    assert.deepEqual(found.map((f) => [f.feature, f.severity]), [['demo', 'erro']]);
    assert.match(found[0].message, /AC-005/);
  });
});

test('regra de fechamento sem tolerancia gera FECHAMENTO_INCOMPLETO', () => {
  const { report } = auditSpec(specText({ section: VALID_SECTION.replace('±0,01 p.p.', '') }));
  const found = findingsOf(report, 'FECHAMENTO_INCOMPLETO');
  assert.equal(found.length, 1, JSON.stringify(report.findings));
  assert.equal(found[0].severity, 'aviso');
});

test('regra de fechamento com o mesmo AC nas duas colunas gera FECHAMENTO_INCOMPLETO', () => {
  const { report } = auditSpec(specText({ status: 'pronta', section: VALID_SECTION.replace('| AC-004 |', '| AC-003 |') }));
  assert.deepEqual(findingsOf(report, 'FECHAMENTO_INCOMPLETO').map((f) => f.severity), ['erro']);
});

test('regra de fechamento que cita AC inexistente gera REF_SPEC_INEXISTENTE', () => {
  const { report } = auditSpec(specText({ section: VALID_SECTION.replace('| AC-004 |', '| AC-098 |') }));
  const found = findingsOf(report, 'REF_SPEC_INEXISTENTE');
  assert.equal(found.length, 1, JSON.stringify(report.findings));
  assert.match(found[0].message, /AC-098/);
});

test('subsecao de fechamento com "Nenhuma." nao gera achado novo', () => {
  const section = VALID_SECTION.replace(/\| Regra \|[\s\S]*?\| AC-004 \|\n/, 'Nenhuma.\n');
  assert.doesNotMatch(section, /Prova de que fecha/);
  const { status, report } = auditSpec(specText({ status: 'pronta', section }));
  assert.deepEqual(newFindings(report), []);
  assert.equal(status, 0);
});

test('nomes da secao comparados sem acento e sem caixa, e "nao se aplica" tambem', () => {
  const section = VALID_SECTION.replace('## Casos de borda e regras de fechamento', '## CASOS DE BORDA E REGRAS DE FECHAMENTO')
    .replace('### Casos de borda', '### casos de borda')
    .replace('### Regras de fechamento', '### Regras de Fechamento (totais)')
    .replace('Não se aplica: a base', 'nao se aplica: a base');
  const { status, report } = auditSpec(specText({ status: 'pronta', section }));
  assert.deepEqual(newFindings(report), []);
  assert.equal(status, 0);
});

test('achados da secao pertencem a feature e saem com o --feature de outra', () => {
  withTempDir('fspec-bordas-', (root) => {
    buildSpecs(root, {
      alfa: specText({ feature: 'alfa', status: 'pronta', section: '' }),
      beta: specText({ feature: 'beta', status: 'pronta', us: 'US-002', asm: 'ASM-002',
        acs: ACS.map(([id, t]) => [id.replace('AC-00', 'AC-01'), t]),
        section: VALID_SECTION.replace(/AC-00(\d)/g, 'AC-01$1').replace('ASM-001', 'ASM-002') }),
    });
    const all = runAudit(root);
    assert.deepEqual(findingsOf(all.report, 'SECAO_AUSENTE').map((f) => f.feature), ['alfa']);
    const filtered = runAudit(root, '--feature', 'beta');
    assert.deepEqual(newFindings(filtered.report), []);
    assert.equal(filtered.status, 0, JSON.stringify(filtered.report.findings));
  });
});

test('new cria a spec com a secao e as linhas de exemplo, e o rascunho so da aviso novo', () => {
  withTempDir('fspec-bordas-', (root) => {
    for (const args of [['init'], ['new', 'demo']]) {
      const proc = spawnSync(process.execPath, [ENGINE, ...args], { cwd: root, encoding: 'utf-8' });
      assert.equal(proc.status, 0, proc.stderr);
    }
    const spec = readFileSync(path.join(root, '.spec', 'features', 'demo', 'spec.md'), 'utf-8');
    const lines = spec.split(/\r?\n/);
    const order = ['## Fora de escopo', '## Casos de borda e regras de fechamento', '### Casos de borda',
      '### Regras de fechamento', '## Suposições'].map((h) => lines.indexOf(h));
    assert.ok(order.every((n, i) => n > (order[i - 1] ?? 0)), `secao fora do lugar: ${order.join(', ')}`);
    assert.match(spec, /casos-de-borda\.md/);
    const found = newFindings(runAudit(root).report);
    assert.ok(findingsOf({ findings: found }, 'BORDA_INCOMPLETA').length > 0, 'a linha de exemplo da borda e pendencia');
    assert.ok(findingsOf({ findings: found }, 'FECHAMENTO_INCOMPLETO').length > 0, 'a linha de exemplo do fechamento e pendencia');
    assert.deepEqual(found.filter((f) => f.severity !== 'aviso'), []);
  });
});
