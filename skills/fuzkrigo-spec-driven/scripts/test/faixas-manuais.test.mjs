// Testes do ciclo das faixas manuais: o que acontece entre o script sair com 2 e
// o gate, quando o Arquiteto integra o trabalho dos executores externos. Rodar
// da pasta scripts/, no Git Bash:
//   node --test test/faixas-manuais.test.mjs
//
// Manual lane cycle tests: what happens between the script exiting 2 and the
// gate, while the Architect integrates the external executors' work. Run from
// scripts/, in Git Bash.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { runInNewContext } from 'vm';
import { parseEventos, renderPainelHtml } from '../lib/src/core/painel.js';
import { withTempDir } from './fixture-projeto.mjs';
import {
  CLAUDE_AND_CODEX,
  eventsOf,
  executorCommits,
  fakeClaude,
  FEATURE,
  generatePlan,
  git,
  plannedProject,
  projectWith,
  readFeature,
  run,
  runScript,
  taskCommit,
  worktreeOf,
  writeFiles,
} from './fixture-faixas.mjs';

const WITH_SEQUENTIAL = [...CLAUDE_AND_CODEX, { id: 'T-003', model: 'sonnet' }];
const CODEX_ONLY = [{ id: 'T-001', model: 'codex', file: 'src/a.js' }];

// Blocos bash da integracao, na ordem em que o .md os apresenta.
// The integration bash blocks, in the order the .md presents them.
function integrationBlocks(repo) {
  const md = readFeature(repo, 'plano-execucao.md');
  const start = md.indexOf('### Integração');
  assert.ok(start >= 0, `sem subseção de integração:\n${md}`);
  return [...md.slice(start).matchAll(/```bash\n([\s\S]*?)\n```/g)].map((m) => m[1]);
}

// Roda os blocos como estao escritos, na raiz do repositorio.
// Runs the blocks exactly as written, at the repository root.
const integrate = (repo, env) => run('bash', ['-c', integrationBlocks(repo).join('\n')], repo, env);

// Roda o script e exige a pendencia manual, pre-condicao da integracao.
// Runs the script and requires the manual pending exit, the integration precondition.
function runUntilManual(repo, env) {
  const proc = runScript(repo, env);
  assert.equal(proc.status, 2, proc.out);
}

const branches = (repo) => git(repo, 'branch', '--format=%(refname:short)').split('\n');

function assertIntegrated(root, repo, lane) {
  assert.match(git(repo, 'log', '--format=%s'), new RegExp(`merge ${lane}`));
  assert.equal(existsSync(worktreeOf(root, lane)), false);
  assert.equal(branches(repo).includes(`spec/demo-${lane}`), false);
}

// ── tarefas sequenciais / sequential tasks ─────────────────────────────────

test('com faixa manual as tarefas sem Arquivos: esperam a integracao', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, WITH_SEQUENTIAL);
    const claude = fakeClaude(root);
    const proc = runScript(repo, claude.env);
    assert.equal(proc.status, 2, proc.out);
    assert.equal(claude.calls().match(/^CALL$/gm)?.length, 1, claude.calls());
    assert.doesNotMatch(claude.calls(), /T-003/);
    assert.deepEqual(eventsOf(root).filter((e) => e.startsWith('seq|')), []);
    assert.match(readFeature(repo, 'tasks.md'), /T-003 .*\[pendente\]/);
    assert.match(proc.out, /sequenciais pendentes[^\n]*T-003/);
  });
});

test('a integracao do .md, executada como esta, roda as sequenciais e o gate depois das faixas', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, WITH_SEQUENTIAL);
    const claude = fakeClaude(root);
    runUntilManual(repo, claude.env);
    executorCommits(root, 'faixa-2', writeFiles('src/b.js'), taskCommit('T-002'));
    const proc = integrate(repo, claude.env);

    assertIntegrated(root, repo, 'faixa-2');
    assert.match(claude.calls(), /T-003/, proc.out);
    const events = eventsOf(root);
    assert.ok(events.includes('seq|T-003|concluida'), proc.out);
    assert.ok(events.includes('gate|inicio'), proc.out);
    const tasks = readFeature(repo, 'tasks.md');
    for (const id of ['T-001', 'T-002', 'T-003']) assert.match(tasks, new RegExp(`${id} .*\\[concluida\\]`));
  });
});

test('sem sequenciais a integracao termina no gate e deixa a arvore limpa', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, CODEX_ONLY);
    const claude = fakeClaude(root);
    runUntilManual(repo, claude.env);
    executorCommits(root, 'faixa-1', writeFiles('src/a.js'), taskCommit('T-001'));
    const proc = integrate(repo, claude.env);

    assertIntegrated(root, repo, 'faixa-1');
    assert.ok(existsSync(path.join(repo, '.spec', 'verification', `${FEATURE}.json`)), proc.out);
    assert.match(readFeature(repo, 'tasks.md'), /T-001 .*\[concluida\]/);
    assert.equal(git(repo, 'status', '--porcelain'), '', proc.out);
  });
});

// ── juiz mecanico / mechanical judge ───────────────────────────────────────

const CODEX_AND_AGY = [
  { id: 'T-001', model: 'codex', file: 'src/a.js' },
  { id: 'T-002', model: 'agy', file: 'src/b.js' },
];

const JUDGE_TITLE =
  '**1. Confira cada faixa:** o comando reprova arquivo fora da lista; os testes rodam no worktree. Reprovou: não mescle.';

// Troca o caminho do motor por MOTOR, com ou sem aspas.
// Replaces the engine path with MOTOR, quoted or not.
const withoutEnginePath = (block) => block.replace(/node (?:'[^']*'|\S+)/g, 'node MOTOR');

const laneDir = (lane) => `../fuzkrigo-worktrees/repo-demo-${lane}`;

test('o juiz tem um conferir e os testes por faixa, e cada merge comeca por ele', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, CODEX_AND_AGY);
    assert.ok(readFeature(repo, 'plano-execucao.md').includes(JUDGE_TITLE));
    const [judge, ...merges] = integrationBlocks(repo).map(withoutEnginePath);
    const lanes = ['faixa-1', 'faixa-2'];
    assert.deepEqual(
      judge.split('\n'),
      lanes.flatMap((lane) => [
        `node MOTOR conferir demo ${lane}`,
        `(cd ${laneDir(lane)} && node --test --test-reporter=tap)`,
      ])
    );
    lanes.forEach((lane, i) => {
      const start = `node MOTOR conferir demo ${lane} &&\n  git merge --no-ff spec/demo-${lane} `;
      assert.ok(merges[i].startsWith(start), merges[i]);
    });
    assert.doesNotMatch(readFeature(repo, 'plano-execucao.md'), /git diff/);
  });
});

test('sem testCommand a linha dos testes vira comentario', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = projectWith(root, CODEX_ONLY);
    const config = path.join(repo, 'fuzkrigo.config.json');
    const raw = JSON.parse(readFileSync(config, 'utf-8'));
    writeFileSync(config, JSON.stringify({ ...raw, testCommand: null }));
    git(repo, 'commit', '-q', '-am', 'sem testCommand');
    assert.equal(generatePlan(repo).status, 0);
    const [judge] = integrationBlocks(repo).map(withoutEnginePath);
    assert.deepEqual(judge.split('\n'), [
      'node MOTOR conferir demo faixa-1',
      `# rode os testes do projeto no worktree ${laneDir('faixa-1')}`,
    ]);
  });
});

test('colar a integracao nao mescla faixa reprovada', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, CODEX_ONLY);
    const claude = fakeClaude(root);
    runUntilManual(repo, claude.env);
    executorCommits(root, 'faixa-1', writeFiles('src/a.js', 'src/outside.js'), taskCommit('T-001'));
    const proc = integrate(repo, claude.env);

    assert.ok(proc.out.includes('fora da lista: src/outside.js'), proc.out);
    assert.doesNotMatch(git(repo, 'log', '--format=%s'), /merge faixa-1/);
    assert.ok(existsSync(worktreeOf(root, 'faixa-1')), proc.out);
    assert.ok(branches(repo).includes('spec/demo-faixa-1'));
    assert.match(readFeature(repo, 'tasks.md'), /T-001 .*\[pendente\]/);
  });
});

// ── estado entre execucoes / state between runs ────────────────────────────

test('o script recusa recomecar com branch de faixa ainda por integrar', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, CLAUDE_AND_CODEX);
    const claude = fakeClaude(root);
    runUntilManual(repo, claude.env);
    // regenerado, o codex passa de faixa-2 a faixa-1 / the codex lane is renumbered
    assert.equal(generatePlan(repo).status, 0);
    const head = git(repo, 'rev-parse', 'HEAD');

    const proc = runScript(repo, claude.env);
    assert.equal(proc.status, 1, proc.out);
    assert.match(proc.out, /spec\/demo-faixa-2[^\n]*integre ou remova/);
    assert.equal(existsSync(worktreeOf(root, 'faixa-1')), false);
    assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
    assert.match(readFeature(repo, 'plano-execucao.md'), /Não regenere o plano/);
  });
});

// O que o claude fez entra no commit; a faixa manual continua pendente.
// What claude did is committed; the manual lane stays pending.
function assertStatusCommitted(repo) {
  assert.equal(git(repo, 'status', '--porcelain'), '');
  const tasks = git(repo, 'show', `HEAD:.spec/features/${FEATURE}/tasks.md`);
  assert.match(tasks, /T-001 .*\[concluida\]/);
  assert.match(tasks, /T-002 .*\[pendente\]/);
}

test('ao sair 2 o script commita o status das tarefas', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, CLAUDE_AND_CODEX);
    const proc = runScript(repo, fakeClaude(root).env);
    assert.equal(proc.status, 2, proc.out);
    assertStatusCommitted(repo);
  });
});

test('ao sair 1 com faixa manual o script tambem commita o status das tarefas', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, [...CLAUDE_AND_CODEX, { id: 'T-003', model: 'sonnet', file: 'src/c.js' }]);
    const proc = runScript(repo, fakeClaude(root, 7, { failOn: 'T-003' }).env);
    assert.equal(proc.status, 1, proc.out);
    assertStatusCommitted(repo);
  });
});

// ── textos e painel / texts and panel ──────────────────────────────────────

// Roda o script da pagina com um documento de mentira e desenha o estado.
// Runs the page script against a stub document and renders the state.
function renderPanel(eventLog) {
  const html = renderPainelHtml({ feature: FEATURE, token: 't', podeExecutar: true });
  const source = html.slice(html.indexOf('<script>') + '<script>'.length, html.indexOf('</script>'));
  const elements = {};
  const element = () => ({ textContent: '', className: '', innerHTML: '', disabled: false });
  const context = {
    document: {
      getElementById: (id) => (elements[id] ??= element()),
      querySelectorAll: () => [],
    },
    fetch: () => new Promise(() => {}),
    setInterval: () => 0,
  };
  const render = runInNewContext(`${source}; render;`, context);
  render({
    plan: { avisos: [], ondas: [], faixas: [], sequenciais: [] },
    execucao: parseEventos(eventLog),
    rodando: false,
    tasksMd: {},
    logs: {},
    provas: null,
    atualizado: '2026-11-27T10:00:00Z',
  });
  return elements;
}

test('com fim|2 o painel aguarda as faixas manuais, sem oferecer reexecucao', () => {
  const page = renderPanel('2026-11-27T10:00:00Z|inicio|demo\n2026-11-27T10:00:01Z|fim|2\n');
  assert.equal(page.fase.textContent, 'aguardando faixas manuais');
  assert.doesNotMatch(page['btn-nota'].textContent, /reexecutar/);
});

test('com faixa manual o .md e o .html nao dizem que toda faixa roda claude -p', () => {
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, CLAUDE_AND_CODEX);
    const md = readFeature(repo, 'plano-execucao.md');
    const html = readFeature(repo, 'plano-execucao.html');
    assert.doesNotMatch(md, /Cada faixa roda `claude -p`/);
    assert.match(md, /Cada faixa do Claude roda `claude -p`/);
    assert.doesNotMatch(html, /Cada faixa roda <code>claude -p/);
    assert.match(html, /Cada faixa do Claude roda <code>claude -p/);
    assert.doesNotMatch(html, /O gate final \(verify \+ audit\) roda sozinho/);
  });
  withTempDir('fspec-manuais-', (root) => {
    const repo = plannedProject(root, [{ id: 'T-001', model: 'sonnet', file: 'src/a.js' }]);
    assert.match(readFeature(repo, 'plano-execucao.md'), /Cada faixa roda `claude -p`/);
    const html = readFeature(repo, 'plano-execucao.html');
    assert.match(html, /Cada faixa roda <code>claude -p/);
    assert.match(html, /O gate final \(verify \+ audit\) roda sozinho/);
  });
});

test('o executor externo e reconhecido sem diferenciar maiusculas', () => {
  withTempDir('fspec-manuais-', (root) => {
    const models = ['Codex', 'AGY', 'Antigravity', 'Sonnet'];
    const tasks = models.map((model, i) => ({ id: `T-00${i + 1}`, model, file: `src/${i}.js` }));
    const plan = JSON.parse(readFeature(plannedProject(root, tasks), 'plano.json'));
    assert.deepEqual(plan.faixas.map((lane) => lane.executor), ['codex', 'agy', 'agy', 'claude']);
  });
});
