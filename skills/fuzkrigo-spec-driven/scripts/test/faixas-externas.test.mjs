// Testes das faixas externas: tarefas de `Modelo: codex` ou `agy` viram faixas
// manuais, que o executar-tarefas.sh prepara e nao executa. Rodar da pasta
// scripts/, no Git Bash:
//   node --test test/faixas-externas.test.mjs
//
// External lane tests: tasks with `Modelo: codex` or `agy` become manual lanes,
// which executar-tarefas.sh prepares and does not run. Run from scripts/, in
// Git Bash.
//
// Os casos que rodam o script precisam de `bash` no PATH (Git Bash no Windows).
// The cases that run the script need `bash` on PATH (Git Bash on Windows).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'fs';
import { runInNewContext } from 'vm';
import { parseEventos, renderPainelHtml } from '../lib/src/core/painel.js';
import { withTempDir } from './fixture-projeto.mjs';
import {
  CLAUDE_AND_CODEX,
  envWithoutClaude,
  eventsOf,
  fakeClaude,
  FEATURE,
  featureFile,
  gateEvents,
  generatePlan,
  git,
  MANUAL_HEADING,
  plannedProject,
  projectWith,
  readFeature,
  runScript,
  worktreeOf,
} from './fixture-faixas.mjs';

// ── plano / plan ───────────────────────────────────────────────────────────

test('Modelo decide o executor da tarefa e da faixa no plano.json', () => {
  withTempDir('fspec-externas-', (root) => {
    const models = ['codex', 'agy', 'antigravity', 'sonnet', 'opus'];
    const tasks = models.map((model, i) => ({ id: `T-00${i + 1}`, model, file: `src/${i}.js` }));
    const plan = JSON.parse(readFeature(plannedProject(root, tasks), 'plano.json'));
    const expected = ['codex', 'agy', 'agy', 'claude', 'claude'];
    assert.deepEqual(plan.faixas.map((lane) => lane.executor), expected);
    assert.deepEqual(plan.faixas.flatMap((lane) => lane.tarefas.map((t) => t.executor)), expected);
  });
});

test('faixa que mistura executores e recusada, citando a faixa e as tarefas', () => {
  withTempDir('fspec-externas-', (root) => {
    const repo = projectWith(root, [
      { id: 'T-001', model: 'sonnet', file: 'src/a.js' },
      { id: 'T-002', model: 'codex', file: 'src/a.js' },
    ]);
    const plan = generatePlan(repo);
    assert.equal(plan.status, 2, plan.out);
    assert.ok(
      plan.out.includes(
        'faixa-1 mistura executores: T-001 (claude), T-002 (codex) — tarefas que dividem arquivo vão para o mesmo executor'
      ),
      plan.out
    );
    assert.equal(existsSync(featureFile(repo, 'executar-tarefas.sh')), false);
  });
});

test('tarefa de executor externo sem Arquivos: e recusada', () => {
  for (const executor of ['codex', 'agy']) {
    withTempDir('fspec-externas-', (root) => {
      const repo = projectWith(root, [
        { id: 'T-001', model: 'sonnet', file: 'src/a.js' },
        { id: 'T-002', model: executor },
      ]);
      const plan = generatePlan(repo);
      assert.equal(plan.status, 2, plan.out);
      assert.ok(
        plan.out.includes(`T-002 (${executor}) não lista Arquivos: — executor externo só trabalha em faixa`),
        plan.out
      );
    });
  }
});

// ── executar-tarefas.sh ────────────────────────────────────────────────────

test('com faixa manual o script roda so o claude, prepara o worktree e sai 2 sem gate', () => {
  withTempDir('fspec-externas-', (root) => {
    const repo = plannedProject(root, CLAUDE_AND_CODEX);
    const claude = fakeClaude(root);
    const proc = runScript(repo, claude.env);
    assert.equal(proc.status, 2, proc.out);

    assert.equal(claude.calls().match(/^CALL$/gm)?.length, 1, claude.calls());
    assert.match(claude.calls(), /T-001/);
    assert.doesNotMatch(claude.calls(), /T-002/);

    assert.ok(existsSync(worktreeOf(root, 'faixa-2')), proc.out);
    assert.equal(git(worktreeOf(root, 'faixa-2'), 'rev-parse', '--abbrev-ref', 'HEAD'), 'spec/demo-faixa-2');
    assert.doesNotMatch(git(repo, 'log', '--format=%s'), /merge faixa-2/);

    const events = eventsOf(root);
    assert.ok(events.includes('faixa|faixa-2|manual'), events.join('\n'));
    assert.ok(events.indexOf('faixa|faixa-2|manual') < events.indexOf('onda|1|inicio'), events.join('\n'));
    assert.equal(events.at(-1), 'fim|2');
    assert.deepEqual(gateEvents(events), []);
    assert.deepEqual(events.filter((e) => e.startsWith('faixa|faixa-2|')), ['faixa|faixa-2|manual']);

    const opening = proc.out.split('\n').find((l) => l.includes('jcodex'));
    assert.match(opening ?? '', /codex.*jcodex.*repo-demo-faixa-2/, proc.out);
    assert.match(proc.out, /Faixas manuais.*plano-execucao\.md|plano-execucao\.md.*Faixas manuais/);

    const tasks = readFeature(repo, 'tasks.md');
    assert.match(tasks, /T-001 .*\[concluida\]/);
    assert.match(tasks, /T-002 .*\[pendente\]/);
  });
});

test('plano so com codex nao exige o claude no PATH', () => {
  withTempDir('fspec-externas-', (root) => {
    const repo = plannedProject(root, [
      { id: 'T-001', model: 'codex', file: 'src/a.js' },
      { id: 'T-002', model: 'codex', file: 'src/b.js' },
    ]);
    const proc = runScript(repo, envWithoutClaude(root));
    assert.equal(proc.status, 2, proc.out);
    assert.doesNotMatch(proc.out, /claude\) não encontrado/);
    for (const lane of ['faixa-1', 'faixa-2']) assert.ok(existsSync(worktreeOf(root, lane)), proc.out);
  });
});

test('falha em faixa do claude tem precedencia sobre a pendencia manual: sai 1', () => {
  withTempDir('fspec-externas-', (root) => {
    const repo = plannedProject(root, CLAUDE_AND_CODEX);
    const proc = runScript(repo, fakeClaude(root, 7).env);
    assert.equal(proc.status, 1, proc.out);
    const events = eventsOf(root);
    assert.ok(events.includes('faixa|faixa-2|manual'), events.join('\n'));
    assert.equal(events.at(-1), 'fim|1');
    assert.deepEqual(gateEvents(events), []);
    assert.match(proc.out, /Faixas manuais/);
  });
});

// Guarda de regressao: sem faixa externa, nada muda.
// Regression guard: without external lanes, nothing changes.
test('plano so com claude nao ganha secao de faixas manuais e roda o gate', () => {
  withTempDir('fspec-externas-', (root) => {
    const repo = plannedProject(root, [
      { id: 'T-001', model: 'sonnet', file: 'src/a.js' },
      { id: 'T-002', model: 'opus', file: 'src/b.js' },
    ]);
    assert.doesNotMatch(readFeature(repo, 'plano-execucao.md'), /Faixas manuais/);
    const proc = runScript(repo, fakeClaude(root).env);
    const events = eventsOf(root);
    assert.ok(events.includes('gate|inicio'), proc.out);
    assert.ok(events.some((e) => e.startsWith('gate|audit|')), proc.out);
    assert.deepEqual(events.filter((e) => e.endsWith('|manual')), []);
    assert.equal(events.at(-1), `fim|${proc.status}`);
    assert.notEqual(proc.status, 2, proc.out);
  });
});

// ── plano-execucao.md ──────────────────────────────────────────────────────

test('a secao de faixas manuais traz abertura, esforco, prompt e integracao', () => {
  withTempDir('fspec-externas-', (root) => {
    const repo = plannedProject(root, [
      { id: 'T-001', model: 'codex', file: 'src/a.js', effort: 'alto' },
      { id: 'T-002', model: 'agy', file: 'src/b.js', effort: 'baixo' },
    ]);
    const md = readFeature(repo, 'plano-execucao.md');
    assert.ok(md.indexOf(MANUAL_HEADING) > md.indexOf('## Como executar'), md);
    const section = md.slice(md.indexOf(MANUAL_HEADING));
    assert.match(section, /executar-tarefas\.sh.*cria os worktrees.*não as executa/);
    assert.ok(section.includes('cd ../fuzkrigo-worktrees/repo-demo-faixa-1 && jcodex'), section);
    assert.ok(section.includes('cd ../fuzkrigo-worktrees/repo-demo-faixa-2 && jagy'), section);
    assert.match(section, /T-001[^\n]*high/);
    assert.match(section, /T-002[^\n]*low/);
    assert.match(
      section,
      /se o atalho abrir em outro esforço, ajuste com `\/model` \(Codex\) ou `\/effort` \(Antigravity\) antes de colar/i
    );

    const prompts = [...section.matchAll(/```\n(Você executa[\s\S]*?)\n```/g)].map((m) => m[1]);
    assert.equal(prompts.length, 2, section);
    for (const prompt of prompts) {
      assert.match(prompt, /já está na raiz do worktree/);
      assert.doesNotMatch(prompt, /\.\.\/fuzkrigo-worktrees/);
      assert.match(prompt.split('\n').at(-1), /AGENTS\.md/);
    }

    const steps = [
      /conferir demo faixa-1/,
      /git merge --no-ff spec\/demo-faixa-1/,
      /git worktree remove \.\.\/fuzkrigo-worktrees\/repo-demo-faixa-1/,
      /git branch -d spec\/demo-faixa-1/,
      /tarefa demo T-001 concluida/,
      /verify demo/,
      /audit --ci --feature demo/,
    ];
    const positions = steps.map((re) => section.search(re));
    assert.ok(positions.every((p) => p >= 0), `passo ausente: ${positions}\n${section}`);
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), section);
  });
});

// ── painel ─────────────────────────────────────────────────────────────────

// Avalia a funcao do chip como o navegador faria.
// Evaluates the chip function as the browser would.
function chipFor(state) {
  const html = renderPainelHtml({ feature: FEATURE, token: 't', podeExecutar: true });
  const source = html.slice(html.indexOf('function esc('), html.indexOf('function stTarefa('));
  return runInNewContext(`${source}; chipFaixa;`)(state);
}

test('o painel mostra "manual" no chip da faixa manual', () => {
  const events = parseEventos('2026-11-27T10:00:00Z|faixa|faixa-2|manual\n');
  assert.equal(events.faixas['faixa-2'], 'manual');
  assert.match(chipFor(events.faixas['faixa-2']), />manual</);
});

const WATCH_ONLY_TEXT =
  'Modo acompanhamento — a execução roda fora deste painel (agentes nativos do Antigravity, ou o script rodado ' +
  'pelo Arquiteto no <code>jarq</code>, na caixa); aqui você vê tasks.md, logs, provas e o gate ao vivo.';

test('o painel sem botao cita o Arquiteto no jarq e marca a faixa reprovada', () => {
  const html = renderPainelHtml({ feature: FEATURE, token: 't', podeExecutar: false }).replace(/\s+/g, ' ');
  assert.ok(html.includes(WATCH_ONLY_TEXT), html);
  assert.doesNotMatch(html, /o script no terminal/);
  const events = parseEventos('2026-11-27T10:00:00Z|faixa|faixa-2|reprovada\n');
  assert.match(chipFor(events.faixas['faixa-2']), /class="chip erro">reprovada</);
});
