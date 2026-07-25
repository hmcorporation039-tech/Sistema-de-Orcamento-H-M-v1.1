@echo off
title H^&M Engenharia - Sistema
echo ================================
echo  H^&M Engenharia - Sistema
echo ================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "if (-not (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue)) { Write-Host 'Iniciando o sistema...'; Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','C:\HM-Engenharia\hm-eng\backend\scripts\iniciar-producao.ps1' -WindowStyle Hidden; Start-Sleep -Seconds 5 } else { Write-Host 'Sistema ja esta em execucao.' }"

echo.
echo Abrindo o sistema no navegador...
explorer.exe "http://localhost:3001"
