# Sonora

**Desenvolvido por DLTechSup**

O Sonora é um aplicativo de desktop para baixar músicas do YouTube em **MP3**. É feito com **Electron + React** e usa o
[yt-dlp](engine/yt-dlp) como motor de download.

![Ícone](build/icon.png)

## Recursos

- Cole o link de um **vídeo** ou de uma **playlist** e escolha quais músicas baixar
- Qualidade de **128, 192, 256 ou 320 kbps**
- **Capa do álbum** e metadados (título e artista) gravados no MP3
- Fila de downloads com progresso, velocidade, tempo restante, cancelar e tentar de novo
- Escolha da pasta de destino (padrão: `Músicas/Sonora`)
- Tudo embutido: o usuário final **não precisa instalar Python, ffmpeg nem nada mais**

## Baixar o instalador

A cada push, o GitHub Actions (**Actions → Gerar instaladores**) gera:

| Sistema | Arquivo |
|---|---|
| Windows | `Sonora-Setup-1.0.0.exe` (instalador) e `Sonora-Portatil-1.0.0.exe` |
| macOS | `Sonora-1.0.0-mac-arm64.dmg` |
| Linux | `Sonora-1.0.0-linux-x86_64.AppImage` e `.deb` |

Abra a execução mais recente do workflow e baixe o artefato **Sonora-Windows** (ou o do seu sistema).
Para publicar uma versão em **Releases**, crie uma tag, por exemplo `git tag v1.0.0 && git push origin v1.0.0`.

> O instalador não é assinado digitalmente, então o Windows SmartScreen pode mostrar um aviso.
> Clique em **Mais informações → Executar assim mesmo**.

O instalador do Windows é personalizado com a marca DLTechSup: barra lateral e cabeçalho com a
arte do Sonora, página de boas-vindas em português, e **DLTechSup** como editor em
"Aplicativos instalados" e nas propriedades do `.exe`. As artes são geradas por
`scripts/make-installer-art.py` e a personalização fica em `build/installer.nsh`.

## Gerar o instalador na sua máquina

Pré-requisitos: **Node.js 20+** e **Python 3.10+**. Gere no próprio sistema de destino (o instalador de
Windows precisa ser gerado no Windows, porque o motor é compilado com PyInstaller).

```bash
npm install
npm run dist        # baixa ffmpeg e deno, compila o yt-dlp e gera o instalador em release/
```

Etapas separadas:

```bash
npm run deps        # copia o ffmpeg e baixa o deno para resources/bin
npm run engine      # compila engine/yt-dlp em resources/bin/yt-dlp(.exe) com PyInstaller
npm run build:ui    # gera a interface React em dist/
npx electron-builder --win   # ou --mac / --linux
```

## Desenvolvimento

```bash
npm install
npm run deps
npm run dev
```

Se `resources/bin/yt-dlp` ainda não existir, o app roda o motor direto do código-fonte
(`python -m yt_dlp` em `engine/yt-dlp`).

## Estrutura

```
electron/          processo principal (janela, IPC, execução do motor)
src/               interface React
engine/yt-dlp/     código-fonte do motor yt-dlp
scripts/           scripts de build (motor, dependências, ícone)
build/             ícone, artes, script e licença do instalador
resources/bin/     binários empacotados (gerados: yt-dlp, ffmpeg, deno)
```

## Sobre o motor

`engine/yt-dlp` é o código-fonte do yt-dlp 2026.08.19, com uma única alteração: o extrator do site
Shahid (`shahid.py`) foi removido porque contém chaves de API públicas que o *push protection* do GitHub
bloqueia. Ele não tem relação com o YouTube.

## Aviso

Use o programa apenas para baixar conteúdo que você tem direito de baixar, respeitando os termos de uso
do YouTube e as leis de direitos autorais.
