# Baixador de Mídia (Android)

**Desenvolvido por DLTechSup**

Aplicativo Android nativo (Kotlin + Jetpack Compose) que baixa **áudio (MP3/M4A)** e **vídeo (MP4)** de links do
**YouTube** e do **Instagram**. O motor **yt-dlp** (com Python e FFmpeg) vai dentro do próprio APK, então o usuário
não instala mais nada. O plano completo está em [PLANO.md](PLANO.md).

## Recursos

- Campo de link, botão **Colar** e recebimento de links pelo menu **Compartilhar** do YouTube/Instagram
- Prévia com miniatura, título, canal/autor e duração
- Áudio **MP3 (320 kbps)** ou **M4A**; vídeo **MP4** em 360p, 720p, 1080p ou melhor disponível
- Capa e metadados (título e artista) gravados no arquivo de áudio
- Downloads em segundo plano com notificação de progresso, velocidade, tempo restante e **cancelar**
- Salva em `Download/BaixadorMidia/Musicas` e `Download/BaixadorMidia/Videos` (MediaStore; o nome da pasta é configurável)
- **Histórico** (abrir, compartilhar, apagar) e **Configurações** (formato, qualidade, pasta, tema, atualizar o motor)
- Mensagens de erro em português; tema claro e escuro (escuro por padrão do sistema)

## Como gerar o APK

Requisitos: **Android Studio** (Koala ou mais novo) ou **JDK 17 + Android SDK 35**.

**Pelo Android Studio:** abra a pasta `baixador-midia`, espere o Gradle sincronizar e use
*Build → Build APK(s)* (ou rode no celular com o botão ▶).

**Pela linha de comando:**

```bash
cd baixador-midia
./gradlew assembleRelease        # Windows: gradlew.bat assembleRelease
```

O APK sai em `app/build/outputs/apk/release/app-release.apk`.

### Assinar o APK

Sem configuração, o `assembleRelease` assina com a chave de **debug** (instala, mas não serve para distribuir).
Para assinar com a sua chave:

```bash
keytool -genkeypair -v -keystore meu-app.jks -alias baixador -keyalg RSA -keysize 2048 -validity 10000
cp keystore.properties.example keystore.properties   # preencha com os seus dados
./gradlew assembleRelease
```

O `keystore.properties` e os `.jks` são ignorados pelo git. **Guarde a chave com cuidado**: sem ela não dá para
atualizar o app já instalado.

O APK usa só `arm64-v8a` e `armeabi-v7a` (celulares reais) para ficar menor. O Python e o FFmpeg embutidos fazem o
APK ter algumas dezenas de MB.

## Estrutura

```
app/src/main/java/com/dltechsup/baixadormidia/
  App.kt, MainActivity.kt        inicialização do motor, permissões e Compartilhar
  engine/Engine.kt               youtubedl-android: info, opções do yt-dlp, atualizar, erros em português
  engine/DownloadWorker.kt       WorkManager + serviço em primeiro plano + notificação
  engine/DownloadQueue.kt        fila e estado dos downloads
  data/                          configurações (DataStore), histórico, salvar no MediaStore
  ui/                            telas Compose: Início, Downloads, Histórico, Configurações
```

## Observações

- O yt-dlp precisa de atualização com frequência (YouTube e Instagram mudam): use **Configurações → Atualizar motor**.
- Conteúdo privado do Instagram, ou que exija login, não é baixado (o app não faz login).
- O app não será publicado na Play Store; a distribuição é por APK.
- Use apenas com conteúdo seu ou que você tenha direito de baixar, respeitando os termos de uso das plataformas.

## Estado do projeto

O código foi escrito seguindo a API do youtubedl-android 0.18.1, mas **ainda não foi compilado nem testado em um
aparelho**. Na primeira compilação podem aparecer pequenos ajustes (versões de dependências, avisos do Gradle).
