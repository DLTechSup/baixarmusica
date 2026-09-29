@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Sonora - Gerar instalador (DLTechSup)
cd /d "%~dp0"

echo.
echo  ==========================================================
echo     SONORA  -  Gerador do instalador para Windows
echo     Desenvolvido por DLTechSup
echo  ==========================================================
echo.
echo  Este script faz todo o processo:
echo    1. Verifica o Node.js e o Python
echo    2. Instala as dependencias do projeto
echo    3. Baixa o ffmpeg e o deno
echo    4. Compila o motor yt-dlp (PyInstaller)
echo    5. Gera a interface
echo    6. Cria o instalador e a versao portatil
echo.

rem ---------------------------------------------------------------
rem 1. Pre-requisitos
rem ---------------------------------------------------------------
rem Em servidores de build (CI) o script roda sem pausas.
echo [1/6] Verificando pre-requisitos...

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  [ERRO] Node.js nao encontrado.
    call :oferecer_instalacao "Node.js" "OpenJS.NodeJS.LTS" "https://nodejs.org"
    goto :falha
)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
    echo  [ERRO] Node.js 20 ou mais novo e necessario. Versao encontrada: %NODE_MAJOR%
    call :oferecer_instalacao "Node.js" "OpenJS.NodeJS.LTS" "https://nodejs.org"
    goto :falha
)
for /f %%v in ('node -v') do echo        Node.js %%v  OK

set "PYTHON="
py -3 -c "import sys; assert sys.version_info >= (3, 10)" >nul 2>nul && set "PYTHON=py -3"
if not defined PYTHON (
    python -c "import sys; assert sys.version_info >= (3, 10)" >nul 2>nul && set "PYTHON=python"
)
if not defined PYTHON (
    echo.
    echo  [ERRO] Python 3.10 ou mais novo nao encontrado.
    call :oferecer_instalacao "Python" "Python.Python.3.12" "https://www.python.org/downloads/"
    goto :falha
)
for /f "delims=" %%v in ('%PYTHON% --version') do echo        %%v  OK
rem O script do motor usa a variavel PYTHON para achar o interpretador
for /f "delims=" %%p in ('%PYTHON% -c "import sys; print(sys.executable)"') do set "PYTHON=%%p"
echo.

rem ---------------------------------------------------------------
rem 2. Dependencias do projeto
rem ---------------------------------------------------------------
echo [2/6] Instalando dependencias (npm)...
if exist package-lock.json (
    call npm ci
) else (
    call npm install
)
if errorlevel 1 goto :falha
echo.

rem ---------------------------------------------------------------
rem 3. ffmpeg e deno
rem ---------------------------------------------------------------
echo [3/6] Preparando ffmpeg e deno...
call npm run deps
if errorlevel 1 goto :falha
echo.

rem ---------------------------------------------------------------
rem 4. Motor yt-dlp
rem ---------------------------------------------------------------
echo [4/6] Compilando o motor yt-dlp (pode levar alguns minutos)...
call npm run engine
if errorlevel 1 goto :falha
"resources\bin\yt-dlp.exe" --version >nul 2>nul
if errorlevel 1 (
    echo  [ERRO] O motor foi gerado, mas nao executou corretamente.
    goto :falha
)
for /f %%v in ('resources\bin\yt-dlp.exe --version') do echo        Motor yt-dlp %%v  OK
echo.

rem ---------------------------------------------------------------
rem 5. Interface
rem ---------------------------------------------------------------
echo [5/6] Gerando a interface...
call npm run build:ui
if errorlevel 1 goto :falha
echo.

rem ---------------------------------------------------------------
rem 6. Instalador
rem ---------------------------------------------------------------
echo [6/6] Criando o instalador...
if exist release rmdir /s /q release
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win --publish never
if errorlevel 1 goto :falha

echo.
echo  ==========================================================
echo     PRONTO! Arquivos gerados na pasta "release":
echo  ==========================================================
for %%f in (release\*.exe) do echo     - %%~nxf
echo.
echo  Sonora-Setup-*.exe     = instalador (com atalhos)
echo  Sonora-Portatil-*.exe  = versao portatil (nao precisa instalar)
echo.
if not defined CI (
    start "" explorer "%~dp0release"
    pause
)
exit /b 0

rem ---------------------------------------------------------------
:oferecer_instalacao
rem %1 = nome, %2 = id do winget, %3 = site
where winget >nul 2>nul
if errorlevel 1 (
    echo  Baixe e instale o %~1 em: %~3
    exit /b 0
)
echo.
choice /c SN /m " Deseja instalar o %~1 agora pelo winget"
if errorlevel 2 (
    echo  Baixe e instale o %~1 em: %~3
    exit /b 0
)
winget install -e --id %~2 --accept-package-agreements --accept-source-agreements
echo.
echo  Instalacao concluida. FECHE esta janela e rode o gerar-instalador.bat de novo
echo  para que o Windows reconheca o %~1.
exit /b 0

:falha
echo.
echo  ==========================================================
echo     Ocorreu um erro. Veja as mensagens acima.
echo  ==========================================================
echo.
if not defined CI pause
exit /b 1
