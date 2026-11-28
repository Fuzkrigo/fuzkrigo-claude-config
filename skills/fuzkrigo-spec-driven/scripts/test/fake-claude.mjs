// `claude` falso das suites de faixas, chamado pelo atalho que o fakeClaude grava
// no PATH. Registra a chamada, emite os eventos pedidos e, como um executor de
// verdade, commita um arquivo permitido da tarefa que veio no prompt. Não é uma
// suite (sem .test.).
// Fake `claude` of the lane suites, called by the shim fakeClaude writes on PATH.
// It records the call, emits the requested events and, like a real executor,
// commits one allowed file of the task found in the prompt. Not a suite (no
// .test. in the name).

import { spawnSync } from 'child_process';
import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';

const [configFile, ...args] = process.argv.slice(2);
const config = JSON.parse(readFileSync(configFile, 'utf-8'));
const call = args.join(' ');

function git(...gitArgs) {
  const proc = spawnSync('git', gitArgs, { encoding: 'utf-8' });
  if (proc.status !== 0) throw new Error(`claude falso: git ${gitArgs[0]} falhou: ${proc.stderr}`);
}

function touch(file, taskId) {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${taskId}\n`);
}

// A tarefa sequencial não lista arquivos: nada é commitado.
// A sequential task lists no files: nothing is committed.
function work(prompt) {
  const commit = /mensagem de commit: "((T-\d+)[^"]*)"/.exec(prompt);
  const allowed = /arquivos permitidos \([^)]*\): (.+)/.exec(prompt)?.[1];
  if (!commit || !allowed || allowed.startsWith('(')) return;
  const [, message, taskId] = commit;
  if (config.commit && !config.skipCommit.includes(taskId)) {
    const files = [allowed.split(', ')[0], config.extraFiles[taskId]].filter(Boolean);
    for (const file of files) touch(file, taskId);
    git('add', '--', ...files);
    git('commit', '-q', '-m', message);
  }
  if (config.leftovers[taskId]) touch(config.leftovers[taskId], taskId);
}

appendFileSync(config.log, `CALL\n${call}\n`);
for (const line of config.events) process.stdout.write(`${line}\n`);
if (config.stderr) process.stderr.write(`${config.stderr}\n`);
// exitCode em vez de process.exit: não corta a saída que ainda está no pipe.
// exitCode instead of process.exit: does not truncate output still in the pipe.
if (config.exitCode !== 0 && call.includes(config.failOn)) process.exitCode = config.exitCode;
else work(args[1]);
