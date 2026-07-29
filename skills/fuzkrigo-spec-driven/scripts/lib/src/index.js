// API pública programática do fuzkrigo-spec-driven.
// Use quando quiser embutir a auditoria num script/CI próprio em vez do CLI.

export { run as runCli } from './cli.js';
export { DEFAULT_CONFIG, loadConfig } from './config.js';
export { auditProject } from './core/audit.js';
export {
  adicionarLicao, carregarLicoes, LICOES_DEFAULTS, listarLicoes,
  penalizarLicao,
  podarLicoes, renderLicoes, salvarLicoes, sugerirLicoes
} from './core/licoes.js';
export { loadProject } from './core/project.js';
export { renderJson, renderMarkdown, renderTerminal } from './core/report.js';
export { scaffoldTests } from './core/scaffold.js';
export {
  buscarSinal, carregarSinais, registrarAchados,
  registrarVerify, salvarSinais, SINAIS_DEFAULTS
} from './core/sinais.js';
export { runVerify } from './core/verify.js';
export { parseConstitution } from './parsers/constitution.js';
export { allAcs, parseSpec } from './parsers/spec.js';
export { parseTasks } from './parsers/tasks.js';
