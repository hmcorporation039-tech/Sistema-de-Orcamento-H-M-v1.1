# Para o backend: primeiro o supervisor (senao ele sobe outro node assim que o
# atual parar) e depois o node que escuta na porta. Usado pelo reiniciar.ps1 e
# pelo restaurar-backup.ps1 -SubstituirProducao.
#
# Uso:
#   .\parar-backend.ps1                 -> porta do .env (PORT; padrao 3001)
#   .\parar-backend.ps1 -Porta 3002
#   .\parar-backend.ps1 -Simular        -> so mostra o que seria parado
#   -PidFile <arquivo>                  -> outro supervisor.pid (padrao logs\supervisor.pid)
#
# Codigo de saida: 0 = a porta ficou livre; 1 = a porta continua em uso
# (no -Simular, 1 sempre que ha algo ouvindo, porque nada foi parado).

param(
    [int]$Porta = 0,
    [switch]$Simular,
    [string]$PidFile = ""
)

$backendDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $PidFile) { $PidFile = Join-Path $backendDir "logs\supervisor.pid" }
if ($Porta -le 0) {
    $Porta = 3001
    $envArq = Join-Path $backendDir ".env"
    if (Test-Path $envArq) {
        foreach ($linha in Get-Content $envArq) {
            if ($linha -match '^\s*PORT\s*=\s*(\d+)\s*$') { $Porta = [int]$matches[1] }
        }
    }
}
$prefixo = if ($Simular) { '[SIMULACAO] ' } else { '' }

function Get-Ouvinte([int]$p) {
    Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}

# 1) o supervisor (PowerShell que roda o iniciar-producao.ps1)
if (Test-Path $PidFile) {
    $supervisor = [int](Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    $p = Get-Process -Id $supervisor -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -match 'powershell') {
        Write-Host "${prefixo}Parando o supervisor do backend (PID $supervisor)..."
        if (-not $Simular) { Stop-Process -Id $supervisor -Force -ErrorAction SilentlyContinue }
    }
}

# 2) o node que escuta na porta
$c = Get-Ouvinte $Porta
if ($c) {
    $pai = (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").ParentProcessId
    Write-Host ("${prefixo}Parando o backend que escuta na porta $Porta (PID " + $c.OwningProcess + ')...')
    if (-not $Simular) {
        try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch { Write-Host 'Nao consegui parar automaticamente; feche o node.exe pelo Gerenciador de Tarefas.' }
        # supervisor antigo (antes do supervisor.pid existir)
        $pp = Get-Process -Id $pai -ErrorAction SilentlyContinue
        if ($pp -and $pp.ProcessName -match 'powershell') { Stop-Process -Id $pai -Force -ErrorAction SilentlyContinue }
    }
} else {
    Write-Host "Nenhum backend rodando na porta $Porta."
}

# 3) espera a porta liberar (ate ~10 s)
if (-not $Simular) {
    for ($i = 0; $i -lt 20; $i++) {
        if (-not (Get-Ouvinte $Porta)) { break }
        Start-Sleep -Milliseconds 500
    }
}
if (Get-Ouvinte $Porta) {
    Write-Host "${prefixo}A porta $Porta continua em uso."
    exit 1
}
exit 0
