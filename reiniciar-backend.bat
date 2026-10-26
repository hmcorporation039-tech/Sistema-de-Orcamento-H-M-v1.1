@echo off
REM O backend de producao roda como administrador (iniciado pelo atalho de
REM inicializacao). Sem elevacao, o Stop-Process falha com "Acesso negado" e o
REM backend novo nao sobe (porta 3001 ocupada) - entao pede elevacao sozinho.
net session >nul 2>&1
if errorlevel 1 (
  echo Pedindo permissao de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
title Reiniciar backend - HM Engenharia
echo ============================================================
echo   Reiniciar o backend do Sistema de Orcamentos
echo ============================================================
echo.
echo Isto PARA o backend que esta rodando na porta 3001 e sobe um
echo novo, para as mudancas de codigo (backend) entrarem em vigor.
echo Nao afeta o banco de dados nem seus arquivos.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\scripts\reiniciar.ps1"

echo.
echo ------------------------------------------------------------
echo Concluido.
echo Recarregue o sistema no navegador com Ctrl+F5.
echo ------------------------------------------------------------
echo.
pause
