---
name: pipeline-corporativo
description: Templates, procedimentos e boilerplate para projetos VBA+Python+PyInstaller no ambiente corporativo Windows. Use esta skill SEMPRE que o contexto envolver criação de projeto novo nesta pasta, setup de ambiente Python/venv, estrutura de diretórios, comunicação IPC entre Excel e Python, configuração de logging, compilação com PyInstaller, deploy de .exe em rede, backup complementar de artefatos (.exe), export de módulos VBA, ou retomada de sessão de desenvolvimento. Também ativar quando o usuário mencionar robocopy, snapshot, .spec, argparse, dist/, ou qualquer procedimento de build/deploy corporativo. O versionamento de código é feito por Git/GitHub (ver skill `iniciar-projeto`); esta skill cobre os procedimentos técnicos do ambiente e o backup dos artefatos que ficam fora do repositório.
---

# Pipeline Corporativo — VBA + Python + PyInstaller

Skill de referência para os procedimentos técnicos do ambiente corporativo. Contém templates, comandos e boilerplate organizados por fase do ciclo de desenvolvimento.

## Triagem — Carregue Apenas o Necessário

| Situação | Carregar |
|----------|----------|
| Criando projeto novo ou montando estrutura de diretórios | `references/estrutura-setup.md` |
| Implementando comunicação Excel ↔ Python (argparse, VBA Shell, retorno) | `references/ipc-patterns.md` |
| Configurando logging (path condicional dev/prod, formato, o que logar) | `references/logging.md` |
| Compilando com PyInstaller, configurando .spec, ou fazendo deploy em rede | `references/build-deploy.md` |
| Backup de artefatos fora do Git (.exe em rede), export .bas para o repositório, robocopy | `references/backup.md` |

Na maioria das sessões, apenas 1-2 referências serão necessárias. Carregue com `view` apenas as relevantes.
