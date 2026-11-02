@echo off
REM Registra no Agendador de Tarefas do Windows o teste mensal de restauracao do backup.
REM Todo dia 1, as 03:30 (depois do backup das 02:00): restaura o dump mais novo num banco temporario,
REM confere com o banco em uso, apaga o temporario e avisa por e-mail (backend\scripts\testar-restauracao.js).
REM Rode como administrador, uma vez. Para o sistema de PRODUCAO, rode o .bat de C:\HM-Engenharia\hm-eng\.
net session >nul 2>&1
if errorlevel 1 (
  echo Pedindo permissao de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
title Registrar o teste de restauracao - HM Engenharia
set "BACKEND=%~dp0backend"
schtasks /Create /F /TN "HM Teste de Restauracao" /SC MONTHLY /D 1 /ST 03:30 /RL HIGHEST ^
  /TR "\"C:\Program Files\nodejs\node.exe\" \"%BACKEND%\scripts\testar-restauracao.js\""
if errorlevel 1 (
  echo.
  echo Nao consegui registrar a tarefa. Veja a mensagem acima.
) else (
  echo.
  echo Pronto: a tarefa "HM Teste de Restauracao" roda todo dia 1, as 03:30.
  echo O resultado aparece em Integracoes e vai por e-mail para ALERTA_EMAIL (ou EMAIL_IMAP_USER).
  echo Para testar agora, sem e-mail:  "C:\Program Files\nodejs\node.exe" "%BACKEND%\scripts\testar-restauracao.js" --sem-email
  echo Para remover:  schtasks /Delete /TN "HM Teste de Restauracao" /F
)
echo.
pause
