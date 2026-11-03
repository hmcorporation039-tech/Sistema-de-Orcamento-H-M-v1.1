@echo off
REM ============================================================
REM   Envia para o GitHub as alteracoes feitas no PC (producao).
REM   Pode ser usado sempre que houver mudanca: mostra o que vai
REM   subir, pede a descricao do commit e faz o push.
REM   O .gitignore protege .env, PDFs, backups, logs e as pastas
REM   de clientes/fornecedores - esses nunca sobem.
REM ============================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo Pasta: %CD%
echo.
git --version >nul 2>&1 || (echo ERRO: git nao encontrado. & goto :fim)

REM Antes do "git add -A": mostra o que mudou e recusa se houver pasta de build
REM (frontend\build-2.x.0-anterior, ~40 MB minificados) ou arquivo maior que 20 MB.
echo Situacao da pasta (git status):
git -c core.quotepath=off status --short
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ruins = @(); foreach ($f in (git -c core.quotepath=off ls-files -m -o --exclude-standard)) { if ($f -match '(^|/)build-[^/]*/') { $ruins += ('pasta de build: ' + $f) } elseif ((Test-Path -LiteralPath $f -PathType Leaf) -and ((Get-Item -LiteralPath $f).Length -gt 20MB)) { $ruins += ('maior que 20 MB: ' + $f) } }; if ($ruins.Count -gt 0) { Write-Host 'RECUSADO - nao envie estes arquivos para o GitHub:'; $ruins | Select-Object -First 30 | ForEach-Object { Write-Host ('  ' + $_) }; Write-Host 'Tire da pasta (ou ponha no .gitignore) e rode de novo.'; exit 1 }"
if errorlevel 1 goto :fim

git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova no PC. Conferindo se ha commits para enviar...
  goto :push
)

echo Arquivos que serao enviados:
git diff --cached --stat
echo.
set "MSG="
set /p "MSG=Descreva a alteracao (ou Enter para cancelar): "
if not defined MSG (
  git reset -q
  echo Cancelado. Nada foi enviado.
  goto :fim
)
git commit -m "%MSG%"
if errorlevel 1 (echo ERRO no commit. & goto :fim)

:push
git push origin main --follow-tags
if errorlevel 1 (echo ERRO no push - confira o login do GitHub. & goto :fim)
echo.
echo OK: GitHub atualizado.
:fim
echo.
pause
