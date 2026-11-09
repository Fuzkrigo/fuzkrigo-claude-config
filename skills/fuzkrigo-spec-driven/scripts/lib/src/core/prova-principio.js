// Prova dos testes de principio: a verificacao(teste) so vale com o teste
// etiquetado E com a prova de que ele passou no verify.
// Principle test proof: verificacao(teste) only holds with the tagged test AND
// the proof that it passed in verify.

// Prova que vale para o audit: com --feature, a dessa feature; sem filtro, a
// de timestamp mais recente do projeto.
// Proof that counts for the audit: with --feature, that feature's; without a
// filter, the project's most recent one.
export function proofForScope(verifications, feature) {
  if (feature !== null) return verifications[feature] || null;
  let latest = null;
  for (const proof of Object.values(verifications)) {
    const time = Date.parse(proof?.timestamp);
    if (Number.isNaN(time)) continue;
    if (!latest || time > Date.parse(latest.timestamp)) latest = proof;
  }
  return latest;
}

// Achado PRINCIPIO_SEM_PROVA para um principio com teste etiquetado, ou null.
// Sem resultado: aviso (vira erro no --ci). Falha ou pulo: erro para [DEVE],
// aviso nos outros niveis, como o PRINCIPIO_VIOLADO. Sem campo `feature`: e
// achado do projeto e sobrevive ao filtro.
// PRINCIPIO_SEM_PROVA finding for a principle with a tagged test, or null.
// No result: warning (error under --ci). Fail or skip: error for [DEVE],
// warning for other levels, like PRINCIPIO_VIOLADO. No `feature` field: it is
// a project finding and survives the filter.
export function principleProofFinding(principle, check, proof, location) {
  const tag = check.principleTag;
  const result = proof?.principles?.[tag];
  if (result?.status === 'pass') return null;
  if (!result) {
    return {
      code: 'PRINCIPIO_SEM_PROVA',
      severity: 'aviso',
      message: `${principle.id} tem teste @principle:${tag}, mas nenhum verify gravou o resultado dele — rode \`fuzkrigo-spec verify <feature>\``,
      ...location,
    };
  }
  const outcome =
    result.status === 'skip'
      ? 'foi PULADO na última verificação — pular não é prova'
      : 'FALHOU na última verificação';
  return {
    code: 'PRINCIPIO_SEM_PROVA',
    severity: principle.level === 'DEVE' ? 'erro' : 'aviso',
    message: `${principle.id} "${principle.title}": o teste @principle:${tag} ${outcome} (${result.testName || 'sem nome'})`,
    ...location,
  };
}
