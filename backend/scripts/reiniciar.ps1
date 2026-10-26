# Para o backend em producao (supervisor + node) e sobe de novo.
# Chamado pelo reiniciar-backend.bat (ja elevado como administrador).

$backendDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pidFile = Join-Path $backendDir "logs\supervisor.pid"

# 1) o supervisor primeiro - senao ele sobe outro node assim que o atual parar
if (Test-Path $pidFile) {
    $supervisor = [int](Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    $p = Get-Process -Id $supervisor -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -match 'powershell') {
        Write-Host "Parando o supervisor do backend (PID $supervisor)..."
        Stop-Process -Id $supervisor -Force -ErrorAction SilentlyContinue
    }
}

# 2) o node que escuta na porta 3001
$c = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($c) {
    $pai = (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").ParentProcessId
    Write-Host ('Parando o backend atual (PID ' + $c.OwningProcess + ')...')
    try { Stop-Process -Id $c.OwningProcess -Force } catch { Write-Host 'Nao consegui parar automaticamente; feche o node.exe pelo Gerenciador de Tarefas.' }
    # supervisor antigo (antes do supervisor.pid existir)
    $pp = Get-Process -Id $pai -ErrorAction SilentlyContinue
    if ($pp -and $pp.ProcessName -match 'powershell') { Stop-Process -Id $pai -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
} else {
    Write-Host 'Nenhum backend rodando na porta 3001 - vou apenas iniciar.'
}

Write-Host 'Subindo o backend novo (oculto)...'
Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $backendDir 'scripts\iniciar-producao.ps1') -WindowStyle Hidden
Start-Sleep -Seconds 8
try {
    $h = Invoke-RestMethod 'http://localhost:3001/health' -TimeoutSec 6
    Write-Host ''
    Write-Host ('OK: backend no ar, banco ' + $h.banco + '. Versao: ' + $h.versao)
} catch {
    Write-Host ''
    Write-Host 'Ainda subindo - aguarde ~10s e abra http://localhost:3001/health no navegador.'
}
