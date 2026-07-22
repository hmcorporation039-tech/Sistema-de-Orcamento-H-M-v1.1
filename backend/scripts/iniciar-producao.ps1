# Inicia o backend (que tambem serve a interface) em modo producao, silencioso.
# Usado pelo atalho na pasta Inicializar do Windows para o sistema subir
# sozinho ao fazer login, sem precisar abrir terminal.

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptsDir
$logDir = Join-Path $backendDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir "sistema.log"
Set-Location $backendDir

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

& "C:\Program Files\nodejs\node.exe" "src\server.js" 2>&1 | ForEach-Object {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $_" | Out-File -FilePath $logFile -Append -Encoding utf8
}
