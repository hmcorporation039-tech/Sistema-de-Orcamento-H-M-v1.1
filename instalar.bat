@echo off
echo ================================
echo  H^&M Engenharia - Instalacao
echo ================================
echo.

echo Instalando dependencias do Backend...
cd backend
call npm install
cd ..

echo.
echo Instalando dependencias do Frontend...
cd frontend
call npm install
cd ..

echo.
echo ================================
echo  Instalacao concluida!
echo ================================
echo.
echo PROXIMO PASSO:
echo 1. Crie o arquivo backend\.env com seus dados
echo    (copie o backend\.env.example e renomeie)
echo.
echo 2. Crie o banco de dados no PostgreSQL:
echo    CREATE DATABASE hm_orcamentos;
echo.
echo 3. Execute iniciar.bat para rodar o sistema
echo.
pause
