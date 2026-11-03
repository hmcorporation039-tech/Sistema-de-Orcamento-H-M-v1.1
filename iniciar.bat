@echo off
title H^&M Engenharia - Sistema
echo ================================
echo  H^&M Engenharia - Sistema
echo ================================
echo.

rem Porta do backend\.env (PORT; padrao 3001), como o reiniciar.ps1: no ambiente
rem de teste (3002) a porta fixa 3001 abria a PRODUCAO.
set "PORTA=3001"
if exist "%~dp0backend\.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0backend\.env") do (
    if /i "%%A"=="PORT" set "PORTA=%%B"
  )
)
set "PORTA=%PORTA: =%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "if (-not (Get-NetTCPConnection -LocalPort %PORTA% -ErrorAction SilentlyContinue)) { Write-Host 'Iniciando o sistema...'; Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0backend\scripts\iniciar-producao.ps1' -WindowStyle Hidden; Start-Sleep -Seconds 5 } else { Write-Host 'Sistema ja esta em execucao.' }"

echo.
echo Abrindo o sistema no navegador (porta %PORTA%)...
explorer.exe "http://localhost:%PORTA%"
