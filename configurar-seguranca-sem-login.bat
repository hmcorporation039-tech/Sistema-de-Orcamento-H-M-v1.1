@echo off
REM Atalho de duplo clique para o modo recomendado: o mesmo que
REM   configurar-seguranca.bat -RodarSemLogin
REM (o backend sobe com o Windows mesmo sem ninguem logado). Criado em
REM 29/10/2026 porque, rodando pelo PowerShell, o parametro ficou de fora e a
REM tarefa voltou a subir so no login.
call "%~dp0configurar-seguranca.bat" -RodarSemLogin
