// Fixture das suites de faixas externas: repositorio temporario com uma feature,
// `claude` falso no PATH e leitura dos eventos do script. Nao e uma suite (sem
// .test.).
// Fixture for the external lane suites: temporary repository with one feature,
// a fake `claude` on PATH and the script event reader. Not a suite (no .test.
// in the name).

import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENGINE } from './fixture-projeto.mjs';

export const FEATURE = 'demo';
export const MANUAL_HEADING = '## Faixas manuais (Dev Principal e Dev Secundario)';
const FAKE_CLAUDE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fake-claude.mjs');
const posix = (p) => p.split(path.sep).join('/');

// ── projeto temporario / temporary project ─────────────────────────────────

function tasksMd(tasks) {
  const blocks = tasks.map(({ id, model, file, effort }) =>
    [
      `## ${id} — Tarefa ${id} [pendente]`,
      '',
      '- Refs: US-001, AC-001',
      ...(file ? [`- Arquivos: ${file}`] : []),
      ...(model ? [`- Modelo: ${model}`] : []),
      ...(effort ? [`- Esforço: ${effort}`] : []),
    ].join('\n')
  );
  return `# Tasks: Demo\n\n> feature: ${FEATURE}\n\n${blocks.join('\n\n')}\n`;
}

export function run(cmd, args, cwd, env = process.env) {
  const proc = spawnSync(cmd, args, { cwd, env, encoding: 'utf-8' });
  return { status: proc.status, out: `${proc.stdout ?? ''}${proc.stderr ?? ''}` };
}

export function git(cwd, ...args) {
  const proc = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  assert.equal(proc.status, 0, proc.stderr);
  return proc.stdout.trim();
}

export function featureFile(repo, name) {
  return path.join(repo, '.spec', 'features', FEATURE, name);
}

export const readFeature = (repo, name) => readFileSync(featureFile(repo, name), 'utf-8');

// Repositorio numa subpasta, na branch da issue, com a spec commitada; os
// worktrees nascem ao lado dele, dentro da pasta temporaria.
// Repository in a subfolder, on the issue branch, with the spec committed; the
// worktrees are created next to it, inside the temporary folder.
export function projectWith(root, tasks) {
  const repo = path.join(root, 'repo');
  mkdirSync(repo);
  assert.equal(run(process.execPath, [ENGINE, 'init'], repo).status, 0);
  assert.equal(run(process.execPath, [ENGINE, 'new', FEATURE], repo).status, 0);
  writeFileSync(featureFile(repo, 'tasks.md'), tasksMd(tasks));
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', 'Teste');
  git(repo, 'config', 'user.email', 'teste@example.com');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'inicial');
  git(repo, 'switch', '-q', '-c', 'feat/1-demo');
  return repo;
}

export const generatePlan = (repo) => run(process.execPath, [ENGINE, 'plano', FEATURE, '--agents', 'claude'], repo);

export function plannedProject(root, tasks) {
  const repo = projectWith(root, tasks);
  const plan = generatePlan(repo);
  assert.equal(plan.status, 0, plan.out);
  return repo;
}

// ── execucao do script / script execution ──────────────────────────────────

const pathKey = () => Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';

function writeExecutable(file, content) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  chmodSync(file, 0o755);
}

// `claude` falso na frente do PATH (ver fake-claude.mjs): registra os
// argumentos, commita um arquivo permitido da tarefa e sai com o código pedido.
// Fake `claude` in front of PATH (see fake-claude.mjs): records its arguments,
// commits one allowed file of the task and exits with the requested code.
// `failOn` restringe a falha às chamadas cujo prompt cita o texto.
// `failOn` limits the failure to calls whose prompt mentions the text.
// Opções: `commit: false` não commita nada; `skipCommit` lista as tarefas sem
// commit; `extraFiles` e `leftovers` ({ 'T-001': 'arquivo' }) acrescentam um
// arquivo ao commit ou o deixam sem commit; `events` vai para o stdout, uma
// linha cada, e `stderr` para o stderr.
// Options: `commit: false` commits nothing; `skipCommit` lists tasks left
// without commit; `extraFiles` and `leftovers` add a file to the commit or leave
// it uncommitted; `events` goes to stdout, one line each, `stderr` to stderr.
export function fakeClaude(root, exitCode = 0, options = {}) {
  const bin = path.join(root, 'bin');
  const log = path.join(root, 'claude-calls.log');
  const configFile = path.join(root, 'fake-claude.json');
  const config = {
    exitCode,
    log,
    failOn: '',
    commit: true,
    skipCommit: [],
    extraFiles: {},
    leftovers: {},
    events: [],
    stderr: '',
    ...options,
  };
  writeFileSync(configFile, JSON.stringify(config));
  writeExecutable(
    path.join(bin, 'claude'),
    `#!/bin/sh\nexec '${posix(process.execPath)}' '${posix(FAKE_CLAUDE)}' '${posix(configFile)}' "$@"\n`
  );
  const env = { ...process.env, [pathKey()]: `${bin}${path.delimiter}${process.env[pathKey()]}` };
  return { env, calls: () => (existsSync(log) ? readFileSync(log, 'utf-8') : '') };
}

// PATH sem nenhum `claude`: tira as pastas que o tem e repoe o node por um
// atalho, caso more na mesma pasta.
// PATH without any `claude`: drops the folders holding it and restores node
// through a shim, in case it lives in the same folder.
export function envWithoutClaude(root) {
  const bin = path.join(root, 'shim');
  writeExecutable(path.join(bin, 'node'), `#!/bin/sh\nexec '${posix(process.execPath)}' "$@"\n`);
  const names = ['claude', 'claude.exe', 'claude.cmd', 'claude.bat'];
  const kept = process.env[pathKey()]
    .split(path.delimiter)
    .filter((dir) => !names.some((name) => existsSync(path.join(dir, name))));
  const env = { ...process.env, [pathKey()]: [bin, ...kept].join(path.delimiter) };
  assert.notEqual(run('bash', ['-c', 'command -v claude'], root, env).status, 0, 'o PATH ainda tem claude');
  return env;
}

export const runScript = (repo, env) => run('bash', [`.spec/features/${FEATURE}/executar-tarefas.sh`], repo, env);

export const worktreeOf = (root, lane) => path.join(root, 'fuzkrigo-worktrees', `repo-${FEATURE}-${lane}`);

export const logsDirOf = (root) => path.join(root, 'fuzkrigo-worktrees', `repo-${FEATURE}-logs`);

// ── executor de mentira / stand-in executor ────────────────────────────────

// Escreve cada arquivo (caminho relativo à raiz dada), criando as pastas.
// Writes each file (path relative to the given root), creating the folders.
export const writeFiles =
  (...files) =>
  (dir) => {
    for (const file of files) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      writeFileSync(path.join(dir, file), `export default '${file}';\n`);
    }
  };

// Mensagem no formato que o prompt pede: começa pelo código da tarefa.
// Message in the format the prompt asks for: starts with the task code.
export const taskCommit = (id) => `${id} ${FEATURE}: trabalho da tarefa`;

// Faz o papel do executor externo: altera o worktree da faixa e commita.
// Plays the external executor: changes the lane worktree and commits.
export function executorCommits(root, lane, change, message) {
  const worktree = worktreeOf(root, lane);
  change(worktree);
  git(worktree, 'add', '-A');
  git(worktree, 'commit', '-q', '--allow-empty', '-m', message);
}

// ── eventos / events ───────────────────────────────────────────────────────

// Eventos sem o carimbo de hora. / Events without the timestamp.
export function eventsOf(root) {
  const file = path.join(logsDirOf(root), 'plano-eventos.log');
  return readFileSync(file, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(line.indexOf('|') + 1));
}

export const gateEvents = (events) => events.filter((e) => e.startsWith('gate|'));

export const CLAUDE_AND_CODEX = [
  { id: 'T-001', model: 'sonnet', file: 'src/a.js' },
  { id: 'T-002', model: 'codex', file: 'src/b.js' },
];
