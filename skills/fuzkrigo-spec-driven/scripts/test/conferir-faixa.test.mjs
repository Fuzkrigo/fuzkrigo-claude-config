// Testes do comando `conferir <feature> <faixa>`: o juiz mecânico dos arquivos
// de uma faixa antes do merge. Rodar da pasta scripts/, no Git Bash:
//   node --test test/conferir-faixa.test.mjs
//
// Tests of the `conferir <feature> <lane>` command: the mechanical judge of a
// lane's files before the merge. Run from scripts/, in Git Bash.
//
// Antes, o .md imprimia um `git diff` e a lista dos permitidos para comparar a
// olho, e o script mesclava as faixas do Claude sem conferir nada.
// Before, the .md printed a `git diff` and the allowed list to compare by eye,
// and the script merged Claude lanes without checking anything.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { ENGINE, withTempDir } from './fixture-projeto.mjs';
import {
  executorCommits,
  fakeClaude,
  FEATURE,
  featureFile,
  git,
  plannedProject,
  readFeature,
  run,
  runScript,
  taskCommit,
  worktreeOf,
  writeFiles,
} from './fixture-faixas.mjs';

const LANE = 'faixa-1';
const BRANCH = 'spec/demo-faixa-1';
const ONE_TASK = [{ id: 'T-001', model: 'codex', file: 'src/a.js, test/a.test.js' }];
const TWO_TASKS = [
  { id: 'T-001', model: 'codex', file: 'src/a.js, test/a.test.js' },
  { id: 'T-002', model: 'codex', file: 'src/a.js, src/c.js' },
];

const check = (repo, ...args) => run(process.execPath, [ENGINE, 'conferir', ...args], repo);
const checkLane = (repo) => check(repo, FEATURE, LANE);

// Linhas que acusam arquivo fora da lista. / Lines reporting out-of-list files.
const outsideLines = (proc) => proc.out.split(/\r?\n/).filter((l) => l.startsWith('fora da lista:'));

// Commita um arquivo na branch da issue, antes de as faixas nascerem.
// Commits a file on the issue branch, before the lanes are created.
function commitBase(repo, file, content = `export default '${file}';\n`) {
  writeFiles(file)(repo);
  writeFileSync(path.join(repo, file), content);
  git(repo, 'add', '--', file);
  git(repo, 'commit', '-q', '-m', `base: ${file}`);
}

// Plano gerado e faixas manuais preparadas pelo script (worktree e branch).
// Plan generated and manual lanes prepared by the script (worktree and branch).
function preparedLane(root, { tasks = ONE_TASK, base = () => {} } = {}) {
  const repo = plannedProject(root, tasks);
  base(repo);
  const proc = runScript(repo, fakeClaude(root).env);
  assert.equal(proc.status, 2, proc.out);
  return repo;
}

const commit = (root, change, message = taskCommit('T-001')) => executorCommits(root, LANE, change, message);

function assertPassed(proc, count) {
  assert.equal(proc.status, 0, proc.out);
  assert.ok(proc.out.includes(`${LANE}: ${count} arquivo(s) tocado(s), todos permitidos`), proc.out);
}

// ── arquivos tocados / touched files ───────────────────────────────────────

test('faixa so com arquivos permitidos, testes inclusos, sai 0 com a contagem', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root);
    commit(root, writeFiles('src/a.js', 'test/a.test.js'));
    // o HEAD andar depois (outra faixa mesclada) não conta contra a faixa
    // HEAD moving afterwards (another lane merged) does not count against it
    commitBase(repo, 'src/de-outra-faixa.js');
    assertPassed(checkLane(repo), 2);
  });
});

test('os permitidos sao a uniao das tarefas da faixa, e nao os de outra faixa', () => {
  const tasks = [...TWO_TASKS, { id: 'T-003', model: 'codex', file: 'src/outra.js' }];
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root, { tasks });
    commit(root, writeFiles('src/a.js', 'test/a.test.js'));
    commit(root, writeFiles('src/c.js'), taskCommit('T-002'));
    assertPassed(checkLane(repo), 3);

    commit(root, writeFiles('src/outra.js'), taskCommit('T-002'));
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.deepEqual(outsideLines(proc), ['fora da lista: src/outra.js']);
  });
});

test('arquivo fora da lista sai 1 e imprime so o caminho dele', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root);
    commit(root, writeFiles('src/a.js', 'src/extra.js'));
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.deepEqual(outsideLines(proc), ['fora da lista: src/extra.js']);
  });
});

test('arquivo de fora renomeado para dentro da lista sai 1: a origem aparece', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root, { base: (r) => commitBase(r, 'src/proibido.js') });
    commit(root, (wt) => git(wt, 'mv', 'src/proibido.js', 'src/a.js'));
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.deepEqual(outsideLines(proc), ['fora da lista: src/proibido.js']);
  });
});

test('arquivo de fora da lista apagado sai 1', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root, { base: (r) => commitBase(r, 'src/proibido.js') });
    commit(root, (wt) => rmSync(path.join(wt, 'src', 'proibido.js')));
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.deepEqual(outsideLines(proc), ['fora da lista: src/proibido.js']);
  });
});

// ── faixa sem o que mesclar / nothing to merge ─────────────────────────────

test('faixa sem commits sai 1 com a mensagem', () => {
  withTempDir('fspec-conferir-', (root) => {
    const proc = checkLane(preparedLane(root));
    assert.equal(proc.status, 1, proc.out);
    assert.ok(proc.out.includes('faixa-1 sem commits — nada a mesclar'), proc.out);
  });
});

test('faixa com commits e nenhum arquivo alterado sai 1', () => {
  const histories = {
    'commit vazio': (root) => commit(root, () => {}),
    'commit seguido de revert': (root) => {
      commit(root, writeFiles('src/a.js'));
      commit(root, (wt) => rmSync(path.join(wt, 'src', 'a.js')));
    },
  };
  for (const [name, history] of Object.entries(histories)) {
    withTempDir('fspec-conferir-', (root) => {
      const repo = preparedLane(root);
      history(root);
      const proc = checkLane(repo);
      assert.equal(proc.status, 1, `${name}: ${proc.out}`);
      assert.ok(proc.out.includes('faixa-1 sem arquivos alterados — nada a mesclar'), `${name}: ${proc.out}`);
    });
  }
});

test('branch da faixa apagada sai 1 citando a branch', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root);
    git(repo, 'worktree', 'remove', '--force', worktreeOf(root, LANE));
    git(repo, 'branch', '-q', '-D', BRANCH);
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.match(proc.out, /spec\/demo-faixa-1/);
    assert.match(proc.out, /não existe|inexistente/);
  });
});

// ── uso errado / wrong usage ───────────────────────────────────────────────

function assertUsageError(proc, expected) {
  assert.equal(proc.status, 2, proc.out);
  assert.doesNotMatch(proc.out, /comando desconhecido/);
  assert.match(proc.out, expected);
}

test('faixa fora do plano sai 2 com a lista das faixas', () => {
  const tasks = [...ONE_TASK, { id: 'T-002', model: 'codex', file: 'src/b.js' }];
  withTempDir('fspec-conferir-', (root) => {
    const proc = check(plannedProject(root, tasks), FEATURE, 'faixa-9');
    assertUsageError(proc, /faixa-1/);
    assert.match(proc.out, /faixa-2/);
  });
});

test('feature sem plano.json e chamada sem a faixa saem 2', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = plannedProject(root, ONE_TASK);
    assert.equal(run(process.execPath, [ENGINE, 'new', 'outra'], repo).status, 0);
    assertUsageError(check(repo, 'outra', LANE), /plano\.json/);
    assertUsageError(check(repo, 'nao-existe', LANE), /plano\.json/);
    assertUsageError(check(repo, FEATURE), /uso: fuzkrigo-spec conferir <feature> <faixa>/);
    assertUsageError(check(repo), /uso: fuzkrigo-spec conferir <feature> <faixa>/);
  });
});

// ── nomes de arquivo / file names ──────────────────────────────────────────

const ODD_NAMES = ['src/a.js', 'src/sub/b.js', 'src/relatório.js', 'src/com espaço.js'];
const ODD_LIST = './src/a.js, src\\sub\\b.js, src/relatório.js, src/com espaço.js';

test('Arquivos: com ./, barra invertida, acento e espaco casa com o que o git informa', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root, { tasks: [{ id: 'T-001', model: 'codex', file: ODD_LIST }] });
    commit(root, writeFiles(...ODD_NAMES));
    assertPassed(checkLane(repo), 4);

    // o conferir normaliza o que lê, mesmo com o plano.json escrito sem normalizar
    // conferir normalizes what it reads, even from a non-normalized plano.json
    const plan = JSON.parse(readFeature(repo, 'plano.json'));
    plan.faixas[0].tarefas[0].arquivos = ODD_LIST.split(', ');
    writeFileSync(featureFile(repo, 'plano.json'), JSON.stringify(plan));
    assertPassed(checkLane(repo), 4);

    commit(root, writeFiles('src/ação.js'));
    assert.deepEqual(outsideLines(checkLane(repo)), ['fora da lista: src/ação.js']);
  });
});

// Controles que o Windows aceita em nome de arquivo: CSI de 8 bits e DEL.
// Controls that Windows accepts in file names: 8-bit CSI and DEL.
const HOSTILE = (word) => `src/\u009b31m${word}\u007f.js`;

test('nome de arquivo com caractere de controle sai limpo nas mensagens', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root);
    commit(root, writeFiles(HOSTILE('commitado')));
    writeFiles(HOSTILE('solto'))(worktreeOf(root, LANE));
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.deepEqual(outsideLines(proc), ['fora da lista: src/commitado.js']);
    assert.match(proc.out, /sem commit no worktree: src\/solto\.js/);
    assert.doesNotMatch(proc.out, /[\u007f-\u009f]/);
  });
});

// Uma quebra de linha no nome forjaria uma linha do veredito. O Windows não
// aceita esse nome em arquivo, então a função é testada direto.
// A line break in a name would forge a verdict line. Windows rejects such a file
// name, so the function is tested directly.
test('a limpeza tira quebra de linha, escape e controle, e mantem o texto', async () => {
  const { stripControl } = await import('../lib/src/util/text.js');
  assert.equal(stripControl('a\nfaixa-1: ok\r.js'), 'afaixa-1: ok.js');
  assert.equal(stripControl('\u001b[31mcor\u001b[0m \u001b]0;título\u0007fim\u001bc\u0000'), 'cor fim');
  assert.equal(stripControl('tab\tacento ção → ✘'), 'tab\tacento ção → ✘');
});

// ── worktree com arquivo sem commit / uncommitted files ────────────────────

function assertDirty(proc, file) {
  assert.equal(proc.status, 1, proc.out);
  assert.ok(proc.out.includes(file), proc.out);
  assert.match(proc.out, /sem commit/);
}

test('arquivo novo sem commit no worktree sai 1, mesmo com o git configurado para escondê-lo', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root);
    commit(root, writeFiles('src/a.js'));
    git(repo, 'config', 'status.showUntrackedFiles', 'no');
    writeFiles('tmp/sobra.txt')(worktreeOf(root, LANE));
    assertDirty(checkLane(repo), 'tmp/sobra.txt');
  });
});

test('arquivo permitido alterado sem commit, no indice ou nao, sai 1', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root);
    commit(root, writeFiles('src/a.js'));
    const worktree = worktreeOf(root, LANE);
    appendFileSync(path.join(worktree, 'src', 'a.js'), '// pendente\n');
    assertDirty(checkLane(repo), 'src/a.js');
    git(worktree, 'add', 'src/a.js');
    assertDirty(checkLane(repo), 'src/a.js');
  });
});

test('arquivo ignorado pelo git no worktree nao reprova a faixa', () => {
  withTempDir('fspec-conferir-', (root) => {
    const base = (r) => commitBase(r, '.gitignore', 'cache/\n');
    const repo = preparedLane(root, { base });
    commit(root, writeFiles('src/a.js'));
    writeFiles('cache/lixo.txt')(worktreeOf(root, LANE));
    assertPassed(checkLane(repo), 1);
  });
});

// ── submódulo escondido / hidden submodule ─────────────────────────────────

const GITMODULES = '[submodule "lib"]\n\tpath = lib\n\turl = ./lib\n\tignore = all\n';
const gitlink = (digit) => `160000,${digit.repeat(40)},lib`;

// Submódulo `lib` com `ignore = all`, que faz o git esconder as mudanças dele.
// Submodule `lib` with `ignore = all`, which makes git hide its changes.
function baseWithSubmodule(repo) {
  writeFileSync(path.join(repo, '.gitmodules'), GITMODULES);
  mkdirSync(path.join(repo, 'lib'));
  git(repo, 'add', '.gitmodules');
  git(repo, 'update-index', '--add', '--cacheinfo', gitlink('1'));
  git(repo, 'commit', '-q', '-m', 'base: submódulo');
}

test('troca de submodulo fora da lista aparece, mesmo com ignore = all', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root, { base: baseWithSubmodule });
    commit(root, (wt) => {
      writeFiles('src/a.js')(wt);
      git(wt, 'update-index', '--cacheinfo', gitlink('2'));
    });
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.deepEqual(outsideLines(proc), ['fora da lista: lib']);
  });
});

test('submodulo alterado sem commit no worktree aparece, mesmo com ignore = all', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root, { base: baseWithSubmodule });
    commit(root, writeFiles('src/a.js'));
    assertPassed(checkLane(repo), 1);
    // o submódulo passa a apontar para outro commit, sem registro na faixa
    // the submodule now points to another commit, not recorded in the lane
    const sub = path.join(worktreeOf(root, LANE), 'lib');
    git(sub, 'init', '-q');
    git(sub, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '--allow-empty', '-m', 'sub');
    const proc = checkLane(repo);
    assert.equal(proc.status, 1, proc.out);
    assert.match(proc.out, /sem commit no worktree: lib$/m);
  });
});

// ── um commit por tarefa / one commit per task ─────────────────────────────

function assertTaskMissing(proc) {
  assert.equal(proc.status, 1, proc.out);
  assert.match(proc.out, /T-002/);
  assert.doesNotMatch(proc.out, /T-001/);
}

test('cada tarefa da faixa exige um commit que comece pelo codigo dela', () => {
  withTempDir('fspec-conferir-', (root) => {
    const repo = preparedLane(root, { tasks: TWO_TASKS });
    commit(root, writeFiles('src/a.js', 'src/c.js'));
    assertTaskMissing(checkLane(repo));

    // código parecido ou citado no meio não vale / lookalike or mid-message codes do not count
    commit(root, writeFiles('test/a.test.js'), 'T-0020 demo: outra tarefa');
    commit(root, () => {}, 'ajuste da T-002');
    assertTaskMissing(checkLane(repo));

    commit(root, () => {}, taskCommit('T-002'));
    assertPassed(checkLane(repo), 3);
  });
});
