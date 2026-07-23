# Segurança da Cadeia de Suprimentos (Supply Chain)

Comprometer uma dependência costuma ser mais fácil do que atacar a aplicação diretamente. Como você instala pacotes via pip, esta é uma superfície de ataque real e recorrente. Corresponde ao A03 do OWASP Top 10 2025 (categoria nova). Carregar ao adicionar dependências, configurar CI, ou distribuir executáveis.

## Os vetores de ataque

- **Typosquatting** — atacante publica pacote com nome parecido com um popular (`reqests` em vez de `requests`, `python-dateutil` vs. um clone malicioso). Um erro de digitação instala malware. Grande parte dos pacotes typosquatted flagrados contém malware ativo.
- **Dependency confusion** — atacante publica no repositório **público** (PyPI) um pacote com o mesmo nome de um pacote **interno/privado** da sua organização, com número de versão mais alto. O resolvedor pode puxar o público malicioso em vez do interno. O pip é comprovadamente vulnerável a isso.
- **Account takeover / pacote sequestrado** — mantenedor legítimo tem a conta comprometida e uma versão envenenada de um pacote confiável é publicada. Já aconteceu com pacotes de milhões de downloads.
- **Instalação executa código** — o pip pode executar código durante a instalação (setup.py). Um pacote malicioso ganha execução na sua máquina de dev ou no runner de CI só por ser instalado.

## Defesas

**Ao adicionar uma dependência:**
- Conferir o nome caractere a caractere. Instalar do nome exato e oficial, nunca de sugestão de terceiro.
- Verificar reputação: idade do projeto, número de mantenedores, downloads, último update, issues abertas sobre segurança.
- Auditar antes de fixar: última atualização, CVEs conhecidas, licença.
- Preferir bibliotecas maduras e populares (mais olhos, menos surpresa).

**No projeto (contínuo):**
- **Lockfile commitado** — pin de versões exatas (`requirements.txt` com `==` ou lockfile). Builds reproduzíveis.
- **`pip-audit`** — escanear dependências (diretas e transitivas) contra bancos de CVE. Rodar no CI a cada mudança.
- **SBOM** — manter um Software Bill of Materials: inventário do que o projeto usa, para responder rápido "estou afetado?" quando uma CVE sai.
- **Cadência de atualização** — atualizações de segurança têm prioridade alta; não deixar dependências apodrecerem.

**Contra dependency confusion (se houver pacotes internos):**
- Travar o resolvedor a registries aprovados; não deixar o pip cair no PyPI público para nomes internos.
- Reservar/escopar os nomes internos.

## Cadeia de build (PyInstaller)

O executável distribuído é parte da cadeia. Pontos de atenção:
- **O que vai embutido** — o PyInstaller empacota tudo; garantir que segredos não sejam embarcados no binário (nada de `.env` ou chaves dentro do `.exe`).
- **Integridade** — o `.exe` em rede pode ser adulterado. Considerar checksum publicado junto, e code signing quando viável.
- **Runner/máquina de build limpos** — se o ambiente que compila estiver comprometido, o artefato sai comprometido. O CI/CD é produção (A08): hardening, acesso mínimo, auditoria.
