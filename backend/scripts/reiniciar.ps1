# Para o backend em producao (supervisor + node) e sobe de novo.
# Chamado pelo reiniciar-backend.bat (ja elevado como administrador).

$backendDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Porta do .env (PORT; padrao 3001)
$porta = 3001
$envArq = Join-Path $backendDir ".env"
if (Test-Path $envArq) {
    foreach ($linha in Get-Content $envArq) {
        if ($linha -match '^\s*PORT\s*=\s*(\d+)\s*$') { $porta = [int]$matches[1] }
    }
}

# 1) e 2) supervisor e node da porta: os mesmos passos do restaurar-backup.ps1
# (scripts\parar-backend.ps1)
& (Join-Path $backendDir 'scripts\parar-backend.ps1') -Porta $porta
if ($LASTEXITCODE -ne 0) {
    Write-Host "A porta $porta continua ocupada - feche o node.exe pelo Gerenciador de Tarefas e rode de novo."
}

Write-Host 'Subindo o backend novo (oculto)...'
Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $backendDir 'scripts\iniciar-producao.ps1') -WindowStyle Hidden
Start-Sleep -Seconds 8
try {
    $h = Invoke-RestMethod "http://localhost:$porta/health" -TimeoutSec 6
    Write-Host ''
    Write-Host ('OK: backend no ar, banco ' + $h.banco + '. Versao: ' + $h.versao)
} catch {
    Write-Host ''
    Write-Host "Ainda subindo - aguarde ~10s e abra http://localhost:$porta/health no navegador."
}
