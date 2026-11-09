// Fixture compartilhada pelas suites do audit: um projeto limpo, com uma
// constituicao de um principio [DEVE] verificado por teste, e provas escritas
// a mao no formato que o `verify` grava. Nao e uma suite (sem .test.).
// Shared fixture for the audit suites: a clean project, with a constitution
// holding one [DEVE] principle checked by a test, and hand-written proofs in
// the format `verify` records. Not a suite (no .test. in the name).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const ENGINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fuzkrigo-spec.mjs');

const CONSTITUTION = `# Constituição

## P-001 [DEVE] Nota nunca fica negativa

- verificação(teste): @principle:P-001
`;

// Roda o teste numa pasta temporaria vazia e a apaga no fim.
// Runs the test in an empty temporary folder and removes it afterwards.
export function withTempDir(prefix, fn) {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, rel, content) {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), content);
}

// A secao de casos de borda e obrigatoria de `pronta` em diante: a spec da
// fixture a traz completa, para o audit dela continuar limpo.
// The edge case section is required from `pronta` on: the fixture spec
// carries it complete, so its audit stays clean.
function edgeSectionFor(n) {
  return `## Casos de borda e regras de fechamento\n\n### Casos de borda\n\n` +
    `| Categoria | Situação | Decisão |\n|---|---|---|\n| Limites | Nota no limite da escala | AC-00${n} |\n\n` +
    `### Regras de fechamento\n\nNenhuma.\n\n`;
}

function specFor(name, n) {
  return `# Spec: ${name}\n\n> feature: ${name}\n> status: em-implementacao\n\n## Histórias\n\n` +
    `### US-00${n} — História de ${name}\n\nComo usuário, quero algo, para ter um benefício.\n\n` +
    `#### AC-00${n} — Critério de ${name}\n\n- **Dado** um contexto\n- **Quando** eu ajo\n` +
    `- **Então** vejo o resultado\n\n${edgeSectionFor(n)}## Suposições\n\nNenhuma.\n\n## Perguntas em aberto\n\nNenhuma.\n`;
}

function tasksFor(name, n, taskIds) {
  const tasks = taskIds.map((id) =>
    `## ${id} — Implementar ${name} [concluida]\n\n- Refs: US-00${n}, AC-00${n}\n- Arquivos: test/${name}.test.js\n`
  );
  return `# Tasks: ${name}\n\n> feature: ${name}\n\n${tasks.join('\n')}`;
}

// Prova no formato do verify. principle: 'pass' | 'fail' | 'skip' | null.
// Proof in the verify format. principle: 'pass' | 'fail' | 'skip' | null.
function proofFor(name, n, { timestamp, principle }) {
  const principles = principle ? { 'P-001': { status: principle, testName: '@principle:P-001 nota' } } : {};
  return JSON.stringify({
    feature: name,
    timestamp,
    results: { [`AC-00${n}`]: { status: 'pass', testName: `@spec:AC-00${n} criterio` } },
    principles,
  });
}

// features: [{ name, tasks: ['T-001'], proof: { timestamp, principle } | null }]
// O teste do principio fica no arquivo da primeira feature.
// The principle test lives in the first feature's file.
export function buildProject(root, features) {
  write(root, 'fuzkrigo.config.json', '{"testCommand":"node --test --test-reporter=tap","reporter":"tap"}\n');
  write(root, '.spec/constituicao.md', CONSTITUTION);
  features.forEach(({ name, tasks = [], proof = null }, i) => {
    const n = i + 1;
    write(root, `.spec/features/${name}/spec.md`, specFor(name, n));
    write(root, `.spec/features/${name}/tasks.md`, tasksFor(name, n, tasks));
    const principleTest = i === 0 ? "test('@principle:P-001 nota', () => {});\n" : '';
    write(root, `test/${name}.test.js`, `import { test } from 'node:test';\ntest('@spec:AC-00${n} criterio', () => {});\n${principleTest}`);
    if (proof) write(root, `.spec/verification/${name}.json`, proofFor(name, n, proof));
  });
}

// Roda o audit com --json e devolve { status, report }. A saida termina com
// uma linha de texto depois do JSON, que e descartada.
// Runs audit with --json and returns { status, report }. The output ends with
// a text line after the JSON, which is dropped.
export function runAudit(root, ...args) {
  const proc = spawnSync(process.execPath, [ENGINE, 'audit', '--json', ...args], { cwd: root, encoding: 'utf-8' });
  const json = proc.stdout.slice(0, proc.stdout.lastIndexOf('}') + 1);
  return { status: proc.status, report: JSON.parse(json), stderr: proc.stderr };
}

export function findingsOf(report, code) {
  return report.findings.filter((f) => f.code === code);
}
