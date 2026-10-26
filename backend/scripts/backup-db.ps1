# Backup diario do Sistema de Orcamentos (tarefa "HM-Engenharia Backup Diario").
#  1. Banco hm_orcamentos -> backend\backups\hm_orcamentos_AAAA-MM-DD_HH-mm.dump
#     (formato custom do pg_dump: ja comprimido e restauravel com pg_restore,
#     inclusive por cima de um banco existente - ver restaurar-backup.ps1)
#  2. Confere se o arquivo gerado e legivel (pg_restore --list) antes de
#     apagar backups antigos - um backup corrompido nao derruba os bons.
#  3. Copia o backup e a pasta "Arquivos do Sistema" (projetos, laudos, PDFs)
#     para o servidor de arquivos. A copia da pasta nunca apaga nada no destino
#     (sem /MIR): um arquivo apagado ou corrompido aqui nao some de la.
# Mantem 30 dias. Registro em backend\logs\backup.log.

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptsDir
$envPath = Join-Path $backendDir ".env"
$logDir = Join-Path $backendDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "backup.log"

function Log($texto) {
    $linha = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $texto"
    Write-Output $linha
    $linha | Out-File -FilePath $logFile -Append -Encoding utf8
}

if (-not (Test-Path $envPath)) { Log "ERRO: .env nao encontrado em $envPath"; exit 1 }

$envVars = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*?)\s*$') { $envVars[$matches[1]] = $matches[2] }
}

$pgBin = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty DirectoryName
if (-not $pgBin) { Log "ERRO: pg_dump.exe nao encontrado em C:\Program Files\PostgreSQL\*\bin"; exit 1 }

$backupDir = Join-Path $backendDir "backups"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$arquivo = Join-Path $backupDir "hm_orcamentos_$timestamp.dump"

$env:PGPASSWORD = $envVars["DB_PASS"]
try {
    & (Join-Path $pgBin "pg_dump.exe") -h $envVars["DB_HOST"] -p $envVars["DB_PORT"] -U $envVars["DB_USER"] -F c -Z 6 -f $arquivo $envVars["DB_NAME"]
    if ($LASTEXITCODE -ne 0) { throw "pg_dump saiu com codigo $LASTEXITCODE" }
    # conferencia: o arquivo precisa ser lido pelo pg_restore e ter as tabelas principais
    $indice = & (Join-Path $pgBin "pg_restore.exe") --list $arquivo
    if ($LASTEXITCODE -ne 0) { throw "pg_restore --list falhou (backup ilegivel)" }
    foreach ($tabela in @('propostas', 'materiais', 'usuarios')) {
        if (-not ($indice | Select-String -SimpleMatch "TABLE DATA public $tabela ")) { throw "backup sem os dados da tabela $tabela" }
    }
} catch {
    Log "ERRO no backup do banco: $($_.Exception.Message)"
    Remove-Item $arquivo -ErrorAction SilentlyContinue
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
Log "Backup do banco concluido e conferido: $arquivo ($([math]::Round((Get-Item $arquivo).Length / 1KB)) KB)"

# so apaga os antigos depois de um backup novo conferido
Get-ChildItem $backupDir -File |
    Where-Object { $_.Name -match '\.(dump|sql\.zip)$' -and $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force

# Copia para o servidor de arquivos. Se a rede estiver fora, o backup local
# (ja concluido) nao e afetado.
$destinoRede = "\\MARCIO-SERVER\Arquivos Gerais 2\H&M\Projeto do sistema de orçamentos\Backups"
try {
    if (-not (Test-Path $destinoRede)) { New-Item -ItemType Directory -Path $destinoRede -Force | Out-Null }
    Copy-Item -Path $arquivo -Destination $destinoRede -Force
    Get-ChildItem $destinoRede -File |
        Where-Object { $_.Name -match '\.(dump|sql\.zip)$' -and $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
    Log "Copia do banco enviada para a rede: $destinoRede"
} catch {
    Log "AVISO: nao foi possivel copiar o backup do banco para a rede ($destinoRede): $($_.Exception.Message)"
}

$arquivosSistema = "C:\HM-Engenharia\Arquivos do Sistema"
if (Test-Path $arquivosSistema) {
    $destinoArquivos = Join-Path $destinoRede "Arquivos do Sistema"
    # /E = subpastas; sem /MIR (nao apaga no destino); /R /W = poucas tentativas se a rede cair
    robocopy $arquivosSistema $destinoArquivos /E /R:2 /W:5 /FFT /NP /NFL /NDL /NJH /XF *.tmp | Out-Null
    # robocopy: 0-7 = sucesso (com ou sem arquivos copiados); 8+ = falha
    if ($LASTEXITCODE -ge 8) {
        Log "AVISO: copia de 'Arquivos do Sistema' para a rede falhou (robocopy codigo $LASTEXITCODE)"
    } else {
        Log "Copia de 'Arquivos do Sistema' para a rede concluida (robocopy codigo $LASTEXITCODE)"
    }
    $global:LASTEXITCODE = 0
}
exit 0
