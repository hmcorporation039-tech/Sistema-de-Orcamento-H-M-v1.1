@echo off
REM Registra no Agendador de Tarefas do Windows o monitor que avisa por e-mail se o sistema sair do ar.
REM Roda a cada 5 minutos (backend\scripts\monitorar-saude.js). Rode como administrador, uma vez.
REM Para o sistema de PRODUCAO, rode o .bat que esta em C:\HM-Engenharia\hm-eng\registrar-monitor-saude.bat.
net session >nul 2>&1
if errorlevel 1 (
  echo Pedindo permissao de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
title Registrar o monitor de saude - HM Engenharia
set "BACKEND=%~dp0backend"
schtasks /Create /F /TN "HM Monitor de Saude" /SC MINUTE /MO 5 /RL HIGHEST ^
  /TR "\"C:\Program Files\nodejs\node.exe\" \"%BACKEND%\scripts\monitorar-saude.js\""
if errorlevel 1 (
  echo.
  echo Nao consegui registrar a tarefa. Veja a mensagem acima.
) else (
  echo.
  echo Pronto: a tarefa "HM Monitor de Saude" roda a cada 5 minutos.
  echo O aviso vai para ALERTA_EMAIL (ou, se nao definido, para EMAIL_IMAP_USER) do arquivo backend\.env.
  echo Para testar sem esperar:  "C:\Program Files\nodejs\node.exe" "%BACKEND%\scripts\monitorar-saude.js"
  echo Para remover:  schtasks /Delete /TN "HM Monitor de Saude" /F
)
echo.
pause
