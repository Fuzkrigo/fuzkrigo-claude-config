# Releases — Versionamento, Tags e Changelog

Cada **Milestone** concluída vira um **Release**. Padrão único para todos os projetos. Texto sempre em português BR, sem emojis, sem menção a IA ou coautoria.

**Divisão de execução.** O CHANGELOG.md e o texto do release são **gerados automaticamente por mim** — é documentação. O que fica manual do usuário é a parte Git: commit do changelog, criação de tag, release e fechamento da milestone. Aviso quando a milestone está pronta e entrego changelog, texto e comandos prontos — nunca executo tag ou release no lugar dele.

## Índice
- [Versionamento (SemVer)](#versionamento-semver)
- [Tags](#tags)
- [Estrutura do texto de release](#estrutura-do-texto-de-release)
- [CHANGELOG.md](#changelogmd)
- [Ritual de release](#ritual-de-release)

## Versionamento (SemVer)

Formato `vMAJOR.MINOR.PATCH`, ex.: `v1.2.0`.

| Parte | Incrementa quando…                                        |
| ----- | --------------------------------------------------------- |
| MAJOR | mudança incompatível / breaking change                    |
| MINOR | nova funcionalidade compatível com versões anteriores     |
| PATCH | correção de bug compatível                                |

Antes de `v1.0.0`, o projeto está em desenvolvimento inicial: `v0.x.y`. A `v1.0.0` marca a primeira versão de produção estável.

## Tags

A tag Git carrega a versão e é o que amarra o release ao commit exato.

```bash
git tag -a v0.1.0 -m "v0.1.0 - MVP Parser"
git push origin v0.1.0
```

Usar sempre tag anotada (`-a`), não leve, para guardar autor e data.

## Estrutura do texto de release

Formato baseado em Keep a Changelog, com títulos em português. Incluir só as seções que tiverem conteúdo:

```markdown
## v0.1.0 - MVP Parser

Primeira entrega funcional do extrator de intimacoes.

### Adicionado
- Parser de eventos R-4010 do REINF
- Exportacao de resumo em Excel

### Alterado
- Interface de selecao de arquivos simplificada

### Corrigido
- Encoding UTF-8 na exportacao no Windows

### Removido
- Modo legado de leitura por regex
```

Seções possíveis: **Adicionado**, **Alterado**, **Descontinuado**, **Removido**, **Corrigido**, **Seguranca**.

## CHANGELOG.md

Manter um `CHANGELOG.md` na raiz, acumulando todas as versões (mais recente no topo). O texto de cada release é a seção correspondente do CHANGELOG. Topo do arquivo com uma seção `## [Nao lancado]` para acumular mudanças em andamento antes de virarem versão.

## Ritual de release

Quando a milestone termina, eu **monto o CHANGELOG.md e o texto do release automaticamente** a partir das issues fechadas e dos commits da milestone (é documentação, não faz parte do que o usuário treina no Git). O usuário só executa o que é dele: commit do changelog, tag, release e fechamento da milestone. Bloco a entregar (adaptado à versão):

```bash
# 1. Garantir main atualizada e todas as issues da milestone fechadas
git checkout main
git pull origin main

# 2. CHANGELOG.md e texto do release ja preparados por mim automaticamente
#    (movi "Nao lancado" para a nova versao e gerei o release-vX.Y.Z.md)

# 3. Commitar o changelog
git add CHANGELOG.md
git commit -m "docs(changelog): consolidar v0.1.0"
git push origin main

# 4. Criar a tag anotada
git tag -a v0.1.0 -m "v0.1.0 - MVP Parser"
git push origin v0.1.0

# 5. Criar o release no GitHub a partir da tag e do changelog
gh release create v0.1.0 \
  --title "v0.1.0 - MVP Parser" \
  --notes-file /tmp/release-v0.1.0.md

# 6. Se o projeto gera executavel (PyInstaller), anexar o .exe
gh release upload v0.1.0 dist/app.exe

# 7. Fechar a milestone
gh api repos/:owner/:repo/milestones/1 -X PATCH -f state=closed
```

Checklist antes de liberar o release:
- Todas as issues da milestone estão Done.
- CHANGELOG.md e texto do release gerados por mim e revisados pelo usuário.
- Tag anotada criada e enviada.
- Texto do release sem emojis e sem menção a IA.
- Assets anexados quando aplicável (ex.: `.exe`).
