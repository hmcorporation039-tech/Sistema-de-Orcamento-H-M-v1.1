# Inicia o backend (que tambem serve a interface) em modo producao, silencioso.
# Usado pela tarefa agendada / atalho de inicializacao do Windows para o
# sistema subir sozinho, sem precisar abrir terminal.
#
# Supervisor: se o node cair (erro grave, falta de memoria), sobe de novo em
# 10 s. Para parar de vez, encerre este PowerShell antes do node (o
# reiniciar-backend.bat ja faz isso). O PID do supervisor fica em
# logs\supervisor.pid.

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptsDir
$logDir = Join-Path $backendDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir "sistema.log"
Set-Location $backendDir
Set-Content -Path (Join-Path $logDir "supervisor.pid") -Value $PID -Encoding ascii

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

# Rotacao do log: acima de 20 MB vira sistema-AAAAMMDD-HHmmss.log; guarda os 10 mais recentes
function Rotacionar-Log {
    if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 20MB)) {
        Move-Item $logFile (Join-Path $logDir ("sistema-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".log"))
        Get-ChildItem $logDir -Filter "sistema-*.log" | Sort-Object LastWriteTime -Descending |
            Select-Object -Skip 10 | Remove-Item -Force -ErrorAction SilentlyContinue
    }
}

while ($true) {
    Rotacionar-Log
    $linhas = 0
    & "C:\Program Files\nodejs\node.exe" "src\server.js" 2>&1 | ForEach-Object {
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $_" | Out-File -FilePath $logFile -Append -Encoding utf8
        # rotaciona tambem durante a execucao (o backend pode ficar semanas no ar)
        $linhas++
        if ($linhas % 5000 -eq 0) { Rotacionar-Log }
    }
    $codigo = $LASTEXITCODE
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [supervisor] backend encerrou (codigo $codigo) - reiniciando em 10 s" | Out-File -FilePath $logFile -Append -Encoding utf8
    Start-Sleep -Seconds 10
}
