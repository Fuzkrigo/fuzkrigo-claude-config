// scaffold — o DoD nasce executável.
// Para cada AC sem teste anotado, gera um esqueleto de teste que FALHA
// até ser implementado. O título carrega @spec:AC-xxx; o corpo carrega
// o Dado/Quando/Então da spec como roteiro. Com o arquivo de testes já
// existente, acrescenta os esqueletos ao fim e nunca o reescreve.
// With the test file already in place, it appends the skeletons at the end
// and never rewrites it.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

function detectStyle(config) {
  const cmd = config.testCommand || '';
  if (cmd.includes('vitest')) return 'vitest';
  if (cmd.includes('jest')) return 'jest';
  if (cmd.includes('pytest')) return 'pytest';
  return 'node';
}

function jsHeader(style) {
  if (style === 'vitest') {
    return `import { test } from 'vitest';\n`;
  }
  if (style === 'jest') {
    return '';
  }
  return `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n`;
}

function jsFail(style, message) {
  if (style === 'vitest' || style === 'jest') {
    return `  throw new Error('${message}');`;
  }
  return `  assert.fail('${message}');`;
}

function renderJsTest(style, story, ac) {
  const lines = [];
  lines.push(`// ${story.id} — ${story.title}`);
  lines.push(`test('${ac.id}: ${ac.title.replace(/'/g, "\\'")} @spec:${ac.id}', () => {`);
  for (const g of ac.given) lines.push(`  // Dado: ${g}`);
  for (const w of ac.when) lines.push(`  // Quando: ${w}`);
  for (const t of ac.then) lines.push(`  // Então: ${t}`);
  lines.push(jsFail(style, `critério de aceite ${ac.id} ainda não provado — implemente este teste`));
  lines.push('});');
  return lines.join('\n');
}

function renderPyTest(story, ac) {
  const fn = ac.id.toLowerCase().replace(/-/g, '_');
  const lines = [];
  lines.push(`# ${story.id} — ${story.title}`);
  lines.push(`def test_${fn}():`);
  lines.push(`    """${ac.id}: ${ac.title} @spec:${ac.id}"""`);
  for (const g of ac.given) lines.push(`    # Dado: ${g}`);
  for (const w of ac.when) lines.push(`    # Quando: ${w}`);
  for (const t of ac.then) lines.push(`    # Então: ${t}`);
  lines.push(`    raise AssertionError("critério de aceite ${ac.id} ainda não provado — implemente este teste")`);
  return lines.join('\n');
}

// Critérios de aceite e princípios ainda sem teste anotado.
// Acceptance criteria and principles still without an annotated test.
function pendingItems(project, feature) {
  const testFileSet = new Set(project.testFiles);
  const tagged = new Set(
    project.annotations.specTags.filter((t) => testFileSet.has(t.file)).map((t) => t.acId)
  );
  const pending = [];
  for (const story of feature.spec.stories) {
    for (const ac of story.acs) {
      if (!tagged.has(ac.id)) pending.push({ story, ac });
    }
  }

  // princípios [DEVE]/[RECOMENDADO] com verificação(teste) sem tag ainda:
  // o esqueleto nasce junto — senão o gate exige um teste que nenhum passo cria
  const taggedPrinciples = new Set(
    project.annotations.principleTags.filter((t) => testFileSet.has(t.file)).map((t) => t.principleId)
  );
  const principles = [];
  for (const p of project.constitution?.principles || []) {
    for (const check of p.checks) {
      if (check.kind === 'teste' && !taggedPrinciples.has(check.principleTag)) {
        principles.push({ principle: p, tag: check.principleTag });
      }
    }
  }
  return { pending, principles };
}

// Cabeçalho e imports: só no arquivo novo. / Header and imports: new file only.
function fileHeader(style, featureName) {
  return style === 'pytest'
    ? `# Testes de spec da feature ${featureName} — gerados por fuzkrigo-spec scaffold\n\n`
    : `// Testes de spec da feature ${featureName} — gerados por fuzkrigo-spec scaffold\n${jsHeader(style)}\n`;
}

// Os esqueletos, separados por uma linha em branco.
// The skeletons, separated by a blank line.
function renderBody(style, { pending, principles }) {
  if (style === 'pytest') {
    return (
      pending.map(({ story, ac }) => renderPyTest(story, ac)).join('\n\n') +
      principles.map(({ principle, tag }) => `\n\n${renderPyPrinciple(principle, tag)}`).join('')
    );
  }
  return (
    pending.map(({ story, ac }) => renderJsTest(style, story, ac)).join('\n\n') +
    principles.map(({ principle, tag }) => `\n\n${renderJsPrinciple(style, principle, tag)}`).join('')
  );
}

export function scaffoldTests(project, featureName) {
  const { config } = project;
  const feature = project.features.find((f) => f.name === featureName);
  if (!feature?.spec) {
    throw new Error(`feature "${featureName}" não encontrada ou sem spec.md`);
  }

  const style = detectStyle(config);
  const fileName =
    style === 'pytest' ? `test_spec_${featureName.replace(/-/g, '_')}.py` : `${featureName}.spec.test.js`;
  const outDir = path.join(config.rootDir, style === 'pytest' ? 'tests' : 'test');
  const outPath = path.join(outDir, fileName);

  const items = pendingItems(project, feature);
  const total = items.pending.length + items.principles.length;
  if (total === 0) {
    return { file: null, pending: 0, message: 'todos os critérios de aceite (e princípios) já têm teste anotado' };
  }

  const body = renderBody(style, items);
  const appended = existsSync(outPath);
  if (appended) {
    // Nunca reescreve: só acrescenta ao fim, depois de uma linha em branco.
    // Never rewrites: only appends at the end, after a blank line.
    const separator = readFileSync(outPath, 'utf-8').endsWith('\n') ? '\n' : '\n\n';
    appendFileSync(outPath, `${separator}${body.replace(/^\n+/, '')}\n`);
  } else {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, `${fileHeader(style, featureName)}${body}\n`);
  }

  return {
    file: path.relative(config.rootDir, outPath),
    appended,
    pending: total,
    acIds: [...items.pending.map((p) => p.ac.id), ...items.principles.map((p) => p.tag)],
  };
}

// O que o CLI imprime depois do scaffold. / What the CLI prints after scaffold.
export function scaffoldSummary(result) {
  if (!result.file) return [result.message];
  const head = result.appended
    ? `✔ ${result.file} recebeu ${result.pending} esqueleto(s) no fim (falham até você implementar); o que já estava no arquivo ficou intacto`
    : `✔ ${result.file} criado com ${result.pending} teste(s)-esqueleto (todos FALHAM até você implementar)`;
  return [head, `  critérios cobertos: ${result.acIds.join(', ')}`];
}

function renderJsPrinciple(style, principle, tag) {
  const lines = [];
  lines.push(`// ${principle.id} [${principle.level}] — ${principle.title}`);
  lines.push(
    `test('${principle.id}: ${principle.title.replace(/'/g, "\\'")} @principle:${tag}', () => {`
  );
  lines.push(jsFail(style, `princípio ${principle.id} ainda não provado — implemente este teste`));
  lines.push('});');
  return lines.join('\n');
}

function renderPyPrinciple(principle, tag) {
  const fn = tag.toLowerCase().replace(/-/g, '_');
  const lines = [];
  lines.push(`# ${principle.id} [${principle.level}] — ${principle.title}`);
  lines.push(`def test_${fn}():`);
  lines.push(`    """${principle.id}: ${principle.title} @principle:${tag}"""`);
  lines.push(`    raise AssertionError("princípio ${principle.id} ainda não provado — implemente este teste")`);
  return lines.join('\n');
}
