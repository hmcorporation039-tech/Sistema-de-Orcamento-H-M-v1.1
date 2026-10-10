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

powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue; if ($c) { Write-Host ('Parando o backend atual (PID ' + $c.OwningProcess + ')...'); try { Stop-Process -Id $c.OwningProcess -Force } catch { Write-Host 'Nao consegui parar automaticamente; feche o node.exe pelo Gerenciador de Tarefas.' }; Start-Sleep -Seconds 2 } else { Write-Host 'Nenhum backend rodando na porta 3001 - vou apenas iniciar.' }; Write-Host 'Subindo o backend novo (oculto)...'; Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','C:\HM-Engenharia\hm-eng\backend\scripts\iniciar-producao.ps1' -WindowStyle Hidden; Start-Sleep -Seconds 8; try { $h = Invoke-RestMethod 'http://localhost:3001/health' -TimeoutSec 6; Write-Host ''; Write-Host ('OK: backend no ar. Versao reportada: ' + $h.versao) } catch { Write-Host ''; Write-Host 'Ainda subindo - aguarde ~10s e abra http://localhost:3001/health no navegador.' }"

echo.
echo ------------------------------------------------------------
echo Concluido.
echo Recarregue o sistema no navegador com Ctrl+F5.
echo ------------------------------------------------------------
echo.
pause
