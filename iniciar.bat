@echo off
echo ================================
echo  H^&M Engenharia - Sistema
echo ================================
echo.

echo [1/2] Iniciando Backend (API)...
start "H&M Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo [2/2] Iniciando Frontend (Interface)...
start "H&M Frontend" cmd /k "cd frontend && npm start"

echo.
echo Sistema iniciando...
echo Aguarde o navegador abrir automaticamente.
echo.
echo Para encerrar, feche as duas janelas do terminal.
pause
