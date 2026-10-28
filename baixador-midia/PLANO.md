# PLANO.md — App Android para baixar música e vídeo (YouTube e Instagram)

## Objetivo
Criar um aplicativo Android nativo que baixa áudio (MP3/M4A) e vídeo (MP4) a partir de links do YouTube e do
Instagram, usando o motor yt-dlp embutido no próprio APK, sem exigir que o usuário instale Python ou qualquer outra coisa.

## Stack obrigatória
- Linguagem: Kotlin
- Interface: Jetpack Compose com Material 3
- Motor de download: biblioteca youtubedl-android (github.com/yausername/youtubedl-android), que já traz yt-dlp, Python e FFmpeg empacotados
  - Dependências: `io.github.junkfood02.youtubedl-android:library`, `:ffmpeg` (usar a versão estável mais recente)
- Arquitetura: MVVM + Coroutines + StateFlow
- Tarefas em segundo plano: WorkManager com notificação de progresso (foreground service)
- minSdk 24, targetSdk mais recente
- Referência de código aberto para consulta: app Seal (github.com/JunkFood02/Seal)

## Funcionalidades (MVP)
1. Campo para colar o link + botão "Colar" que lê a área de transferência.
2. Receber links pelo menu "Compartilhar" do Android (intent-filter ACTION_SEND text/plain) vindos do app do YouTube e do Instagram.
3. Ao colar o link, buscar e mostrar: miniatura, título, canal/autor e duração.
4. Escolha do formato:
   - Áudio: MP3 (padrão, 320 kbps quando possível) ou M4A
   - Vídeo: MP4 com seleção de qualidade (360p, 720p, 1080p, melhor disponível)
5. Download com barra de progresso, velocidade e tempo restante; botão cancelar.
6. Salvar em Download/NomeDoApp (Música e Vídeos separados) usando MediaStore.
7. Embutir capa e metadados (título, artista) no MP3.
8. Tela de Histórico com os arquivos baixados (abrir, compartilhar, apagar).
9. Botão em Configurações para atualizar o yt-dlp (`YoutubeDL.updateYoutubeDL`), pois YouTube e Instagram mudam com frequência.
10. Tratamento de erros com mensagens claras em português (link inválido, sem internet, conteúdo privado, falha no download).

## Inicialização
- Inicializar `YoutubeDL.getInstance().init(context)` e `FFmpeg.getInstance().init(context)` na classe Application.
- Pedir permissão de notificações (Android 13+).

## Identidade visual
- Nome do app: [DEFINIR]
- Cores principais: [DEFINIR]
- Estilo: [DEFINIR — ex.: escuro e moderno / colorido]
- Ícone: [DEFINIR]
- Todos os textos da interface em português do Brasil.
- Suporte a tema escuro e claro.

## Telas
- Início: campo de link, prévia do vídeo, escolha de formato e botão Baixar.
- Downloads: fila e progresso dos downloads em andamento.
- Histórico: lista do que já foi baixado.
- Configurações: pasta de destino, formato padrão, qualidade padrão, atualizar motor, tema.

## Entregáveis
- Projeto Android Studio completo e compilável.
- Instruções no README para gerar o APK (`./gradlew assembleRelease`) e assinar.
- Configurar `abiFilters` (arm64-v8a, armeabi-v7a) para reduzir o tamanho do APK.

## Observações
- O app não será publicado na Play Store (apps desse tipo violam as políticas dela); distribuição por APK.
- Uso destinado a conteúdo próprio ou com direito de download, respeitando os termos de uso das plataformas.

## Ordem de execução sugerida para o Claude Code
1. Criar o projeto e configurar dependências.
2. Inicializar o motor e testar um download simples de MP3.
3. Construir a tela Início com prévia e escolha de formato.
4. Implementar WorkManager com notificação de progresso.
5. Adicionar Histórico, Configurações e intent de compartilhamento.
6. Aplicar a identidade visual e gerar o APK.

---

## Decisões tomadas (itens [DEFINIR])
Ficaram em aberto no plano; foram escolhidos valores padrão, fáceis de trocar:

| Item | Escolha | Onde trocar |
|---|---|---|
| Nome do app | **Baixador de Mídia** | `res/values/strings.xml` |
| Cores | rosa `#FF5F8F` e violeta `#8B5CF6` (mesma identidade do Sonora) | `ui/theme/Theme.kt` |
| Estilo | escuro e moderno por padrão do sistema, com tema claro disponível | Configurações → Tema |
| Ícone | seta de download branca sobre degradê rosa→violeta (ícone adaptativo) | `res/drawable/ic_launcher_*.xml` |
| Pasta de destino | `Download/BaixadorMidia/Musicas` e `/Videos` | Configurações → Pasta de destino |
| Versões | youtubedl-android 0.18.1, Compose BOM 2024.12.01, AGP 8.7.3, Kotlin 2.0.21, targetSdk 35 | `app/build.gradle.kts` |
