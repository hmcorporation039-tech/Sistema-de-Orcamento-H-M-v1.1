@echo off
REM ============================================================
REM   Atualizacao do Sistema de Orcamentos H&M
REM   O que faz: instala dependencias do backend, roda os testes,
REM   instala dependencias do frontend e gera o build de producao.
REM   NAO reinicia o backend (voce faz isso no final).
REM   Coloque este arquivo na pasta que contem "backend" e "frontend".
REM ============================================================
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Atualizacao do Sistema de Orcamentos H^&M
echo ============================================================
echo.
echo Pasta base: %CD%
echo.

if not exist "%~dp0backend" (
  echo ERRO: nao encontrei a pasta "backend" aqui.
  echo Coloque este .bat na pasta que contem backend\ e frontend\.
  goto :fim
)
if not exist "%~dp0frontend" (
  echo ERRO: nao encontrei a pasta "frontend" aqui.
  echo Coloque este .bat na pasta que contem backend\ e frontend\.
  goto :fim
)

REM --- 1/4) Backend: instalar dependencias ---
echo [1/4] Instalando dependencias do backend (npm install)...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 goto :erro_npm
echo    OK: dependencias do backend instaladas.
echo.

REM --- 2/4) Backend: testes ---
echo [2/4] Rodando os testes do backend (npm test)...
call npm test
if errorlevel 1 (
  echo.
  echo    AVISO: algum teste falhou. Veja a saida acima.
  echo    A instalacao seguiu; vale conferir os testes depois.
  echo.
) else (
  echo    OK: testes passaram.
  echo.
)

REM --- 3/4) Frontend: instalar dependencias ---
echo [3/4] Instalando dependencias do frontend (npm install)...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto :erro_npm
echo    OK: dependencias do frontend instaladas.
echo.

REM --- 4/4) Frontend: build de producao ---
echo [4/4] Gerando o build de producao do frontend (npm run build)...
call npm run build
if errorlevel 1 goto :erro_npm
echo    OK: build do frontend gerado.
echo.

echo ============================================================
echo   TUDO PRONTO
echo ============================================================
echo.
echo Agora REINICIE o backend para as mudancas valerem:
echo   - Feche o processo node.exe atual (Gerenciador de Tarefas)
echo     ou pare/inicie do jeito que voce ja usa.
echo.
echo Depois confira em: http://localhost:3001/health
echo (deve responder com o status e a versao)
echo.
goto :fim

:erro_npm
echo.
echo ============================================================
echo   ERRO ao rodar o npm. Veja a mensagem acima.
echo   IMPORTANTE: NAO reinicie o backend ate resolver isto,
echo   senao ele nao sobe (faltaria o modulo "helmet").
echo ============================================================

:fim
echo.
pause
endlocal
