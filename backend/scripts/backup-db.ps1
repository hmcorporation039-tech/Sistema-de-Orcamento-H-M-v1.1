# Backup diario do banco hm_orcamentos. Gera um .sql.zip em backend/backups/
# e apaga backups com mais de 30 dias. Pensado para rodar via Agendador de
# Tarefas do Windows (veja instrucoes-agendador.txt na mesma pasta).

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptsDir
$envPath = Join-Path $backendDir ".env"

if (-not (Test-Path $envPath)) {
    Write-Error "Arquivo .env nao encontrado em $envPath"
    exit 1
}

$envVars = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*?)\s*$') {
        $envVars[$matches[1]] = $matches[2]
    }
}

$pgDump = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName

if (-not $pgDump) {
    Write-Error "pg_dump.exe nao encontrado em C:\Program Files\PostgreSQL\*\bin"
    exit 1
}

$backupDir = Join-Path $backendDir "backups"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$arquivoSql = Join-Path $backupDir "hm_orcamentos_$timestamp.sql"
$arquivoZip = "$arquivoSql.zip"

$env:PGPASSWORD = $envVars["DB_PASS"]
try {
    & $pgDump -h $envVars["DB_HOST"] -p $envVars["DB_PORT"] -U $envVars["DB_USER"] -F p -f $arquivoSql $envVars["DB_NAME"]
    if ($LASTEXITCODE -ne 0) { throw "pg_dump saiu com codigo $LASTEXITCODE" }
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Compress-Archive -Path $arquivoSql -DestinationPath $arquivoZip -Force
Remove-Item $arquivoSql

Get-ChildItem $backupDir -Filter "*.sql.zip" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force

Write-Output "Backup concluido: $arquivoZip"
