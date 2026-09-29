# DLTechSup — Baixar Música

Aplicativo de desktop para baixar músicas do YouTube em **MP3**. É feito com **Electron + React** e usa o
[yt-dlp](engine/yt-dlp) como motor de download.

![Ícone](build/icon.png)

## Recursos

- Cole o link de um **vídeo** ou de uma **playlist** e escolha quais músicas baixar
- Qualidade de **128, 192, 256 ou 320 kbps**
- **Capa do álbum** e metadados (título e artista) gravados no MP3
- Fila de downloads com progresso, velocidade, tempo restante, cancelar e tentar de novo
- Escolha da pasta de destino (padrão: `Músicas/DLTechSup`)
- Tudo embutido: o usuário final **não precisa instalar Python, ffmpeg nem nada mais**

## Baixar o instalador

A cada push, o GitHub Actions (**Actions → Gerar instaladores**) gera:

| Sistema | Arquivo |
|---|---|
| Windows | `DLTechSup-Setup-1.0.0.exe` (instalador) e `DLTechSup-Portatil-1.0.0.exe` |
| macOS | `DLTechSup-1.0.0-mac-arm64.dmg` |
| Linux | `DLTechSup-1.0.0-linux-x86_64.AppImage` e `.deb` |

Abra a execução mais recente do workflow e baixe o artefato **DLTechSup-Windows** (ou o do seu sistema).
Para publicar uma versão em **Releases**, crie uma tag, por exemplo `git tag v1.0.0 && git push origin v1.0.0`.

> O instalador não é assinado digitalmente, então o Windows SmartScreen pode mostrar um aviso.
> Clique em **Mais informações → Executar assim mesmo**.

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
build/             ícone e licença do instalador
resources/bin/     binários empacotados (gerados: yt-dlp, ffmpeg, deno)
```

## Sobre o motor

`engine/yt-dlp` é o código-fonte do yt-dlp 2026.08.19, com uma única alteração: o extrator do site
Shahid (`shahid.py`) foi removido porque contém chaves de API públicas que o *push protection* do GitHub
bloqueia. Ele não tem relação com o YouTube.

## Aviso

Use o programa apenas para baixar conteúdo que você tem direito de baixar, respeitando os termos de uso
do YouTube e as leis de direitos autorais.
