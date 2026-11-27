// Testes dos textos do motor sobre onde o script roda: o executar-tarefas.sh e
// rodado pelo Arquiteto, na caixa (jarq), e o painel e so para olhar, fora
// dela. Rodar da pasta scripts/:
//   node --test test/script-na-caixa.test.mjs
//
// Engine text tests on where the script runs: the Architect runs
// executar-tarefas.sh inside the jail (jarq), and the panel is watch only,
// outside it. Run from scripts/.
//
// Antes, o motor mandava colar o comando no terminal e recomendava o botao
// Executar do painel: nos dois casos o `claude -p` rodava fora da caixa.
// Before, the engine told the user to paste the command into a terminal and
// recommended the panel's run button: either way `claude -p` ran unjailed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';
import {
  CLAUDE_AND_CODEX,
  FEATURE,
  plannedProject,
  projectWith,
  readFeature,
  run,
} from './fixture-faixas.mjs';

const CLAUDE_ONLY = [
  { id: 'T-001', model: 'sonnet', file: 'src/a.js' },
  { id: 'T-002', model: 'opus', file: 'src/b.js' },
];
const PLANS = [CLAUDE_ONLY, CLAUDE_AND_CODEX];

// Junta as quebras de linha, para a asserção não depender de onde o texto dobra.
// Joins line breaks, so assertions do not depend on where the text wraps.
const flat = (text) => text.replace(/\s+/g, ' ');

// Frases que levam a rodar o script fora da caixa.
// Phrases that lead to running the script outside the jail.
const OUTSIDE_ROUTES = [
  /Executar todas as tarefas/,
  /(?<!Não )use o botão/i,
  /executar com um clique/i,
  /executa de verdade/i,
  /sem digitar/i,
  /(direto|cole) no terminal/i,
  /copia o comando acima/i,
];

function assertNoOutsideRoute(text) {
  for (const route of OUTSIDE_ROUTES) assert.doesNotMatch(flat(text), route);
}

const sectionFrom = (text, heading) => {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `sem "${heading}":\n${text}`);
  return text.slice(start);
};

test('o .md manda o Arquiteto rodar no jarq e o painel e so para olhar', () => {
  for (const tasks of PLANS) {
    withTempDir('fspec-caixa-', (root) => {
      const md = readFeature(plannedProject(root, tasks), 'plano-execucao.md');
      const section = flat(sectionFrom(md, '## Como executar'));
      assertNoOutsideRoute(section);
      assert.match(section, /Arquiteto[^.]*`jarq`[^.]*caixa/);
      assert.match(section, /fora da caixa[^#]*só para (olhar|acompanhar)/i);
      assert.match(section, /Não use o botão Executar[^.]*fora da caixa/);
    });
  }
});

test('no plano misto a integracao diz que quem integra e o Arquiteto, no jarq', () => {
  withTempDir('fspec-caixa-', (root) => {
    const md = readFeature(plannedProject(root, CLAUDE_AND_CODEX), 'plano-execucao.md');
    const intro = sectionFrom(md, '### Integração').split('```bash')[0];
    assert.match(flat(intro), /Arquiteto[^.]*`jarq`/);
  });
});

test('no modo antigravity o item do painel tambem e so para olhar', () => {
  withTempDir('fspec-caixa-', (root) => {
    const repo = projectWith(root, CLAUDE_ONLY);
    assert.equal(run(process.execPath, [ENGINE, 'plano', FEATURE, '--agents', 'antigravity'], repo).status, 0);
    const item = flat(sectionFrom(readFeature(repo, 'plano-execucao.md'), '**Acompanhe ao vivo**'));
    assert.match(item, /fora da caixa, só para olhar/);
    assertNoOutsideRoute(item);
  });
});

test('o script sugere o painel so fora da caixa', () => {
  withTempDir('fspec-caixa-', (root) => {
    const sh = readFeature(plannedProject(root, CLAUDE_ONLY), 'executar-tarefas.sh');
    const hint = sh.split('\n').find((line) => line.startsWith('info "acompanhe ao vivo'));
    assert.match(hint ?? '', /fuzkrigo-spec painel demo \(fora da caixa, só para olhar\)/, sh);
  });
});

test('o .html copia o comando para o Arquiteto rodar na caixa', () => {
  for (const tasks of PLANS) {
    withTempDir('fspec-caixa-', (root) => {
      const html = readFeature(plannedProject(root, tasks), 'plano-execucao.html');
      assertNoOutsideRoute(html);
      assert.match(html, /<button onclick="copiar\(\)">Copiar o comando do script<\/button>/);
      assert.match(flat(html), /Arquiteto rodar na caixa \(<code>jarq<\/code>\)/);
      assert.match(flat(html), /fora da caixa[^#]*só para acompanhar/i);
    });
  }
});

// Trecho da ajuda entre um comando e o seguinte.
// Help excerpt between one command and the next.
const helpBlock = (help, from, to) => flat(help.slice(help.indexOf(from), help.indexOf(to)));

test('a ajuda nao promete execucao pelo painel', () => {
  withTempDir('fspec-caixa-', (root) => {
    const proc = run(process.execPath, [ENGINE, 'help'], root);
    assert.equal(proc.status, 0, proc.out);
    assertNoOutsideRoute(proc.out);
    assert.match(helpBlock(proc.out, 'plano <feature> [', 'painel <feature> ['), /`?jarq`?/);
    const panel = helpBlock(proc.out, 'painel <feature> [', 'tarefa <feature>');
    assert.match(panel, /fora da caixa[^]*só para acompanhar/i);
  });
});

test('a saida do plano nao oferece execucao pelo painel nem no terminal', () => {
  for (const agent of ['claude', 'antigravity']) {
    withTempDir('fspec-caixa-', (root) => {
      const proc = run(process.execPath, [ENGINE, 'plano', FEATURE, '--agents', agent], projectWith(root, CLAUDE_ONLY));
      assert.equal(proc.status, 0, proc.out);
      assertNoOutsideRoute(proc.out);
      const panel = proc.out.split('\n').find((line) => line.includes('fuzkrigo-spec painel'));
      assert.match(panel ?? '', /fora da caixa/, proc.out);
      if (agent === 'claude') assert.match(proc.out, /jarq[^\n]*executar-tarefas\.sh/);
    });
  }
});
