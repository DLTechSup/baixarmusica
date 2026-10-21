@echo off
setlocal EnableExtensions
chcp 65001 >nul
title InstaNavegador - Gerar instalador (DLTechSup)
cd /d "%~dp0"

echo.
echo  ==========================================================
echo     INSTANAVEGADOR  -  Gerador do instalador para Windows
echo     Desenvolvido por DLTechSup
echo  ==========================================================
echo.
echo  Este script faz todo o processo:
echo    1. Verifica o Node.js
echo    2. Instala as dependencias do projeto
echo    3. Gera a interface
echo    4. Cria o instalador e a versao portatil
echo.

echo [1/4] Verificando o Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  [ERRO] Node.js nao encontrado.
    call :oferecer_instalacao
    goto :falha
)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
    echo  [ERRO] Node.js 20 ou mais novo e necessario. Versao encontrada: %NODE_MAJOR%
    call :oferecer_instalacao
    goto :falha
)
for /f %%v in ('node -v') do echo        Node.js %%v  OK
echo.

echo [2/4] Instalando dependencias (npm)...
if exist package-lock.json (
    call npm ci
) else (
    call npm install
)
if errorlevel 1 goto :falha
echo.

echo [3/4] Gerando a interface...
call npm run build:ui
if errorlevel 1 goto :falha
echo.

echo [4/4] Criando o instalador...
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
echo  InstaNavegador-Setup-*.exe     = instalador (com atalhos)
echo  InstaNavegador-Portatil-*.exe  = versao portatil (nao precisa instalar)
echo.
if not defined CI (
    start "" explorer "%~dp0release"
    pause
)
exit /b 0

:oferecer_instalacao
where winget >nul 2>nul
if errorlevel 1 (
    echo  Baixe e instale o Node.js em: https://nodejs.org
    exit /b 0
)
echo.
choice /c SN /m " Deseja instalar o Node.js agora pelo winget"
if errorlevel 2 (
    echo  Baixe e instale o Node.js em: https://nodejs.org
    exit /b 0
)
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo.
echo  Instalacao concluida. FECHE esta janela e rode o gerar-instalador.bat de novo
echo  para que o Windows reconheca o Node.js.
exit /b 0

:falha
echo.
echo  ==========================================================
echo     Ocorreu um erro. Veja as mensagens acima.
echo  ==========================================================
echo.
if not defined CI pause
exit /b 1
