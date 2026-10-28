# Restaura um backup do banco do Sistema de Orcamentos.
#
# Uso (PowerShell, na pasta backend\scripts):
#   .\restaurar-backup.ps1 -Arquivo ..\backups\hm_orcamentos_2026-10-25_02-00.dump
#       -> restaura num banco SEPARADO (hm_orcamentos_restaurado) para conferir,
#          sem tocar no banco em uso. Recomendado sempre primeiro.
#   .\restaurar-backup.ps1 -Arquivo <arquivo> -Banco outro_nome
#   .\restaurar-backup.ps1 -Arquivo <arquivo> -SubstituirProducao
#       -> SUBSTITUI o banco em uso (hm_orcamentos); pede para digitar SUBSTITUIR.
#          PARA o backend sozinho (supervisor + node da porta do .env: os mesmos
#          passos do reiniciar.ps1, em scripts\parar-backend.ps1) e CANCELA sem
#          mexer em nada se a porta continuar ouvindo - antes o supervisor subia
#          o node de novo no meio da restauracao. Antes de apagar, faz um backup
#          de seguranca do banco atual. No fim, suba com reiniciar-backend.bat.
#   -Simular  -> mostra os passos sem parar nada e sem tocar no banco
#   -Porta N  -> porta do backend a parar (padrao: PORT do .env, ou 3001)
#
# Aceita .dump (formato atual) e .sql.zip / .sql (backups antigos, texto).

param(
    [Parameter(Mandatory = $true)][string]$Arquivo,
    [string]$Banco = "hm_orcamentos_restaurado",
    [switch]$SubstituirProducao,
    [switch]$Simular,
    [int]$Porta = 0
)

$ErrorActionPreference = "Stop"
$backendDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$envVars = @{}
Get-Content (Join-Path $backendDir ".env") | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*?)\s*$') { $envVars[$matches[1]] = $matches[2] }
}
$pgBin = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_restore.exe" | Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty DirectoryName
$conexao = @('-h', $envVars["DB_HOST"], '-p', $envVars["DB_PORT"], '-U', $envVars["DB_USER"])
if ($Porta -le 0) { $Porta = if ($envVars["PORT"]) { [int]$envVars["PORT"] } else { 3001 } }

if (-not (Test-Path $Arquivo)) { throw "Arquivo nao encontrado: $Arquivo" }
$Arquivo = (Resolve-Path $Arquivo).Path

if ($SubstituirProducao) {
    $Banco = $envVars["DB_NAME"]
    Write-Host "ATENCAO: isto APAGA o banco em uso ($Banco) e coloca no lugar o conteudo de:" -ForegroundColor Yellow
    Write-Host "  $Arquivo" -ForegroundColor Yellow
    if (-not $Simular) {
        if ((Read-Host "Digite SUBSTITUIR para continuar") -ne 'SUBSTITUIR') { Write-Host "Cancelado."; exit 1 }
    }

    # O backend (e o supervisor, que o sobe de novo em 10 s) precisa estar
    # parado: com ele no ar o dropdb --force derruba as conexoes, o supervisor
    # religa o node, as migracoes recriam tabelas vazias no banco novo e o
    # pg_restore falha no meio.
    & (Join-Path $PSScriptRoot 'parar-backend.ps1') -Porta $Porta -Simular:$Simular
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Restauracao CANCELADA: o backend continua ouvindo na porta $Porta. Nada foi alterado no banco." -ForegroundColor Red
        Write-Host "Feche o node.exe e o PowerShell do supervisor pelo Gerenciador de Tarefas e rode de novo."
        exit 1
    }
} elseif ($Banco -eq $envVars["DB_NAME"]) {
    throw "Para restaurar sobre o banco em uso, use -SubstituirProducao."
}

if ($Simular) {
    Write-Host "[SIMULACAO] Banco de destino: $Banco"
    if ($SubstituirProducao) { Write-Host "[SIMULACAO] pg_dump do banco atual em backups\antes-da-restauracao_<data>.dump" }
    Write-Host "[SIMULACAO] dropdb --if-exists --force $Banco ; createdb -E UTF8 -T template0 $Banco"
    Write-Host "[SIMULACAO] restauraria $Arquivo"
    Write-Host "[SIMULACAO] nada foi alterado."
    exit 0
}

$env:PGPASSWORD = $envVars["DB_PASS"]
$temp = $null
try {
    if ($SubstituirProducao) {
        $seguranca = Join-Path $backendDir ("backups\antes-da-restauracao_" + (Get-Date -Format 'yyyy-MM-dd_HH-mm') + ".dump")
        & (Join-Path $pgBin "pg_dump.exe") @conexao -F c -f $seguranca $Banco
        if ($LASTEXITCODE -ne 0) { throw "Nao consegui fazer o backup de seguranca do banco atual - nada foi alterado." }
        Write-Host "Backup de seguranca do banco atual: $seguranca"
    }

    # banco de destino sempre novo e vazio (restaurar por cima de tabelas existentes da erro)
    & (Join-Path $pgBin "dropdb.exe") @conexao --if-exists --force $Banco
    if ($LASTEXITCODE -ne 0) { throw "Nao consegui apagar o banco $Banco (o backend ainda esta conectado?)" }
    & (Join-Path $pgBin "createdb.exe") @conexao -E UTF8 -T template0 $Banco
    if ($LASTEXITCODE -ne 0) { throw "Nao consegui criar o banco $Banco" }

    if ($Arquivo -match '\.dump$') {
        & (Join-Path $pgBin "pg_restore.exe") @conexao -d $Banco --no-owner --exit-on-error $Arquivo
    } else {
        $sql = $Arquivo
        if ($Arquivo -match '\.zip$') {
            $temp = Join-Path $env:TEMP ("hm-restauracao-" + [guid]::NewGuid())
            Expand-Archive -Path $Arquivo -DestinationPath $temp
            $sql = (Get-ChildItem $temp -Filter *.sql | Select-Object -First 1).FullName
        }
        & (Join-Path $pgBin "psql.exe") @conexao -d $Banco -v ON_ERROR_STOP=1 -q -o NUL -f $sql
    }
    if ($LASTEXITCODE -ne 0) { throw "A restauracao falhou (codigo $LASTEXITCODE). O banco $Banco ficou incompleto." }

    $contagem = & (Join-Path $pgBin "psql.exe") @conexao -d $Banco -t -A -c "SELECT 'propostas=' || (SELECT count(*) FROM propostas) || ' materiais=' || (SELECT count(*) FROM materiais) || ' usuarios=' || (SELECT count(*) FROM usuarios)"
    Write-Host "Restaurado em '$Banco': $contagem" -ForegroundColor Green
    if (-not $SubstituirProducao) {
        Write-Host "Para conferir: psql -U $($envVars['DB_USER']) -d $Banco   |   para apagar depois: dropdb -U $($envVars['DB_USER']) $Banco"
    } else {
        Write-Host "Suba o backend de novo (reiniciar-backend.bat)."
    }
} catch {
    if ($SubstituirProducao) { Write-Host "O backend esta PARADO. Depois de resolver, suba com reiniciar-backend.bat (o backup de seguranca esta em backups\)." -ForegroundColor Yellow }
    throw
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    if ($temp) { Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue }
}
