# LGPD (Checklist Ativado Quando Aplicável)

**Este checklist deve ser rodado sempre que o projeto lidar com dados pessoais.** Se o projeto não lida, pular.

## Classificação de Dados
- **Dados pessoais**: nome, e-mail, telefone, CPF, endereço, IP, cookies identificadores.
- **Dados pessoais sensíveis** (Art. 5º, II da LGPD): origem racial, convicção religiosa, opinião política, saúde, biometria, dados genéticos, orientação sexual.
- **Dados fiscais corporativos**: CPF de funcionários, dados bancários, folhas de pagamento — tratar com rigor de dado sensível no contexto corporativo, mesmo que não caia formalmente na categoria sensível da LGPD.

## Checklist Operacional
- [ ] **Privacy by Design**: privacidade considerada desde a concepção, não como patch posterior.
- [ ] **Minimização**: coletar apenas os dados estritamente necessários para a finalidade.
- [ ] **Finalidade**: cada dado coletado tem finalidade clara e documentada.
- [ ] **Consentimento**: quando aplicável, coletado de forma específica e destacada.
- [ ] **Criptografia**: dados sensíveis criptografados em repouso (AES-256) e em trânsito (TLS).
- [ ] **Pseudonimização**: em logs e analytics, usar hashes ou IDs opacos no lugar do dado real.
- [ ] **Mascaramento**: CPF aparece como `***.***.***-12` em telas e relatórios não essenciais.
- [ ] **Acesso restrito**: só pessoal autorizado por função acessa dados sensíveis.
- [ ] **Logs de acesso**: toda consulta a dado sensível registrada com quem, quando, por quê.
- [ ] **Retenção**: prazo definido para cada tipo de dado; expurgo automático ao final.
- [ ] **Direito ao esquecimento**: implementar capacidade de eliminar dados de um titular sob solicitação.
- [ ] **Backups também seguem LGPD**: criptografados, com mesmo controle de retenção.
- [ ] **Logs não contêm dados pessoais em claro** — nunca logar CPF, e-mail, senha, nome completo sem necessidade justificada.

## Transparência ao Titular
Quando o sistema é usado por pessoas cujos dados são coletados, a LGPD exige que o titular saiba o que acontece com seus dados. Implicações de engenharia, não só jurídicas:

- [ ] **Declaração de dados coletados**: informar de forma clara e acessível quais dados são coletados e para quê (aviso de privacidade). O usuário não deve precisar adivinhar.
- [ ] **Termos de uso / política de privacidade** (quando o sistema tem usuários externos): documento acessível descrevendo tratamento, finalidade, retenção e direitos do titular.
- [ ] **Registro de aceite**: se há consentimento, registrar quando e a qual versão dos termos o titular consentiu (aceite versionado — se os termos mudam, o registro reflete qual versão foi aceita).
- [ ] **Canal para exercício de direitos**: forma de o titular solicitar acesso, correção ou eliminação dos próprios dados.

Para sistemas internos corporativos (uso apenas por funcionários, sem coleta de terceiros externos), termos de uso formais podem não se aplicar — mas a finalidade documentada e o controle de acesso continuam valendo.

## Ao Usar IA com Dados da Empresa
- **Nunca colar dados reais de terceiros** em prompts de IA pública.
- Usar dados sintéticos/anonimizados para exemplos.
- Se precisar discutir estrutura de dados reais, mascarar os valores.
