# Liga as skills do projeto ao Claude Code: cria uma junction em
# %USERPROFILE%\.claude\skills\<name> para cada pasta skills\<pasta> que tem SKILL.md
# (<name> = campo "name:" do SKILL.md). As junctions apontam para a PRODUCAO
# (C:\HM-Engenharia\hm-eng\skills\<pasta>), que e a fonte das skills do Claude Code.
#
# Antes cada skill nova era ligada a mao (mklink /J) e a quadros-nbr61439 ficou de fora:
# pronta desde 29/10, mas o Claude Code nao a enxergava.
#
#   powershell -ExecutionPolicy Bypass -File skills\ligar-skills.ps1 -WhatIf   so lista o que faria
#   powershell -ExecutionPolicy Bypass -File skills\ligar-skills.ps1           cria as que faltam
#
# Nunca apaga nem troca uma ligacao existente: se ja houver algo com o nome apontando
# para outro lugar, so avisa.
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$Origem = 'C:\HM-Engenharia\hm-eng\skills',
    [string]$Destino = (Join-Path $env:USERPROFILE '.claude\skills')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Origem -PathType Container)) {
    Write-Host "Pasta de skills nao encontrada: $Origem"
    exit 1
}

function Ler-NomeDaSkill([string]$arquivo) {
    # campo name: do cabecalho (front matter) do SKILL.md
    $dentro = $false
    foreach ($linha in Get-Content -LiteralPath $arquivo -Encoding UTF8 -TotalCount 40) {
        if ($linha -match '^\s*---\s*$') { if ($dentro) { break } else { $dentro = $true; continue } }
        if ($dentro -and $linha -match '^\s*name\s*:\s*["'']?([A-Za-z0-9._-]+)["'']?\s*$') { return $matches[1] }
    }
    return $null
}

function Alvo-DaLigacao([string]$caminho) {
    $item = Get-Item -LiteralPath $caminho -Force
    if ($item.LinkType) { return [string]($item.Target | Select-Object -First 1) }
    return $null
}

$criadas = 0; $prontas = 0; $avisos = 0
$pastas = Get-ChildItem -LiteralPath $Origem -Directory | Where-Object { $_.Name -notmatch '^[_.]' -and $_.Name -ne 'node_modules' } | Sort-Object Name

if (-not (Test-Path -LiteralPath $Destino) -and $PSCmdlet.ShouldProcess($Destino, 'Criar pasta de skills do Claude Code')) {
    New-Item -ItemType Directory -Path $Destino | Out-Null
}

foreach ($p in $pastas) {
    $skillMd = Join-Path $p.FullName 'SKILL.md'
    if (-not (Test-Path -LiteralPath $skillMd)) { continue }
    $nome = Ler-NomeDaSkill $skillMd
    if (-not $nome) {
        Write-Host ("AVISO  {0}: SKILL.md sem o campo name: - pulada" -f $p.Name); $avisos++; continue
    }
    $link = Join-Path $Destino $nome
    $alvo = $p.FullName
    if (Test-Path -LiteralPath $link) {
        $atual = Alvo-DaLigacao $link
        if ($atual -and ([IO.Path]::GetFullPath($atual).TrimEnd('\') -ieq [IO.Path]::GetFullPath($alvo).TrimEnd('\'))) {
            Write-Host ("ok     {0} -> {1}" -f $nome, $alvo); $prontas++
        } else {
            $desc = if ($atual) { "aponta para $atual" } else { 'e uma pasta comum, nao uma ligacao' }
            Write-Host ("AVISO  {0}: ja existe e {1} - nao mexi" -f $nome, $desc); $avisos++
        }
        continue
    }
    if ($PSCmdlet.ShouldProcess("$link -> $alvo", 'Criar junction')) {
        New-Item -ItemType Junction -Path $link -Target $alvo | Out-Null
        Write-Host ("criada {0} -> {1}" -f $nome, $alvo)
    } else {
        Write-Host ("FALTA  {0} -> {1}" -f $nome, $alvo)
    }
    $criadas++
}

$verbo = if ($WhatIfPreference) { 'a criar' } else { 'criada(s)' }
Write-Host ''
Write-Host ("{0} ja ligada(s), {1} {2}, {3} aviso(s). Destino: {4}" -f $prontas, $criadas, $verbo, $avisos, $Destino)
