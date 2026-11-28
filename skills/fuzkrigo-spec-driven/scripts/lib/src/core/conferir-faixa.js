// Conferência de uma faixa antes do merge: o juiz mecânico do plano de execução.
// Reprova arquivo fora da lista, faixa sem o que mesclar, tarefa sem commit
// próprio e worktree com arquivo sem commit. Não roda os testes.
// Lane check before the merge: the mechanical judge of the execution plan.
// Rejects out-of-list files, a lane with nothing to merge, a task without its
// own commit and a worktree with uncommitted files. It does not run the tests.

import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { stripControl } from '../util/text.js';
import { normFile } from './plano.js';

// Argumentos em lista, sem shell. As saídas pedidas com -z separam por NUL e não
// escapam nomes com acento, espaço ou quebra de linha.
// Argument list, no shell. Outputs requested with -z are NUL separated and do not
// escape names with accents, spaces or line breaks.
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
const nulList = (output) => output.split('\0').slice(0, -1);
// Com `ignore = all` no .gitmodules, o git esconderia a mudança de um submódulo.
// With `ignore = all` in .gitmodules, git would hide a submodule change.
const SHOW_SUBMODULES = '--ignore-submodules=none';

const usageError = (message) => ({ exitCode: 2, lines: [`erro: ${message}`] });

// Faixa pedida, lida do plano.json, ou o erro de uso (saída 2).
// The requested lane, read from plano.json, or the usage error (exit 2).
function findLane(config, featureName, laneId) {
  const planFile = `${config.specDir}/features/${featureName}/plano.json`;
  const fullPath = path.join(config.rootDir, planFile);
  if (!existsSync(fullPath)) {
    return { error: usageError(`${planFile} não existe — gere o plano: fuzkrigo-spec plano ${featureName}`) };
  }
  let plan;
  try {
    plan = JSON.parse(readFileSync(fullPath, 'utf-8'));
  } catch (err) {
    return { error: usageError(`${planFile} inválido: ${err.message}`) };
  }
  if (!Array.isArray(plan.faixas)) return { error: usageError(`${planFile} inválido: sem a lista de faixas`) };
  const lane = plan.faixas.find((fx) => fx.id === laneId);
  if (lane) return { lane };
  const ids = plan.faixas.map((fx) => fx.id).join(', ') || 'nenhuma';
  return { error: usageError(`faixa "${laneId}" não está no plano de "${featureName}" — faixas do plano: ${ids}`) };
}

// Pasta onde a branch está aberta, perguntada ao git: vale mesmo que o worktree
// não esteja no caminho previsto no plano. null se não estiver aberta.
// Folder where the branch is checked out, asked from git: holds even when the
// worktree is not at the planned path. null when it is not checked out.
function worktreeOfBranch(root, ref) {
  const blocks = git(root, 'worktree', 'list', '--porcelain').split(/\r?\n\r?\n/);
  const block = blocks.find((b) => b.split(/\r?\n/).includes(`branch ${ref}`));
  const dir = block?.match(/^worktree (.+?)\r?$/m)?.[1];
  return dir && existsSync(dir) ? dir : null;
}

// --untracked-files=all: não depende de status.showUntrackedFiles do usuário.
// --untracked-files=all: independent of the user's status.showUntrackedFiles.
function uncommittedFiles(root, ref) {
  const dir = worktreeOfBranch(root, ref);
  if (!dir) return [];
  const status = git(dir, 'status', '--porcelain', '-z', '--no-renames', '--untracked-files=all', SHOW_SUBMODULES);
  return nulList(status).map((entry) => entry.slice(3));
}

// Cada tarefa da faixa precisa de um commit cuja mensagem comece pelo código.
// Every lane task needs a commit whose message starts with its code.
function tasksWithoutCommit(tasks, subjects) {
  return tasks.filter((t) => !subjects.some((s) => new RegExp(`^${t.id}(?!\\d)`).test(s))).map((t) => t.id);
}

// O que há de errado nos commits da faixa. --no-renames mostra a origem de um
// arquivo renomeado.
// What is wrong with the lane commits. --no-renames shows the source of a
// renamed file.
function checkCommits(root, lane, ref) {
  const subjects = nulList(git(root, 'log', '-z', '--format=%s', `HEAD..${ref}`, '--'));
  if (!subjects.length) return { problems: [`${lane.id} sem commits — nada a mesclar`], touched: [] };
  const diff = git(root, 'diff', '--no-renames', '--name-only', '-z', SHOW_SUBMODULES, `HEAD...${ref}`, '--');
  const touched = nulList(diff);
  const allowed = new Set(lane.tarefas.flatMap((t) => t.arquivos.map(normFile)));
  const problems = [
    ...(touched.length ? [] : [`${lane.id} sem arquivos alterados — nada a mesclar`]),
    ...touched.filter((file) => !allowed.has(file)).map((file) => `fora da lista: ${file}`),
    ...tasksWithoutCommit(lane.tarefas, subjects).map(
      (id) => `${lane.id}: ${id} sem commit — nenhuma mensagem de commit da faixa começa pelo código dela`
    ),
  ];
  return { problems, touched };
}

// Devolve { exitCode, lines }: 0 pode mesclar, 1 faixa reprovada, 2 uso errado.
// Returns { exitCode, lines }: 0 may merge, 1 lane rejected, 2 wrong usage.
function judgeLane(config, featureName, laneId) {
  const { lane, error } = findLane(config, featureName, laneId);
  if (error) return error;
  const root = config.rootDir;
  const ref = `refs/heads/${lane.branch}`;
  if (!git(root, 'for-each-ref', '--format=%(refname)', ref).trim()) {
    return { exitCode: 1, lines: [`${lane.id}: a branch ${lane.branch} não existe`] };
  }
  const { problems, touched } = checkCommits(root, lane, ref);
  problems.push(
    ...uncommittedFiles(root, ref).map((file) => `${lane.id}: arquivo sem commit no worktree: ${file}`)
  );
  if (problems.length) return { exitCode: 1, lines: problems };
  return { exitCode: 0, lines: [`${lane.id}: ${touched.length} arquivo(s) tocado(s), todos permitidos`] };
}

// O comando da CLI: imprime o veredito e devolve o código de saída. Erro de uso
// vai para o stderr. Cada linha é limpa: nomes de arquivo vêm do executor.
// The CLI command: prints the verdict and returns the exit code. Usage errors go
// to stderr. Every line is sanitized: file names come from the executor.
export function conferirFaixa(config, featureName, laneId) {
  const { exitCode, lines } = judgeLane(config, featureName, laneId);
  const print = exitCode === 2 ? console.error : console.log;
  for (const line of lines) print(stripControl(line));
  return exitCode;
}
