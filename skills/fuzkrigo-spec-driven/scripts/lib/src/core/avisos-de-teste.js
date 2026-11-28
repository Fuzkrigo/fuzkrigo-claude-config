// Avisos do plano sobre os testes em `Arquivos:`. Em faixas, cada tarefa lista o
// próprio arquivo de teste: a conferência reprova o que estiver fora da lista.
// Plan warnings about tests in `Arquivos:`. In lanes, each task lists its own
// test file: the check rejects anything outside the list.

import path from 'path';
import { scaffoldTestFile } from './scaffold.js';

// Nomes reconhecidos como arquivo de teste. / Names recognized as test files.
const TEST_NAMES = [/^test_.*\.py$/, /_test\.py$/, /\.(test|spec)\.[cm]?[jt]sx?$/];

const isTestFile = (file) => TEST_NAMES.some((pattern) => pattern.test(path.posix.basename(file)));

// `tasks` com `files` já normalizados; tarefa sem arquivos não recebe aviso.
// `tasks` with already normalized `files`; a task without files gets no warning.
export function avisosDeTeste(tasks, config, featureName) {
  const scaffold = scaffoldTestFile(config, featureName);
  return tasks
    .filter((t) => t.files.length)
    .flatMap((t) => [
      ...(t.files.some(isTestFile)
        ? []
        : [
            `${t.id}: nenhum arquivo de teste em Arquivos: — liste o teste da tarefa, ou a conferência reprova o teste que o executor escrever`,
          ]),
      ...(t.files.includes(scaffold)
        ? [
            `${t.id} lista ${scaffold}, o arquivo de testes do scaffold — em faixas, use um arquivo de teste por tarefa (todas as tarefas que o listam caem na mesma faixa)`,
          ]
        : []),
    ]);
}
