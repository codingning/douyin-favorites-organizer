param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('collect', 'incremental', 'draft', 'validate', 'preview', 'approve', 'manifest', 'journal', 'commit-state')]
    [string]$Command,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$cli = Join-Path $projectRoot 'src\cli.mjs'

if (-not (Test-Path -LiteralPath $cli)) {
    throw "Organizer CLI not found: $cli"
}

& node $cli $Command @Arguments
exit $LASTEXITCODE
