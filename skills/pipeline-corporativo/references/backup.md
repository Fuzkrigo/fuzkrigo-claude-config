# Backup Complementar ao Git

O versionamento de código é feito por **Git/GitHub** (histórico, branches, releases — ver skill `iniciar-projeto`). Este arquivo cobre apenas o que fica **fora** do repositório: o executável compilado e artefatos que não são código-fonte.

## Versionar módulos VBA no Git (.bas)

O `.xlsm` é binário e o Git não faz diff dele. Para ter histórico legível do VBA, exportar cada módulo como `.bas` e **commitar junto com o código Python**:

```
src/vba/NomeDoModulo.bas
```

Exportar sempre que alterar lógica VBA significativa, antes do commit. Assim o VBA entra no mesmo histórico do repositório, com diff linha a linha. O `.xlsm` em si permanece fora do Git (binário); os `.bas` são a fonte versionada.

## Backup do .exe em rede

O executável **não vai para o repositório** (é artefato grande e o Defender interfere nele). Destino: `S:\...\0 - Claude\1 - Backups\`. Procedimento de deploy e versionamento do `.exe`: `references/build-deploy.md` (seção Deploy em Rede).

## Mirror opcional de artefatos (robocopy)

Para redundância dos artefatos que ficam fora do Git (executáveis, `.xlsm` de produção), o mirror em rede continua útil. **Não é necessário para código-fonte** — esse já vive no GitHub.

```batch
robocopy "C:\Users\bruno.krieger\Desktop\FERTIPAR\0 - Claude\0 - Apps" "S:\...\0 - Claude\1 - Backups\mirror" /MIR /XD .venv dist __pycache__ .git /LOG:sync_backup.log
```

`/MIR` espelha origem no destino. Excluir `.git` do mirror — o repositório é a fonte de verdade do código, não precisa ser espelhado por robocopy.
