# InstaNavegador

**Desenvolvido por DLTechSup**

Um navegador feito **só para o Instagram**, com um objetivo: **baixar fotos, vídeos e Reels**.

Você entra na sua conta e navega como no site normal. Ao passar o mouse sobre uma foto, vídeo ou Reel aparece o botão
**⬇ Baixar**. Tudo o que aparece na tela também entra no painel **Mídias**, onde dá para baixar várias de uma vez.

## Como usar

1. Abra o programa (na primeira vez aparece um aviso explicando o propósito).
2. Entre na sua conta do Instagram. O login fica salvo só neste programa, separado do seu navegador.
3. Abra um perfil, post ou Reel (ou cole o link / digite `@usuario` na barra de endereço).
4. Passe o mouse sobre a mídia e clique em **⬇ Baixar**, ou use o painel **Mídias**.

Os arquivos vão para `Imagens/InstaNavegador/<usuario>/` (a pasta pode ser trocada no painel).

## Recursos

- Botão **Baixar** sobre fotos, vídeos e Reels, e também no menu do botão direito ("Baixar esta imagem")
- Baixa a foto na **maior resolução** que o Instagram entregou à página
- Carrosséis: cada foto/vídeo do post vira um item
- Painel com miniaturas, filtros (Fotos / Vídeos / Reels), seleção, progresso e fila
- Sem API, sem cookie para copiar, sem motor externo: o programa lê o que a própria página já carregou

## Como funciona

A página do Instagram abre numa janela de navegador (Electron). O programa lê as respostas que o próprio site já
recebe quando você navega (os dados dos posts, com os links das fotos e vídeos) e, como reserva, as imagens visíveis na
tela. Como quem navega é a sua conta logada, não há bloqueio por "acesso sem login".

## Limites

- Um vídeo só pode ser baixado depois que o Instagram carregou os dados dele (abra o Reel, deixe começar a tocar).
- Stories e mensagens privadas não são tratados.
- O Instagram muda o site com frequência; se algo parar de funcionar, o código que lê os dados pode precisar de ajuste
  (fica em `electron/media.cjs`).
- Navegar e baixar muito rápido pode fazer o Instagram limitar a conta. Use com calma.
- Baixe apenas conteúdo seu ou que você tenha permissão para baixar. O programa não tem relação com o Instagram/Meta.

## Gerar o executável no Windows

Dê **dois cliques em `gerar-instalador.bat`**. Ele verifica o Node.js 20+ (oferece instalar pelo `winget`), instala as
dependências e cria na pasta `release`:

| Arquivo | O que é |
|---|---|
| `InstaNavegador-Setup-1.0.0.exe` | instalador com atalhos |
| `InstaNavegador-Portatil-1.0.0.exe` | versão portátil, não precisa instalar |

O GitHub Actions (**Actions → Gerar InstaNavegador (Windows)**) também gera esses arquivos.
Não é preciso Python: o programa é só Electron + React.

> O instalador não é assinado digitalmente, então o Windows SmartScreen pode mostrar um aviso.
> Clique em **Mais informações → Executar assim mesmo**.

## Desenvolvimento

```bash
cd instanavegador
npm install
npm run dev      # interface com recarga automática dentro do Electron
npm test         # testa a leitura dos dados do Instagram
```

## Estrutura

```
electron/main.cjs          janela, navegador do Instagram, fila de downloads
electron/media.cjs         extrai fotos/vídeos/Reels dos dados do Instagram
electron/page-preload.cjs  botão "Baixar" dentro da página do Instagram
electron/downloader.cjs    baixa os arquivos para o disco
src/                       interface React (barra, painel de mídias, aviso)
```
