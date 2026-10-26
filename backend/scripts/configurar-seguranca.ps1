# Ajustes de seguranca e disponibilidade que exigem administrador do Windows
# (auditoria de 25/10/2026). Rodado pelo configurar-seguranca.bat, na raiz do
# projeto, que ja pede a elevacao. Pode ser rodado de novo sem problema.
#
# Parametros:
#   -RodarSemLogin   o backend sobe com o Windows mesmo sem ninguem logado
#                    (recomendado: apos uma atualizacao com reinicio, o sistema
#                    volta sozinho). Pede a senha do usuario do Windows. Nesse
#                    modo o botao "Abrir pasta" nao abre janela neste PC (o
#                    backend roda sem area de trabalho); o caminho continua na tela.
#                    Sem este parametro: sobe ao fazer login, como hoje.
#   -PularBanco      nao cria o usuario de banco hm_app (passo 7)

param([switch]$RodarSemLogin, [switch]$PularBanco)

$ErrorActionPreference = "Stop"
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Rode como administrador (use configurar-seguranca.bat)." -ForegroundColor Red; exit 1
}

$backendDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$raiz = Split-Path -Parent $backendDir
$usuario = "$env:USERDOMAIN\$env:USERNAME"
function Passo($n, $texto) { Write-Host ""; Write-Host "[$n] $texto" -ForegroundColor Cyan }

# 1) Energia: sem suspensao na tomada. O PC dormia apos 5 h ocioso e perdia o
#    backup das 02:00 e as leituras das 06:00/18:00.
Passo 1 "Energia: nunca suspender/hibernar na tomada"
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
Write-Host "  ok (bateria/monitor nao foram alterados)"

# 2) PostgreSQL so na propria maquina. Hoje escuta em todas as placas de rede
#    ('*'); o pg_hba ja recusa conexoes de fora, mas a porta nem precisa existir na rede.
Passo 2 "PostgreSQL: aceitar conexoes so deste PC (listen_addresses = 'localhost')"
$conf = Get-ChildItem 'C:\Program Files\PostgreSQL\*\data\postgresql.conf' | Sort-Object FullName -Descending | Select-Object -First 1
if ($conf) {
    $texto = [IO.File]::ReadAllText($conf.FullName)
    if ($texto -match "(?m)^\s*listen_addresses\s*=\s*'localhost'") {
        Write-Host "  ja estava em localhost"
    } else {
        Copy-Item $conf.FullName "$($conf.FullName).antes-seguranca-$(Get-Date -Format yyyyMMdd-HHmmss)"
        $novo = [regex]::Replace($texto, "(?m)^\s*#?\s*listen_addresses\s*=.*$", "listen_addresses = 'localhost'`t`t# so este PC (auditoria 25/10/2026)", 1)
        [IO.File]::WriteAllText($conf.FullName, $novo, (New-Object Text.UTF8Encoding($false)))
        $servico = Get-Service postgresql* | Select-Object -First 1
        Write-Host "  reiniciando o servico $($servico.Name)..."
        Restart-Service $servico.Name -Force
        Start-Sleep -Seconds 3
        Write-Host "  ok - copia do arquivo anterior ao lado do postgresql.conf"
    }
} else { Write-Host "  postgresql.conf nao encontrado - pulei" -ForegroundColor Yellow }

# 3) Firewall: sistema (porta 3001) liberado so para a rede local; banco bloqueado de fora.
Passo 3 "Firewall: porta 3001 so para a rede local; porta 5432 bloqueada para a rede"
Get-NetFirewallRule -DisplayName "HM Engenharia*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "HM Engenharia - Sistema (3001, rede local)" -Direction Inbound -Protocol TCP -LocalPort 3001 -RemoteAddress LocalSubnet -Action Allow -Profile Any | Out-Null
New-NetFirewallRule -DisplayName "HM Engenharia - Bloquear PostgreSQL (5432) da rede" -Direction Inbound -Protocol TCP -LocalPort 5432 -RemoteAddress Any -Action Block -Profile Any | Out-Null
Write-Host "  ok"
$perfil = Get-NetConnectionProfile | Select-Object -First 1
if ($perfil.NetworkCategory -eq 'Public') {
    Write-Host "  obs.: a rede '$($perfil.Name)' esta como PUBLICA. Se for a rede do escritorio, mude para Privada em" -ForegroundColor Yellow
    Write-Host "        Configuracoes > Rede e Internet > Propriedades (ou: Set-NetConnectionProfile -Name '$($perfil.Name)' -NetworkCategory Private)" -ForegroundColor Yellow
}

# 4) Tarefa agendada do backend (substitui o atalho da pasta Inicializar):
#    reinicia sozinha se cair, sem limite de tempo de execucao.
Passo 4 "Tarefa agendada 'HM-Engenharia Backend'"
$acao = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$backendDir\scripts\iniciar-producao.ps1`"" -WorkingDirectory $backendDir
$config = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
if ($RodarSemLogin) {
    $cred = Get-Credential -UserName $usuario -Message "Senha do usuario do Windows que roda o sistema (fica guardada so no Agendador de Tarefas)"
    $gatilho = New-ScheduledTaskTrigger -AtStartup
    $gatilho.Delay = 'PT30S'   # da tempo da rede e do PostgreSQL subirem
    Register-ScheduledTask -TaskName "HM-Engenharia Backend" -Action $acao -Trigger $gatilho -Settings $config -RunLevel Highest `
        -User $cred.UserName -Password $cred.GetNetworkCredential().Password -Force | Out-Null
    Write-Host "  ok - sobe com o Windows, mesmo sem login"
} else {
    $gatilho = New-ScheduledTaskTrigger -AtLogOn -User $usuario
    $principalTarefa = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Highest
    Register-ScheduledTask -TaskName "HM-Engenharia Backend" -Action $acao -Trigger $gatilho -Settings $config -Principal $principalTarefa -Force | Out-Null
    Write-Host "  ok - sobe ao fazer login de $usuario (para subir sem login, rode de novo com -RodarSemLogin)"
}
$atalho = Join-Path ([Environment]::GetFolderPath('Startup')) "HM Engenharia - Sistema.lnk"
if (Test-Path $atalho) {
    Move-Item $atalho (Join-Path $raiz "HM Engenharia - Sistema (atalho antigo da Inicializacao).lnk") -Force
    Write-Host "  atalho antigo da pasta Inicializar removido (guardado na pasta do projeto)"
}

# 5) Backup diario: roda assim que possivel se o horario passar com o PC
#    desligado, e acorda o PC para rodar.
Passo 5 "Tarefa 'HM-Engenharia Backup Diario': recuperar horario perdido e acordar o PC"
$backup = Get-ScheduledTask -TaskName "HM-Engenharia Backup Diario" -ErrorAction SilentlyContinue
if ($backup) {
    $backup.Settings.StartWhenAvailable = $true
    $backup.Settings.WakeToRun = $true
    $backup.Settings.DisallowStartIfOnBatteries = $false
    $backup.Settings.ExecutionTimeLimit = 'PT2H'
    Set-ScheduledTask -InputObject $backup | Out-Null
    Write-Host "  ok"
} else { Write-Host "  tarefa de backup nao encontrada - veja backend\scripts\instrucoes-agendador.txt" -ForegroundColor Yellow }

# 6) Permissoes de arquivos com segredos: so este usuario, SYSTEM e Administradores.
Passo 6 "Permissoes dos arquivos com senhas (.env, backups)"
$protegidos = @(
    (Join-Path $backendDir ".env"),
    (Join-Path $raiz "frontend\cypress.env.json"),
    (Join-Path $raiz "E-mail admin@hmengenharia.com.txt"),
    (Join-Path $backendDir "backups"),
    "C:\HM-Engenharia\Backups"
)
foreach ($p in $protegidos) {
    if (Test-Path $p) {
        $heranca = if ((Get-Item $p).PSIsContainer) { '(OI)(CI)F' } else { 'F' }
        icacls $p /inheritance:r /grant:r "${usuario}:$heranca" "*S-1-5-18:$heranca" "*S-1-5-32-544:$heranca" | Out-Null
        Write-Host "  $p"
    }
}

# 7) Usuario de banco sem superusuario para o sistema (hm_app)
if (-not $PularBanco) {
    Passo 7 "Banco: o sistema passa a conectar como hm_app (sem superusuario)"
    Push-Location $backendDir
    try {
        & "C:\Program Files\nodejs\node.exe" "scripts\criar-usuario-banco.js"
        $okBanco = ($LASTEXITCODE -eq 0)
    } finally { Pop-Location }
    if (-not $okBanco) { Write-Host "  falhou - o .env NAO foi alterado; o sistema continua como antes" -ForegroundColor Yellow }
}

# 8) Reinicia o backend com tudo novo (supervisor + .env)
Passo 8 "Reiniciando o backend"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $backendDir "scripts\reiniciar.ps1")

Write-Host ""
Write-Host "Concluido. Recarregue o sistema no navegador com Ctrl+F5." -ForegroundColor Green
