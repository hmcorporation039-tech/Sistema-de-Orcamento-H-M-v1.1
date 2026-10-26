@echo off
REM Ajustes de seguranca/disponibilidade que exigem administrador (auditoria
REM de 25/10/2026). Detalhes de cada passo em backend\scripts\configurar-seguranca.ps1.
REM Para o backend subir mesmo sem login no Windows:  configurar-seguranca.bat -RodarSemLogin
net session >nul 2>&1
if errorlevel 1 (
  echo Pedindo permissao de administrador...
  if "%~1"=="" (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  ) else (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs"
  )
  exit /b
)
title Configurar seguranca - HM Engenharia
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\scripts\configurar-seguranca.ps1" %*
echo.
pause
